// The files of the chosen folders, counted as they are found. Never inside Windows, the programs,
// AppData or the recycle bin (even if one of those is chosen), never following links, and never
// opening a file that is only in the cloud (OneDrive, Google Drive): those are counted apart. Never
// inside a project or a program either (skip.json): hidden and dot folders, the folders of
// dependencies and builds (node_modules, target…), and any folder that is a project (package.json,
// Cargo.toml, .git, *.sln…) or a program (an .exe beside DLLs). Quitting a file there breaks it.
use std::{
    fs,
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicBool, AtomicUsize, Ordering},
        OnceLock,
    },
};

use serde::Deserialize;
use walkdir::{DirEntry, WalkDir};

use crate::services::{
    paths,
    cleanup::walk::{attributes, enterable, file_entry, is_cloud_only, FileEntry},
    parallel::{run_parallel, ParallelParams},
};

pub const PROTECTED_ERROR: &str = "Esa carpeta es de Windows o de tus programas: ahí no busco";

// What is never entered, as data (skip.json).
#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkipRules {
    // Folders of dependencies and builds, by name.
    pub folders            : Vec<String>,
    // A folder with one of these files, folders or extensions is a project.
    pub project_files      : Vec<String>,
    pub project_folders    : Vec<String>,
    pub project_extensions : Vec<String>,
    // A folder with a program and its libraries side by side is a program.
    pub program_extensions : Vec<String>,
    pub library_extensions : Vec<String>,
}

pub fn skip_rules() -> &'static SkipRules {
    static RULES: OnceLock<SkipRules> = OnceLock::new();
    RULES.get_or_init(|| serde_json::from_str(include_str!("skip.json")).unwrap_or_default())
}

fn has_extension(name: &str, extensions: &[String]) -> bool {
    name.rsplit_once('.').is_some_and(|(_, extension)| extensions.iter().any(|known| known.eq_ignore_ascii_case(extension)))
}

// A folder of dependencies or builds, or one that is a project or a program (what is inside says it).
pub fn is_project_or_build(folder: &Path, rules: &SkipRules) -> bool {
    let name = folder.file_name().map(|name| name.to_string_lossy().into_owned()).unwrap_or_default();
    if rules.folders.iter().any(|skipped| skipped.eq_ignore_ascii_case(&name)) {
        return true;
    }

    let Ok(entries) = fs::read_dir(folder) else { return false };
    let (mut program, mut library) = (false, false);
    for entry in entries.flatten() {
        let name   = entry.file_name().to_string_lossy().into_owned();
        let folder = entry.file_type().is_ok_and(|kind| kind.is_dir());
        if folder && rules.project_folders.iter().any(|marker| marker.eq_ignore_ascii_case(&name)) {
            return true;
        }
        if folder && has_extension(&name, &rules.project_extensions) {
            return true;
        }
        if !folder && (rules.project_files.iter().any(|marker| marker.eq_ignore_ascii_case(&name)) || has_extension(&name, &rules.project_extensions)) {
            return true;
        }
        program |= !folder && has_extension(&name, &rules.program_extensions);
        library |= !folder && has_extension(&name, &rules.library_extensions);
    }
    program && library
}

// Hidden folders and those whose name starts with a dot (.git, .vscode, .cache…).
fn hidden_folder(entry: &DirEntry) -> bool {
    let dot    = entry.file_name().to_string_lossy().starts_with('.');
    let hidden = entry.metadata().is_ok_and(|metadata| attributes(&metadata) & FILE_ATTRIBUTE_HIDDEN != 0);
    dot || hidden
}

const FILE_ATTRIBUTE_HIDDEN: u32 = 0x2;
pub const MISSING_ERROR: &str   = "No encuentro esa carpeta";

// Windows, the programs, their data and the recycle bin, from the environment of this computer.
pub fn protected_roots() -> Vec<PathBuf> {
    let from_env = |name: &str| std::env::var_os(name).map(PathBuf::from);
    let app_data = from_env("APPDATA").and_then(|roaming| roaming.parent().map(Path::to_path_buf));
    [from_env("SystemRoot"), from_env("ProgramFiles"), from_env("ProgramFiles(x86)"), from_env("ProgramW6432"), from_env("ProgramData"), app_data, from_env("LOCALAPPDATA")]
        .into_iter()
        .flatten()
        .collect()
}

// Inside (or the same as) one of the protected folders, or a recycle bin anywhere. Compared as Windows
// sees them (services/paths.rs): a short 8.3 name, other capitals or a final \ are the same folder.
pub fn is_protected(path: &Path, protected: &[PathBuf]) -> bool {
    let bin = paths::normalized(path).split('\\').any(|part| part == "$recycle.bin");
    bin || protected.iter().any(|root| paths::is_inside(path, root))
}

// Why a folder cannot be looked in, or None.
pub fn folder_problem(path: &Path, protected: &[PathBuf]) -> Option<&'static str> {
    if is_protected(path, protected) {
        return Some(PROTECTED_ERROR);
    }
    (!path.is_dir()).then_some(MISSING_ERROR)
}

pub struct WalkParams<'a> {
    pub roots     : &'a [PathBuf],
    pub protected : &'a [PathBuf],
    pub threads   : usize,
    pub cancel    : &'a AtomicBool,
    // Files found so far (for «Contando archivos… 45.000»).
    pub on_count  : &'a (dyn Fn(usize) + Sync),
}

#[derive(Debug, Default)]
pub struct Walked {
    pub files      : Vec<FileEntry>,
    // Only in the cloud: skipped, never downloaded.
    pub cloud_only : usize,
    // Folders of programs, projects, dependencies and builds left whole.
    pub projects   : usize,
}

struct Counters<'a> {
    found    : &'a AtomicUsize,
    cloud    : &'a AtomicUsize,
    projects : &'a AtomicUsize,
    report   : &'a (dyn Fn(usize) + Sync),
}

// A folder below a root that is never entered (counted when it is a project, a program or a build).
fn left_out(entry: &DirEntry, params: &WalkParams, counters: &Counters) -> bool {
    if entry.depth() == 0 || !entry.file_type().is_dir() {
        return false;
    }
    // Links and junctions are never followed (enterable says so too); nothing to look inside.
    if entry.path_is_symlink() || entry.file_type().is_symlink() || hidden_folder(entry) || is_protected(entry.path(), params.protected) {
        return true;
    }
    let project = is_project_or_build(entry.path(), skip_rules());
    if project {
        counters.projects.fetch_add(1, Ordering::Relaxed);
    }
    project
}

fn walk_one(root: &Path, recursive: bool, params: &WalkParams, counters: &Counters) -> Vec<FileEntry> {
    let depth = if recursive { usize::MAX } else { 1 };
    let mut files = Vec::new();

    // Only the loose files of a root (its folders are walked each on their own, checked once there).
    let entries = WalkDir::new(root).follow_links(false).max_depth(depth).into_iter().filter_entry(|entry| (!recursive || !left_out(entry, params, counters)) && enterable(entry, true));

    for entry in entries {
        if params.cancel.load(Ordering::Relaxed) {
            break;
        }
        let Ok(entry) = entry else { continue };
        if !entry.file_type().is_file() {
            continue;
        }
        let Ok(metadata) = entry.metadata() else { continue };
        if is_cloud_only(attributes(&metadata)) {
            counters.cloud.fetch_add(1, Ordering::Relaxed);
            continue;
        }
        if let Some(file) = file_entry(entry.path(), &metadata) {
            files.push(file);
            (counters.report)(counters.found.fetch_add(1, Ordering::Relaxed) + 1);
        }
    }
    files
}

// The files of every root (roots inside another root, or protected, are left out), each first-level
// folder on its own thread.
pub fn walk(params: WalkParams) -> Walked {
    let found    = AtomicUsize::new(0);
    let cloud    = AtomicUsize::new(0);
    let projects = AtomicUsize::new(0);
    let counters = Counters { found: &found, cloud: &cloud, projects: &projects, report: params.on_count };

    let mut roots: Vec<PathBuf> = params.roots.iter().filter(|root| folder_problem(root, params.protected).is_none()).cloned().collect();
    roots.sort_by_key(|root| root.components().count());
    let mut kept: Vec<PathBuf> = Vec::new();
    for root in roots {
        if !kept.iter().any(|parent| root.starts_with(parent)) {
            kept.push(root);
        }
    }

    let mut files   = Vec::new();
    let mut folders = Vec::new();
    for root in &kept {
        files.extend(walk_one(root, false, &params, &counters));
        // The first-level folders, each walked on its own (whole, so it is checked as a folder there).
        let entries = WalkDir::new(root).follow_links(false).min_depth(1).max_depth(1).into_iter().filter_entry(|entry| entry.depth() == 0 || !entry.file_type().is_dir() || (!left_out(entry, &params, &counters) && enterable(entry, true)));
        folders.extend(entries.filter_map(Result::ok).filter(|entry| entry.depth() == 1 && entry.file_type().is_dir()).map(|entry| entry.into_path()));
    }

    let walked = run_parallel(ParallelParams {
        paths       : &folders,
        threads     : params.threads,
        cancel      : params.cancel,
        work        : |folder: &Path| walk_one(folder, true, &params, &counters),
        on_finished : &|_| {},
    });
    files.extend(walked.into_iter().flatten().flatten());

    Walked { files, cloud_only: cloud.load(Ordering::Relaxed), projects: projects.load(Ordering::Relaxed) }
}
