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
use tauri::{AppHandle, Emitter, Manager};

use crate::services::{
    archive::{self, ZipEntry, ZipParams, ZIP_ERROR},
    destination::{self, Destination},
    history::{self, format_size, HistoryEntry, NewEntryParams},
    image::{compress, convert, to_pdf::PdfBuilder, SourceFormat, TargetFormat, READ_ERROR},
    naming::{output_path, OutputKind, OutputNameParams},
    parallel::{run_parallel, worker_count, ParallelParams},
    settings::SaveMode,
};

pub const ACTION_PROGRESS_EVENT: &str = "action-progress";

pub const SAVE_ERROR: &str        = "No pude guardar el archivo";
pub const UNSUPPORTED_ERROR: &str = "Esto lo aprendo pronto";
pub const SAME_FORMAT: &str       = "Ya está en este formato";
pub const ALREADY_SMALL: &str     = "Ya pesaba poco";
// pub const ALREADY_SMALL: &str     = "Ya estaba bien comprimida";

pub const FILES_ZIP_PREFIX: &str   = "archivos";
pub const RESULTS_ZIP_PREFIX: &str = "resultados";

const IMAGE_KIND: &str = "image";
const PDF_KIND: &str   = "pdf";
const ZIP_KIND: &str   = "zip";

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActionOptions {
    pub format: Option<TargetFormat>,
    pub destination: Option<Destination>,
    // Deliver every result inside one zip (convert and compress with 2 or more files).
    pub bundle: Option<bool>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActionRequest {
    pub action_id: String,
    pub paths: Vec<String>,
    pub options: Option<ActionOptions>,
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
}

#[derive(Serialize)]
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
}

#[derive(Clone, Serialize)]
pub struct ActionProgress {
    // Finished files.
    pub current: usize,
    pub total: usize,
    // The file being processed, when files go one by one.
    pub name: String,
    // Files processed at the same time.
    pub active: usize,
}

// Shared cancel flag: files in progress always finish, new ones are not started.
#[derive(Default)]
pub struct ActionControl {
    cancelled: AtomicBool,
}

struct Saved {
    output: PathBuf,
    size: u64,
}

struct SaveParams<'a> {
    source: &'a Path,
    kind: OutputKind<'a>,
    bytes: &'a [u8],
}

struct ProgressParams<'a> {
    current: usize,
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
}

impl Run<'_> {
    fn progress(&self, params: ProgressParams) {
        let progress = ActionProgress { current: params.current, total: self.paths.len(), name: params.name.to_string(), active: params.active };
        let _        = self.app.emit(ACTION_PROGRESS_EVENT, progress);
    }

    // One by one (PDF pages, zip entries): reports the file in progress and stops between files once cancelled.
    fn each(&self, mut work: impl FnMut(&Path)) -> bool {
        for (index, source) in self.paths.iter().enumerate() {
            if self.cancel.load(Ordering::SeqCst) {
                return true;
            }

            self.progress(ProgressParams { current: index, name: &file_name(source), active: 1 });
            work(source);
        }

        self.progress(ProgressParams { current: self.paths.len(), name: "", active: 1 });
        false
    }

    // Up to (cores - 1) files at once; progress counts finished files.
    fn each_parallel<T: Send>(&self, work: impl Fn(&Path) -> T + Sync) -> (Vec<Option<T>>, bool) {
        let threads = worker_count().min(self.paths.len()).max(1);
        self.progress(ProgressParams { current: 0, name: "", active: threads });

        let results = run_parallel(ParallelParams {
            paths       : &self.paths,
            threads,
            cancel      : self.cancel,
            work,
            on_finished : &|done| self.progress(ProgressParams { current: done, name: "", active: threads }),
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

pub fn cancel(app: &AppHandle) {
    app.state::<ActionControl>().cancelled.store(true, Ordering::SeqCst);
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

fn convert_one(run: &Run, source: &Path, format: TargetFormat) -> Result<Option<Saved>, String> {
    let from = SourceFormat::from_path(source).ok_or(READ_ERROR)?;
    if from.is(format) {
        return Ok(None);
    }

    let bytes = convert::convert(source, format)?;
    run.save(SaveParams { source, kind: OutputKind::Converted { extension: format.extension() }, bytes: &bytes }).map(Some)
}

fn compress_one(run: &Run, source: &Path) -> Result<Option<Saved>, String> {
    let from       = SourceFormat::from_path(source).ok_or(READ_ERROR)?;
    let compressed = compress::compress(source, from)?;

    if compressed.bytes.len() as u64 >= file_size(source) {
        return Ok(None);
    }

    let kind = OutputKind::Compressed { extension: &compressed.extension };
    run.save(SaveParams { source, kind, bytes: &compressed.bytes }).map(Some)
}

struct Collected {
    outcomes: Vec<FileOutcome>,
    entries: Vec<HistoryEntry>,
    batch: Option<Saved>,
    cancelled: bool,
}

struct CollectParams<'a> {
    run: &'a Run<'a>,
    results: Vec<Option<Result<Option<Saved>, String>>>,
    unchanged_reason: &'a str,
    action: &'a str,
    detail: &'a dyn Fn(&Path, &Saved) -> String,
}

// Turns the per-file results (in drop order) into outcomes and history entries; skipped files are left out.
fn collect_results(params: CollectParams) -> (Vec<FileOutcome>, Vec<HistoryEntry>) {
    let mut outcomes = Vec::new();
    let mut entries  = Vec::new();

    for (source, result) in params.run.paths.iter().zip(params.results) {
        match result {
            Some(Ok(Some(result))) => {
                let detail = (params.detail)(source, &result);
                entries.push(history::new_entry(NewEntryParams { output: &result.output, kind: IMAGE_KIND, action: params.action, detail }));
                outcomes.push(saved(source, &result));
            }
            Some(Ok(None))   => outcomes.push(unchanged(source, params.unchanged_reason)),
            Some(Err(error)) => outcomes.push(failed(source, error)),
            None             => {}
        }
    }

    (outcomes, entries)
}

fn run_convert(run: &Run, format: TargetFormat) -> Collected {
    let (results, cancelled) = run.each_parallel(|source| convert_one(run, source, format));
    let detail               = |_: &Path, _: &Saved| format!("Convertido a {}", format.label());

    let (outcomes, entries) = collect_results(CollectParams { run, results, unchanged_reason: SAME_FORMAT, action: "convert", detail: &detail });
    Collected { outcomes, entries, batch: None, cancelled }
}

fn run_compress(run: &Run) -> Collected {
    let (results, cancelled) = run.each_parallel(|source| compress_one(run, source));
    let detail               = |source: &Path, result: &Saved| history::reduced_detail(file_size(source), result.size);

    let (outcomes, entries) = collect_results(CollectParams { run, results, unchanged_reason: ALREADY_SMALL, action: "compress", detail: &detail });
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
            params.run.progress(ProgressParams { current: added, name: next, active: 1 });
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
    run.progress(ProgressParams { current: 0, name: &file_name(first), active: 1 });

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
    let detail   = format!("{} imágenes en un ZIP · {}", outputs.len(), format_size(report.size));
    let entry    = history::new_entry(NewEntryParams { output: &output, kind: ZIP_KIND, action, detail });

    Collected { outcomes, entries: vec![entry], batch: Some(Saved { output, size: report.size }), cancelled: collected.cancelled }
}

// Runs on a worker thread; one failure never stops the rest.
pub fn run(app: &AppHandle, request: ActionRequest) -> Result<ActionReport, String> {
    let control = app.state::<ActionControl>();
    control.cancelled.store(false, Ordering::SeqCst);

    let options     = request.options.unwrap_or(ActionOptions { format: None, destination: None, bundle: None });
    let destination = options.destination.unwrap_or_default();
    let paths       = request.paths.iter().map(PathBuf::from).collect::<Vec<_>>();
    let total       = paths.len();
    let action      = request.action_id.as_str();
    let bundled     = options.bundle.unwrap_or(false) && total > 1 && matches!(action, "convert" | "compress");
    let scratch     = if bundled { Some(scratch_folder()?) } else { None };

    // Bundled results are made in the scratch folder first, then zipped into the real destination.
    let work_destination = match &scratch {
        Some(folder) => Destination { mode: SaveMode::Custom, folder: Some(folder.to_string_lossy().into_owned()) },
        None         => destination.clone(),
    };

    let run = Run { app, paths, destination: work_destination, cancel: &control.cancelled, reserved: Mutex::new(HashSet::new()) };

    let collected = match (action, options.format) {
        ("convert", Some(format)) => run_convert(&run, format),
        ("compress", _)           => run_compress(&run),
        ("to-pdf", _)             => run_to_pdf(&run),
        ("zip", _)                => run_zip(&run),
        _                         => return Err(UNSUPPORTED_ERROR.to_string()),
    };

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
        cancelled   : collected.cancelled,
        bundled,
    })
}
