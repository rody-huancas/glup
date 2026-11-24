// "Pasar audio a texto": Whisper on the graphics card when it can (glup-voz, Vulkan) and on the
// processor otherwise; the audio read by FFmpeg (the LGPL one of videos, downloaded together with the
// model when it is not there yet).
pub mod audio;
pub mod compose;
pub mod device;
pub mod engine;
pub mod gpu;
pub mod model;

#[cfg(test)]
mod tests;

use std::{
    cell::Cell,
    fs,
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
    time::Instant,
};

use chrono::Local;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

use crate::services::{
    actions::{ActionControl, ActionProgress, Via},
    background::{
        download::{self, fetch_http, DownloadEnd, DownloadParams},
        model::{delete_in, model_path, models_folder, status_in, ModelStatus},
    },
    destination::{self, Destination},
    history::{self, NewEntryParams},
    naming::{output_path, OutputKind, OutputNameParams},
    progress::{self, DownloadSpan, Stage},
    settings,
    tasks::TaskSummary,
    text::compose::to_windows_lines,
    transcribe::{
        audio::{decode, seconds_of},
        compose::{compose, history_detail, srt, FileSegments},
        device::{ChooseParams, Engine, GpuMode},
        engine::{Listened, ListenParams, TranscribeSession},
        gpu::GpuFailure,
        model::{estimate_seconds, Level},
    },
    video::{
        self,
        tool::{self as video_tool, FFMPEG_DATA_SIZE, FFMPEG_DOWNLOAD, MISSING_ERROR},
    },
};

pub const TRANSCRIBE_ACTION: &str   = "transcribe";
pub const DOWNLOAD_ACTION_ID: &str  = "download-transcribe-model";
pub const SUBTITLES_EXTENSION: &str = "srt";
// Several files share one .srt: subtitulos-AAAA-MM-DD-HHmm.srt.
pub const SEVERAL_SUBTITLES: &str   = "subtitulos";

pub const NOT_LEARNED: &str       = "Primero tengo que aprender a escuchar audios";
pub const LEARNED_MESSAGE: &str   = "Listo, ya sé pasar audios a texto";
pub const CANCELLED_MESSAGE: &str = "Dejé la descarga a medias. La próxima vez sigo desde ahí.";
pub const SAVE_ERROR: &str        = "No pude guardar los subtítulos";

// Reading the sound is a small part of the work; listening, the rest.
const DECODE_SHARE: f64 = 0.05;

// Where the samples go for glup-voz (next to the models; removed after each audio).
const GPU_SAMPLES: &str = "voz-muestras.f32";

// --- Graphics card or processor ---

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscribeEngine {
    pub mode   : GpuMode,
    pub engine : Engine,
}

// A card (or the probe) that failed is remembered with its driver: the processor until it changes.
fn remember_failure(app: &AppHandle, key: String) {
    let current = settings::read(app).settings;
    if current.gpu_blocked.contains(&key) {
        return;
    }
    let blocked = device::with_blocked(current.gpu_blocked.clone(), key);
    let _       = settings::update(app, settings::Settings { gpu_blocked: blocked, ..current });
}

// Which one it uses now. The cards are looked for once while Glup runs, in glup-voz: a driver that
// breaks while Vulkan starts closes that program, never Glup.
pub fn engine_for(app: &AppHandle, session: &TranscribeSession) -> TranscribeEngine {
    let mode = settings::read(app).settings.transcribe_gpu;
    if mode == GpuMode::Never {
        return TranscribeEngine { mode, engine: Engine::Chosen };
    }

    let drivers = device::drivers();
    let devices = match session.gpu_devices() {
        Ok(devices)                     => Some(devices),
        Err(GpuFailure::Missing)        => None,
        Err(GpuFailure::Failed(reason)) => {
            eprintln!("[transcribe] la tarjeta de video no respondió al buscarla: {reason}");
            remember_failure(app, device::probe_key(&drivers));
            None
        }
    };
    let blocked = settings::read(app).settings.gpu_blocked;
    TranscribeEngine { mode, engine: device::choose(&ChooseParams { mode, devices: devices.as_deref(), blocked: &blocked, drivers: &drivers }) }
}

// The card failed (loading the model or in the middle of an audio): it is remembered as "no usar"
// with this driver, and the work goes on with the processor.
fn card_failed(app: &AppHandle, engine: &Engine, failure: GpuFailure) {
    eprintln!("[transcribe] la tarjeta de video falló, sigo con el procesador: {failure:?}");
    if let (Engine::Gpu { name }, GpuFailure::Failed(_)) = (engine, failure) {
        remember_failure(app, device::card_key(name, &device::drivers()));
    }
}

fn via_of(on_card: &AtomicBool) -> Via {
    if on_card.load(Ordering::SeqCst) { Via::Gpu } else { Via::Cpu }
}

// --- What Glup has learned ---

// The level's model, plus FFmpeg when it is not here yet (one download for both).
pub fn status(app: &AppHandle, level: Level) -> Result<ModelStatus, String> {
    let model  = status_in(&models_folder(app)?, level.model());
    let ffmpeg = video_tool::ffmpeg_path(app).is_some();

    Ok(ModelStatus {
        installed : model.installed && ffmpeg,
        size      : model.size + if ffmpeg || model.installed { 0 } else { FFMPEG_DATA_SIZE },
        partial   : model.partial,
    })
}

fn emit(app: &AppHandle, progress: ActionProgress) {
    progress::emit(app, progress);
}

// What is still missing, in bytes: FFmpeg (if videos never needed it) and the model.
#[derive(Debug, PartialEq, Eq)]
pub struct Missing {
    pub ffmpeg : u64,
    pub model  : u64,
}

pub fn missing_bytes(ffmpeg_installed: bool, model_installed: bool, level: Level) -> Missing {
    Missing {
        ffmpeg : if ffmpeg_installed { 0 } else { FFMPEG_DOWNLOAD.size },
        model  : if model_installed { 0 } else { level.model().size },
    }
}

// FFmpeg first if missing, then the model, resumed and checked: one bar for both ("de 704 MB"), so it
// never looks like the download starts over.
pub fn download_model(app: &AppHandle, task: &Option<String>, level: Level) -> Result<TaskSummary, String> {
    let control = app.state::<ActionControl>();
    control.begin(task);

    let model   = level.model();
    let folder  = models_folder(app)?;
    let missing = missing_bytes(video_tool::ffmpeg_path(app).is_some(), model_path(&folder, model).exists(), level);
    let total   = missing.ffmpeg + missing.model;

    if missing.ffmpeg > 0 {
        let summary = video::download_tool_as(app, &DownloadSpan { task: task.clone(), before: 0, total })?;
        if video_tool::ffmpeg_path(app).is_none() {
            return Ok(summary);
        }
    }

    let span = DownloadSpan { task: task.clone(), before: missing.ffmpeg, total };
    let end  = download::download(DownloadParams {
        folder       : &folder,
        model,
        cancel       : &control.cancelled,
        on_progress  : &|done| emit(app, span.downloading(done)),
        on_verifying : &|| emit(app, span.verifying()),
        fetch        : &|start| fetch_http(model.url, start),
    })?;

    Ok(match end {
        DownloadEnd::Installed => TaskSummary::success(LEARNED_MESSAGE.to_string()),
        DownloadEnd::Cancelled => TaskSummary::calm(CANCELLED_MESSAGE.to_string()),
    })
}

// "Borrar" in Ajustes: that level's model (FFmpeg stays, videos use it too).
pub fn delete_model(app: &AppHandle, level: Level) -> Result<(), String> {
    app.state::<Arc<TranscribeSession>>().release();
    delete_in(&models_folder(app)?, level.model())
}

// --- Listening ---

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscribeOptions {
    pub level    : Level,
    // "es", "en"… or None to detect it.
    pub language : Option<LanguageCode>,
}

// The languages Glup offers (Whisper knows them all by these codes).
#[derive(Clone, Copy, Debug, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum LanguageCode {
    Es,
    En,
    Pt,
    Fr,
    It,
    De,
    Ca,
    Qu,
}

impl LanguageCode {
    pub fn code(self) -> &'static str {
        match self {
            LanguageCode::Es => "es",
            LanguageCode::En => "en",
            LanguageCode::Pt => "pt",
            LanguageCode::Fr => "fr",
            LanguageCode::It => "it",
            LanguageCode::De => "de",
            LanguageCode::Ca => "ca",
            LanguageCode::Qu => "qu",
        }
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscribeRequest {
    pub paths   : Vec<String>,
    pub options : TranscribeOptions,
    pub task_id : Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscribeReport {
    pub text      : String,
    pub subtitles : String,
    // Seconds of audio listened to (all files).
    pub seconds   : u64,
    pub cancelled : bool,
    // The history line, to point it at the .txt if it is saved.
    pub entry_id  : Option<String>,
}

fn file_name(path: &Path) -> String {
    path.file_name().map(|value| value.to_string_lossy().into_owned()).unwrap_or_default()
}

// Every file in turn: read its sound, listen to it, then put it all together. Cancelar stops Whisper
// right away; what was finished before stays.
pub fn transcribe(app: &AppHandle, request: TranscribeRequest) -> Result<TranscribeReport, String> {
    let ffmpeg  = video_tool::ffmpeg_path(app).ok_or_else(|| MISSING_ERROR.to_string())?;
    let model   = model_path(&models_folder(app)?, request.options.level.model());
    if !model.exists() {
        return Err(NOT_LEARNED.to_string());
    }

    let control = app.state::<ActionControl>();
    control.begin(&request.task_id);
    let cancel  = Arc::new(AtomicBool::new(false));
    let session = app.state::<Arc<TranscribeSession>>().inner().clone();
    let total   = request.paths.len();
    let clock   = StageClock::start();

    let mut files     = Vec::new();
    let mut seconds   = 0.0;
    let mut cancelled = false;

    // Loading Whisper takes seconds and cannot be interrupted; another audio a moment ago reuses it.
    // On the card first, when there is one; if it fails, on the processor.
    let engine    = engine_for(app, &session).engine;
    let on_card   = Arc::new(AtomicBool::new(matches!(engine, Engine::Gpu { .. })));
    let scratch   = models_folder(app)?.join(GPU_SAMPLES);
    let preparing = |via: Via| emit(app, ActionProgress { via: Some(via), ..ActionProgress::at(&request.task_id, Stage::Preparing) });

    if on_card.load(Ordering::SeqCst) && !session.gpu_is_loaded(&model) {
        preparing(Via::Gpu);
        if let Err(failure) = session.gpu_prepare(&model) {
            card_failed(app, &engine, failure);
            on_card.store(false, Ordering::SeqCst);
        }
        clock.lap("cargar el modelo en la tarjeta");
    }
    if !on_card.load(Ordering::SeqCst) && !session.is_loaded(&model) {
        preparing(Via::Cpu);
        session.prepare(&model)?;
        clock.lap("cargar el modelo");
    }
    if control.cancelled.load(Ordering::SeqCst) {
        return Ok(TranscribeReport { text: String::new(), subtitles: String::new(), seconds: 0, cancelled: true, entry_id: None });
    }

    for (index, path) in request.paths.iter().map(PathBuf::from).enumerate() {
        let name   = file_name(&path);
        let report = |done: f64| {
            let percent = (done * 100.0).round() as u32;
            let detail  = if total > 1 { format!("{name} · {percent} %") } else { format!("{percent} %") };
            emit(app, ActionProgress {
                task_id : request.task_id.clone(),
                current : ((index as f64 + done) / total as f64 * 1000.0) as usize,
                total   : 1000,
                name    : name.clone(),
                active  : 1,
                detail  : Some(detail),
                stage   : Stage::Working,
                via     : Some(via_of(&on_card)),
            });
        };

        report(0.0);
        let Some(samples) = decode(&ffmpeg, &path, &control.cancelled)? else {
            cancelled = true;
            break;
        };
        seconds += seconds_of(&samples);
        report(DECODE_SHARE);
        clock.lap("leer el sonido");

        // Whisper's own flag follows the shared one (Cancelar on the task) while it listens.
        let watcher       = watch_cancel(app.clone(), cancel.clone());
        let progress_app  = app.clone();
        let progress_task = request.task_id.clone();
        let progress_name = name.clone();
        let progress_card = on_card.clone();
        let mut params    = ListenParams {
            model       : &model,
            samples     : &samples,
            language    : request.options.language.map(LanguageCode::code),
            cancel      : cancel.clone(),
            on_progress : Box::new(move |percent| {
                let done  = DECODE_SHARE + (1.0 - DECODE_SHARE) * percent.clamp(0, 100) as f64 / 100.0;
                let shown = (done * 100.0).round() as u32;
                emit(&progress_app, ActionProgress {
                    task_id : progress_task.clone(),
                    current : ((index as f64 + done) / total as f64 * 1000.0) as usize,
                    total   : 1000,
                    name    : progress_name.clone(),
                    active  : 1,
                    detail  : Some(if total > 1 { format!("{progress_name} · {shown} %") } else { format!("{shown} %") }),
                    stage   : Stage::Working,
                    via     : Some(via_of(&progress_card)),
                });
            }),
        };

        // On the card; if it fails halfway, this same audio again on the processor (what was done
        // before stays done).
        let listened = if on_card.load(Ordering::SeqCst) {
            match session.gpu_listen(&mut params, &scratch) {
                Ok(listened) => Ok(listened),
                Err(failure) => {
                    card_failed(app, &engine, failure);
                    on_card.store(false, Ordering::SeqCst);
                    if !session.is_loaded(&model) {
                        preparing(Via::Cpu);
                        session.prepare(&model)?;
                    }
                    report(DECODE_SHARE);
                    session.listen(params)
                }
            }
        } else {
            session.listen(params)
        };
        watcher.store(true, Ordering::SeqCst);
        clock.lap(if on_card.load(Ordering::SeqCst) { "escuchar con la tarjeta" } else { "escuchar" });

        match listened? {
            Listened::Segments(segments) => files.push(FileSegments { name, segments }),
            Listened::Cancelled          => {
                cancelled = true;
                break;
            }
        }
    }

    emit(app, ActionProgress::at(&request.task_id, Stage::Saving));

    let text      = compose(&files);
    let subtitles = srt(&files);
    let entry_id  = request.paths.first().filter(|_| !text.is_empty()).map(|first| {
        let entry = history::new_entry(NewEntryParams { output: Path::new(first), kind: "audio", action: TRANSCRIBE_ACTION, detail: history_detail(seconds) });
        let id    = entry.id.clone();
        let _     = history::append(app, vec![entry]);
        id
    });

    clock.lap("armar el texto y el historial");
    Ok(TranscribeReport { text, subtitles, seconds: seconds.round() as u64, cancelled, entry_id })
}

// How long each stage took, in the log (to see where the time goes).
struct StageClock(Cell<Instant>);

impl StageClock {
    fn start() -> Self {
        Self(Cell::new(Instant::now()))
    }

    fn lap(&self, stage: &str) {
        eprintln!("[transcribe] {stage}: {} ms", self.0.get().elapsed().as_millis());
        self.0.set(Instant::now());
    }
}

// Copies the task's cancel flag into Whisper's while it listens; returns a flag to stop watching.
fn watch_cancel(app: AppHandle, cancel: Arc<AtomicBool>) -> Arc<AtomicBool> {
    let done = Arc::new(AtomicBool::new(false));
    let stop = done.clone();

    std::thread::spawn(move || {
        while !stop.load(Ordering::SeqCst) {
            if app.state::<ActionControl>().cancelled.load(Ordering::SeqCst) {
                cancel.store(true, Ordering::SeqCst);
                break;
            }
            std::thread::sleep(std::time::Duration::from_millis(100));
        }
    });

    done
}

// "Esto tomará unos 2 minutos": the seconds of audio (from the file info) and the level.
pub fn estimate(level: Level, audio_seconds: f64) -> u64 {
    estimate_seconds(level, audio_seconds)
}

// --- Subtitles ---

pub struct SubtitleNameParams<'a> {
    pub folder  : &'a Path,
    pub sources : &'a [PathBuf],
    pub stamp   : &'a str,
    pub exists  : &'a dyn Fn(&Path) -> bool,
}

// clase.srt next to the original (with « (2)» if taken); several files: subtitulos-<fecha>.srt.
pub fn subtitles_path(params: SubtitleNameParams) -> Option<PathBuf> {
    let first = params.sources.first()?;
    let name  = format!("{SEVERAL_SUBTITLES}-{}", params.stamp);
    let kind  = if params.sources.len() == 1 { OutputKind::Converted { extension: SUBTITLES_EXTENSION } } else { OutputKind::Named { name: &name, extension: SUBTITLES_EXTENSION } };

    Some(output_path(&OutputNameParams { folder: params.folder, source: first, kind }, params.exists))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveSubtitlesRequest {
    pub paths       : Vec<String>,
    pub subtitles   : String,
    pub destination : Option<Destination>,
}

// "Guardar subtítulos (.srt)": in the destination chosen, never over another file.
pub fn save_subtitles(request: SaveSubtitlesRequest) -> Result<String, String> {
    let sources: Vec<PathBuf> = request.paths.iter().map(PathBuf::from).collect();
    let first                 = sources.first().ok_or(SAVE_ERROR)?;
    let folder                = destination::prepare(first, &request.destination.unwrap_or_default())?;
    let stamp                 = Local::now().format("%Y-%m-%d-%H%M").to_string();
    let output                = subtitles_path(SubtitleNameParams { folder: &folder, sources: &sources, stamp: &stamp, exists: &|path| path.exists() }).ok_or(SAVE_ERROR)?;

    fs::write(&output, to_windows_lines(&request.subtitles)).map_err(|_| SAVE_ERROR.to_string())?;
    Ok(output.to_string_lossy().into_owned())
}
