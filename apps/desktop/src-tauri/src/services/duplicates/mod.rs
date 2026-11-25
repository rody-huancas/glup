// "Archivos repetidos" (familia Tu PC): the same file kept more than once in the person's folders, to
// free the space of the extra copies. Exact copies (byte by byte) with one marked to stay; optionally,
// photos that look alike, apart and with nothing marked. Quitting sends them to the recycle bin in
// batches, with the same checks as Limpieza (still the same file, never every copy of a group).
pub mod keep;
pub mod same;
pub mod similar;
pub mod walk;

#[cfg(test)]
mod tests;

use std::{
    collections::HashMap,
    path::{Path, PathBuf},
    sync::{atomic::Ordering, Mutex},
    time::{Duration, Instant},
};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

use self::{
    keep::preselect,
    same::{same_content, SameParams},
    similar::{is_photo, similar_photos, SimilarParams},
    walk::{protected_roots, WalkParams},
};
use crate::services::{
    actions::{ActionControl, ActionProgress},
    cleanup::{self, folders, CategoryId, CleanFilesParams, CleanTally, KnownFile},
    history::{self, format_size, FilelessEntryParams, HistoryEntry},
    parallel::worker_count,
    progress::{self, Stage},
    tasks::TaskSummary,
};

pub const SCAN_ACTION: &str   = "duplicates-scan";
pub const REMOVE_ACTION: &str = "duplicates";
const HISTORY_NAME: &str      = "Archivos repetidos";
// Smaller files are not looked at unless asked (10 KB).
pub const DEFAULT_MIN_SIZE: u64 = 10 * 1024;
// The progress goes to the panel at most this often.
const PROGRESS_EVERY: Duration = Duration::from_millis(150);

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanRequest {
    pub folders  : Vec<String>,
    pub min_size : u64,
    // «Buscar también fotos parecidas».
    pub similar  : bool,
    pub task_id  : Option<String>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum GroupKind {
    Same,
    Similar,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GroupFile {
    pub path     : String,
    pub size     : u64,
    pub modified : i64,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FoundGroup {
    pub id       : u32,
    pub kind     : GroupKind,
    pub files    : Vec<GroupFile>,
    // The copy that would stay (exact copies only; alike photos come with nothing marked).
    pub keep     : Option<usize>,
    // The copies marked to quit: only the clear ones (empty: the person decides).
    pub quit     : Vec<usize>,
    // Copies in folders of their own with plain names: nothing marked, «Revisar».
    pub review   : bool,
    // What quitting every copy but the one that stays frees.
    pub freeable : u64,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DuplicatesScan {
    pub groups     : Vec<FoundGroup>,
    // Files in groups of exact copies, and what the extra copies take.
    pub files      : usize,
    pub freeable   : u64,
    pub scanned    : usize,
    pub cloud_only : usize,
    // Folders of programs and projects left whole.
    pub projects   : usize,
    pub cancelled  : bool,
    pub summary    : TaskSummary,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoveRequest {
    pub paths   : Vec<String>,
    pub task_id : Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoveReport {
    pub to_trash  : u64,
    pub removed   : usize,
    pub changed   : usize,
    pub in_use    : usize,
    pub failed    : usize,
    pub cancelled : bool,
    pub summary   : TaskSummary,
}

// The last scan: only its files can be quitted, each with its group (never all of one).
#[derive(Default)]
pub struct DuplicatesState(Mutex<HashMap<PathBuf, KnownFile>>);

// Where it looks and from what size, when nothing else is chosen.
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DuplicateDefaults {
    pub folders  : Vec<String>,
    pub min_size : u64,
}

pub fn defaults() -> DuplicateDefaults {
    DuplicateDefaults { folders: folders::duplicate_folders().into_iter().map(|folder| folder.to_string_lossy().into_owned()).collect(), min_size: DEFAULT_MIN_SIZE }
}

// Why that folder cannot be chosen (Windows, programs, AppData, the recycle bin, or not there).
pub fn folder_problem(path: &str) -> Option<String> {
    walk::folder_problem(Path::new(path), &protected_roots()).map(str::to_string)
}

// "45.000": a dot every three figures.
pub fn grouped(count: usize) -> String {
    let digits = count.to_string();
    let mut out = String::new();
    for (index, digit) in digits.chars().enumerate() {
        if index > 0 && (digits.len() - index) % 3 == 0 {
            out.push('.');
        }
        out.push(digit);
    }
    out
}

struct Reporter<'a> {
    app  : &'a AppHandle,
    task : &'a Option<String>,
    last : Mutex<Option<Instant>>,
}

impl Reporter<'_> {
    // A line ("Contando archivos… 45.000") and, when it can be counted, how far it went.
    fn send(&self, detail: String, current: usize, total: usize, now: bool) {
        let mut last = self.last.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
        if !now && last.is_some_and(|at| at.elapsed() < PROGRESS_EVERY) {
            return;
        }
        *last = Some(Instant::now());
        progress::emit(self.app, ActionProgress { current, total, detail: Some(detail), ..ActionProgress::at(self.task, Stage::Working) });
    }
}

fn group_file(file: &cleanup::walk::FileEntry) -> GroupFile {
    GroupFile { path: file.path.to_string_lossy().into_owned(), size: file.size, modified: file.modified }
}

pub fn scan_summary(scan: &DuplicatesScan) -> TaskSummary {
    let same = scan.groups.iter().filter(|group| group.kind == GroupKind::Same).count();
    let alike = scan.groups.len() - same;
    let cloud = (scan.cloud_only > 0).then(|| if scan.cloud_only == 1 { "Salté 1 archivo que está solo en la nube".to_string() } else { format!("Salté {} archivos que están solo en la nube", grouped(scan.cloud_only)) });
    let photos = (alike > 0).then(|| if alike == 1 { "1 grupo de fotos parecidas".to_string() } else { format!("{alike} grupos de fotos parecidas") });
    let projects = (scan.projects > 0).then(|| if scan.projects == 1 { "Salté 1 carpeta de programas y proyectos".to_string() } else { format!("Salté {} carpetas de programas y proyectos", grouped(scan.projects)) });
    let note   = [projects, cloud, photos].into_iter().flatten().collect::<Vec<_>>();

    let (tone, message) = if scan.cancelled {
        ("calm", "Dejé de buscar a pedido tuyo".to_string())
    } else if same == 0 {
        ("calm", "No encontré archivos repetidos".to_string())
    } else {
        let groups = if same == 1 { "1 grupo".to_string() } else { format!("{same} grupos") };
        ("success", format!("Encontré {} archivos repetidos en {groups} · {} que puedes liberar", grouped(scan.files), format_size(scan.freeable)))
    };
    TaskSummary { tone: tone.to_string(), message, note: (!note.is_empty()).then(|| note.join(" · ")) }
}

// Looks (nothing is touched): the files of the folders, the exact copies, and the alike photos if asked.
pub fn scan(app: &AppHandle, request: &ScanRequest) -> DuplicatesScan {
    let control = app.state::<ActionControl>();
    let cancel  = &control.cancelled;
    control.begin(&request.task_id);

    let reporter  = Reporter { app, task: &request.task_id, last: Mutex::new(None) };
    let threads   = worker_count();
    let roots: Vec<PathBuf> = request.folders.iter().map(PathBuf::from).collect();
    let protected = protected_roots();

    reporter.send("Contando archivos…".to_string(), 0, 0, true);
    let walked = walk::walk(WalkParams {
        roots     : &roots,
        protected : &protected,
        threads,
        cancel,
        on_count  : &|found| reporter.send(format!("Contando archivos… {}", grouped(found)), 0, 0, false),
    });

    let groups = same_content(SameParams {
        files       : &walked.files,
        min_size    : request.min_size.max(1),
        threads,
        cancel,
        on_progress : &|done, total| reporter.send(format!("Comparando {} posibles…", grouped(total)), done, total, done == 0),
    });

    let downloads = folders::user_folders().downloads;
    let by_path: HashMap<&PathBuf, &cleanup::walk::FileEntry> = walked.files.iter().map(|file| (&file.path, file)).collect();
    let mut found: Vec<FoundGroup> = groups
        .iter()
        .map(|files| {
            let chosen = preselect(files, downloads.as_deref());
            FoundGroup {
                id       : 0,
                kind     : GroupKind::Same,
                files    : files.iter().map(group_file).collect(),
                keep     : Some(chosen.keep),
                review   : chosen.quit.is_empty(),
                quit     : chosen.quit,
                freeable : files[0].size * (files.len() as u64 - 1),
            }
        })
        .collect();

    // Alike photos: among the photos that are not an extra copy (one of each exact group, the one that stays).
    if request.similar && !cancel.load(Ordering::SeqCst) {
        let extra: std::collections::HashSet<PathBuf> = groups.iter().zip(&found).flat_map(|(files, group)| files.iter().enumerate().filter(move |(index, _)| Some(*index) != group.keep).map(|(_, file)| file.path.clone())).collect();
        let photos: Vec<PathBuf> = walked.files.iter().filter(|file| file.size >= request.min_size.max(1) && is_photo(&file.path) && !extra.contains(&file.path)).map(|file| file.path.clone()).collect();
        let alike = similar_photos(SimilarParams {
            photos      : &photos,
            threads,
            cancel,
            on_progress : &|done, total| reporter.send(format!("Mirando fotos parecidas… {} de {}", grouped(done), grouped(total)), done, total, done == 0),
        });

        for paths in alike {
            let mut files: Vec<&cleanup::walk::FileEntry> = paths.iter().filter_map(|path| by_path.get(path).copied()).collect();
            files.sort_by_key(|file| (file.newest(), file.path.clone()));
            let biggest = files.iter().map(|file| file.size).max().unwrap_or(0);
            let total: u64 = files.iter().map(|file| file.size).sum();
            found.push(FoundGroup { id: 0, kind: GroupKind::Similar, files: files.into_iter().map(group_file).collect(), keep: None, quit: Vec::new(), review: true, freeable: total - biggest });
        }
    }

    // Most space first, exact copies before alike photos.
    found.sort_by_key(|group| (group.kind == GroupKind::Similar, std::cmp::Reverse(group.freeable)));
    for (index, group) in found.iter_mut().enumerate() {
        group.id = index as u32 + 1;
    }

    let mut known = HashMap::new();
    for group in &found {
        for file in &group.files {
            let path = PathBuf::from(&file.path);
            let Some(entry) = by_path.get(&path) else { continue };
            known.entry(path).or_insert(KnownFile { category: CategoryId::Duplicates, size: entry.size, modified: entry.modified, created: entry.created, group: Some(group.id) });
        }
    }
    if let Ok(mut state) = app.state::<DuplicatesState>().0.lock() {
        *state = known;
    }

    let same: Vec<&FoundGroup> = found.iter().filter(|group| group.kind == GroupKind::Same).collect();
    let mut scan = DuplicatesScan {
        files      : same.iter().map(|group| group.files.len()).sum(),
        freeable   : same.iter().map(|group| group.freeable).sum(),
        scanned    : walked.files.len(),
        cloud_only : walked.cloud_only,
        projects   : walked.projects,
        cancelled  : cancel.load(Ordering::SeqCst),
        groups     : found,
        summary    : TaskSummary { tone: String::new(), message: String::new(), note: None },
    };
    scan.summary = scan_summary(&scan);
    scan
}

pub fn remove_summary(tally: &CleanTally) -> TaskSummary {
    let mut notes = Vec::new();
    if tally.changed > 0 {
        notes.push(if tally.changed == 1 { "1 archivo cambió desde la búsqueda y lo dejé".to_string() } else { format!("{} archivos cambiaron desde la búsqueda y los dejé", tally.changed) });
    }
    if tally.in_use > 0 {
        notes.push(if tally.in_use == 1 { "1 archivo estaba en uso y quedó".to_string() } else { format!("{} archivos estaban en uso y quedaron", tally.in_use) });
    }
    if tally.failed > 0 {
        notes.push(if tally.failed == 1 { "1 archivo no se pudo quitar".to_string() } else { format!("{} archivos no se pudieron quitar", tally.failed) });
    }

    let problems = tally.changed + tally.in_use + tally.failed > 0;
    let (tone, message) = match (tally.to_trash, tally.cancelled) {
        (0, true)  => ("calm", "No quité nada: lo cancelaste".to_string()),
        (0, false) => (if problems { "failed" } else { "calm" }, "No pude quitar nada".to_string()),
        (bytes, _) => (if problems || tally.cancelled { "partial" } else { "success" }, format!("Liberé {}. Están en la papelera por si te arrepientes.", format_size(bytes))),
    };
    TaskSummary { tone: tone.to_string(), message, note: (!notes.is_empty()).then(|| notes.join(" · ")) }
}

// Quits what was marked, only from the last scan: to the recycle bin in batches, each file checked
// again (same size and date), and never every copy of a group.
pub fn remove(app: &AppHandle, request: &RemoveRequest) -> RemoveReport {
    let control = app.state::<ActionControl>();
    let cancel  = &control.cancelled;
    control.begin(&request.task_id);

    let known    = app.state::<DuplicatesState>().0.lock().map(|state| state.clone()).unwrap_or_default();
    let paths: Vec<PathBuf> = request.paths.iter().map(PathBuf::from).collect();
    let reporter = Reporter { app, task: &request.task_id, last: Mutex::new(None) };

    let tally = cleanup::clean_files(CleanFilesParams {
        known       : &known,
        paths       : &paths,
        cancel,
        remove      : &cleanup::remove_directly,
        to_trash    : &cleanup::to_trash_for_real,
        trash_one   : &cleanup::trash_one_for_real,
        on_progress : &|done, total| reporter.send(format!("Quitando {} de {}…", grouped(done), grouped(total)), done, total, done == total),
    });

    // A new search is needed before quitting more: nothing is quitted twice.
    if let Ok(mut state) = app.state::<DuplicatesState>().0.lock() {
        state.clear();
    }

    let summary = remove_summary(&tally);
    if tally.removed > 0 {
        let detail = summary.note.as_ref().map_or_else(|| summary.message.clone(), |note| format!("{} · {note}", summary.message));
        let entry  = history::fileless_entry(FilelessEntryParams { name: HISTORY_NAME, kind: REMOVE_ACTION, action: REMOVE_ACTION, detail });
        let _      = history::append(app, vec![HistoryEntry { saved: Some(tally.to_trash), ..entry }]);
    }

    RemoveReport { to_trash: tally.to_trash, removed: tally.removed, changed: tally.changed, in_use: tally.in_use, failed: tally.failed, cancelled: tally.cancelled, summary }
}
