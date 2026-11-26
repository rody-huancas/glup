// Reading a disk or a folder for what it takes: every folder in a shared queue that half of the cores
// take from, so a huge folder does not keep the others waiting. The size is the real one on disk (what
// the file holds in clusters). Files only in the cloud are counted apart and never opened (that would
// download them); links and junctions to folders are never followed; a file with several hard links is
// counted once; what cannot be read for permissions is counted apart, nothing is asked as administrator.
use std::{
    collections::HashSet,
    fs,
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicBool, AtomicU64, Ordering},
        Mutex, OnceLock,
    },
    thread,
    time::Duration,
};

use serde::Deserialize;

use crate::services::{
    cleanup::walk::is_cloud_only,
    duplicates::walk::{is_protected, skip_rules, SkipRules},
    space::{
        known::{find, known},
        tree::{FileFound, FolderFound, Kind, Read, Tree, PROGRAM, PROJECT},
    },
};

#[derive(Debug, Default, Deserialize)]
struct KindTable {
    photos    : Vec<String>,
    videos    : Vec<String>,
    documents : Vec<String>,
    programs  : Vec<String>,
}

fn table() -> &'static KindTable {
    static TABLE: OnceLock<KindTable> = OnceLock::new();
    TABLE.get_or_init(|| serde_json::from_str(include_str!("kinds.json")).unwrap_or_default())
}

// Its kind by its extension (kinds.json).
pub fn kind_of(name: &str) -> Kind {
    let Some((_, extension)) = name.rsplit_once('.') else { return Kind::Other };
    let extension = extension.to_lowercase();
    let table     = table();
    let has       = |list: &[String]| list.iter().any(|known| *known == extension);
    if has(&table.photos) {
        Kind::Photos
    } else if has(&table.videos) {
        Kind::Videos
    } else if has(&table.documents) {
        Kind::Documents
    } else if has(&table.programs) {
        Kind::Programs
    } else {
        Kind::Other
    }
}

// What the analysis counts besides the tree, read by the screen while it goes.
#[derive(Debug, Default)]
pub struct Counters {
    pub files       : AtomicU64,
    pub bytes       : AtomicU64,
    pub cloud_files : AtomicU64,
    pub cloud_bytes : AtomicU64,
    // Folders that could not be read (permissions) and links or junctions not followed.
    pub denied      : AtomicU64,
    pub links       : AtomicU64,
    // Second names of a file already counted (hard links).
    pub hard_links  : AtomicU64,
}

// What one entry of a folder is, from what the folder listing says of it.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum EntryKind {
    Folder,
    // A junction or a link (to a folder or a file): never followed.
    Link,
    // Only in the cloud (OneDrive and the like): told apart, never opened.
    Cloud,
    File,
}

pub const ATTRIBUTE_DIRECTORY: u32 = 0x10;
pub const ATTRIBUTE_REPARSE: u32   = 0x400;
// Junctions (and mounted volumes) and symbolic links; the cloud folders of OneDrive have other tags
// and are entered as any folder.
pub const TAG_MOUNT_POINT: u32 = 0xA000_0003;
pub const TAG_SYMLINK: u32     = 0xA000_000C;

pub fn entry_kind(attributes: u32, reparse_tag: u32) -> EntryKind {
    let reparse = attributes & ATTRIBUTE_REPARSE != 0;
    if reparse && (reparse_tag == TAG_MOUNT_POINT || reparse_tag == TAG_SYMLINK) {
        return EntryKind::Link;
    }
    if attributes & ATTRIBUTE_DIRECTORY != 0 {
        return EntryKind::Folder;
    }
    if is_cloud_only(attributes) {
        return EntryKind::Cloud;
    }
    EntryKind::File
}

// One entry as the folder listing gives it: no file is opened for it.
pub struct Listed {
    pub name        : String,
    pub kind        : EntryKind,
    // Bytes on disk (clusters) and as it says it holds.
    pub allocated   : u64,
    pub length      : u64,
    // The same number for every name of a file (hard links).
    pub id          : i64,
}

// The whole folder in a few calls (FileIdBothDirectoryInfo: names, sizes on disk, ids and reparse tags
// of many entries at once). None: it cannot be read (permissions).
#[cfg(windows)]
pub fn list(path: &Path) -> Option<Vec<Listed>> {
    use std::os::windows::{fs::OpenOptionsExt, io::AsRawHandle};

    use windows_sys::Win32::Storage::FileSystem::{FileIdBothDirectoryInfo, GetFileInformationByHandleEx, FILE_FLAG_BACKUP_SEMANTICS, FILE_ID_BOTH_DIR_INFO, FILE_LIST_DIRECTORY};

    let folder = fs::OpenOptions::new().access_mode(FILE_LIST_DIRECTORY).share_mode(7).custom_flags(FILE_FLAG_BACKUP_SEMANTICS).open(path).ok()?;
    let handle = folder.as_raw_handle() as _;
    // u64 so the entries (8-byte aligned) can be read in place.
    let mut buffer = vec![0u64; 64 * 1024 / 8];
    let mut found  = Vec::new();
    loop {
        let filled = unsafe { GetFileInformationByHandleEx(handle, FileIdBothDirectoryInfo, buffer.as_mut_ptr().cast(), (buffer.len() * 8) as u32) } != 0;
        if !filled {
            break;
        }
        let base = buffer.as_ptr().cast::<u8>();
        let mut at = 0usize;
        loop {
            let info = unsafe { &*base.add(at).cast::<FILE_ID_BOTH_DIR_INFO>() };
            let name = unsafe { std::slice::from_raw_parts(info.FileName.as_ptr(), info.FileNameLength as usize / 2) };
            let name = String::from_utf16_lossy(name);
            if name != "." && name != ".." {
                found.push(Listed {
                    kind      : entry_kind(info.FileAttributes, info.EaSize),
                    allocated : info.AllocationSize.max(0) as u64,
                    length    : info.EndOfFile.max(0) as u64,
                    id        : info.FileId,
                    name,
                });
            }
            if info.NextEntryOffset == 0 {
                break;
            }
            at += info.NextEntryOffset as usize;
        }
    }
    Some(found)
}

#[cfg(not(windows))]
pub fn list(path: &Path) -> Option<Vec<Listed>> {
    let entries = fs::read_dir(path).ok()?;
    Some(entries.flatten().filter_map(|entry| {
        let kind     = entry.file_type().ok()?;
        let metadata = entry.metadata().ok()?;
        let kind     = if kind.is_symlink() { EntryKind::Link } else if kind.is_dir() { EntryKind::Folder } else { EntryKind::File };
        Some(Listed { name: entry.file_name().to_string_lossy().into_owned(), kind, allocated: metadata.len(), length: metadata.len(), id: 0 })
    }).collect())
}

pub struct WalkParams<'a> {
    pub root     : &'a Path,
    pub tree     : &'a Mutex<Tree>,
    pub counters : &'a Counters,
    pub threads  : usize,
    pub cancel   : &'a AtomicBool,
    // What counts as «Sistema y apps»: Windows, the programs and their data (protected_roots), given
    // from outside so the result never depends on where the walk happens to be.
    pub system   : &'a [PathBuf],
}

// The work left: folders to read, and how many are being read right now.
struct Queue {
    folders : Mutex<(Vec<(PathBuf, u32)>, usize)>,
}

impl Queue {
    // The next folder, or None when there is none left and nobody can add more.
    fn take(&self, cancel: &AtomicBool) -> Option<(PathBuf, u32)> {
        loop {
            if cancel.load(Ordering::Relaxed) {
                return None;
            }
            {
                let mut state = self.folders.lock().ok()?;
                if let Some(next) = state.0.pop() {
                    state.1 += 1;
                    return Some(next);
                }
                if state.1 == 0 {
                    return None;
                }
            }
            thread::sleep(Duration::from_millis(1));
        }
    }

    fn done(&self, more: Vec<(PathBuf, u32)>) {
        if let Ok(mut state) = self.folders.lock() {
            state.0.extend(more);
            state.1 -= 1;
        }
    }
}

// The kind of a file: «Sistema y apps» inside those folders (whatever it is), otherwise by its extension.
pub fn kind_in(name: &str, system: bool) -> Kind {
    if system { Kind::System } else { kind_of(name) }
}

fn has_extension(name: &str, extensions: &[String]) -> bool {
    name.rsplit_once('.').is_some_and(|(_, extension)| extensions.iter().any(|known| known.eq_ignore_ascii_case(extension)))
}

// The marks of a folder by what is in it (the same rules as Archivos repetidos: a project file or folder,
// or an .exe beside its libraries), or by its own name (node_modules, target…).
pub fn folder_marks(name: &str, files: &[&str], folders: &[&str], rules: &SkipRules) -> u8 {
    let named   = rules.folders.iter().any(|skipped| skipped.eq_ignore_ascii_case(name));
    let project = named
        || folders.iter().any(|folder| rules.project_folders.iter().any(|marker| marker.eq_ignore_ascii_case(folder)) || has_extension(folder, &rules.project_extensions))
        || files.iter().any(|file| rules.project_files.iter().any(|marker| marker.eq_ignore_ascii_case(file)) || has_extension(file, &rules.project_extensions));
    let program = files.iter().any(|file| has_extension(file, &rules.program_extensions)) && files.iter().any(|file| has_extension(file, &rules.library_extensions));
    (if project { PROJECT } else { 0 }) | (if program { PROGRAM } else { 0 })
}

// One folder: listed in a few calls, its files and folders added in one go. A file already seen with
// another name (a hard link) is counted once.
fn read_folder(path: &Path, id: u32, params: &WalkParams, seen: &Mutex<HashSet<i64>>) -> Vec<(PathBuf, u32)> {
    let Some(entries) = list(path) else {
        params.counters.denied.fetch_add(1, Ordering::Relaxed);
        return Vec::new();
    };
    let counters = params.counters;
    let (mut files, mut folders) = (Vec::new(), Vec::new());
    let mut ids = Vec::new();
    let list_of_known = known();
    let text          = path.to_string_lossy();
    let file_names: Vec<&str>   = entries.iter().filter(|entry| entry.kind == EntryKind::File || entry.kind == EntryKind::Cloud).map(|entry| entry.name.as_str()).collect();
    let folder_names: Vec<&str> = entries.iter().filter(|entry| entry.kind == EntryKind::Folder).map(|entry| entry.name.as_str()).collect();
    let system = is_protected(path, params.system);
    let own = folder_marks(&path.file_name().map(|name| name.to_string_lossy().into_owned()).unwrap_or_default(), &file_names, &folder_names, skip_rules());

    for entry in entries {
        match entry.kind {
            EntryKind::Link   => {
                counters.links.fetch_add(1, Ordering::Relaxed);
            }
            EntryKind::Folder => {
                let known = find(list_of_known, &entry.name, &format!("{text}\\{}", entry.name), true);
                folders.push(FolderFound { keep: known.is_some_and(|index| list_of_known[index].keep), known, name: entry.name });
            }
            EntryKind::Cloud  => {
                counters.cloud_files.fetch_add(1, Ordering::Relaxed);
                counters.cloud_bytes.fetch_add(entry.length, Ordering::Relaxed);
            }
            EntryKind::File   => {
                ids.push(entry.id);
                let known = find(list_of_known, &entry.name, &format!("{text}\\{}", entry.name), false);
                files.push(FileFound { kind: kind_in(&entry.name, system), keep: known.is_some_and(|index| list_of_known[index].keep), known, name: entry.name, size: entry.allocated });
            }
        }
    }

    // Ids of 0 (a file system without them) are never taken as the same file.
    let fresh: Vec<bool> = match seen.lock() {
        Ok(mut seen) => ids.iter().map(|file| *file == 0 || seen.insert(*file)).collect(),
        Err(_)       => vec![true; ids.len()],
    };
    let files: Vec<FileFound> = files.into_iter().zip(fresh).filter_map(|(file, fresh)| {
        if !fresh {
            counters.hard_links.fetch_add(1, Ordering::Relaxed);
        }
        fresh.then_some(file)
    }).collect();
    counters.files.fetch_add(files.len() as u64, Ordering::Relaxed);
    counters.bytes.fetch_add(files.iter().map(|file| file.size).sum(), Ordering::Relaxed);

    let paths: Vec<PathBuf> = folders.iter().map(|folder| path.join(&folder.name)).collect();
    let ids   = params.tree.lock().map(|mut tree| tree.add_folder(id, Read { own, files, folders })).unwrap_or_default();
    paths.into_iter().zip(ids).collect()
}

// The whole root, with `threads` readers; it ends early when cancelled (the tree keeps what was read).
pub fn walk(params: WalkParams) {
    let queue = Queue { folders: Mutex::new((vec![(params.root.to_path_buf(), 0)], 0)) };
    let seen  = Mutex::new(HashSet::new());
    thread::scope(|scope| {
        for _ in 0..params.threads.max(1) {
            scope.spawn(|| {
                while let Some((path, id)) = queue.take(params.cancel) {
                    let more = read_folder(&path, id, &params, &seen);
                    queue.done(more);
                }
            });
        }
    });
}
