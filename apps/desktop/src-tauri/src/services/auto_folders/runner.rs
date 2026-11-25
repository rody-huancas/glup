// Doing a rule's work on a few files that arrived: the same actions as the panel (with a Cancelar of
// their own and fewer threads), sorting, or listening to audios. Then, only for the files whose result
// came out well and if the rule says so, the original goes to the recycle bin, with «Deshacer».
use std::{
    fs,
    path::{Path, PathBuf},
    sync::atomic::AtomicBool,
};

use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use crate::services::{
    actions::{self, ActionOptions, ActionRequest, RunWithParams},
    auto_folders::rules::{tool, Rule, SORT_TOOL, TRANSCRIBE_TOOL},
    background::model as background_model,
    destination,
    folder_sort::{self, plan::SortMode, SortFilesParams},
    history::{self, FilelessEntryParams, HistoryEntry},
    image::heif,
    naming::{output_path, OutputKind, OutputNameParams},
    transcribe::{self, model::Level, LanguageCode, TranscribeOptions, TranscribeRequest},
    video::tool as video_tool,
};

pub const TRASH_KIND: &str   = "auto-trash";
pub const TRASH_ACTION: &str = "auto-trash";

pub const RESTORE_ERROR: &str  = "No pude sacarlo de la papelera";
pub const GONE_ERROR: &str     = "Ya no está en la papelera";
pub const OCCUPIED_ERROR: &str = "Ya hay un archivo con ese nombre en su lugar";
pub const RESTORED: &str       = "Volvió a su lugar";

// Files at once inside an action: Carpetas automáticas works in the background, without slowing the PC.
const THREADS: usize = 2;

const TEXT_EXTENSION: &str = "txt";

// What happened with a few files of one rule.
#[derive(Debug, Default)]
pub struct Ran {
    // Each original that came out well, with what it produced.
    pub done   : Vec<(PathBuf, Vec<PathBuf>)>,
    pub failed : usize,
    // Not done because the work was stopped: they wait again.
    pub retry  : Vec<PathBuf>,
}

// The download the rule needs and is not here yet (a learnable of the panel), if any.
pub fn missing(app: &AppHandle, rule: &Rule, paths: &[PathBuf]) -> Option<String> {
    let installed = |status: Result<background_model::ModelStatus, String>| status.is_ok_and(|status| status.installed);
    match rule.action.tool.as_str() {
        "remove-background" => (!installed(background_model::status(app))).then(|| "background".to_string()),
        "compress-video"    => video_tool::ffmpeg_path(app).is_none().then(|| "video".to_string()),
        TRANSCRIBE_TOOL     => {
            let level = transcribe_options(rule).level;
            (!installed(transcribe::status(app, level))).then(|| if level == Level::Precise { "transcribe-precise" } else { "transcribe-fast" }.to_string())
        }
        "iphone-to-jpg" | "convert-image" | "compress-image" => {
            let support = heif::support();
            let blocked = |path: &PathBuf| heif::is_heif(path) && !support.ffmpeg && !(support.heic && support.avif);
            paths.iter().any(blocked).then(|| "photos".to_string())
        }
        _ => None,
    }
}

fn transcribe_options(rule: &Rule) -> TranscribeOptions {
    serde_json::from_value(rule.action.options.clone()).unwrap_or(TranscribeOptions { level: Level::Fast, language: Some(LanguageCode::Es) })
}

#[derive(Deserialize)]
struct SortOptions {
    #[serde(default = "by_type")]
    mode: SortMode,
}

fn by_type() -> SortMode {
    SortMode::Type
}

pub struct RunParams<'a> {
    pub app    : &'a AppHandle,
    pub rule   : &'a Rule,
    pub paths  : &'a [PathBuf],
    pub cancel : &'a AtomicBool,
}

pub fn run(params: RunParams) -> Ran {
    match params.rule.action.tool.as_str() {
        SORT_TOOL       => sort(params),
        TRANSCRIBE_TOOL => listen(params),
        _               => act(params),
    }
}

fn sort(params: RunParams) -> Ran {
    let RunParams { app, rule, paths, cancel } = params;
    let mode   = serde_json::from_value::<SortOptions>(rule.action.options.clone()).map_or(SortMode::Type, |options| options.mode);
    let folder = PathBuf::from(&rule.folder);
    let moved  = folder_sort::sort_files(SortFilesParams { app, folder: &folder, mode, paths, cancel, rule: &rule.name });
    let done: Vec<(PathBuf, Vec<PathBuf>)> = moved.into_iter().map(|record| (record.from, vec![record.to])).collect();
    Ran { failed: paths.len() - done.len(), done, retry: Vec::new() }
}

// «Pasar audio a texto»: each audio heard and its text saved as a .txt where the rule says.
fn listen(params: RunParams) -> Ran {
    let RunParams { app, rule, paths, .. } = params;
    let options = transcribe_options(rule);
    let mut ran = Ran::default();

    for (index, path) in paths.iter().enumerate() {
        let request = TranscribeRequest { paths: vec![path.to_string_lossy().into_owned()], options, task_id: None };
        let report  = match transcribe::transcribe(app, request) {
            Ok(report) if report.cancelled => {
                ran.retry.extend(paths[index..].iter().cloned());
                break;
            }
            Ok(report) if !report.text.is_empty() => report,
            _                                      => {
                ran.failed += 1;
                continue;
            }
        };
        let saved = destination::prepare(path, &rule.destination).and_then(|folder| {
            let output = output_path(&OutputNameParams { folder: &folder, source: path, kind: OutputKind::Converted { extension: TEXT_EXTENSION } }, |path| path.exists());
            fs::write(&output, &report.text).map(|_| output).map_err(|_| transcribe::SAVE_ERROR.to_string())
        });
        match saved {
            Ok(output) => {
                if let Some(id) = &report.entry_id {
                    let _ = history::point_to(app, id, &output);
                    tag(app, id, &rule.name);
                }
                ran.done.push((path.clone(), vec![output]));
            }
            Err(_) => ran.failed += 1,
        }
    }
    ran
}

fn tag(app: &AppHandle, id: &str, rule: &str) {
    let _ = history::update(app, |entries| entries.into_iter().map(|entry| if entry.id == id { HistoryEntry { rule: Some(rule.to_string()), ..entry } } else { entry }).collect());
}

// The options of the rule plus where to save, as the panel sends them.
pub fn options_of(rule: &Rule) -> Option<ActionOptions> {
    let mut options = match &rule.action.options {
        serde_json::Value::Object(options) => options.clone(),
        _                                  => serde_json::Map::new(),
    };
    options.insert("destination".to_string(), serde_json::to_value(&rule.destination).ok()?);
    serde_json::from_value(serde_json::Value::Object(options)).ok()
}

fn act(params: RunParams) -> Ran {
    let RunParams { app, rule, paths, cancel } = params;
    let Some(action) = tool(&rule.action.tool).and_then(|tool| tool.action) else {
        return Ran { failed: paths.len(), ..Ran::default() };
    };
    let request = ActionRequest { action_id: action.to_string(), paths: paths.iter().map(|path| path.to_string_lossy().into_owned()).collect(), options: options_of(rule), task_id: None };
    let Ok(report) = actions::run_with(RunWithParams { app, request, cancel, rule: Some(rule.name.clone()), threads: THREADS }) else {
        return Ran { failed: paths.len(), ..Ran::default() };
    };

    let mut ran = Ran::default();
    for outcome in &report.outcomes {
        let source = PathBuf::from(&outcome.source);
        match &outcome.output {
            Some(output) if came_out_well(outcome.output.as_deref(), outcome.error.as_deref(), outcome.unchanged.as_deref()) => ran.done.push((source, vec![PathBuf::from(output)])),
            _ if outcome.error.is_some() => ran.failed += 1,
            _                            => {}
        }
    }
    if report.cancelled {
        ran.retry = paths.iter().filter(|path| !report.outcomes.iter().any(|outcome| Path::new(&outcome.source) == path.as_path())).cloned().collect();
    }
    ran
}

// Saved, with no error, and not «Ya pesaba poco» or «Ya está en este formato» (then nothing new exists).
pub fn came_out_well(output: Option<&str>, error: Option<&str>, unchanged: Option<&str>) -> bool {
    output.is_some() && error.is_none() && unchanged.is_none()
}

// Its result is really on disk and not empty: only then the original may go to the bin.
pub fn result_is_there(outputs: &[PathBuf]) -> bool {
    !outputs.is_empty() && outputs.iter().all(|output| fs::metadata(output).is_ok_and(|metadata| metadata.len() > 0))
}

pub struct TrashDoneParams<'a> {
    pub done  : &'a [(PathBuf, Vec<PathBuf>)],
    // Sends one original to the bin (true: it went).
    pub trash : &'a mut dyn FnMut(&Path) -> bool,
}

// The originals of what came out well, to the bin; how many went.
pub fn trash_done(params: TrashDoneParams) -> usize {
    params.done.iter().filter(|(source, outputs)| result_is_there(outputs) && source.is_file() && (params.trash)(source)).count()
}

// Where the original was and when it left, to take it back out of the bin.
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrashUndo {
    pub path : PathBuf,
    pub at   : i64,
}

pub struct TrashParams<'a> {
    pub app  : &'a AppHandle,
    pub path : &'a Path,
    pub rule : &'a str,
    pub at   : i64,
}

// Only after its result came out well (the caller checks it); never deleted for good.
pub fn trash_original(params: TrashParams) -> bool {
    let TrashParams { app, path, rule, at } = params;
    if trash::delete(path).is_err() || path.exists() {
        return false;
    }
    let name  = path.file_name().map(|name| name.to_string_lossy().into_owned()).unwrap_or_default();
    let undo  = serde_json::to_string(&TrashUndo { path: path.to_path_buf(), at }).ok();
    let entry = history::fileless_entry(FilelessEntryParams { name: &name, kind: TRASH_KIND, action: TRASH_ACTION, detail: "Mandado a la papelera después de hacerlo bien".to_string() });
    let _     = history::append(app, vec![HistoryEntry { undo, rule: Some(rule.to_string()), ..entry }]);
    true
}

fn same_path(a: &Path, b: &Path) -> bool {
    a.to_string_lossy().to_lowercase() == b.to_string_lossy().to_lowercase()
}

// «Deshacer» in the Historial: the original back to its place, if its place is still free.
#[cfg(any(windows, all(unix, not(target_os = "macos"))))]
pub fn restore(undo: &TrashUndo) -> Result<(), String> {
    if undo.path.exists() {
        return Err(OCCUPIED_ERROR.to_string());
    }
    let items = trash::os_limited::list().map_err(|_| RESTORE_ERROR.to_string())?;
    let item  = items
        .into_iter()
        .filter(|item| same_path(&item.original_path(), &undo.path))
        .min_by_key(|item| (item.time_deleted * 1000 - undo.at).abs())
        .ok_or_else(|| GONE_ERROR.to_string())?;
    trash::os_limited::restore_all([item]).map_err(|_| RESTORE_ERROR.to_string())
}

#[cfg(not(any(windows, all(unix, not(target_os = "macos")))))]
pub fn restore(_undo: &TrashUndo) -> Result<(), String> {
    Err(RESTORE_ERROR.to_string())
}

pub fn undo_trash(app: &AppHandle, undo: &str) -> Result<String, String> {
    let record: TrashUndo = serde_json::from_str(undo).map_err(|_| RESTORE_ERROR.to_string())?;
    restore(&record)?;
    let _ = history::mark_undone(app, undo);
    Ok(RESTORED.to_string())
}
