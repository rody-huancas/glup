// Whisper (whisper.cpp through whisper-rs) on the processor, or on the graphics card through glup-voz
// (gpu.rs). Either way the model stays loaded between files and is let go after 5 minutes without use,
// like the background model.
use std::{
    ffi::c_void,
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    thread,
    time::{Duration, Instant},
};

use whisper_rs::{FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters};

use crate::services::transcribe::{
    compose::Segment,
    gpu::{self, GpuDevice, GpuFailure, GpuListenParams, GpuListened, GpuWorker},
};

pub const MODEL_ERROR: &str  = "No pude cargar lo que aprendí para escuchar audios. Bórralo en Ajustes y descárgalo otra vez.";
pub const LISTEN_ERROR: &str = "No pude pasar este audio a texto";

pub const IDLE_LIMIT: Duration = Duration::from_secs(5 * 60);
const WATCH_EVERY: Duration    = Duration::from_secs(30);
const MAX_THREADS: usize       = 8;

struct Loaded {
    path      : PathBuf,
    context   : Arc<WhisperContext>,
    last_used : Instant,
}

// The card's side: glup-voz running with its model, and the cards it found.
#[derive(Default)]
struct GpuSlot {
    worker    : Option<GpuWorker>,
    // Looked for once while Glup runs (None: not yet).
    devices   : Option<Result<Vec<GpuDevice>, GpuFailure>>,
    last_used : Option<Instant>,
}

#[derive(Default)]
pub struct TranscribeSession {
    loaded   : Mutex<Option<Loaded>>,
    gpu      : Mutex<GpuSlot>,
    watching : AtomicBool,
}

pub struct ListenParams<'a> {
    pub model       : &'a Path,
    pub samples     : &'a [f32],
    // "es", "en"… or None to let Whisper detect it.
    pub language    : Option<&'a str>,
    // Checked by Whisper between steps: stops right away.
    pub cancel      : Arc<AtomicBool>,
    // 0 to 100.
    pub on_progress : Box<dyn FnMut(i32) + Send>,
}

// Cancelled while it was listening.
pub enum Listened {
    Segments(Vec<Segment>),
    Cancelled,
}

// Asked by whisper.cpp between steps; the data is the cancel flag.
unsafe extern "C" fn should_abort(data: *mut c_void) -> bool {
    !data.is_null() && unsafe { (*(data as *const AtomicBool)).load(Ordering::SeqCst) }
}

fn threads() -> i32 {
    thread::available_parallelism().map(|count| count.get()).unwrap_or(4).min(MAX_THREADS) as i32
}

impl TranscribeSession {
    // Whether this model is in memory already (another audio a moment ago): nothing to prepare.
    pub fn is_loaded(&self, model: &Path) -> bool {
        self.loaded.lock().map(|loaded| loaded.as_ref().is_some_and(|current| current.path == model)).unwrap_or(false)
    }

    // Loads the model ahead of the first audio, so the wait shows as "Preparándome…".
    pub fn prepare(self: &Arc<Self>, model: &Path) -> Result<(), String> {
        self.context(model).map(|_| ())
    }

    // The model for this path, loading it (or swapping the other level) only when needed.
    fn context(self: &Arc<Self>, model: &Path) -> Result<Arc<WhisperContext>, String> {
        let mut loaded = self.loaded.lock().map_err(|_| MODEL_ERROR.to_string())?;

        if let Some(current) = loaded.as_mut().filter(|current| current.path == model) {
            current.last_used = Instant::now();
            return Ok(current.context.clone());
        }

        let path    = model.to_str().ok_or(MODEL_ERROR)?;
        let context = Arc::new(WhisperContext::new_with_params(path, WhisperContextParameters::default()).map_err(|_| MODEL_ERROR.to_string())?);
        *loaded     = Some(Loaded { path: model.to_path_buf(), context: context.clone(), last_used: Instant::now() });
        drop(loaded);

        self.watch();
        Ok(context)
    }

    // One watcher at a time lets each model go (the processor's and the card's) after IDLE_LIMIT without use.
    fn watch(self: &Arc<Self>) {
        if self.watching.swap(true, Ordering::SeqCst) {
            return;
        }

        let session = Arc::clone(self);
        thread::spawn(move || loop {
            thread::sleep(WATCH_EVERY);
            let (Ok(mut loaded), Ok(mut gpu)) = (session.loaded.lock(), session.gpu.lock()) else { break };
            if loaded.as_ref().is_some_and(|current| current.last_used.elapsed() >= IDLE_LIMIT) {
                *loaded = None;
            }
            if gpu.last_used.is_some_and(|used| used.elapsed() >= IDLE_LIMIT) {
                gpu.worker    = None;
                gpu.last_used = None;
            }
            if loaded.is_none() && gpu.worker.is_none() {
                session.watching.store(false, Ordering::SeqCst);
                break;
            }
        });
    }

    pub fn release(&self) {
        if let Ok(mut loaded) = self.loaded.lock() {
            *loaded = None;
        }
        self.drop_gpu();
    }

    // The cards glup-voz sees, looked for once while Glup runs. If the probe itself fails (the program
    // dies while Vulkan starts), that is the answer until Glup starts again.
    pub fn gpu_devices(&self) -> Result<Vec<GpuDevice>, GpuFailure> {
        let mut slot = self.gpu.lock().map_err(|_| GpuFailure::Missing)?;
        if let Some(found) = &slot.devices {
            return found.clone();
        }

        // That glup-voz closes after answering: loading a model starts another one, so nothing stays
        // open holding video memory just because Ajustes asked.
        let found = gpu::worker_path().ok_or(GpuFailure::Missing).and_then(|path| GpuWorker::start(&path)?.devices());
        slot.devices = Some(found.clone());
        found
    }

    fn worker(slot: &mut GpuSlot) -> Result<&mut GpuWorker, GpuFailure> {
        if !slot.worker.as_mut().is_some_and(GpuWorker::alive) {
            let path    = gpu::worker_path().ok_or(GpuFailure::Missing)?;
            slot.worker = Some(GpuWorker::start(&path)?);
        }
        slot.worker.as_mut().ok_or(GpuFailure::Missing)
    }

    pub fn gpu_is_loaded(&self, model: &Path) -> bool {
        self.gpu.lock().is_ok_and(|mut slot| slot.worker.as_mut().is_some_and(|worker| worker.alive() && worker.model.as_deref() == Some(model)))
    }

    // The model on the card (it stays there for the next audio).
    pub fn gpu_prepare(self: &Arc<Self>, model: &Path) -> Result<(), GpuFailure> {
        {
            let mut slot = self.gpu.lock().map_err(|_| GpuFailure::Missing)?;
            Self::worker(&mut slot)?.load(model)?;
            slot.last_used = Some(Instant::now());
        }
        self.watch();
        Ok(())
    }

    // On the card. On a failure glup-voz is closed; `params` stay whole for the processor to listen.
    pub fn gpu_listen(self: &Arc<Self>, params: &mut ListenParams, scratch: &Path) -> Result<Listened, GpuFailure> {
        let result = {
            let mut slot   = self.gpu.lock().map_err(|_| GpuFailure::Missing)?;
            let worker     = Self::worker(&mut slot)?;
            worker.load(params.model)?;
            let listened   = worker.listen(GpuListenParams {
                samples     : params.samples,
                language    : params.language,
                cancel      : &params.cancel,
                scratch,
                on_progress : &mut *params.on_progress,
            });
            slot.last_used = Some(Instant::now());
            listened
        };
        self.watch();

        match result {
            Ok(GpuListened::Segments(segments)) => Ok(Listened::Segments(segments)),
            Ok(GpuListened::Cancelled)          => Ok(Listened::Cancelled),
            Err(failure)                        => {
                self.drop_gpu();
                Err(failure)
            }
        }
    }

    // Closes glup-voz (after a failure, or when the model is let go).
    pub fn drop_gpu(&self) {
        if let Ok(mut slot) = self.gpu.lock() {
            slot.worker    = None;
            slot.last_used = None;
        }
    }

    pub fn listen(self: &Arc<Self>, params: ListenParams) -> Result<Listened, String> {
        let context   = self.context(params.model)?;
        let mut state = context.create_state().map_err(|_| LISTEN_ERROR.to_string())?;

        let mut full = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
        full.set_n_threads(threads());
        full.set_language(params.language.or(Some("auto")));
        full.set_translate(false);
        full.set_print_progress(false);
        full.set_print_realtime(false);
        full.set_print_special(false);
        full.set_print_timestamps(false);
        full.set_suppress_blank(true);
        full.set_progress_callback_safe(params.on_progress);

        // whisper-rs 0.16's set_abort_callback_safe casts its pointer to the wrong type (it reads the
        // closure's box as the closure), so the flag goes straight to C here. `params.cancel` outlives
        // the call below.
        unsafe {
            full.set_abort_callback(Some(should_abort));
            full.set_abort_callback_user_data(Arc::as_ptr(&params.cancel) as *mut c_void);
        }

        let result = state.full(full, params.samples);
        if params.cancel.load(Ordering::SeqCst) {
            return Ok(Listened::Cancelled);
        }
        result.map_err(|error| {
            eprintln!("[transcribe] whisper: {error}");
            LISTEN_ERROR.to_string()
        })?;

        let segments = state
            .as_iter()
            .filter_map(|segment| {
                let text = segment.to_str_lossy().ok()?.into_owned();
                // Whisper counts in hundredths of a second.
                Some(Segment { start: segment.start_timestamp().max(0) as u64 * 10, end: segment.end_timestamp().max(0) as u64 * 10, text })
            })
            .collect();

        if let Ok(mut loaded) = self.loaded.lock() {
            if let Some(current) = loaded.as_mut() {
                current.last_used = Instant::now();
            }
        }
        Ok(Listened::Segments(segments))
    }
}
