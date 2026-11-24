// The graphics card, through glup-voz.exe (voz/): Whisper with Vulkan in a program of its own, so a
// broken driver or a card out of memory can only close that one. Glup talks to it one JSON line at a
// time; if it fails or dies, the caller goes on with the processor.
use std::{
    io::{BufRead, BufReader, Write},
    path::{Path, PathBuf},
    process::{Child, ChildStdin, ChildStdout, Command, Stdio},
    sync::{
        atomic::{AtomicBool, Ordering},
        mpsc::{self, Receiver, RecvTimeoutError},
        Arc,
    },
    thread,
    time::{Duration, Instant},
};

use serde::{Deserialize, Serialize};

use crate::services::{transcribe::compose::Segment, video::encode::hide_window};

pub const WORKER_NAME: &str = "glup-voz.exe";

// Looking for the cards (Vulkan starts, every driver answers) and loading a model on one.
const DEVICES_WAIT: Duration = Duration::from_secs(20);
const LOAD_WAIT: Duration    = Duration::from_secs(120);
// While it listens, it reports progress often; this long without a word, it is stuck.
const SILENCE_WAIT: Duration = Duration::from_secs(90);

#[derive(Clone, Debug, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GpuDevice {
    pub name       : String,
    pub integrated : bool,
    pub memory     : u64,
}

#[derive(Deserialize)]
#[serde(tag = "kind", rename_all = "lowercase")]
enum Answer {
    Devices { devices: Vec<GpuDevice> },
    Loaded,
    Progress { percent: i32 },
    Segments { segments: Vec<Segment> },
    Cancelled,
    Error { message: String },
}

#[derive(Serialize)]
#[serde(tag = "kind", rename_all = "lowercase")]
enum Order<'a> {
    Devices,
    Load { model: &'a str },
    Listen { samples: &'a str, language: Option<&'a str> },
    Cancel,
}

// Why the card could not do it: the caller remembers it and goes on with the processor.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum GpuFailure {
    // glup-voz.exe is not there (a build without it) or could not start (no Vulkan loader).
    Missing,
    // It answered with an error, or died, or stopped answering.
    Failed(String),
}

pub enum GpuListened {
    Segments(Vec<Segment>),
    Cancelled,
}

// Next to glup.exe (installed as a sidecar; in development, in the same target folder). GLUP_VOZ
// points at another one (the tests, whose program lives one folder deeper).
pub fn worker_path() -> Option<PathBuf> {
    let path = std::env::var_os("GLUP_VOZ").map(PathBuf::from).or_else(|| Some(std::env::current_exe().ok()?.parent()?.join(WORKER_NAME)))?;
    path.is_file().then_some(path)
}

pub struct GpuWorker {
    child   : Child,
    input   : ChildStdin,
    answers : Receiver<Answer>,
    // The model loaded on the card.
    pub model : Option<PathBuf>,
}

impl Drop for GpuWorker {
    fn drop(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

fn read_answers(output: ChildStdout) -> Receiver<Answer> {
    let (sender, answers) = mpsc::channel();
    thread::spawn(move || {
        for line in BufReader::new(output).lines() {
            let Ok(line) = line else { break };
            if let Ok(answer) = serde_json::from_str::<Answer>(&line) {
                if sender.send(answer).is_err() {
                    break;
                }
            }
        }
    });
    answers
}

fn failed(what: &str) -> GpuFailure {
    GpuFailure::Failed(what.to_string())
}

impl GpuWorker {
    pub fn start(path: &Path) -> Result<GpuWorker, GpuFailure> {
        Self::start_command(Command::new(path))
    }

    fn start_command(mut command: Command) -> Result<GpuWorker, GpuFailure> {
        command.stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::null());
        hide_window(&mut command);

        let mut child = command.spawn().map_err(|_| GpuFailure::Missing)?;
        let input     = child.stdin.take().ok_or(GpuFailure::Missing)?;
        let output    = child.stdout.take().ok_or(GpuFailure::Missing)?;
        Ok(GpuWorker { child, input, answers: read_answers(output), model: None })
    }

    fn order(&mut self, order: &Order) -> Result<(), GpuFailure> {
        let line = serde_json::to_string(order).map_err(|_| failed("order"))?;
        writeln!(self.input, "{line}").and_then(|_| self.input.flush()).map_err(|_| failed("se cerró"))
    }

    fn answer(&self, wait: Duration) -> Result<Answer, GpuFailure> {
        match self.answers.recv_timeout(wait) {
            Ok(answer)                        => Ok(answer),
            Err(RecvTimeoutError::Timeout)    => Err(failed("no responde")),
            Err(RecvTimeoutError::Disconnected) => Err(failed("se cerró")),
        }
    }

    // Whether it is still running (a crash ends it).
    pub fn alive(&mut self) -> bool {
        matches!(self.child.try_wait(), Ok(None))
    }

    pub fn devices(&mut self) -> Result<Vec<GpuDevice>, GpuFailure> {
        self.order(&Order::Devices)?;
        match self.answer(DEVICES_WAIT)? {
            Answer::Devices { devices } => Ok(devices),
            _                           => Err(failed("respuesta inesperada")),
        }
    }

    pub fn load(&mut self, model: &Path) -> Result<(), GpuFailure> {
        if self.model.as_deref() == Some(model) {
            return Ok(());
        }
        self.model = None;
        self.order(&Order::Load { model: &model.to_string_lossy() })?;
        match self.answer(LOAD_WAIT)? {
            Answer::Loaded           => {
                self.model = Some(model.to_path_buf());
                Ok(())
            }
            Answer::Error { message } => Err(GpuFailure::Failed(message)),
            _                        => Err(failed("respuesta inesperada")),
        }
    }

    // The samples go in a file next to the models (megabytes, not a line of JSON); progress comes as it
    // listens; Cancelar on the task reaches it within half a second.
    pub fn listen(&mut self, mut params: GpuListenParams) -> Result<GpuListened, GpuFailure> {
        let bytes: Vec<u8> = params.samples.iter().flat_map(|sample| sample.to_le_bytes()).collect();
        std::fs::write(params.scratch, bytes).map_err(|_| failed("no pude escribir el sonido"))?;
        let result = self.listen_file(&mut params);
        let _      = std::fs::remove_file(params.scratch);
        result
    }

    fn listen_file(&mut self, params: &mut GpuListenParams) -> Result<GpuListened, GpuFailure> {
        self.order(&Order::Listen { samples: &params.scratch.to_string_lossy(), language: params.language })?;

        let mut cancel_sent = false;
        let mut last_word   = Instant::now();
        loop {
            if params.cancel.load(Ordering::SeqCst) && !cancel_sent {
                self.order(&Order::Cancel)?;
                cancel_sent = true;
            }
            match self.answers.recv_timeout(Duration::from_millis(500)) {
                Ok(Answer::Progress { percent }) => {
                    last_word = Instant::now();
                    (params.on_progress)(percent);
                }
                Ok(Answer::Segments { segments }) => return Ok(GpuListened::Segments(segments)),
                Ok(Answer::Cancelled)             => return Ok(GpuListened::Cancelled),
                Ok(Answer::Error { message })     => return Err(GpuFailure::Failed(message)),
                Ok(_)                             => return Err(failed("respuesta inesperada")),
                Err(RecvTimeoutError::Disconnected) => return Err(failed("se cerró mientras escuchaba")),
                Err(RecvTimeoutError::Timeout)      => {
                    if last_word.elapsed() > SILENCE_WAIT {
                        return Err(failed("dejó de responder"));
                    }
                }
            }
        }
    }
}

pub struct GpuListenParams<'a> {
    pub samples     : &'a [f32],
    pub language    : Option<&'a str>,
    pub cancel      : &'a Arc<AtomicBool>,
    // Where the samples are written for it.
    pub scratch     : &'a Path,
    pub on_progress : &'a mut dyn FnMut(i32),
}

#[cfg(test)]
mod tests {
    use super::*;

    // A program that ends at once, as glup-voz would after a driver crash: a failure to tell, not a panic.
    #[cfg(windows)]
    #[test]
    fn a_worker_that_dies_is_a_failure_and_not_a_crash() {
        let mut command = Command::new("cmd");
        command.args(["/c", "exit 3"]);
        let mut worker = GpuWorker::start_command(command).unwrap();

        assert!(matches!(worker.load(Path::new("modelo.bin")), Err(GpuFailure::Failed(_))));
        assert!(matches!(worker.devices(), Err(GpuFailure::Failed(_))));
        // Its output closes a moment before Windows says it ended.
        let started = Instant::now();
        while worker.alive() && started.elapsed() < Duration::from_secs(5) {
            thread::sleep(Duration::from_millis(50));
        }
        assert!(!worker.alive());
    }

    #[test]
    fn a_missing_worker_is_missing() {
        assert!(matches!(GpuWorker::start(Path::new("C:/no/existe/glup-voz.exe")), Err(GpuFailure::Missing)));
    }
}
