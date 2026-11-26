// "Qué ocupa espacio": a disk or a folder read for what takes its space (only read: nothing changes
// unless the person sends something to the recycle bin), shown as it is found. Its tree lives here while
// Glup is open; the screen asks for one folder at a time.
pub mod known;
pub mod tree;
pub mod walk;

#[cfg(test)]
mod tests;

use std::{
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    thread,
    time::{Duration, Instant},
};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

use self::{
    known::known,
    tree::{Kind, Tree, ALL_KINDS, NOT_KNOWN},
    walk::{walk, Counters, WalkParams},
};
use crate::services::{
    actions::{ActionControl, ActionProgress},
    cleanup::{trash_one_for_real, RemoveError},
    duplicates::walk::{is_protected, protected_roots},
    history::format_size,
    parallel::worker_count,
    progress::{self, Stage},
    tasks::TaskSummary,
};

pub const SPACE_ACTION: &str    = "space";
pub const MISSING_ERROR: &str   = "No encuentro esa carpeta";
pub const NOTHING_ERROR: &str   = "Todavía no revisé nada";
pub const IN_USE_ERROR: &str    = "Un programa lo tiene abierto: ciérralo y vuelve a intentarlo";
pub const TRASH_ERROR: &str     = "No pude mandarlo a la papelera";
// The screen shows this many things of a folder (the rest as one block).
pub const SHOWN: usize = 80;
const REPORT_EVERY: Duration = Duration::from_millis(400);

pub struct Analysis {
    pub root      : PathBuf,
    pub tree      : Mutex<Tree>,
    pub counters  : Counters,
    pub done      : AtomicBool,
    pub cancelled : AtomicBool,
    pub started   : Instant,
}

#[derive(Default)]
pub struct SpaceState(Mutex<Option<Arc<Analysis>>>);

impl SpaceState {
    fn current(&self) -> Option<Arc<Analysis>> {
        self.0.lock().ok().and_then(|current| current.clone())
    }
}

// "120.000".
pub fn thousands(value: u64) -> String {
    let digits = value.to_string();
    let mut out = String::new();
    for (index, digit) in digits.chars().enumerate() {
        if index > 0 && (digits.len() - index) % 3 == 0 {
            out.push('.');
        }
        out.push(digit);
    }
    out
}

// «Revisé 120.000 archivos · 84 GB».
pub fn progress_line(files: u64, bytes: u64) -> String {
    format!("Revisé {} {} · {}", thousands(files), if files == 1 { "archivo" } else { "archivos" }, format_size(bytes))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalyzeRequest {
    pub root    : String,
    pub task_id : Option<String>,
}

// The whole disk or folder, as a task (progress and Cancelar); the screen reads the tree meanwhile.
pub fn analyze(app: &AppHandle, request: AnalyzeRequest) -> Result<TaskSummary, String> {
    let root = PathBuf::from(&request.root);
    if !root.is_dir() {
        return Err(MISSING_ERROR.to_string());
    }
    let control  = app.state::<ActionControl>();
    control.begin(&request.task_id);
    let name     = root.file_name().map(|name| name.to_string_lossy().into_owned()).unwrap_or_else(|| root.to_string_lossy().into_owned());
    let analysis = Arc::new(Analysis { root: root.clone(), tree: Mutex::new(Tree::with_root(&name)), counters: Counters::default(), done: AtomicBool::new(false), cancelled: AtomicBool::new(false), started: Instant::now() });
    if let Ok(mut current) = app.state::<SpaceState>().0.lock() {
        *current = Some(analysis.clone());
    }

    let finished = AtomicBool::new(false);
    thread::scope(|scope| {
        scope.spawn(|| {
            while !finished.load(Ordering::Relaxed) {
                let (files, bytes) = (analysis.counters.files.load(Ordering::Relaxed), analysis.counters.bytes.load(Ordering::Relaxed));
                progress::emit(app, ActionProgress { detail: Some(progress_line(files, bytes)), ..ActionProgress::at(&request.task_id, Stage::Working) });
                thread::sleep(REPORT_EVERY);
            }
        });
        walk(WalkParams { root: &root, tree: &analysis.tree, counters: &analysis.counters, threads: worker_count(), cancel: &control.cancelled, system: &protected_roots() });
        finished.store(true, Ordering::Relaxed);
    });

    let cancelled = control.cancelled.load(Ordering::SeqCst);
    analysis.cancelled.store(cancelled, Ordering::SeqCst);
    analysis.done.store(true, Ordering::SeqCst);
    let line = progress_line(analysis.counters.files.load(Ordering::Relaxed), analysis.counters.bytes.load(Ordering::Relaxed));
    eprintln!("[glup:espacio] {} en {:.1} s: {line}", root.display(), analysis.started.elapsed().as_secs_f64());
    Ok(if cancelled { TaskSummary::calm(format!("Me detuve. {line}")) } else { TaskSummary::success(format!("Listo. {line}")) })
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Item {
    pub id    : u32,
    pub name  : String,
    pub size  : u64,
    pub dir   : bool,
    pub kind  : Kind,
    pub files : u32,
    // The whole path (for «Abrir carpeta» and the list of the biggest files).
    pub path    : String,
    // How much of it is its kind (0 to 1): the strength of its colour.
    pub share   : f64,
    // What it is, in plain words, when it is a known one (known.json).
    pub note    : Option<String>,
    // Why it cannot go to the bin (None: it can).
    pub blocked : Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KindTotal {
    pub kind : Kind,
    pub size : u64,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Totals {
    pub files       : u64,
    pub bytes       : u64,
    pub cloud_files : u64,
    pub cloud_bytes : u64,
    pub denied      : u64,
    pub links       : u64,
    pub hard_links  : u64,
    pub done        : bool,
    pub cancelled   : bool,
    pub seconds     : f64,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SpaceView {
    pub folder   : Item,
    // From the root to this folder.
    pub crumbs   : Vec<Item>,
    pub children : Vec<Item>,
    // What did not fit in the list, as one block.
    pub rest     : Option<(u32, u64)>,
    pub kinds    : Vec<KindTotal>,
    pub biggest  : Vec<Item>,
    pub totals   : Totals,
}

pub fn path_of(root: &Path, tree: &Tree, id: u32) -> PathBuf {
    tree.trail(id).into_iter().skip(1).fold(root.to_path_buf(), |path, step| path.join(&*tree.nodes[step as usize].name))
}

fn item(root: &Path, tree: &Tree, id: u32) -> Item {
    let node = &tree.nodes[id as usize];
    let path = path_of(root, tree, id);
    let note = (node.known != NOT_KNOWN).then(|| known().get(node.known as usize).map(|entry| entry.note.clone())).flatten();
    Item {
        id,
        name    : node.name.to_string(),
        size    : node.size,
        dir     : node.dir,
        kind    : tree.main_kind(id),
        files   : node.files,
        share   : tree.share(id),
        blocked : trash_block(tree, id, &path, &protected_roots()).map(str::to_string),
        path    : path.to_string_lossy().into_owned(),
        note,
    }
}

pub fn view_of(analysis: &Analysis, id: u32) -> Option<SpaceView> {
    let tree = analysis.tree.lock().ok()?;
    let id   = if (id as usize) < tree.nodes.len() && tree.nodes[id as usize].dir && !tree.nodes[id as usize].removed { id } else { 0 };
    let root = &analysis.root;
    let all  = tree.children(id);
    let rest = (all.len() > SHOWN).then(|| (all.len() as u32 - SHOWN as u32, all[SHOWN..].iter().map(|child| tree.nodes[*child as usize].size).sum()));
    let node = &tree.nodes[id as usize];
    let c    = &analysis.counters;
    Some(SpaceView {
        folder   : item(root, &tree, id),
        crumbs   : tree.trail(id).into_iter().map(|step| item(root, &tree, step)).collect(),
        children : all.into_iter().take(SHOWN).map(|child| item(root, &tree, child)).collect(),
        rest,
        kinds    : ALL_KINDS.into_iter().map(|kind| KindTotal { kind, size: node.kinds[kind.index()] }).filter(|total| total.size > 0).collect(),
        biggest  : tree.top_files().into_iter().map(|file| item(root, &tree, file)).collect(),
        totals   : Totals {
            files       : c.files.load(Ordering::Relaxed),
            bytes       : c.bytes.load(Ordering::Relaxed),
            cloud_files : c.cloud_files.load(Ordering::Relaxed),
            cloud_bytes : c.cloud_bytes.load(Ordering::Relaxed),
            denied      : c.denied.load(Ordering::Relaxed),
            links       : c.links.load(Ordering::Relaxed),
            hard_links  : c.hard_links.load(Ordering::Relaxed),
            done        : analysis.done.load(Ordering::Relaxed),
            cancelled   : analysis.cancelled.load(Ordering::Relaxed),
            seconds     : analysis.started.elapsed().as_secs_f64(),
        },
    })
}

pub fn view(app: &AppHandle, id: u32) -> Result<SpaceView, String> {
    let analysis = app.state::<SpaceState>().current().ok_or(NOTHING_ERROR)?;
    view_of(&analysis, id).ok_or_else(|| NOTHING_ERROR.to_string())
}

// Why it cannot go to the bin: Windows, the programs and their data by where it is; a project, a program
// or a known file that must stay by what the analysis saw in it, around it or above it (never read
// again).
pub fn trash_block(tree: &Tree, id: u32, path: &Path, protected: &[PathBuf]) -> Option<&'static str> {
    if id != 0 && is_protected(path, protected) {
        return Some("Es de Windows o de un programa");
    }
    tree.trash_block(id)
}

// «Mandar a la papelera» (asked first on the screen): it leaves the totals at once.
pub fn trash(app: &AppHandle, id: u32) -> Result<SpaceView, String> {
    let analysis = app.state::<SpaceState>().current().ok_or(NOTHING_ERROR)?;
    let (path, dir, parent) = {
        let tree = analysis.tree.lock().map_err(|_| TRASH_ERROR.to_string())?;
        let node = tree.nodes.get(id as usize).ok_or(TRASH_ERROR)?;
        (path_of(&analysis.root, &tree, id), node.dir, node.parent)
    };
    let blocked = analysis.tree.lock().ok().and_then(|tree| trash_block(&tree, id, &path, &protected_roots()));
    if let Some(reason) = blocked {
        return Err(reason.to_string());
    }
    let sent = if dir { trash::delete(&path).map_err(|_| TRASH_ERROR.to_string()) } else {
        trash_one_for_real(&path).map_err(|error| if matches!(error, RemoveError::InUse) { IN_USE_ERROR.to_string() } else { TRASH_ERROR.to_string() })
    };
    sent?;
    if let Ok(mut tree) = analysis.tree.lock() {
        tree.remove(id);
    }
    view_of(&analysis, parent).ok_or_else(|| NOTHING_ERROR.to_string())
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Place {
    pub path  : String,
    pub label : String,
    pub free  : u64,
    pub total : u64,
}

// The disks of this PC (with their free and used space) and the person's folder, first.
pub fn places(app: &AppHandle) -> Vec<Place> {
    let mut found = Vec::new();
    if let Ok(home) = app.path().home_dir() {
        let name = home.file_name().map(|name| name.to_string_lossy().into_owned()).unwrap_or_default();
        found.push(Place { path: home.to_string_lossy().into_owned(), label: format!("Tu carpeta ({name})"), free: 0, total: 0 });
    }
    found.extend(disks());
    found
}

#[cfg(windows)]
fn disks() -> Vec<Place> {
    use std::{ffi::OsStr, os::windows::ffi::OsStrExt};

    use windows_sys::Win32::Storage::FileSystem::{GetDiskFreeSpaceExW, GetDriveTypeW, GetLogicalDrives, GetVolumeInformationW};

    const DRIVE_REMOVABLE: u32 = 2;
    const DRIVE_FIXED: u32     = 3;
    let mask = unsafe { GetLogicalDrives() };
    (0..26u32)
        .filter(|bit| mask & (1 << bit) != 0)
        .filter_map(|bit| {
            let letter = char::from(b'A' + bit as u8);
            let root   = format!("{letter}:\\");
            let wide: Vec<u16> = OsStr::new(&root).encode_wide().chain(Some(0)).collect();
            let kind = unsafe { GetDriveTypeW(wide.as_ptr()) };
            if kind != DRIVE_FIXED && kind != DRIVE_REMOVABLE {
                return None;
            }
            let (mut free, mut total, mut total_free) = (0u64, 0u64, 0u64);
            if unsafe { GetDiskFreeSpaceExW(wide.as_ptr(), &mut free, &mut total, &mut total_free) } == 0 {
                return None;
            }
            let mut name = [0u16; 64];
            let named    = unsafe { GetVolumeInformationW(wide.as_ptr(), name.as_mut_ptr(), name.len() as u32, std::ptr::null_mut(), std::ptr::null_mut(), std::ptr::null_mut(), std::ptr::null_mut(), 0) } != 0;
            let label    = if named { String::from_utf16_lossy(&name[..name.iter().position(|unit| *unit == 0).unwrap_or(0)]) } else { String::new() };
            let label    = if label.is_empty() { format!("Disco ({letter}:)") } else { format!("{label} ({letter}:)") };
            Some(Place { path: root, label, free, total })
        })
        .collect()
}

#[cfg(not(windows))]
fn disks() -> Vec<Place> {
    Vec::new()
}
