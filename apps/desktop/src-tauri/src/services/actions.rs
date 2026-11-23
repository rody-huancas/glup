use std::{
    collections::HashSet,
    fs,
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicBool, Ordering},
        Mutex,
    },
};

use chrono::Local;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

use crate::services::{
    archive::{self, ZipEntry, ZipParams, ZIP_ERROR},
    background::{self, BackgroundKind, REMOVED_SUFFIX},
    destination::{self, Destination},
    history::{self, format_size, HistoryEntry, NewEntryParams, SignedDetailParams},
    image::{compress, convert, to_pdf::PdfBuilder, SourceFormat, TargetFormat, READ_ERROR},
    naming::{output_path, OutputKind, OutputNameParams},
    parallel::{run_parallel, worker_count, ParallelParams},
    pdf::{
        self as pdf_tools,
        images::{self as pdf_images, IMAGES_SUFFIX as ORIGINALS_SUFFIX, NO_IMAGES},
        merge as pdf_merge,
        numbering::{self as pdf_numbering, NumberingOptions, NUMBERED_SUFFIX, NUMBERING_ERROR},
        organize::{self as pdf_organize, OrganizeParams, OrganizedPage, ORGANIZED_SUFFIX, ORGANIZE_ERROR},
        protect::{self as pdf_protect, PROTECTED_SUFFIX, SHORT_PASSWORD, UNLOCKED_SUFFIX},
        reduce::{self as pdf_reduce, ReduceLevel, TARGET_STEPS},
        save_images::{self, PageImageFormat, PageImageSession, PageImageSessions, SESSION_ERROR},
        sign::{self as pdf_sign, Placement, PlacementContent, SignParams},
        split as pdf_split,
        watermark::{self as pdf_watermark, WatermarkOptions, EMPTY_TEXT, WATERMARK_SUFFIX},
    },
    progress::{self, Stage},
    settings::SaveMode,
    signatures, tasks,
    video::{self, plan::VideoOptions, ReduceVideoParams, VideoResult, ALREADY_LIGHT, REDUCED_SUFFIX as VIDEO_SUFFIX, VIDEO_EXTENSION},
};

pub const ACTION_PROGRESS_EVENT: &str = "action-progress";

pub const SAVE_ERROR: &str        = "No pude guardar el archivo";
pub const UNSUPPORTED_ERROR: &str = "Esto lo aprendo pronto";
pub const SAME_FORMAT: &str       = "Ya está en este formato";
pub const ALREADY_SMALL: &str     = "Ya pesaba poco";

pub const FILES_ZIP_PREFIX: &str   = "archivos";
pub const RESULTS_ZIP_PREFIX: &str = "resultados";

const IMAGE_KIND: &str = "image";
const PDF_KIND: &str   = "pdf";
const ZIP_KIND: &str   = "zip";
const VIDEO_KIND: &str = "video";

pub const MERGED_SUFFIX: &str  = "unido";
pub const REDUCED_SUFFIX: &str = "reducido";
pub const SIGNED_SUFFIX: &str  = "firmado";
pub const IMAGES_SUFFIX: &str  = "imagenes";
pub const PAGES_ERROR: &str    = "Esas páginas no existen en el PDF";
pub const REMOVED_DETAIL: &str = "Fondo quitado";
const PDF_EXTENSION: &str      = "pdf";

#[derive(Clone, Copy, Debug, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SplitMode {
    All,
    Select,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SplitOptions {
    pub mode: SplitMode,
    // 1-based, in the order of the new PDF (Select only).
    pub pages: Vec<u32>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActionOptions {
    pub format: Option<TargetFormat>,
    pub destination: Option<Destination>,
    // Deliver every result inside one zip (convert and compress with 2 or more files).
    pub bundle: Option<bool>,
    pub split: Option<SplitOptions>,
    pub reduce: Option<ReduceOptions>,
    // "Quitar fondo": transparent (PNG) or white (JPG).
    pub background: Option<BackgroundKind>,
    // "Poner contraseña" and "Quitar contraseña". Only used to (de)crypt: never stored, logged or
    // written to the history.
    #[serde(default)]
    pub password: Option<String>,
    #[serde(default)]
    pub watermark: Option<WatermarkOptions>,
    #[serde(default)]
    pub numbering: Option<NumberingOptions>,
    // "Reducir peso" for videos: what it is for, and the size typed.
    #[serde(default)]
    pub video: Option<VideoOptions>,
}

// "Reducir peso" for PDFs: the level and, optionally, a size the result must stay under.
#[derive(Clone, Copy, Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReduceOptions {
    pub level: ReduceLevel,
    pub target_bytes: Option<u64>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActionRequest {
    pub action_id: String,
    pub paths: Vec<String>,
    pub options: Option<ActionOptions>,
    // Frontend id of the task, so progress and the result can be matched (and recovered) later.
    pub task_id: Option<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileOutcome {
    pub source: String,
    pub output: Option<String>,
    pub size_before: u64,
    pub size_after: Option<u64>,
    pub error: Option<String>,
    // Why nothing was saved on purpose (already light, already in that format); not an error.
    pub unchanged: Option<String>,
    // Extra line for the result ("Lo más que pude: 2,4 MB").
    pub note: Option<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActionReport {
    pub action_id: String,
    pub outcomes: Vec<FileOutcome>,
    // The single file created from all the sources (PDF or ZIP), when there is one.
    pub output: Option<String>,
    pub output_size: Option<u64>,
    // Files requested, including the ones left out by a cancel.
    pub total: usize,
    pub cancelled: bool,
    // The results were delivered inside one zip.
    pub bundled: bool,
    // The output is a folder with several files (pages, images): "Ver en carpeta" opens it.
    pub output_is_folder: bool,
    // Page work (split, to images): pages written and pages in the PDF.
    pub pages_done: Option<u32>,
    pub pages_total: Option<u32>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActionProgress {
    pub task_id: Option<String>,
    // Finished files.
    pub current: usize,
    pub total: usize,
    // The file being processed, when files go one by one.
    pub name: String,
    // Files processed at the same time.
    pub active: usize,
    // Replaces "N de M" when the progress is not counted in files ("12 MB de 109 MB").
    pub detail: Option<String>,
    // What it is doing now (services/progress.rs), the same for every task.
    pub stage: Stage,
}

// Shared cancel flag: files in progress always finish, new ones are not started.
#[derive(Default)]
pub struct ActionControl {
    // Shared with Limpieza, which runs through the same task queue.
    pub cancelled: AtomicBool,
    // The task Cancelar was pressed for. A task made of several calls (a download, then the action)
    // stays cancelled from one call to the next.
    cancelled_task: Mutex<Option<String>>,
}

impl ActionControl {
    // Every call of a task starts here: the flag is cleared unless this same task was cancelled.
    pub fn begin(&self, task: &Option<String>) {
        let same = task.is_some() && self.cancelled_task.lock().map(|cancelled| *cancelled == *task).unwrap_or(false);
        self.cancelled.store(same, Ordering::SeqCst);
    }

    pub fn cancel(&self, task: Option<String>) {
        if let Ok(mut cancelled) = self.cancelled_task.lock() {
            *cancelled = task;
        }
        self.cancelled.store(true, Ordering::SeqCst);
    }
}

struct Saved {
    output: PathBuf,
    size: u64,
}

// One file's result: saved, or left as is on purpose with the reason to show.
enum FileResult {
    Saved(Saved),
    // A PDF made lighter: whether a stronger level was used, and a note for the result.
    Reduced { saved: Saved, maximum: bool, note: Option<String> },
    Unchanged(String),
}

struct SaveParams<'a> {
    source: &'a Path,
    kind: OutputKind<'a>,
    bytes: &'a [u8],
}

struct ProgressParams<'a> {
    current: usize,
    total: usize,
    name: &'a str,
    active: usize,
}

struct Run<'a> {
    app: &'a AppHandle,
    paths: Vec<PathBuf>,
    destination: Destination,
    cancel: &'a AtomicBool,
    // Names handed out but maybe not written yet, so parallel workers never pick the same one.
    reserved: Mutex<HashSet<PathBuf>>,
    task: Option<String>,
}

impl Run<'_> {
    fn progress(&self, params: ProgressParams) {
        let progress = ActionProgress {
            task_id : self.task.clone(),
            current : params.current,
            total   : params.total,
            name    : params.name.to_string(),
            active  : params.active,
            detail  : None,
            stage   : Stage::Working,
        };

        progress::emit(self.app, progress);
    }

    // One by one (PDF pages, zip entries): reports the file in progress and stops between files once cancelled.
    fn each(&self, mut work: impl FnMut(&Path)) -> bool {
        for (index, source) in self.paths.iter().enumerate() {
            if self.cancel.load(Ordering::SeqCst) {
                return true;
            }

            self.progress(ProgressParams { current: index, total: self.paths.len(), name: &file_name(source), active: 1 });
            work(source);
        }

        self.progress(ProgressParams { current: self.paths.len(), total: self.paths.len(), name: "", active: 1 });
        false
    }

    // Up to (cores - 1) files at once; progress counts finished files.
    fn each_parallel<T: Send>(&self, work: impl Fn(&Path) -> T + Sync) -> (Vec<Option<T>>, bool) {
        let threads = worker_count().min(self.paths.len()).max(1);
        self.progress(ProgressParams { current: 0, total: self.paths.len(), name: "", active: threads });

        let results = run_parallel(ParallelParams {
            paths       : &self.paths,
            threads,
            cancel      : self.cancel,
            work,
            on_finished : &|done| self.progress(ProgressParams { current: done, total: self.paths.len(), name: "", active: threads }),
        });

        let cancelled = results.iter().any(Option::is_none);
        (results, cancelled)
    }

    fn reserve(&self, params: &OutputNameParams) -> PathBuf {
        let mut reserved = self.reserved.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
        let output       = output_path(params, |path| path.exists() || reserved.contains(path));

        reserved.insert(output.clone());
        output
    }

    // Never overwrites: the name is unique inside the destination folder.
    fn save(&self, params: SaveParams) -> Result<Saved, String> {
        let folder = destination::prepare(params.source, &self.destination)?;
        let output = self.reserve(&OutputNameParams { folder: &folder, source: params.source, kind: params.kind });

        fs::write(&output, params.bytes).map_err(|_| SAVE_ERROR.to_string())?;
        Ok(Saved { size: params.bytes.len() as u64, output })
    }
}

pub fn cancel(app: &AppHandle, task: Option<String>) {
    app.state::<ActionControl>().cancel(task);
}

fn file_name(path: &Path) -> String {
    path.file_name().map(|value| value.to_string_lossy().into_owned()).unwrap_or_default()
}

fn file_size(path: &Path) -> u64 {
    fs::metadata(path).map(|data| data.len()).unwrap_or(0)
}

fn stamp() -> String {
    Local::now().format("%Y-%m-%d-%H%M").to_string()
}

fn outcome(source: &Path) -> FileOutcome {
    FileOutcome {
        source      : source.to_string_lossy().into_owned(),
        output      : None,
        size_before : file_size(source),
        size_after  : None,
        error       : None,
        unchanged   : None,
        note        : None,
    }
}

fn failed(source: &Path, error: String) -> FileOutcome {
    FileOutcome { error: Some(error), ..outcome(source) }
}

fn saved(source: &Path, result: &Saved) -> FileOutcome {
    FileOutcome {
        output     : Some(result.output.to_string_lossy().into_owned()),
        size_after : Some(result.size),
        ..outcome(source)
    }
}

fn unchanged(source: &Path, reason: &str) -> FileOutcome {
    FileOutcome { unchanged: Some(reason.to_string()), ..outcome(source) }
}

fn convert_one(run: &Run, source: &Path, format: TargetFormat) -> Result<FileResult, String> {
    let from = SourceFormat::from_path(source).ok_or(READ_ERROR)?;
    if from.is(format) {
        return Ok(FileResult::Unchanged(SAME_FORMAT.to_string()));
    }

    let bytes = convert::convert(source, format)?;
    run.save(SaveParams { source, kind: OutputKind::Converted { extension: format.extension() }, bytes: &bytes }).map(FileResult::Saved)
}

fn compress_one(run: &Run, source: &Path) -> Result<FileResult, String> {
    let from       = SourceFormat::from_path(source).ok_or(READ_ERROR)?;
    let compressed = compress::compress(source, from)?;

    if compressed.bytes.len() as u64 >= file_size(source) {
        return Ok(FileResult::Unchanged(ALREADY_SMALL.to_string()));
    }

    let kind = OutputKind::Compressed { extension: &compressed.extension };
    run.save(SaveParams { source, kind, bytes: &compressed.bytes }).map(FileResult::Saved)
}

// "Quitar fondo" for one image: foto.jpg → foto-sin-fondo.png (or .jpg over white).
fn remove_background_one(run: &Run, source: &Path, kind: BackgroundKind) -> Result<FileResult, String> {
    let removed = background::remove(run.app, source, kind)?;
    let kind    = OutputKind::Suffixed { suffix: REMOVED_SUFFIX, extension: removed.extension };

    run.save(SaveParams { source, kind, bytes: &removed.bytes }).map(FileResult::Saved)
}

struct Collected {
    outcomes: Vec<FileOutcome>,
    entries: Vec<HistoryEntry>,
    batch: Option<Saved>,
    cancelled: bool,
}

struct CollectParams<'a> {
    run: &'a Run<'a>,
    results: Vec<Option<Result<FileResult, String>>>,
    action: &'a str,
    kind: &'a str,
    detail: &'a dyn Fn(&Path, &Saved) -> String,
}

// Turns the per-file results (in drop order) into outcomes and history entries; skipped files are left out.
fn collect_results(params: CollectParams) -> (Vec<FileOutcome>, Vec<HistoryEntry>) {
    let mut outcomes = Vec::new();
    let mut entries  = Vec::new();

    for (source, result) in params.run.paths.iter().zip(params.results) {
        match result {
            Some(Ok(FileResult::Saved(result))) => {
                let detail = (params.detail)(source, &result);
                entries.push(history::new_entry(NewEntryParams { output: &result.output, kind: params.kind, action: params.action, detail }));
                outcomes.push(saved(source, &result));
            }
            Some(Ok(FileResult::Reduced { saved: result, maximum, note })) => {
                let before = file_size(source);
                let detail = if maximum { history::reduced_max_detail(before, result.size) } else { history::reduced_detail(before, result.size) };
                entries.push(history::new_entry(NewEntryParams { output: &result.output, kind: params.kind, action: params.action, detail }));
                outcomes.push(FileOutcome { note, ..saved(source, &result) });
            }
            Some(Ok(FileResult::Unchanged(reason))) => outcomes.push(unchanged(source, &reason)),
            Some(Err(error)) => outcomes.push(failed(source, error)),
            None             => {}
        }
    }

    (outcomes, entries)
}

fn run_convert(run: &Run, format: TargetFormat) -> Collected {
    let (results, cancelled) = run.each_parallel(|source| convert_one(run, source, format));
    let detail               = |_: &Path, _: &Saved| format!("Convertido a {}", format.label());

    let (outcomes, entries) = collect_results(CollectParams { run, results, action: "convert", kind: IMAGE_KIND, detail: &detail });
    Collected { outcomes, entries, batch: None, cancelled }
}

fn run_compress(run: &Run) -> Collected {
    let (results, cancelled) = run.each_parallel(|source| compress_one(run, source));
    let detail               = |source: &Path, result: &Saved| history::reduced_detail(file_size(source), result.size);

    let (outcomes, entries) = collect_results(CollectParams { run, results, action: "compress", kind: IMAGE_KIND, detail: &detail });
    Collected { outcomes, entries, batch: None, cancelled }
}

// One image at a time: the model already uses several cores (or the graphics card).
fn run_remove_background(run: &Run, kind: BackgroundKind) -> Collected {
    background::prepare(run.app, &run.task);

    let mut results = Vec::new();
    let cancelled   = run.each(|source| results.push(Some(remove_background_one(run, source, kind))));
    let detail      = |_: &Path, _: &Saved| REMOVED_DETAIL.to_string();

    let (outcomes, entries) = collect_results(CollectParams { run, results, action: "remove-background", kind: IMAGE_KIND, detail: &detail });
    Collected { outcomes, entries, batch: None, cancelled }
}

// One PDF for all the images, in the order they were dropped (so one by one); a broken image is skipped and reported.
// A cancel keeps the pages added so far.
fn run_to_pdf(run: &Run) -> Collected {
    let mut builder  = PdfBuilder::new();
    let mut outcomes = Vec::new();

    let cancelled = run.each(|source| match builder.add_image(source) {
        Ok(())     => outcomes.push(outcome(source)),
        Err(error) => outcomes.push(failed(source, error)),
    });

    let Some(first) = run.paths.first() else {
        return Collected { outcomes, entries: Vec::new(), batch: None, cancelled };
    };

    let pages  = builder.page_count();
    let stamp  = stamp();
    let kind   = if run.paths.len() == 1 { OutputKind::Pdf } else { OutputKind::BatchPdf { stamp: &stamp } };
    let result = builder.finish().and_then(|bytes| run.save(SaveParams { source: first, kind, bytes: &bytes }));

    let Ok(result) = result else {
        let error = result.err().unwrap_or_default();
        let all   = outcomes.into_iter().map(|item| if item.error.is_some() { item } else { FileOutcome { error: Some(error.clone()), ..item } }).collect();
        return Collected { outcomes: all, entries: Vec::new(), batch: None, cancelled };
    };

    let output = result.output.to_string_lossy().into_owned();

    let outcomes = outcomes
        .into_iter()
        .map(|item| if item.error.is_some() { item } else { FileOutcome { output: Some(output.clone()), ..item } })
        .collect();

    let detail = if pages == 1 { "Convertido a PDF".to_string() } else { format!("PDF de {pages} imágenes") };
    let entry  = history::new_entry(NewEntryParams { output: &result.output, kind: PDF_KIND, action: "to-pdf", detail });

    Collected { outcomes, entries: vec![entry], batch: Some(result), cancelled }
}

struct ZipFilesParams<'a> {
    run: &'a Run<'a>,
    sources: &'a [PathBuf],
    output: &'a Path,
    cancellable: bool,
}

// Writes the zip reporting each added file; returns the zip report.
fn zip_files(params: ZipFilesParams) -> Result<archive::ZipReport, String> {
    let names   = archive::unique_entry_names(params.sources);
    let entries = params.sources.iter().zip(names).map(|(source, name)| ZipEntry { source, name }).collect();
    let names   = params.sources.iter().map(|source| file_name(source)).collect::<Vec<_>>();

    archive::write_zip(ZipParams {
        output   : params.output,
        entries,
        cancel   : params.cancellable.then_some(params.run.cancel),
        on_added : &|added| {
            let next = names.get(added).map(String::as_str).unwrap_or("");
            params.run.progress(ProgressParams { current: added, total: names.len(), name: next, active: 1 });
        },
    })
}

// "Juntar en ZIP": the originals, flat, in one archivos-AAAA-MM-DD-HHmm.zip in the destination.
fn run_zip(run: &Run) -> Collected {
    let empty = |outcomes: Vec<FileOutcome>, cancelled: bool| Collected { outcomes, entries: Vec::new(), batch: None, cancelled };

    let Some(first) = run.paths.first() else {
        return empty(Vec::new(), false);
    };

    let folder = match destination::prepare(first, &run.destination) {
        Ok(folder) => folder,
        Err(error) => return empty(run.paths.iter().map(|source| failed(source, error.clone())).collect(), false),
    };

    let stamp  = stamp();
    let output = run.reserve(&OutputNameParams { folder: &folder, source: first, kind: OutputKind::Archive { prefix: FILES_ZIP_PREFIX, stamp: &stamp } });
    run.progress(ProgressParams { current: 0, total: run.paths.len(), name: &file_name(first), active: 1 });

    let report = match zip_files(ZipFilesParams { run, sources: &run.paths, output: &output, cancellable: true }) {
        Ok(report) => report,
        Err(error) => return empty(run.paths.iter().map(|source| failed(source, error.clone())).collect(), false),
    };

    let zip_path = output.to_string_lossy().into_owned();

    let outcomes = run
        .paths
        .iter()
        .zip(&report.errors)
        .map(|(source, error)| match error {
            Some(error)            => failed(source, error.clone()),
            None if report.written => FileOutcome { output: Some(zip_path.clone()), ..outcome(source) },
            None                   => outcome(source),
        })
        .collect::<Vec<_>>();

    if !report.written {
        return empty(outcomes, report.cancelled);
    }

    let added  = report.errors.iter().filter(|error| error.is_none()).count();
    let detail = format!("Juntado en ZIP · {added} archivos · {}", format_size(report.size));
    let entry  = history::new_entry(NewEntryParams { output: &output, kind: ZIP_KIND, action: "zip", detail });

    Collected { outcomes, entries: vec![entry], batch: Some(Saved { output, size: report.size }), cancelled: false }
}

// A private scratch folder for results that end up inside a zip; removed when the run ends.
fn scratch_folder() -> Result<PathBuf, String> {
    let folder = std::env::temp_dir().join(format!("glup-{}-{}", std::process::id(), Local::now().timestamp_millis()));
    fs::create_dir_all(&folder).map_err(|_| SAVE_ERROR.to_string())?;
    Ok(folder)
}

struct BundleParams<'a> {
    run: &'a Run<'a>,
    collected: Collected,
    destination: &'a Destination,
    action: &'a str,
}

// "Entregar todo en un ZIP": the results (made in the scratch folder) go into resultados-AAAA-MM-DD-HHmm.zip.
fn bundle(params: BundleParams) -> Collected {
    let BundleParams { run, collected, destination, action } = params;
    let outputs: Vec<PathBuf> = collected.outcomes.iter().filter_map(|item| item.output.as_ref().map(PathBuf::from)).collect();

    let (Some(first), false) = (run.paths.first(), outputs.is_empty()) else {
        return Collected { entries: Vec::new(), ..collected };
    };

    let folder = destination::prepare(first, destination);
    let output = folder.map(|folder| {
        let stamp = stamp();
        run.reserve(&OutputNameParams { folder: &folder, source: first, kind: OutputKind::Archive { prefix: RESULTS_ZIP_PREFIX, stamp: &stamp } })
    });

    let report = output.as_ref().map_err(Clone::clone).and_then(|output| zip_files(ZipFilesParams { run, sources: &outputs, output, cancellable: false }));

    let (Ok(output), Ok(report)) = (output, report) else {
        let outcomes = collected.outcomes.into_iter().map(|item| if item.output.is_some() { FileOutcome { output: None, error: Some(ZIP_ERROR.to_string()), ..item } } else { item }).collect();
        return Collected { outcomes, entries: Vec::new(), batch: None, cancelled: collected.cancelled };
    };

    if !report.written {
        return Collected { entries: Vec::new(), batch: None, ..collected };
    }

    let zip_path = output.to_string_lossy().into_owned();
    let outcomes = collected.outcomes.into_iter().map(|item| if item.output.is_some() { FileOutcome { output: Some(zip_path.clone()), ..item } } else { item }).collect();
    let noun     = if outputs.iter().all(|path| is_pdf(path)) { "PDFs" } else { "imágenes" };
    let detail   = if action == "remove-background" {
        format!("{REMOVED_DETAIL} · {} imágenes", outputs.len())
    } else {
        format!("{} {noun} en un ZIP · {}", outputs.len(), format_size(report.size))
    };
    let entry    = history::new_entry(NewEntryParams { output: &output, kind: ZIP_KIND, action, detail });

    Collected { outcomes, entries: vec![entry], batch: Some(Saved { output, size: report.size }), cancelled: collected.cancelled }
}

// Runs on a worker thread; one failure never stops the rest.
pub fn run(app: &AppHandle, request: ActionRequest) -> Result<ActionReport, String> {
    let control = app.state::<ActionControl>();
    control.begin(&request.task_id);

    let options     = request.options.unwrap_or(ActionOptions {
        format: None, destination: None, bundle: None, split: None, reduce: None, background: None, password: None, watermark: None, numbering: None,
        video: None,
    });
    let destination = options.destination.unwrap_or_default();
    let paths       = request.paths.iter().map(PathBuf::from).collect::<Vec<_>>();
    let total       = paths.len();
    let action      = request.action_id.as_str();
    let bundled     = options.bundle.unwrap_or(false) && total > 1 && matches!(action, "convert" | "compress" | "remove-background" | "protect" | "watermark" | "page-numbers");
    let scratch     = if bundled { Some(scratch_folder()?) } else { None };

    // Bundled results are made in the scratch folder first, then zipped into the real destination.
    let work_destination = match &scratch {
        Some(folder) => Destination { mode: SaveMode::Custom, folder: Some(folder.to_string_lossy().into_owned()) },
        None         => destination.clone(),
    };

    let task     = request.task_id.clone();
    let run      = Run { app, paths, destination: work_destination, cancel: &control.cancelled, reserved: Mutex::new(HashSet::new()), task };
    let all_pdfs = run.paths.iter().all(|path| is_pdf(path));
    let videos   = run.paths.iter().all(|path| is_video(path));
    let split    = options.split.clone();
    let mut page = PageOutput::default();

    let collected = match (action, options.format) {
        ("convert", Some(format))     => run_convert(&run, format),
        ("compress", _) if all_pdfs => run_reduce_pdf(&run, options.reduce.unwrap_or_default()),
        ("compress", _) if videos   => run_reduce_video(&run, options.video.unwrap_or_default()),
        ("compress", _)             => run_compress(&run),
        ("to-pdf", _)               => run_to_pdf(&run),
        ("remove-background", _)    => run_remove_background(&run, options.background.unwrap_or_default()),
        ("zip", _)                  => run_zip(&run),
        ("merge", _)                => run_merge(&run),
        ("split-pages", _)          => {
            let (collected, output) = run_split(SplitParams { run: &run, split, bundle: options.bundle.unwrap_or(false) });
            page = output;
            collected
        }
        ("protect", _)              => run_protect(&run, options.password.as_deref().unwrap_or_default()),
        ("unlock", _)               => run_unlock(&run, options.password.as_deref().unwrap_or_default()),
        ("watermark", _)            => run_watermark(&run, options.watermark.as_ref()),
        ("page-numbers", _)         => run_numbering(&run, options.numbering.as_ref()),
        ("extract-images", _)       => {
            let (collected, output) = run_extract_images(&run, options.bundle.unwrap_or(false));
            page = output;
            collected
        }
        _ => return Err(UNSUPPORTED_ERROR.to_string()),
    };

    // The counted part is over: writing the ZIP and the history is shown as "Guardando…".
    progress::emit(app, ActionProgress::at(&run.task, Stage::Saving));

    let collected = if bundled { bundle(BundleParams { run: &run, collected, destination: &destination, action }) } else { collected };

    if let Some(folder) = scratch {
        let _ = fs::remove_dir_all(folder);
    }

    let _ = history::append(app, collected.entries);

    Ok(ActionReport {
        action_id   : request.action_id,
        outcomes    : collected.outcomes,
        output      : collected.batch.as_ref().map(|result| result.output.to_string_lossy().into_owned()),
        output_size : collected.batch.map(|result| result.size),
        total,
        cancelled        : collected.cancelled,
        bundled          : bundled || page.bundled,
        output_is_folder : page.folder,
        pages_done       : page.done,
        pages_total      : page.total,
    })
}

fn is_video(path: &Path) -> bool {
    crate::services::file_info::read(&path.to_string_lossy(), None).kind == crate::services::file_info::FileKind::Video
}

fn is_pdf(path: &Path) -> bool {
    path.extension().is_some_and(|extension| extension.eq_ignore_ascii_case(PDF_EXTENSION))
}

fn stem_of(path: &Path) -> String {
    path.file_stem().map(|value| value.to_string_lossy().into_owned()).unwrap_or_default()
}

// What a page job produced, for the report.
#[derive(Default)]
struct PageOutput {
    folder: bool,
    bundled: bool,
    done: Option<u32>,
    total: Option<u32>,
}

struct ReducePdfParams<'a> {
    run: &'a Run<'a>,
    source: &'a Path,
    options: ReduceOptions,
}

struct Lightest {
    bytes: Vec<u8>,
    reason: &'static str,
    maximum: bool,
}

// With a size limit: Normal, Al máximo, quality 45, 80 ppp, stopping at the first one under the limit;
// if none gets there, the lightest one (and the note says so).
fn reduce_to_target(source: &Path, target: u64) -> Result<(Lightest, Option<String>), String> {
    let mut lightest: Option<Lightest> = None;

    for profile in TARGET_STEPS {
        let outcome = pdf_reduce::reduce(source, &profile)?;
        let size    = outcome.bytes.len() as u64;
        let lighter = lightest.as_ref().is_none_or(|best| size < best.bytes.len() as u64);

        if lighter {
            lightest = Some(Lightest { bytes: outcome.bytes, reason: outcome.reason, maximum: profile.maximum });
        }

        if size <= target {
            break;
        }
    }

    let lightest = lightest.ok_or(SAVE_ERROR)?;
    let size     = lightest.bytes.len() as u64;
    let note     = (size > target).then(|| format!("Lo más que pude: {}", format_size(size)));

    Ok((lightest, note))
}

// When nothing is gained, the reason says where the weight is (fonts, already light images…).
fn reduce_pdf_one(params: ReducePdfParams) -> Result<FileResult, String> {
    let ReducePdfParams { run, source, options } = params;

    let (result, note) = match options.target_bytes {
        Some(target) => reduce_to_target(source, target)?,
        None => {
            let profile = options.level.profile();
            let outcome = pdf_reduce::reduce(source, &profile)?;
            (Lightest { bytes: outcome.bytes, reason: outcome.reason, maximum: profile.maximum }, None)
        }
    };

    if result.bytes.len() as u64 >= file_size(source) {
        return Ok(FileResult::Unchanged(result.reason.to_string()));
    }

    let kind  = OutputKind::Suffixed { suffix: REDUCED_SUFFIX, extension: PDF_EXTENSION };
    let saved = run.save(SaveParams { source, kind, bytes: &result.bytes })?;

    Ok(FileResult::Reduced { saved, maximum: result.maximum, note })
}

// "Reducir peso" for PDFs: lighter images and streams, several PDFs at once.
fn run_reduce_pdf(run: &Run, options: ReduceOptions) -> Collected {
    let (results, cancelled) = run.each_parallel(|source| reduce_pdf_one(ReducePdfParams { run, source, options }));
    let detail               = |source: &Path, result: &Saved| history::reduced_detail(file_size(source), result.size);

    let (outcomes, entries) = collect_results(CollectParams { run, results, action: "compress", kind: PDF_KIND, detail: &detail });
    Collected { outcomes, entries, batch: None, cancelled }
}

// "Unir": the files in the order chosen, images as A4 pages, in <primero>-unido.pdf. A cancel leaves no PDF.
fn run_merge(run: &Run) -> Collected {
    let mut picks    = Vec::new();
    let mut outcomes = Vec::new();

    let cancelled = run.each(|source| match pdf_merge::pick(source) {
        Ok(pick)   => {
            picks.push(pick);
            outcomes.push(outcome(source));
        }
        Err(error) => outcomes.push(failed(source, error)),
    });

    let Some(first) = run.paths.first() else {
        return Collected { outcomes, entries: Vec::new(), batch: None, cancelled };
    };

    if cancelled || picks.is_empty() {
        return Collected { outcomes, entries: Vec::new(), batch: None, cancelled };
    }

    let files  = picks.len();
    let pages  = pdf_merge::page_count(&picks);
    let kind   = OutputKind::Suffixed { suffix: MERGED_SUFFIX, extension: PDF_EXTENSION };
    let result = pdf_merge::merge(picks).and_then(|bytes| run.save(SaveParams { source: first, kind, bytes: &bytes }));

    let Ok(result) = result else {
        let error = result.err().unwrap_or_default();
        let all   = outcomes.into_iter().map(|item| if item.error.is_some() { item } else { FileOutcome { error: Some(error.clone()), ..item } }).collect();
        return Collected { outcomes: all, entries: Vec::new(), batch: None, cancelled };
    };

    let output   = result.output.to_string_lossy().into_owned();
    let outcomes = outcomes.into_iter().map(|item| if item.error.is_some() { item } else { FileOutcome { output: Some(output.clone()), ..item } }).collect();
    let detail   = format!("Unido · {files} archivos · {pages} páginas");
    let entry    = history::new_entry(NewEntryParams { output: &result.output, kind: PDF_KIND, action: "merge", detail });

    Collected { outcomes, entries: vec![entry], batch: Some(result), cancelled }
}

struct SplitParams<'a> {
    run: &'a Run<'a>,
    split: Option<SplitOptions>,
    bundle: bool,
}

struct PagesFolderParams<'a> {
    run: &'a Run<'a>,
    source: &'a Path,
    document: &'a lopdf::Document,
    bundle: bool,
}

// A unique "<name>-<suffix>" folder in the destination (or a scratch one when it ends up zipped).
fn output_folder(run: &Run, source: &Path, suffix: &str) -> Result<PathBuf, String> {
    let parent = destination::prepare(source, &run.destination)?;
    let folder = run.reserve(&OutputNameParams { folder: &parent, source, kind: OutputKind::Folder { suffix } });

    fs::create_dir_all(&folder).map_err(|_| SAVE_ERROR.to_string())?;
    Ok(folder)
}

struct ZipFolderParams<'a> {
    run: &'a Run<'a>,
    source: &'a Path,
    files: &'a [PathBuf],
    suffix: &'a str,
}

// The pages (or images) written so far, zipped as <name>-<suffix>.zip in the destination.
fn zip_into_destination(params: ZipFolderParams) -> Result<Saved, String> {
    let parent = destination::prepare(params.source, &params.run.destination)?;
    let output = params.run.reserve(&OutputNameParams { folder: &parent, source: params.source, kind: OutputKind::Suffixed { suffix: params.suffix, extension: "zip" } });
    let report = zip_files(ZipFilesParams { run: params.run, sources: params.files, output: &output, cancellable: false })?;

    if !report.written {
        return Err(ZIP_ERROR.to_string());
    }

    Ok(Saved { output, size: report.size })
}

// "Todas por separado": contrato-p01.pdf, contrato-p02.pdf… in contrato-paginas/ (or contrato-paginas.zip).
fn split_all(params: PagesFolderParams) -> Result<(Saved, PageOutput, bool), String> {
    let PagesFolderParams { run, source, document, bundle } = params;
    let total   = document.get_pages().len() as u32;
    let stem    = stem_of(source);
    let scratch = if bundle { Some(scratch_folder()?) } else { None };
    let folder  = match &scratch {
        Some(folder) => folder.clone(),
        None         => output_folder(run, source, pdf_split::PAGES_SUFFIX)?,
    };

    let mut written   = Vec::new();
    let mut cancelled = false;

    for page in 1..=total {
        if run.cancel.load(Ordering::SeqCst) {
            cancelled = true;
            break;
        }

        let name = format!("Página {page} de {total}");
        run.progress(ProgressParams { current: page as usize - 1, total: total as usize, name: &name, active: 1 });

        let bytes = pdf_split::extract_page(document, page)?;
        let path  = folder.join(format!("{}.{PDF_EXTENSION}", pdf_split::page_stem(&stem, page, total)));

        fs::write(&path, bytes).map_err(|_| SAVE_ERROR.to_string())?;
        written.push(path);
    }

    let done   = written.len() as u32;
    let output = PageOutput { folder: !bundle, bundled: bundle, done: Some(done), total: Some(total) };

    let saved = if bundle {
        let zipped = zip_into_destination(ZipFolderParams { run, source, files: &written, suffix: pdf_split::PAGES_SUFFIX });
        let _      = fs::remove_dir_all(&folder);
        zipped?
    } else {
        let size = written.iter().map(|path| file_size(path)).sum();
        Saved { output: folder, size }
    };

    Ok((saved, output, cancelled))
}

// "Separar páginas": every page on its own, or the chosen ones (in that order) as one PDF.
fn run_split(params: SplitParams) -> (Collected, PageOutput) {
    let SplitParams { run, split, bundle } = params;
    let empty = |outcomes: Vec<FileOutcome>| (Collected { outcomes, entries: Vec::new(), batch: None, cancelled: false }, PageOutput::default());

    let (Some(source), Some(split)) = (run.paths.first(), split) else {
        return empty(Vec::new());
    };

    let document = match pdf_tools::load(source) {
        Ok(document) => document,
        Err(error)   => return empty(vec![failed(source, error)]),
    };

    let total = document.get_pages().len() as u32;

    if split.mode == SplitMode::Select {
        if split.pages.is_empty() || split.pages.iter().any(|page| *page == 0 || *page > total) {
            return empty(vec![failed(source, PAGES_ERROR.to_string())]);
        }

        let count  = split.pages.len();
        let name   = pdf_split::selection_stem(&stem_of(source), &split.pages);
        let kind   = OutputKind::Named { name: &name, extension: PDF_EXTENSION };
        let result = pdf_split::extract_pages(document, split.pages).and_then(|bytes| run.save(SaveParams { source, kind, bytes: &bytes }));

        return match result {
            Ok(result) => {
                let detail = format!("Separado: {count} páginas");
                let entry  = history::new_entry(NewEntryParams { output: &result.output, kind: PDF_KIND, action: "split-pages", detail });
                let item   = saved(source, &result);
                (Collected { outcomes: vec![item], entries: vec![entry], batch: Some(result), cancelled: false }, PageOutput::default())
            }
            Err(error) => empty(vec![failed(source, error)]),
        };
    }

    match split_all(PagesFolderParams { run, source, document: &document, bundle }) {
        Ok((result, output, cancelled)) => {
            let detail = format!("Separado en {} páginas", output.done.unwrap_or(0));
            let kind   = if bundle { ZIP_KIND } else { PDF_KIND };
            let entry  = history::new_entry(NewEntryParams { output: &result.output, kind, action: "split-pages", detail });
            let item   = FileOutcome { output: Some(result.output.to_string_lossy().into_owned()), ..outcome(source) };
            (Collected { outcomes: vec![item], entries: vec![entry], batch: Some(result), cancelled }, output)
        }
        Err(error) => empty(vec![failed(source, error)]),
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PageImagesRequest {
    pub path: String,
    pub format: PageImageFormat,
    pub total: u32,
    pub destination: Option<Destination>,
    pub bundle: Option<bool>,
    pub task_id: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FinishPageImagesRequest {
    pub session: u64,
    pub cancelled: bool,
    pub task_id: Option<String>,
}

// "A imágenes": pdf.js renders each page in the webview and the bytes are written here, into
// contrato-imagenes/ (or a scratch folder that becomes contrato-imagenes.zip at the end).
pub fn begin_page_images(app: &AppHandle, request: PageImagesRequest) -> Result<u64, String> {
    let source      = PathBuf::from(&request.path);
    let bundle      = request.bundle.unwrap_or(false);
    let destination = request.destination.unwrap_or_default();
    let control     = app.state::<ActionControl>();
    let run         = Run { app, paths: vec![source.clone()], destination, cancel: &control.cancelled, reserved: Mutex::new(HashSet::new()), task: None };
    let folder      = if bundle { scratch_folder()? } else { output_folder(&run, &source, IMAGES_SUFFIX)? };

    if let Some(task) = &request.task_id {
        tasks::start(app, task, "to-images");
    }

    let session = PageImageSession { source, format: request.format, total: request.total, folder, saved: Vec::new(), bundle, destination: run.destination };
    Ok(save_images::open(&app.state::<PageImageSessions>(), session))
}

// The result is also kept in the task registry, like any other task.
pub fn finish_page_images(app: &AppHandle, request: FinishPageImagesRequest) -> Result<ActionReport, String> {
    let task   = request.task_id.clone();
    let result = finish_page_images_inner(app, request);

    if let Some(task) = &task {
        tasks::finish(app, task, &result);
    }

    result
}

fn finish_page_images_inner(app: &AppHandle, request: FinishPageImagesRequest) -> Result<ActionReport, String> {
    let session     = save_images::close(&app.state::<PageImageSessions>(), request.session).ok_or(SESSION_ERROR)?;
    let control     = app.state::<ActionControl>();
    let destination = session.destination.clone();
    let run         = Run { app, paths: vec![session.source.clone()], destination, cancel: &control.cancelled, reserved: Mutex::new(HashSet::new()), task: None };
    let done        = session.saved.len() as u32;
    let source      = session.source.as_path();

    let mut report = ActionReport {
        action_id        : "to-images".to_string(),
        outcomes         : vec![outcome(source)],
        output           : None,
        output_size      : None,
        total            : 1,
        cancelled        : request.cancelled,
        bundled          : session.bundle,
        output_is_folder : !session.bundle,
        pages_done       : Some(done),
        pages_total      : Some(session.total),
    };

    if done == 0 {
        let _ = fs::remove_dir_all(&session.folder);
        return Ok(report);
    }

    let result = if session.bundle {
        let zipped = zip_into_destination(ZipFolderParams { run: &run, source, files: &session.saved, suffix: IMAGES_SUFFIX });
        let _      = fs::remove_dir_all(&session.folder);
        zipped?
    } else {
        Saved { size: session.saved.iter().map(|path| file_size(path)).sum(), output: session.folder.clone() }
    };

    let detail = format!("Pasado a {done} imágenes {}", session.format.label());
    let kind   = if session.bundle { ZIP_KIND } else { IMAGE_KIND };
    let entry  = history::new_entry(NewEntryParams { output: &result.output, kind, action: "to-images", detail });
    let _      = history::append(app, vec![entry]);
    let output = result.output.to_string_lossy().into_owned();

    report.outcomes    = vec![FileOutcome { output: Some(output.clone()), ..outcome(source) }];
    report.output      = Some(output);
    report.output_size = Some(result.size);
    Ok(report)
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SignRequest {
    pub path: String,
    pub placements: Vec<Placement>,
    pub destination: Option<Destination>,
    pub task_id: Option<String>,
}

// "Firmar": the signatures and texts placed on the pages, in contrato-firmado.pdf. Temporary signatures
// (not kept for later) are removed once it is done.
pub fn sign_pdf(app: &AppHandle, request: SignRequest) -> Result<ActionReport, String> {
    let source  = PathBuf::from(&request.path);
    let control = app.state::<ActionControl>();
    let run     = Run {
        app,
        paths       : vec![source.clone()],
        destination : request.destination.unwrap_or_default(),
        cancel      : &control.cancelled,
        reserved    : Mutex::new(HashSet::new()),
        task        : request.task_id.clone(),
    };

    run.progress(ProgressParams { current: 0, total: 1, name: &file_name(&source), active: 1 });

    let summary = pdf_sign::summarize(&request.placements);
    let kind    = OutputKind::Suffixed { suffix: SIGNED_SUFFIX, extension: PDF_EXTENSION };
    let result  = pdf_tools::load(&source)
        .and_then(|document| pdf_sign::sign(SignParams { document, placements: &request.placements }))
        .and_then(|bytes| run.save(SaveParams { source: &source, kind, bytes: &bytes }));

    let used: Vec<&str> = request.placements.iter().filter_map(|item| match &item.content {
        PlacementContent::Image { path } => Some(path.as_str()),
        PlacementContent::Text { .. } => None,
    }).collect();
    signatures::remove_temporary(&used);

    run.progress(ProgressParams { current: 1, total: 1, name: "", active: 1 });

    let (outcomes, batch) = match result {
        Ok(result) => {
            let detail = history::signed_detail(SignedDetailParams { signatures: summary.signatures, texts: summary.texts, pages: summary.pages });
            let entry  = history::new_entry(NewEntryParams { output: &result.output, kind: PDF_KIND, action: "sign", detail });
            let _      = history::append(app, vec![entry]);
            (vec![saved(&source, &result)], Some(result))
        }
        Err(error) => (vec![failed(&source, error)], None),
    };

    Ok(ActionReport {
        action_id        : "sign".to_string(),
        outcomes,
        output           : batch.as_ref().map(|result| result.output.to_string_lossy().into_owned()),
        output_size      : batch.map(|result| result.size),
        total            : 1,
        cancelled        : false,
        bundled          : false,
        output_is_folder : false,
        pages_done       : None,
        pages_total      : None,
    })
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OrganizeRequest {
    pub path: String,
    // The pages of the result in their new order; the ones left out are removed.
    pub pages: Vec<OrganizedPage>,
    pub destination: Option<Destination>,
    pub task_id: Option<String>,
}

// "Organizar páginas": the pages reordered, turned and removed as chosen, in contrato-organizado.pdf.
pub fn organize_pdf(app: &AppHandle, request: OrganizeRequest) -> Result<ActionReport, String> {
    let source  = PathBuf::from(&request.path);
    let control = app.state::<ActionControl>();
    let run     = Run {
        app,
        paths       : vec![source.clone()],
        destination : request.destination.unwrap_or_default(),
        cancel      : &control.cancelled,
        reserved    : Mutex::new(HashSet::new()),
        task        : request.task_id.clone(),
    };

    run.progress(ProgressParams { current: 0, total: 1, name: &file_name(&source), active: 1 });

    let kind   = OutputKind::Suffixed { suffix: ORGANIZED_SUFFIX, extension: PDF_EXTENSION };
    let result = pdf_tools::load(&source).and_then(|document| {
        let total = document.get_pages().len() as u32;
        if !pdf_organize::is_valid(&request.pages, total) {
            return Err(ORGANIZE_ERROR.to_string());
        }

        let summary = pdf_organize::summarize(&request.pages, total);
        let bytes   = pdf_organize::organize(OrganizeParams { document, pages: &request.pages })?;
        run.save(SaveParams { source: &source, kind, bytes: &bytes }).map(|saved| (saved, summary))
    });

    run.progress(ProgressParams { current: 1, total: 1, name: "", active: 1 });

    let (outcomes, batch) = match result {
        Ok((result, summary)) => {
            let detail = pdf_organize::detail(summary);
            let entry  = history::new_entry(NewEntryParams { output: &result.output, kind: PDF_KIND, action: "organize-pages", detail });
            let _      = history::append(app, vec![entry]);
            (vec![saved(&source, &result)], Some(result))
        }
        Err(error) => (vec![failed(&source, error)], None),
    };

    Ok(ActionReport {
        action_id        : "organize-pages".to_string(),
        outcomes,
        output           : batch.as_ref().map(|result| result.output.to_string_lossy().into_owned()),
        output_size      : batch.map(|result| result.size),
        total            : 1,
        cancelled        : false,
        bundled          : false,
        output_is_folder : false,
        pages_done       : None,
        pages_total      : None,
    })
}

struct PdfStepParams<'a> {
    run: &'a Run<'a>,
    action: &'a str,
    suffix: &'a str,
    // Makes the new PDF from the loaded one; Err is the reason shown for that file.
    work: &'a (dyn Fn(&Path, lopdf::Document) -> Result<Vec<u8>, String> + Sync),
    detail: &'a dyn Fn(&Path, &Saved) -> String,
}

// The PDF actions that turn each file into one new PDF (contraseña, marca de agua, números), several
// files at once. A file that cannot be read or made is reported and the rest go on.
fn run_pdf_step(params: PdfStepParams) -> Collected {
    let PdfStepParams { run, action, suffix, work, detail } = params;

    let (results, cancelled) = run.each_parallel(|source| {
        let kind = OutputKind::Suffixed { suffix, extension: PDF_EXTENSION };
        pdf_tools::load(source)
            .and_then(|document| work(source, document))
            .and_then(|bytes| run.save(SaveParams { source, kind, bytes: &bytes }))
            .map(FileResult::Saved)
    });

    let (outcomes, entries) = collect_results(CollectParams { run, results, action, kind: PDF_KIND, detail });
    Collected { outcomes, entries, batch: None, cancelled }
}

fn refuse_all(run: &Run, error: &str) -> Collected {
    let outcomes = run.paths.iter().map(|source| failed(source, error.to_string())).collect();
    Collected { outcomes, entries: Vec::new(), batch: None, cancelled: false }
}

// "Poner contraseña": contrato-protegido.pdf, AES-256.
fn run_protect(run: &Run, password: &str) -> Collected {
    if !pdf_protect::is_valid_password(password) {
        return refuse_all(run, SHORT_PASSWORD);
    }

    let work   = |_: &Path, document: lopdf::Document| pdf_protect::protect(document, password);
    let detail = |_: &Path, _: &Saved| "Protegido con contraseña".to_string();
    run_pdf_step(PdfStepParams { run, action: "protect", suffix: PROTECTED_SUFFIX, work: &work, detail: &detail })
}

// "Quitar contraseña": only with the right password, into contrato-sin-clave.pdf.
fn run_unlock(run: &Run, password: &str) -> Collected {
    let mut results = Vec::new();
    let cancelled   = run.each(|source| {
        let result = pdf_protect::unlock(source, password)
            .and_then(|bytes| run.save(SaveParams { source, kind: OutputKind::Suffixed { suffix: UNLOCKED_SUFFIX, extension: PDF_EXTENSION }, bytes: &bytes }))
            .map(FileResult::Saved);
        results.push(Some(result));
    });
    let detail = |_: &Path, _: &Saved| "Contraseña quitada".to_string();

    let (outcomes, entries) = collect_results(CollectParams { run, results, action: "unlock", kind: PDF_KIND, detail: &detail });
    Collected { outcomes, entries, batch: None, cancelled }
}

// "Marca de agua": the same text on every page, in contrato-marca.pdf.
fn run_watermark(run: &Run, options: Option<&WatermarkOptions>) -> Collected {
    let Some(options) = options.filter(|options| !pdf_watermark::clean_text(&options.text).is_empty()) else {
        return refuse_all(run, EMPTY_TEXT);
    };

    let text   = pdf_watermark::clean_text(&options.text);
    let work   = |_: &Path, document: lopdf::Document| pdf_watermark::watermark(document, options);
    let detail = |_: &Path, _: &Saved| format!("Marca de agua «{text}»");
    run_pdf_step(PdfStepParams { run, action: "watermark", suffix: WATERMARK_SUFFIX, work: &work, detail: &detail })
}

// "Numerar páginas": contrato-numerado.pdf. The history says how many pages got a number.
fn run_numbering(run: &Run, options: Option<&NumberingOptions>) -> Collected {
    let Some(options) = options else {
        return refuse_all(run, NUMBERING_ERROR);
    };

    let counts = Mutex::new(std::collections::HashMap::<PathBuf, u32>::new());
    let work   = |source: &Path, document: lopdf::Document| {
        let (bytes, stamped) = pdf_numbering::number_pages(document, options)?;
        counts.lock().unwrap_or_else(|poisoned| poisoned.into_inner()).insert(source.to_path_buf(), stamped);
        Ok(bytes)
    };
    let detail = |source: &Path, _: &Saved| {
        let stamped = counts.lock().unwrap_or_else(|poisoned| poisoned.into_inner()).get(source).copied().unwrap_or(0);
        format!("Numerado · {stamped} {}", if stamped == 1 { "página" } else { "páginas" })
    };
    run_pdf_step(PdfStepParams { run, action: "page-numbers", suffix: NUMBERED_SUFFIX, work: &work, detail: &detail })
}

// "Sacar imágenes": contrato-img-01.jpg… in contrato-imagenes-originales/ (or that name as a ZIP).
fn run_extract_images(run: &Run, bundle: bool) -> (Collected, PageOutput) {
    let empty = |outcomes: Vec<FileOutcome>| (Collected { outcomes, entries: Vec::new(), batch: None, cancelled: false }, PageOutput::default());

    let Some(source) = run.paths.first() else {
        return empty(Vec::new());
    };

    run.progress(ProgressParams { current: 0, total: 1, name: &file_name(source), active: 1 });

    let images = match pdf_tools::load(source) {
        Ok(document) => pdf_images::extract(&document),
        Err(error)   => return empty(vec![failed(source, error)]),
    };

    if images.is_empty() {
        run.progress(ProgressParams { current: 1, total: 1, name: "", active: 1 });
        return empty(vec![unchanged(source, NO_IMAGES)]);
    }

    let result = write_images(ImagesFolderParams { run, source, images: &images, bundle });
    run.progress(ProgressParams { current: 1, total: 1, name: "", active: 1 });

    match result {
        Ok(result) => {
            let count  = images.len();
            let detail = format!("{count} {} sacadas", if count == 1 { "imagen" } else { "imágenes" });
            let kind   = if bundle { ZIP_KIND } else { IMAGE_KIND };
            let entry  = history::new_entry(NewEntryParams { output: &result.output, kind, action: "extract-images", detail });
            let item   = FileOutcome { output: Some(result.output.to_string_lossy().into_owned()), ..outcome(source) };
            let output = PageOutput { folder: !bundle, bundled: bundle, done: None, total: None };
            (Collected { outcomes: vec![item], entries: vec![entry], batch: Some(result), cancelled: false }, output)
        }
        Err(error) => empty(vec![failed(source, error)]),
    }
}

struct ImagesFolderParams<'a> {
    run: &'a Run<'a>,
    source: &'a Path,
    images: &'a [pdf_images::ExtractedImage],
    bundle: bool,
}

fn write_images(params: ImagesFolderParams) -> Result<Saved, String> {
    let ImagesFolderParams { run, source, images, bundle } = params;
    let stem    = stem_of(source);
    let scratch = if bundle { Some(scratch_folder()?) } else { None };
    let folder  = match &scratch {
        Some(folder) => folder.clone(),
        None         => output_folder(run, source, ORIGINALS_SUFFIX)?,
    };

    let mut written = Vec::new();
    for (index, image) in images.iter().enumerate() {
        let path = folder.join(pdf_images::image_name(&stem, index + 1, images.len(), image.extension));
        fs::write(&path, &image.bytes).map_err(|_| SAVE_ERROR.to_string())?;
        written.push(path);
    }

    if bundle {
        let zipped = zip_into_destination(ZipFolderParams { run, source, files: &written, suffix: ORIGINALS_SUFFIX });
        let _      = fs::remove_dir_all(&folder);
        return zipped;
    }

    Ok(Saved { output: folder, size: written.iter().map(|path| file_size(path)).sum() })
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PasswordCheckRequest {
    pub path: String,
    // Only compared, never kept.
    pub password: String,
}

// "Quitar contraseña" checks the password before running, so a wrong one can be typed again right there.
pub fn check_pdf_password(request: PasswordCheckRequest) -> bool {
    pdf_protect::check_password(Path::new(&request.path), &request.password)
}

// "Video 2 de 3 · 45 %" (or "45 %" for one): the bar goes by the time made, all videos together.
fn video_progress(run: &Run, index: usize, done: f64, name: &str) {
    let total   = run.paths.len();
    let percent = (done * 100.0).round() as u32;
    let detail  = if total > 1 { format!("Video {} de {total} · {percent} %", index + 1) } else { format!("{percent} %") };
    let overall = ((index as f64 + done) / total as f64 * 1000.0) as usize;

    let progress = ActionProgress { task_id: run.task.clone(), current: overall, total: 1000, name: name.to_string(), active: 1, detail: Some(detail), stage: Stage::Working };
    progress::emit(run.app, progress);
}

fn reduce_video_one(run: &Run, index: usize, source: &Path, options: VideoOptions) -> Option<Result<FileResult, String>> {
    let folder = match destination::prepare(source, &run.destination) {
        Ok(folder) => folder,
        Err(error) => return Some(Err(error)),
    };

    let output = run.reserve(&OutputNameParams { folder: &folder, source, kind: OutputKind::Suffixed { suffix: VIDEO_SUFFIX, extension: VIDEO_EXTENSION } });
    let name   = file_name(source);
    let result = video::reduce(ReduceVideoParams {
        app         : run.app,
        source,
        output      : &output,
        options,
        cancel      : run.cancel,
        on_progress : &|done| video_progress(run, index, done, &name),
    });

    match result {
        Ok(VideoResult::Saved(size))  => Some(Ok(FileResult::Saved(Saved { output, size }))),
        Ok(VideoResult::AlreadyLight) => Some(Ok(FileResult::Unchanged(ALREADY_LIGHT.to_string()))),
        Ok(VideoResult::Cancelled)    => None,
        Err(error)                    => Some(Err(error)),
    }
}

// "Reducir peso" for videos: one at a time (FFmpeg already uses the whole processor), into
// video-reducido.mp4. Cancelar stops FFmpeg and deletes the half-made file.
fn run_reduce_video(run: &Run, options: VideoOptions) -> Collected {
    let mut results   = Vec::new();
    let mut cancelled = false;

    for (index, source) in run.paths.iter().enumerate() {
        if run.cancel.load(Ordering::SeqCst) {
            cancelled = true;
            break;
        }

        let result = reduce_video_one(run, index, source, options);
        cancelled |= result.is_none();
        results.push(result);
    }

    let detail              = |source: &Path, result: &Saved| history::reduced_detail(file_size(source), result.size);
    let (outcomes, entries) = collect_results(CollectParams { run, results, action: "compress", kind: VIDEO_KIND, detail: &detail });
    Collected { outcomes, entries, batch: None, cancelled }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IdPhotoSaveRequest {
    #[serde(flatten)]
    pub save: crate::services::id_photo::SaveRequest,
    pub task_id: Option<String>,
}

// "Foto tamaño carnet": foto-carnet.jpg and foto-carnet-hoja.jpg (never over another file), as a task.
pub fn save_id_photo(app: &AppHandle, request: IdPhotoSaveRequest) -> Result<ActionReport, String> {
    use crate::services::id_photo;

    let control = app.state::<ActionControl>();
    let run     = Run {
        app,
        paths       : Vec::new(),
        destination : Destination::default(),
        cancel      : &control.cancelled,
        reserved    : Mutex::new(HashSet::new()),
        task        : request.task_id.clone(),
    };
    run.progress(ProgressParams { current: 0, total: 1, name: "", active: 1 });

    let name  = |folder: &Path, source: &Path, suffix: &str| run.reserve(&OutputNameParams { folder, source, kind: OutputKind::Suffixed { suffix, extension: "jpg" } });
    let saved = id_photo::save(app, id_photo::SaveParams { request: request.save, name: &name });
    run.progress(ProgressParams { current: 1, total: 1, name: "", active: 1 });

    let saved = saved?;
    let first = saved.files.first().cloned().ok_or(SAVE_ERROR)?;
    let size  = saved.files.iter().map(|path| file_size(path)).sum();
    let entry = history::new_entry(NewEntryParams { output: &first, kind: IMAGE_KIND, action: id_photo::ID_ACTION, detail: saved.detail.clone() });
    let _     = history::append(app, vec![entry]);

    let item = FileOutcome { note: saved.note.clone(), ..saved_outcome(&saved.source, &first, size) };
    Ok(ActionReport {
        action_id        : id_photo::ID_ACTION.to_string(),
        outcomes         : vec![item],
        output           : Some(first.to_string_lossy().into_owned()),
        output_size      : Some(size),
        total            : 1,
        cancelled        : false,
        bundled          : false,
        output_is_folder : false,
        pages_done       : None,
        pages_total      : None,
    })
}

fn saved_outcome(source: &Path, output: &Path, size: u64) -> FileOutcome {
    saved(source, &Saved { output: output.to_path_buf(), size })
}

