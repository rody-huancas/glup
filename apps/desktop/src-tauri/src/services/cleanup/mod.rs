pub mod browsers;
pub mod disk;
pub mod downloads;
pub mod duplicates;
pub mod folders;
pub mod large_files;
pub mod recycle_bin;
pub mod temp;
pub mod walk;

use std::{
    collections::{HashMap, HashSet},
    fs, io,
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicBool, Ordering},
        Mutex,
    },
    time::SystemTime,
};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};

use crate::services::{
    actions::{ActionControl, ActionProgress, ACTION_PROGRESS_EVENT},
    cleanup::{
        browsers::BrowsersParams,
        downloads::DownloadsParams,
        duplicates::DuplicatesParams,
        large_files::LargeFilesParams,
        temp::TempParams,
        walk::{FileEntry, ParallelWalkParams},
    },
    history::{self, format_size, FilelessEntryParams},
    parallel::worker_count,
    tasks::TaskSummary,
};

pub const CLEANUP_CATEGORY_EVENT: &str = "cleanup-category";

const HISTORY_NAME: &str = "Limpieza";
const HISTORY_KIND: &str = "cleanup";
const SCAN_ACTION: &str  = "cleanup-scan";
const CLEAN_ACTION: &str = "cleanup";

pub const SCAN_ACTION_ID: &str  = SCAN_ACTION;
pub const CLEAN_ACTION_ID: &str = CLEAN_ACTION;

// Windows errors for a file another program has open (sharing, lock) or locked against deletion.
const IN_USE_ERRORS: [i32; 3] = [5, 32, 33];

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum CategoryId {
    Temp,
    Browsers,
    RecycleBin,
    Installers,
    Archives,
    Duplicates,
    LargeFiles,
}

// Direct: Windows and the browsers make them again · EmptyRecycleBin: Windows' own API · Trash: the
// user's files, recoverable from the recycle bin.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum CleanMethod {
    Direct,
    EmptyRecycleBin,
    Trash,
}

// The order they are checked in; a file found by one is not offered again by the next ones.
pub const CATEGORY_ORDER: [CategoryId; 7] = [
    CategoryId::Temp,
    CategoryId::Browsers,
    CategoryId::RecycleBin,
    CategoryId::Installers,
    CategoryId::Archives,
    CategoryId::Duplicates,
    CategoryId::LargeFiles,
];

impl CategoryId {
    pub fn method(self) -> CleanMethod {
        match self {
            Self::Temp | Self::Browsers => CleanMethod::Direct,
            Self::RecycleBin            => CleanMethod::EmptyRecycleBin,
            _                           => CleanMethod::Trash,
        }
    }

    // Shown in the progress line ("Revisando…").
    fn progress_label(self) -> &'static str {
        match self {
            Self::Temp       => "Archivos temporales",
            Self::Browsers   => "Caché de navegadores",
            Self::RecycleBin => "Papelera",
            Self::Installers => "Instaladores viejos",
            Self::Archives   => "Comprimidos ya abiertos",
            Self::Duplicates => "Archivos repetidos",
            Self::LargeFiles => "Archivos grandes olvidados",
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FoundItem {
    pub path: String,
    pub size: u64,
    pub modified: i64,
    // Copies of the same file share a group (repeated files only).
    pub group: Option<u32>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CategoryReport {
    pub id: CategoryId,
    pub method: CleanMethod,
    pub items: Vec<FoundItem>,
    pub total: u64,
    pub count: u64,
    // Open browsers (their files in use will stay).
    pub running: Vec<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanupScan {
    pub categories: Vec<CategoryReport>,
    pub cancelled: bool,
    pub summary: TaskSummary,
}

// What a scan saw of each file, to check again right before deleting it.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct KnownFile {
    pub category: CategoryId,
    pub size: u64,
    pub modified: i64,
    pub created: i64,
    pub group: Option<u32>,
}

// The last scan: only files in it can ever be deleted.
#[derive(Default)]
pub struct CleanupState(Mutex<HashMap<PathBuf, KnownFile>>);

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanRequest {
    pub task_id: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanRequest {
    pub paths: Vec<String>,
    pub empty_recycle_bin: bool,
    pub task_id: Option<String>,
}

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct CleanTally {
    // Really gone from the disk (deleted directly, or the recycle bin emptied).
    pub freed: u64,
    // Moved to the recycle bin: recoverable, freed only when the bin is emptied.
    pub to_trash: u64,
    pub removed: usize,
    pub in_use: usize,
    pub changed: usize,
    pub failed: usize,
    pub cancelled: bool,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanReport {
    pub freed: u64,
    pub to_trash: u64,
    pub removed: usize,
    pub in_use: usize,
    pub changed: usize,
    pub failed: usize,
    pub cancelled: bool,
    pub summary: TaskSummary,
}

#[derive(Debug, PartialEq, Eq)]
pub enum RemoveError {
    InUse,
    Failed,
}

struct ProgressParams<'a> {
    app: &'a AppHandle,
    task: &'a Option<String>,
    current: usize,
    total: usize,
    name: &'a str,
}

fn emit_progress(params: ProgressParams) {
    let progress = ActionProgress { task_id: params.task.clone(), current: params.current, total: params.total, name: params.name.to_string(), active: 1, detail: None };

    if let Some(task) = params.task {
        crate::services::tasks::progress(params.app, task, &progress);
    }

    let _ = params.app.emit(ACTION_PROGRESS_EVENT, progress);
}

fn item(file: &FileEntry, group: Option<u32>) -> FoundItem {
    FoundItem { path: file.path.to_string_lossy().into_owned(), size: file.size, modified: file.modified, group }
}

struct CategoryParams<'a> {
    id: CategoryId,
    files: Vec<FileEntry>,
    claimed: &'a mut HashSet<PathBuf>,
    known: &'a mut HashMap<PathBuf, KnownFile>,
}

// Files already offered by an earlier category are left out, and the rest are remembered.
fn category(params: CategoryParams) -> CategoryReport {
    let CategoryParams { id, files, claimed, known } = params;
    let files: Vec<FileEntry> = files.into_iter().filter(|file| !claimed.contains(&file.path)).collect();

    for file in &files {
        claimed.insert(file.path.clone());
        known.insert(file.path.clone(), KnownFile { category: id, size: file.size, modified: file.modified, created: file.created, group: None });
    }

    CategoryReport {
        id,
        method  : id.method(),
        total   : files.iter().map(|file| file.size).sum(),
        count   : files.len() as u64,
        items   : files.iter().map(|file| item(file, None)).collect(),
        running : Vec::new(),
    }
}

struct DuplicateCategoryParams<'a> {
    groups: Vec<duplicates::DuplicateGroup>,
    claimed: &'a mut HashSet<PathBuf>,
    known: &'a mut HashMap<PathBuf, KnownFile>,
}

// Copies already offered elsewhere leave their group; a group left with one copy is no longer one.
// The total is what deleting every copy but one would free.
fn duplicate_category(params: DuplicateCategoryParams) -> CategoryReport {
    let DuplicateCategoryParams { groups, claimed, known } = params;
    let mut items = Vec::new();
    let mut total = 0;
    let mut count = 0;

    for (index, group) in groups.into_iter().enumerate() {
        let files: Vec<FileEntry> = group.files.into_iter().filter(|file| !claimed.contains(&file.path)).collect();
        if files.len() < 2 {
            continue;
        }

        let id = index as u32;
        total += files[0].size * (files.len() as u64 - 1);
        count += files.len() as u64;

        for file in &files {
            claimed.insert(file.path.clone());
            known.insert(file.path.clone(), KnownFile { category: CategoryId::Duplicates, size: file.size, modified: file.modified, created: file.created, group: Some(id) });
            items.push(item(file, Some(id)));
        }
    }

    CategoryReport { id: CategoryId::Duplicates, method: CleanMethod::Trash, items, total, count, running: Vec::new() }
}

fn personal_files(roots: &[PathBuf], cancel: &AtomicBool) -> Vec<FileEntry> {
    walk::files_in_parallel(ParallelWalkParams { roots, cancel, personal: true })
}

// Before: one thread per root, so one big folder (Documents) kept the others waiting.
// fn personal_files(roots: &[PathBuf], cancel: &AtomicBool) -> Vec<FileEntry> {
//     let threads = worker_count().min(roots.len()).max(1);
//
//     run_parallel(ParallelParams {
//         paths       : roots,
//         threads,
//         cancel,
//         work        : |root: &Path| walk::files(WalkParams { root, recursive: true, cancel, personal: true }),
//         on_finished : &|_| {},
//     })
//     .into_iter()
//     .flatten()
//     .flatten()
//     .collect()
// }

fn scan_summary(categories: &[CategoryReport], cancelled: bool) -> TaskSummary {
    let total = categories.iter().map(|category| category.total).sum::<u64>();

    if cancelled {
        return TaskSummary::calm(format!("Revisión cancelada · encontré {} hasta ahí", format_size(total)));
    }

    if total == 0 {
        return TaskSummary::calm("No encontré nada que valga la pena borrar".to_string());
    }

    TaskSummary::success(format!("Encontré {} que puedes liberar", format_size(total)))
}

// "Revisar mi PC": each category in turn (each one walks its folders in parallel), reported as soon as
// it is done. Nothing is deleted here.
pub fn scan(app: &AppHandle, task: &Option<String>) -> CleanupScan {
    let control = app.state::<ActionControl>();
    let cancel  = &control.cancelled;
    cancel.store(false, Ordering::SeqCst);

    let folders  = folders::user_folders();
    let now      = walk::millis(SystemTime::now());
    let roots    = walk::distinct_roots(folders.personal.clone());
    let total    = CATEGORY_ORDER.len();
    let mut seen = HashSet::new();
    let mut known: HashMap<PathBuf, KnownFile> = HashMap::new();
    let mut personal: Option<Vec<FileEntry>>   = None;
    let mut categories                         = Vec::new();

    for (index, id) in CATEGORY_ORDER.into_iter().enumerate() {
        if cancel.load(Ordering::SeqCst) {
            break;
        }

        emit_progress(ProgressParams { app, task, current: index, total, name: id.progress_label() });

        let report = match id {
            CategoryId::Temp => {
                let files = folders.temp.as_deref().map(|root| temp::scan(TempParams { root, now, cancel })).unwrap_or_default();
                category(CategoryParams { id, files, claimed: &mut seen, known: &mut known })
            }
            CategoryId::Browsers => {
                let scan = folders.local_app_data.as_deref().map(|local_app_data| {
                    browsers::scan(BrowsersParams { local_app_data, roaming_app_data: folders.roaming_app_data.as_deref(), cancel })
                });
                let scan = scan.unwrap_or_default();
                CategoryReport { running: scan.running, ..category(CategoryParams { id, files: scan.files, claimed: &mut seen, known: &mut known }) }
            }
            CategoryId::RecycleBin => {
                let size  = recycle_bin::size().unwrap_or_default();
                let items = recycle_bin::items();
                CategoryReport {
                    id,
                    method  : CleanMethod::EmptyRecycleBin,
                    total   : size.bytes,
                    count   : size.items,
                    items   : items.iter().map(|file| item(file, None)).collect(),
                    running : Vec::new(),
                }
            }
            CategoryId::Installers | CategoryId::Archives => {
                let files = folders.downloads.as_deref().map(|folder| {
                    let params = DownloadsParams { folder, now, cancel };
                    if id == CategoryId::Installers { downloads::installers(params) } else { downloads::archives(params) }
                });
                category(CategoryParams { id, files: files.unwrap_or_default(), claimed: &mut seen, known: &mut known })
            }
            CategoryId::Duplicates => {
                let files  = personal.get_or_insert_with(|| personal_files(&roots, cancel));
                let groups = duplicates::scan(DuplicatesParams { files, threads: worker_count(), cancel });
                duplicate_category(DuplicateCategoryParams { groups, claimed: &mut seen, known: &mut known })
            }
            CategoryId::LargeFiles => {
                let files = personal.get_or_insert_with(|| personal_files(&roots, cancel));
                let found = large_files::scan(LargeFilesParams { files, now });
                category(CategoryParams { id, files: found, claimed: &mut seen, known: &mut known })
            }
        };

        // A category cut short by a cancel is not shown half done.
        if cancel.load(Ordering::SeqCst) {
            break;
        }

        let _ = app.emit(CLEANUP_CATEGORY_EVENT, &report);
        categories.push(report);
    }

    let cancelled = categories.len() < total;
    emit_progress(ProgressParams { app, task, current: categories.len(), total, name: "" });

    if let Ok(mut state) = app.state::<CleanupState>().0.lock() {
        *state = known;
    }

    let summary = scan_summary(&categories, cancelled);
    CleanupScan { categories, cancelled, summary }
}

// Never all the copies of a file: when every copy of a group is asked for, the oldest one stays.
pub fn keep_one_copy(known: &HashMap<PathBuf, KnownFile>, paths: &[PathBuf]) -> Vec<PathBuf> {
    let asked: HashSet<&PathBuf> = paths.iter().collect();
    let mut groups: HashMap<u32, Vec<&PathBuf>> = HashMap::new();

    for (path, file) in known {
        if let Some(group) = file.group {
            groups.entry(group).or_default().push(path);
        }
    }

    let kept: HashSet<&PathBuf> = groups
        .values()
        .filter(|members| members.iter().all(|path| asked.contains(path)))
        .filter_map(|members| members.iter().min_by_key(|path| (known[**path].modified.max(known[**path].created), (**path).clone())).copied())
        .collect();

    paths.iter().filter(|path| !kept.contains(path)).cloned().collect()
}

// The file must still be what the scan saw: same size and same date. Otherwise it is left alone.
pub fn still_matches(expected: &KnownFile, current: Option<&FileEntry>) -> bool {
    current.is_some_and(|file| file.size == expected.size && file.modified == expected.modified)
}

pub struct CleanFilesParams<'a> {
    pub known: &'a HashMap<PathBuf, KnownFile>,
    pub paths: &'a [PathBuf],
    pub cancel: &'a AtomicBool,
    pub remove: &'a dyn Fn(&Path, CleanMethod) -> Result<(), RemoveError>,
    pub on_progress: &'a dyn Fn(usize, usize, &Path),
}

// Deletes what was asked for, and only what the last scan found: paths it did not see are ignored,
// files that changed since are skipped, and the byte counts only include what really went away.
pub fn clean_files(params: CleanFilesParams) -> CleanTally {
    let paths: Vec<PathBuf> = keep_one_copy(params.known, params.paths)
        .into_iter()
        .filter(|path| params.known.get(path).is_some_and(|file| file.category.method() != CleanMethod::EmptyRecycleBin))
        .collect();

    let mut tally = CleanTally::default();

    for (index, path) in paths.iter().enumerate() {
        if params.cancel.load(Ordering::SeqCst) {
            tally.cancelled = true;
            break;
        }

        (params.on_progress)(index, paths.len(), path);

        let expected = &params.known[path];
        if !still_matches(expected, walk::current(path).as_ref()) {
            tally.changed += 1;
            continue;
        }

        let method = expected.category.method();

        match (params.remove)(path, method) {
            Ok(()) => {
                tally.removed += 1;
                if method == CleanMethod::Trash { tally.to_trash += expected.size } else { tally.freed += expected.size }
            }
            Err(RemoveError::InUse)  => tally.in_use += 1,
            Err(RemoveError::Failed) => tally.failed += 1,
        }
    }

    tally
}

fn classify(error: &io::Error) -> RemoveError {
    if error.raw_os_error().is_some_and(|code| IN_USE_ERRORS.contains(&code)) || error.kind() == io::ErrorKind::PermissionDenied {
        RemoveError::InUse
    } else {
        RemoveError::Failed
    }
}

fn remove_for_real(path: &Path, method: CleanMethod) -> Result<(), RemoveError> {
    match method {
        CleanMethod::Direct          => fs::remove_file(path).map_err(|error| classify(&error)),
        CleanMethod::Trash           => trash::delete(path).map_err(|_| RemoveError::Failed),
        CleanMethod::EmptyRecycleBin => Err(RemoveError::Failed),
    }
}

fn counted(count: usize, singular: &str, plural: &str) -> String {
    if count == 1 { singular.to_string() } else { plural.replace('#', &count.to_string()) }
}

// "Liberaste 3,1 GB", plus what could not be done, said plainly.
pub fn clean_summary(tally: &CleanTally) -> TaskSummary {
    let mut notes = Vec::new();

    if tally.in_use > 0 {
        notes.push(counted(tally.in_use, "1 archivo estaba en uso y quedó", "# archivos estaban en uso y quedaron"));
    }
    if tally.changed > 0 {
        notes.push(counted(tally.changed, "1 archivo cambió desde la revisión y lo dejé", "# archivos cambiaron desde la revisión y los dejé"));
    }
    if tally.failed > 0 {
        notes.push(counted(tally.failed, "1 archivo no se pudo borrar", "# archivos no se pudieron borrar"));
    }
    if tally.to_trash > 0 && tally.freed > 0 {
        notes.push(format!("{} están en la papelera: se liberan cuando la vacíes", format_size(tally.to_trash)));
    }

    let problems = tally.in_use + tally.changed + tally.failed > 0;
    let message  = match (tally.freed, tally.to_trash) {
        (0, 0)        => "No pude liberar nada".to_string(),
        (0, to_trash) => format!("Moví {} a la papelera: se libera cuando la vacíes", format_size(to_trash)),
        (freed, _)    => format!("Liberaste {}", format_size(freed)),
    };

    let tone = match (tally.freed + tally.to_trash > 0, problems) {
        (true, false)  => "success",
        (true, true)   => "partial",
        (false, true)  => "failed",
        (false, false) => "calm",
    };

    TaskSummary { tone: tone.to_string(), message, note: (!notes.is_empty()).then(|| notes.join(" · ")) }
}

// "Liberar": the recycle bin first (so what goes to it now stays recoverable), then each file.
pub fn clean(app: &AppHandle, request: &CleanRequest) -> CleanReport {
    let control = app.state::<ActionControl>();
    let cancel  = &control.cancelled;
    cancel.store(false, Ordering::SeqCst);

    let known = app.state::<CleanupState>().0.lock().map(|state| state.clone()).unwrap_or_default();
    let paths: Vec<PathBuf> = request.paths.iter().map(PathBuf::from).collect();
    let task  = &request.task_id;

    let mut freed_bin = 0;
    if request.empty_recycle_bin {
        emit_progress(ProgressParams { app, task, current: 0, total: paths.len() + 1, name: CategoryId::RecycleBin.progress_label() });

        let before = recycle_bin::size().unwrap_or_default().bytes;
        if recycle_bin::empty() {
            freed_bin = before.saturating_sub(recycle_bin::size().unwrap_or_default().bytes);
        }
    }

    let on_progress = |current: usize, total: usize, path: &Path| {
        let name = path.file_name().map(|name| name.to_string_lossy().into_owned()).unwrap_or_default();
        emit_progress(ProgressParams { app, task, current, total, name: &name });
    };

    let mut tally = clean_files(CleanFilesParams { known: &known, paths: &paths, cancel, remove: &remove_for_real, on_progress: &on_progress });
    tally.freed  += freed_bin;

    emit_progress(ProgressParams { app, task, current: paths.len(), total: paths.len(), name: "" });

    // The next cleaning needs a new scan: nothing from this one can be deleted twice.
    if let Ok(mut state) = app.state::<CleanupState>().0.lock() {
        state.clear();
    }

    let summary = clean_summary(&tally);
    let detail  = summary.note.as_ref().map_or_else(|| summary.message.clone(), |note| format!("{} · {note}", summary.message));
    let entry   = history::fileless_entry(FilelessEntryParams { name: HISTORY_NAME, kind: HISTORY_KIND, action: CLEAN_ACTION, detail });
    let _       = history::append(app, vec![entry]);

    CleanReport {
        freed     : tally.freed,
        to_trash  : tally.to_trash,
        removed   : tally.removed,
        in_use    : tally.in_use,
        changed   : tally.changed,
        failed    : tally.failed,
        cancelled : tally.cancelled,
        summary,
    }
}

#[cfg(test)]
pub mod tests {
    use std::{
        cell::RefCell,
        fs::{File, FileTimes, OpenOptions},
        sync::atomic::AtomicUsize,
        time::{Duration, SystemTime},
    };

    use super::*;
    use crate::services::cleanup::walk::WalkParams;

    pub const DAY_MS: i64 = 24 * 60 * 60 * 1000;

    static NEXT_FOLDER: AtomicUsize = AtomicUsize::new(0);

    pub fn now() -> i64 {
        walk::millis(SystemTime::now())
    }

    pub fn temp_folder(name: &str) -> PathBuf {
        let folder = std::env::temp_dir().join(format!("glup-cleanup-{}-{name}-{}", std::process::id(), NEXT_FOLDER.fetch_add(1, Ordering::SeqCst)));
        let _      = fs::remove_dir_all(&folder);
        fs::create_dir_all(&folder).unwrap();
        folder
    }

    pub fn write_bytes(path: &Path, bytes: &[u8]) {
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        fs::write(path, bytes).unwrap();
    }

    pub fn write_file(path: &Path, size: usize) {
        write_bytes(path, &vec![1u8; size]);
    }

    // Back-dates both the modification and the creation time.
    pub fn age_file(path: &Path, age_ms: i64) {
        let when  = SystemTime::now() - Duration::from_millis(age_ms as u64);
        let times = FileTimes::new().set_modified(when).set_accessed(when);

        #[cfg(windows)]
        let times = {
            use std::os::windows::fs::FileTimesExt;
            times.set_created(when)
        };

        OpenOptions::new().write(true).open(path).unwrap().set_times(times).unwrap();
    }

    fn known_from(folder: &Path, category: CategoryId) -> HashMap<PathBuf, KnownFile> {
        let cancel = AtomicBool::new(false);

        walk::files(WalkParams { root: folder, recursive: true, cancel: &cancel, personal: false })
            .into_iter()
            .map(|file| (file.path.clone(), KnownFile { category, size: file.size, modified: file.modified, created: file.created, group: None }))
            .collect()
    }

    #[test]
    fn checks_every_file_again_before_deleting() {
        let folder = temp_folder("recheck");
        write_file(&folder.join("igual.tmp"), 10);
        write_file(&folder.join("cambiado.tmp"), 10);
        write_file(&folder.join("borrado.tmp"), 10);

        let known = known_from(&folder, CategoryId::Temp);
        File::options().write(true).open(folder.join("cambiado.tmp")).unwrap().set_len(20).unwrap();
        fs::remove_file(folder.join("borrado.tmp")).unwrap();

        let removed = RefCell::new(Vec::new());
        let remove  = |path: &Path, _: CleanMethod| {
            removed.borrow_mut().push(path.to_path_buf());
            Ok(())
        };
        let paths: Vec<PathBuf> = known.keys().cloned().chain([folder.join("ajeno.txt")]).collect();
        let cancel              = AtomicBool::new(false);

        let tally = clean_files(CleanFilesParams { known: &known, paths: &paths, cancel: &cancel, remove: &remove, on_progress: &|_, _, _| {} });

        // Called exactly once, only for the file that did not change.
        assert_eq!(*removed.borrow(), vec![folder.join("igual.tmp")]);
        assert_eq!(tally.removed, 1);
        assert_eq!(tally.changed, 2);
        assert_eq!(tally.freed, 10);
        let _ = fs::remove_dir_all(&folder);
    }

    #[test]
    fn never_deletes_every_copy() {
        let file = |modified: i64| KnownFile { category: CategoryId::Duplicates, size: 5, modified, created: modified, group: Some(1) };
        let known: HashMap<PathBuf, KnownFile> = [
            (PathBuf::from("vieja.bin"), file(100)),
            (PathBuf::from("nueva.bin"), file(300)),
            (PathBuf::from("media.bin"), file(200)),
        ]
        .into_iter()
        .collect();

        let all: Vec<PathBuf> = ["nueva.bin", "media.bin", "vieja.bin"].map(PathBuf::from).to_vec();
        let mut kept          = keep_one_copy(&known, &all);
        kept.sort();

        assert_eq!(kept, vec![PathBuf::from("media.bin"), PathBuf::from("nueva.bin")]);
        assert_eq!(keep_one_copy(&known, &all[..1]), vec![PathBuf::from("nueva.bin")]);
    }

    #[test]
    fn counts_files_in_use_and_moves_personal_ones_to_the_trash() {
        let folder = temp_folder("in-use");
        write_file(&folder.join("abierto.tmp"), 10);
        write_file(&folder.join("instalador.exe"), 30);

        let mut known = known_from(&folder, CategoryId::Temp);
        if let Some(file) = known.get_mut(&folder.join("instalador.exe")) {
            file.category = CategoryId::Installers;
        }

        let remove = |path: &Path, method: CleanMethod| {
            if path.ends_with("abierto.tmp") { Err(RemoveError::InUse) } else { assert_eq!(method, CleanMethod::Trash); Ok(()) }
        };
        let paths: Vec<PathBuf> = known.keys().cloned().collect();
        let cancel              = AtomicBool::new(false);
        let tally               = clean_files(CleanFilesParams { known: &known, paths: &paths, cancel: &cancel, remove: &remove, on_progress: &|_, _, _| {} });

        assert_eq!((tally.freed, tally.to_trash, tally.in_use), (0, 30, 1));
        assert_eq!(clean_summary(&tally).note.as_deref(), Some("1 archivo estaba en uso y quedó"));
        let _ = fs::remove_dir_all(&folder);
    }

    #[test]
    fn says_what_was_freed_plainly() {
        let tally = CleanTally { freed: 3 * 1024 * 1024 * 1024, to_trash: 0, removed: 10, in_use: 12, changed: 0, failed: 0, cancelled: false };
        let summary = clean_summary(&tally);

        assert_eq!(summary.message, "Liberaste 3 GB");
        assert_eq!(summary.note.as_deref(), Some("12 archivos estaban en uso y quedaron"));
        assert_eq!(summary.tone, "partial");
    }

    // Diagnosis on the real PC: only scans (never deletes) and prints what each category found.
    #[test]
    #[ignore]
    fn scans_this_pc_without_deleting() {
        let cancel  = AtomicBool::new(false);
        let folders = folders::user_folders();
        let now     = now();
        let roots   = walk::distinct_roots(folders.personal.clone());
        let mut seen  = HashSet::new();
        let mut known = HashMap::new();
        let clock   = std::time::Instant::now();
        let print   = |report: &CategoryReport| println!("{:<12?} {:>10} · {} elementos{} · {:.1} s", report.id, format_size(report.total), report.count, if report.running.is_empty() { String::new() } else { format!(" · abiertos: {}", report.running.join(", ")) }, clock.elapsed().as_secs_f64());

        let temp = folders.temp.as_deref().map(|root| temp::scan(TempParams { root, now, cancel: &cancel })).unwrap_or_default();
        print(&category(CategoryParams { id: CategoryId::Temp, files: temp, claimed: &mut seen, known: &mut known }));

        let browsers = browsers::scan(BrowsersParams { local_app_data: folders.local_app_data.as_deref().unwrap(), roaming_app_data: folders.roaming_app_data.as_deref(), cancel: &cancel });
        let running  = browsers.running.clone();
        print(&CategoryReport { running, ..category(CategoryParams { id: CategoryId::Browsers, files: browsers.files, claimed: &mut seen, known: &mut known }) });

        let bin = recycle_bin::size().unwrap_or_default();
        println!("RecycleBin   {:>10} · {} elementos · {:.1} s", format_size(bin.bytes), bin.items, clock.elapsed().as_secs_f64());
        println!("(listar la papelera: {} elementos · {:.1} s)", recycle_bin::items().len(), clock.elapsed().as_secs_f64());

        let downloads = folders.downloads.clone().unwrap();
        let installers = downloads::installers(DownloadsParams { folder: &downloads, now, cancel: &cancel });
        print(&category(CategoryParams { id: CategoryId::Installers, files: installers, claimed: &mut seen, known: &mut known }));
        let archives = downloads::archives(DownloadsParams { folder: &downloads, now, cancel: &cancel });
        print(&category(CategoryParams { id: CategoryId::Archives, files: archives, claimed: &mut seen, known: &mut known }));

        let started  = std::time::Instant::now();
        let personal = personal_files(&roots, &cancel);
        println!("(personales: {} archivos en {:?}, {:.1} s)", personal.len(), roots, started.elapsed().as_secs_f64());

        let groups = duplicates::scan(DuplicatesParams { files: &personal, threads: worker_count(), cancel: &cancel });
        print(&duplicate_category(DuplicateCategoryParams { groups, claimed: &mut seen, known: &mut known }));
        print(&category(CategoryParams { id: CategoryId::LargeFiles, files: large_files::scan(LargeFilesParams { files: &personal, now }), claimed: &mut seen, known: &mut known }));
        println!("(revisión total {:.1} s, nada borrado)", started.elapsed().as_secs_f64());
    }
}
