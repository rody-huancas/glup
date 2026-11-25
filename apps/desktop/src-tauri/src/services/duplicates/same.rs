// Files that are the same byte by byte. Cheap first: the same size (free, from the walk); then the
// first and the last 64 KB; only then the whole file (blake3). Hard links to one file are one file, not
// copies. Shared by "Archivos repetidos" and by Limpieza (which only looks at files of 1 MB or more).
use std::{
    collections::HashMap,
    fs::File,
    io::{Read, Seek, SeekFrom},
    path::{Path, PathBuf},
    sync::atomic::AtomicBool,
};

use crate::services::{
    cleanup::walk::FileEntry,
    parallel::{run_parallel, ParallelParams},
};

// The edges compared before the whole file: most different files differ there already.
pub const EDGE_BYTES: u64 = 64 * 1024;
const READ_BUFFER: usize  = 1024 * 1024;

pub struct SameParams<'a> {
    pub files    : &'a [FileEntry],
    // Smaller files are not looked at (an empty file is never a copy).
    pub min_size : u64,
    pub threads  : usize,
    pub cancel   : &'a AtomicBool,
    // Files compared and how many there are to compare (the edges first, then the whole of the big ones).
    pub on_progress : &'a (dyn Fn(usize, usize) + Sync),
}

fn read_up_to(file: &mut File, buffer: &mut [u8]) -> Option<usize> {
    let mut filled = 0;
    while filled < buffer.len() {
        match file.read(&mut buffer[filled..]).ok()? {
            0    => break,
            read => filled += read,
        }
    }
    Some(filled)
}

// The whole content (blake3).
pub fn full_hash(path: &Path) -> Option<[u8; 32]> {
    let mut file   = File::open(path).ok()?;
    let mut hasher = blake3::Hasher::new();
    let mut buffer = vec![0; READ_BUFFER];

    loop {
        let read = file.read(&mut buffer).ok()?;
        if read == 0 {
            break;
        }
        hasher.update(&buffer[..read]);
    }
    Some(*hasher.finalize().as_bytes())
}

// The first and the last EDGE_BYTES; a file that small is read whole, and that already says it all.
pub fn edges_hash(path: &Path) -> Option<[u8; 32]> {
    let mut file = File::open(path).ok()?;
    let size     = file.metadata().ok()?.len();
    if size <= EDGE_BYTES * 2 {
        return full_hash(path);
    }

    let mut hasher = blake3::Hasher::new();
    let mut buffer = vec![0; EDGE_BYTES as usize];
    let read       = read_up_to(&mut file, &mut buffer)?;
    hasher.update(&buffer[..read]);
    file.seek(SeekFrom::End(-(EDGE_BYTES as i64))).ok()?;
    let read = read_up_to(&mut file, &mut buffer)?;
    hasher.update(&buffer[..read]);
    Some(*hasher.finalize().as_bytes())
}

// The file itself, whatever its name: the volume and the file index. Two hard links share it.
#[cfg(windows)]
pub fn identity(path: &Path) -> Option<(u32, u64)> {
    use std::os::windows::{fs::OpenOptionsExt, io::AsRawHandle};

    use windows_sys::Win32::Storage::FileSystem::{GetFileInformationByHandle, BY_HANDLE_FILE_INFORMATION, FILE_FLAG_BACKUP_SEMANTICS, FILE_READ_ATTRIBUTES};

    // Only its attributes: nothing is read, and a share with everyone (no program is disturbed).
    let file = std::fs::OpenOptions::new().access_mode(FILE_READ_ATTRIBUTES).share_mode(7).custom_flags(FILE_FLAG_BACKUP_SEMANTICS).open(path).ok()?;
    let mut info: BY_HANDLE_FILE_INFORMATION = unsafe { std::mem::zeroed() };
    let found = unsafe { GetFileInformationByHandle(file.as_raw_handle() as _, &mut info) } != 0;
    found.then(|| (info.dwVolumeSerialNumber, (u64::from(info.nFileIndexHigh) << 32) | u64::from(info.nFileIndexLow)))
}

#[cfg(not(windows))]
pub fn identity(_: &Path) -> Option<(u32, u64)> {
    None
}

fn hash_all(files: &[FileEntry], params: &SameParams, hash: fn(&Path) -> Option<[u8; 32]>, progress: &(dyn Fn(usize) + Sync)) -> Vec<Option<[u8; 32]>> {
    let paths: Vec<PathBuf> = files.iter().map(|file| file.path.clone()).collect();
    run_parallel(ParallelParams { paths: &paths, threads: params.threads, cancel: params.cancel, work: hash, on_finished: progress })
        .into_iter()
        .map(Option::flatten)
        .collect()
}

fn split(files: Vec<FileEntry>, hashes: Vec<Option<[u8; 32]>>) -> Vec<Vec<FileEntry>> {
    let mut groups: HashMap<(u64, [u8; 32]), Vec<FileEntry>> = HashMap::new();
    for (file, hash) in files.into_iter().zip(hashes) {
        if let Some(hash) = hash {
            groups.entry((file.size, hash)).or_default().push(file);
        }
    }
    groups.into_values().filter(|group| group.len() > 1).collect()
}

// One entry per file on disk: hard links to the same one are not copies of it.
fn without_links(group: Vec<FileEntry>) -> Vec<FileEntry> {
    let mut seen = Vec::new();
    group
        .into_iter()
        .filter(|file| match identity(&file.path) {
            Some(id) if seen.contains(&id) => false,
            Some(id) => {
                seen.push(id);
                true
            }
            None => true,
        })
        .collect()
}

// Groups of the same content, each with two or more files, oldest first.
pub fn same_content(params: SameParams) -> Vec<Vec<FileEntry>> {
    let mut by_size: HashMap<u64, Vec<FileEntry>> = HashMap::new();
    for file in params.files.iter().filter(|file| file.size > 0 && file.size >= params.min_size) {
        by_size.entry(file.size).or_default().push(file.clone());
    }

    let candidates: Vec<FileEntry> = by_size
        .into_values()
        .filter(|group| group.len() > 1)
        .map(without_links)
        .filter(|group| group.len() > 1)
        .flatten()
        .collect();

    // The edges of every candidate, then the whole of those big enough to differ in the middle.
    let total  = candidates.len();
    (params.on_progress)(0, total);
    let hashes = hash_all(&candidates, &params, edges_hash, &|done| (params.on_progress)(done, total));
    let edges  = split(candidates, hashes);

    let (small, big): (Vec<Vec<FileEntry>>, Vec<Vec<FileEntry>>) = edges.into_iter().partition(|group| group[0].size <= EDGE_BYTES * 2);
    let big: Vec<FileEntry> = big.into_iter().flatten().collect();
    let total               = big.len();
    if total > 0 {
        (params.on_progress)(0, total);
    }
    let hashes = hash_all(&big, &params, full_hash, &|done| (params.on_progress)(done, total));

    let mut groups: Vec<Vec<FileEntry>> = small.into_iter().chain(split(big, hashes)).collect();
    for group in &mut groups {
        group.sort_by_key(|file| (file.newest(), file.path.clone()));
    }
    groups
}
