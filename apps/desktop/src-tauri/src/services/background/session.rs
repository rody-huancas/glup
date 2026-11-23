use std::{
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    thread,
    time::{Duration, Instant},
};

use ort::{
    ep::{
        directml::{DirectML, PerformancePreference},
        CPU,
    },
    environment::Environment,
    session::Session,
    value::Tensor,
};

use crate::services::background::mask::MODEL_SIDE;

// Loaded once and reused; let go of (memory back to the PC) after this long without use.
pub const IDLE_LIMIT: Duration = Duration::from_secs(5 * 60);
const IDLE_CHECK: Duration     = Duration::from_secs(30);

pub const LOAD_ERROR: &str = "No pude preparar lo que aprendí. Bórralo en Ajustes y vuelve a descargarlo.";
pub const RUN_ERROR: &str  = "No pude separar el fondo de esta imagen";

const ENVIRONMENT_NAME: &str = "glup";

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Device {
    // The graphics card through DirectML (Windows).
    Gpu,
    Cpu,
}

struct Loaded {
    session: Session,
    device: Device,
    path: PathBuf,
    last_used: Instant,
}

// ONNX Runtime allows one environment per process.
static ENVIRONMENT: Mutex<Option<Environment>> = Mutex::new(None);

#[derive(Default)]
struct Inner {
    loaded: Mutex<Option<Loaded>>,
    // DirectML failed once in this process: the CPU from then on.
    gpu_failed: AtomicBool,
    watching: AtomicBool,
}

// Shared state (lib.rs .manage): the model session, one image at a time.
#[derive(Clone, Default)]
pub struct BackgroundSession(Arc<Inner>);

pub fn is_idle(last_used: Instant, now: Instant, limit: Duration) -> bool {
    now.saturating_duration_since(last_used) >= limit
}

fn log(line: &str) {
    #[cfg(debug_assertions)]
    eprintln!("[glup:fondo] {line}");
    #[cfg(not(debug_assertions))]
    let _ = line;
}

fn environment() -> Result<Environment, String> {
    let mut slot = ENVIRONMENT.lock().map_err(|_| LOAD_ERROR.to_string())?;

    if let Some(environment) = slot.as_ref() {
        return Ok(environment.clone());
    }

    let environment = ort::init().with_name(ENVIRONMENT_NAME).build().map_err(|error| {
        log(&format!("no pude crear el entorno: {error}"));
        LOAD_ERROR.to_string()
    })?;

    *slot = Some(environment.clone());
    Ok(environment)
}

fn build(environment: &Environment, path: &Path, device: Device) -> Result<Session, String> {
    let fail = |error: String| {
        log(&format!("no pude cargar el modelo en {device:?}: {error}"));
        LOAD_ERROR.to_string()
    };

    let builder = Session::builder(environment).map_err(|error| fail(error.to_string()))?;

    let mut builder = match device {
        // DirectML needs sequential execution and no memory pattern.
        Device::Gpu => builder
            .with_parallel_execution(false)
            .and_then(|builder| builder.with_memory_pattern(false))
            // Without a preference DirectML may pick Windows' software adapter, slower than the CPU.
            .and_then(|builder| builder.with_execution_providers([DirectML::default().with_performance_preference(PerformancePreference::HighPerformance).build().error_on_failure()]))
            .map_err(|error| fail(error.to_string()))?,
        Device::Cpu => builder.with_execution_providers([CPU::default().build()]).map_err(|error| fail(error.to_string()))?,
    };

    builder.commit_from_file(path).map_err(|error| fail(error.to_string()))
}

pub fn infer(session: &mut Session, input: &[f32]) -> Result<Vec<f32>, String> {
    let side   = MODEL_SIDE as usize;
    let tensor = Tensor::from_array(([1usize, 3, side, side], input.to_vec())).map_err(|_| RUN_ERROR.to_string())?;
    let output = session.run(ort::inputs![tensor]).map_err(|error| {
        log(&format!("falló la inferencia: {error}"));
        RUN_ERROR.to_string()
    })?;

    let (_, values) = output[0].try_extract_tensor::<f32>().map_err(|_| RUN_ERROR.to_string())?;
    Ok(values.to_vec())
}

// A session on one device only, with no fallback: to measure the CPU and the graphics card apart.
#[cfg(test)]
pub fn open(path: &Path, device: Device) -> Result<Session, String> {
    build(&environment()?, path, device)
}

impl BackgroundSession {
    fn load(&self, path: &Path) -> Result<Loaded, String> {
        let environment = environment()?;

        if !self.0.gpu_failed.load(Ordering::SeqCst) {
            match build(&environment, path, Device::Gpu) {
                Ok(session) => return Ok(Loaded { session, device: Device::Gpu, path: path.to_path_buf(), last_used: Instant::now() }),
                Err(_)      => self.0.gpu_failed.store(true, Ordering::SeqCst),
            }
        }

        let session = build(&environment, path, Device::Cpu)?;
        Ok(Loaded { session, device: Device::Cpu, path: path.to_path_buf(), last_used: Instant::now() })
    }

    // Whether the model at this path is already in memory (so there is nothing to prepare).
    pub fn is_loaded(&self, path: &Path) -> bool {
        self.0.loaded.lock().map(|slot| slot.as_ref().is_some_and(|loaded| loaded.path == path)).unwrap_or(false)
    }

    // Loads the model before the first image, so that wait is shown as its own stage.
    pub fn prepare(&self, path: &Path) -> Result<(), String> {
        let mut slot = self.0.loaded.lock().map_err(|_| RUN_ERROR.to_string())?;
        if slot.as_ref().is_some_and(|loaded| loaded.path == path) {
            return Ok(());
        }

        *slot = Some(self.load(path)?);
        log(&format!("modelo cargado en {:?}", slot.as_ref().map(|loaded| loaded.device)));
        drop(slot);
        self.watch();
        Ok(())
    }

    // The 1024x1024 logits for one preprocessed image. If the graphics card fails while running
    // (not enough memory, a driver), the same image is tried again on the CPU.
    pub fn run(&self, path: &Path, input: &[f32]) -> Result<Vec<f32>, String> {
        let mut slot = self.0.loaded.lock().map_err(|_| RUN_ERROR.to_string())?;

        if slot.as_ref().is_some_and(|loaded| loaded.path != path) {
            *slot = None;
        }

        if slot.is_none() {
            *slot = Some(self.load(path)?);
            log(&format!("modelo cargado en {:?}", slot.as_ref().map(|loaded| loaded.device)));
            self.watch();
        }

        let Some(loaded) = slot.as_mut() else {
            return Err(RUN_ERROR.to_string());
        };

        loaded.last_used = Instant::now();

        let result = infer(&mut loaded.session, input);
        if result.is_ok() || loaded.device == Device::Cpu {
            return result;
        }

        log("la tarjeta gráfica falló; sigo con el procesador");
        self.0.gpu_failed.store(true, Ordering::SeqCst);

        let environment = environment()?;
        let session     = build(&environment, path, Device::Cpu)?;
        let loaded      = slot.insert(Loaded { session, device: Device::Cpu, path: path.to_path_buf(), last_used: Instant::now() });

        infer(&mut loaded.session, input)
    }

    // Lets go of the session now (the model was deleted, or it was idle too long).
    pub fn release(&self) {
        if let Ok(mut slot) = self.0.loaded.lock() {
            *slot = None;
        }
    }

    fn release_if_idle(&self) -> bool {
        let Ok(mut slot) = self.0.loaded.lock() else {
            return false;
        };

        let idle = slot.as_ref().is_some_and(|loaded| is_idle(loaded.last_used, Instant::now(), IDLE_LIMIT));
        if idle {
            *slot = None;
            log("modelo liberado por falta de uso");
        }

        // Decided under the lock, so a session loaded right now always gets a new watcher.
        let done = slot.is_none();
        if done {
            self.0.watching.store(false, Ordering::SeqCst);
        }

        done
    }

    // One watcher thread while a session is loaded; it ends once the session is let go.
    fn watch(&self) {
        if self.0.watching.swap(true, Ordering::SeqCst) {
            return;
        }

        let session = self.clone();
        thread::spawn(move || loop {
            thread::sleep(IDLE_CHECK);

            if session.release_if_idle() {
                return;
            }
        });
    }
}
