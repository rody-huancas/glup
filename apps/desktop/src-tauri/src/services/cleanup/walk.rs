use std::{
    fs::{self, Metadata},
    path::{Path, PathBuf},
    sync::atomic::{AtomicBool, Ordering},
    time::{SystemTime, UNIX_EPOCH},
};

use walkdir::{DirEntry, WalkDir};

use crate::services::parallel::{run_parallel, worker_count, ParallelParams};

// Windows file attributes (values from the Windows SDK).
const FILE_ATTRIBUTE_HIDDEN: u32                = 0x2;
const FILE_ATTRIBUTE_OFFLINE: u32               = 0x1000;
const FILE_ATTRIBUTE_RECALL_ON_OPEN: u32        = 0x4_0000;
const FILE_ATTRIBUTE_RECALL_ON_DATA_ACCESS: u32 = 0x40_0000;

// OneDrive and similar: the content is only in the cloud, opening it would download it.
const CLOUD_ONLY: u32 = FILE_ATTRIBUTE_OFFLINE | FILE_ATTRIBUTE_RECALL_ON_OPEN | FILE_ATTRIBUTE_RECALL_ON_DATA_ACCESS;

// Folders never entered in personal folders: programs' own data that deleting would break.
const SKIPPED_FOLDERS: [&str; 2] = ["node_modules", "$RECYCLE.BIN"];

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct FileEntry {
    pub path: PathBuf,
    pub size: u64,
    // Milliseconds since 1970, as the frontend shows them and the re-check compares them.
    pub modified: i64,
    pub created: i64,
}

impl FileEntry {
    // The newest of created and modified: a file copied or downloaded recently is never "old".
    pub fn newest(&self) -> i64 {
        self.modified.max(self.created)
    }
}

pub struct WalkParams<'a> {
    pub root: &'a Path,
    pub recursive: bool,
    pub cancel: &'a AtomicBool,
    // Personal folders also skip hidden folders, dot folders and node_modules.
    pub personal: bool,
}

pub fn millis(time: SystemTime) -> i64 {
    time.duration_since(UNIX_EPOCH).map(|elapsed| elapsed.as_millis() as i64).unwrap_or(0)
}

pub fn is_cloud_only(attributes: u32) -> bool {
    attributes & CLOUD_ONLY != 0
}

#[cfg(windows)]
fn attributes(metadata: &Metadata) -> u32 {
    use std::os::windows::fs::MetadataExt;
    metadata.file_attributes()
}

#[cfg(not(windows))]
fn attributes(_: &Metadata) -> u32 {
    0
}

// A regular file that is really on this disk; links, junctions and cloud-only files give None.
pub fn file_entry(path: &Path, metadata: &Metadata) -> Option<FileEntry> {
    if !metadata.is_file() || metadata.file_type().is_symlink() || is_cloud_only(attributes(metadata)) {
        return None;
    }

    Some(FileEntry {
        path     : path.to_path_buf(),
        size     : metadata.len(),
        modified : metadata.modified().map(millis).unwrap_or(0),
        created  : metadata.created().map(millis).unwrap_or(0),
    })
}

// The file as it is now, never following a link (used again right before deleting).
pub fn current(path: &Path) -> Option<FileEntry> {
    fs::symlink_metadata(path).ok().and_then(|metadata| file_entry(path, &metadata))
}

fn enterable(entry: &DirEntry, personal: bool) -> bool {
    if entry.depth() == 0 {
        return true;
    }

    // Symbolic links and junctions (std reports both as links): never followed, never listed.
    if entry.path_is_symlink() || entry.file_type().is_symlink() {
        return false;
    }

    if !personal || !entry.file_type().is_dir() {
        return true;
    }

    let name   = entry.file_name().to_string_lossy();
    let hidden = entry.metadata().map(|metadata| attributes(&metadata) & FILE_ATTRIBUTE_HIDDEN != 0).unwrap_or(false);

    !name.starts_with('.') && !SKIPPED_FOLDERS.iter().any(|skipped| name.eq_ignore_ascii_case(skipped)) && !hidden
}

// Every file under a root (or only its first level), without following links. Unreadable entries
// are skipped; a cancel stops the walk.
pub fn files(params: WalkParams) -> Vec<FileEntry> {
    let depth = if params.recursive { usize::MAX } else { 1 };
    let mut found = Vec::new();

    for entry in WalkDir::new(params.root).follow_links(false).max_depth(depth).into_iter().filter_entry(|entry| enterable(entry, params.personal)) {
        if params.cancel.load(Ordering::Relaxed) {
            break;
        }

        let Ok(entry) = entry else { continue };
        if !entry.file_type().is_file() {
            continue;
        }

        if let Some(file) = entry.metadata().ok().and_then(|metadata| file_entry(entry.path(), &metadata)) {
            found.push(file);
        }
    }

    found
}

pub struct ParallelWalkParams<'a> {
    pub roots: &'a [PathBuf],
    pub cancel: &'a AtomicBool,
    pub personal: bool,
}

// Every file under the roots, recursively: the files right in each root, then every first-level
// folder walked on its own thread (half the cores at most, see parallel.rs).
pub fn files_in_parallel(params: ParallelWalkParams) -> Vec<FileEntry> {
    let mut found   = Vec::new();
    let mut folders = Vec::new();

    for root in params.roots {
        found.extend(files(WalkParams { root, recursive: false, cancel: params.cancel, personal: params.personal }));

        let entries = WalkDir::new(root).follow_links(false).min_depth(1).max_depth(1).into_iter().filter_entry(|entry| enterable(entry, params.personal));
        folders.extend(entries.filter_map(Result::ok).filter(|entry| entry.file_type().is_dir()).map(|entry| entry.into_path()));
    }

    let walked = run_parallel(ParallelParams {
        paths       : &folders,
        threads     : worker_count(),
        cancel      : params.cancel,
        work        : |folder: &Path| files(WalkParams { root: folder, recursive: true, cancel: params.cancel, personal: params.personal }),
        on_finished : &|_| {},
    });

    found.extend(walked.into_iter().flatten().flatten());
    found
}

// Roots that sit inside another root are dropped, so no file is listed twice.
pub fn distinct_roots(roots: Vec<PathBuf>) -> Vec<PathBuf> {
    let mut sorted: Vec<PathBuf> = roots.into_iter().filter(|root| root.is_dir()).collect();
    let mut kept: Vec<PathBuf>   = Vec::new();

    sorted.sort_by_key(|root| root.components().count());

    for root in sorted {
        if !kept.iter().any(|parent| root.starts_with(parent)) {
            kept.push(root);
        }
    }

    kept
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::cleanup::tests::{temp_folder, write_file};

    #[test]
    fn recognizes_cloud_only_files() {
        assert!(is_cloud_only(FILE_ATTRIBUTE_RECALL_ON_DATA_ACCESS));
        assert!(is_cloud_only(FILE_ATTRIBUTE_OFFLINE | 0x20));
        assert!(!is_cloud_only(0x20));
    }

    #[test]
    fn skips_dot_folders_and_node_modules_in_personal_folders() {
        let root   = temp_folder("walk-personal");
        let cancel = AtomicBool::new(false);
        write_file(&root.join("foto.jpg"), 10);
        write_file(&root.join(".git").join("pack.bin"), 10);
        write_file(&root.join("app").join("node_modules").join("lib.bin"), 10);

        let names: Vec<_> = files(WalkParams { root: &root, recursive: true, cancel: &cancel, personal: true })
            .into_iter()
            .map(|file| file.path.file_name().unwrap().to_string_lossy().into_owned())
            .collect();

        assert_eq!(names, vec!["foto.jpg"]);
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn walks_in_parallel_the_same_files() {
        let root   = temp_folder("walk-parallel");
        let cancel = AtomicBool::new(false);
        for name in ["a.bin", "uno/b.bin", "uno/dos/c.bin", "tres/d.bin", ".oculta/e.bin"] {
            write_file(&root.join(name), 10);
        }

        let mut sequential: Vec<_> = files(WalkParams { root: &root, recursive: true, cancel: &cancel, personal: true }).into_iter().map(|file| file.path).collect();
        let mut parallel: Vec<_>   = files_in_parallel(ParallelWalkParams { roots: &[root.clone()], cancel: &cancel, personal: true }).into_iter().map(|file| file.path).collect();
        sequential.sort();
        parallel.sort();

        assert_eq!(parallel.len(), 4);
        assert_eq!(parallel, sequential);
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn drops_roots_inside_other_roots() {
        let root   = temp_folder("walk-roots");
        let nested = root.join("Documentos");
        fs::create_dir_all(&nested).unwrap();

        assert_eq!(distinct_roots(vec![root.clone(), nested, root.clone()]), vec![root.clone()]);
        let _ = fs::remove_dir_all(&root);
    }

    // Junctions need no special rights on Windows (unlike symbolic links), so they can be tested.
    #[cfg(windows)]
    #[test]
    fn never_follows_junctions() {
        let root    = temp_folder("walk-junction");
        let outside = temp_folder("walk-junction-outside");
        write_file(&outside.join("ajeno.bin"), 10);
        write_file(&root.join("propio.bin"), 10);

        let status = std::process::Command::new("cmd")
            .args(["/C", "mklink", "/J"])
            .arg(root.join("enlace"))
            .arg(&outside)
            .output()
            .unwrap();
        assert!(status.status.success(), "mklink /J failed");

        let cancel = AtomicBool::new(false);
        let found  = files(WalkParams { root: &root, recursive: true, cancel: &cancel, personal: false });

        assert_eq!(found.len(), 1);
        assert!(found[0].path.ends_with("propio.bin"));

        let _ = fs::remove_dir(root.join("enlace"));
        let _ = fs::remove_dir_all(&root);
        let _ = fs::remove_dir_all(&outside);
    }
}
