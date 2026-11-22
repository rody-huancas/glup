use std::{
    collections::HashMap,
    fs::File,
    io::{BufReader, Read},
    path::{Path, PathBuf},
    sync::atomic::AtomicBool,
};

use crate::services::{
    cleanup::walk::FileEntry,
    parallel::{run_parallel, ParallelParams},
};

// Small files are not worth it; the first 64 KB tell most different files apart without reading all.
pub const MIN_SIZE: u64      = 1024 * 1024;
const PARTIAL_BYTES: usize   = 64 * 1024;
const READ_BUFFER: usize     = 1024 * 1024;

pub struct DuplicatesParams<'a> {
    pub files: &'a [FileEntry],
    pub threads: usize,
    pub cancel: &'a AtomicBool,
}

// Copies of the same content, oldest first.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct DuplicateGroup {
    pub files: Vec<FileEntry>,
}

fn partial_hash(path: &Path) -> Option<[u8; 32]> {
    let mut buffer = vec![0; PARTIAL_BYTES];
    let mut file   = File::open(path).ok()?;
    let read       = file.read(&mut buffer).ok()?;

    Some(*blake3::hash(&buffer[..read]).as_bytes())
}

fn full_hash(path: &Path) -> Option<[u8; 32]> {
    let mut reader = BufReader::with_capacity(READ_BUFFER, File::open(path).ok()?);
    let mut hasher = blake3::Hasher::new();
    let mut buffer = vec![0; READ_BUFFER];

    loop {
        let read = reader.read(&mut buffer).ok()?;
        if read == 0 {
            break;
        }
        hasher.update(&buffer[..read]);
    }

    Some(*hasher.finalize().as_bytes())
}

// Splits candidates by a hash computed in parallel; groups of one are dropped.
fn split_by(candidates: Vec<Vec<FileEntry>>, params: &DuplicatesParams, hash: fn(&Path) -> Option<[u8; 32]>) -> Vec<Vec<FileEntry>> {
    let files: Vec<FileEntry> = candidates.into_iter().flatten().collect();
    let paths: Vec<PathBuf>   = files.iter().map(|file| file.path.clone()).collect();

    let hashes = run_parallel(ParallelParams { paths: &paths, threads: params.threads, cancel: params.cancel, work: hash, on_finished: &|_| {} });

    let mut groups: HashMap<(u64, [u8; 32]), Vec<FileEntry>> = HashMap::new();
    for (file, hash) in files.into_iter().zip(hashes) {
        if let Some(Some(hash)) = hash {
            groups.entry((file.size, hash)).or_default().push(file);
        }
    }

    groups.into_values().filter(|group| group.len() > 1).collect()
}

// Same size first (free), then the first 64 KB, then the whole file. Only files of 1 MB or more.
pub fn scan(params: DuplicatesParams) -> Vec<DuplicateGroup> {
    let mut by_size: HashMap<u64, Vec<FileEntry>> = HashMap::new();
    for file in params.files.iter().filter(|file| file.size >= MIN_SIZE) {
        by_size.entry(file.size).or_default().push(file.clone());
    }

    let same_size: Vec<Vec<FileEntry>> = by_size.into_values().filter(|group| group.len() > 1).collect();
    let same_start                     = split_by(same_size, &params, partial_hash);
    let same_content                   = split_by(same_start, &params, full_hash);

    let mut groups: Vec<DuplicateGroup> = same_content
        .into_iter()
        .map(|mut files| {
            files.sort_by_key(|file| (file.newest(), file.path.clone()));
            DuplicateGroup { files }
        })
        .collect();

    groups.sort_by_key(|group| std::cmp::Reverse(group.files[0].size * (group.files.len() as u64 - 1)));
    groups
}

#[cfg(test)]
mod tests {
    use std::fs;

    use super::*;
    use crate::services::cleanup::{
        tests::{temp_folder, write_bytes},
        walk::{files, WalkParams},
    };

    #[test]
    fn groups_identical_files_and_not_same_size_ones() {
        let root   = temp_folder("duplicates");
        let cancel = AtomicBool::new(false);
        let size   = MIN_SIZE as usize + 10;

        let mut same = vec![7u8; size];
        write_bytes(&root.join("a/original.bin"), &same);
        write_bytes(&root.join("b/copia.bin"), &same);

        // Same size and same first 64 KB, different at the very end.
        same[size - 1] = 8;
        write_bytes(&root.join("c/casi.bin"), &same);
        write_bytes(&root.join("d/chico.bin"), &[7u8; 1000]);
        write_bytes(&root.join("d/chico2.bin"), &[7u8; 1000]);

        let found  = files(WalkParams { root: &root, recursive: true, cancel: &cancel, personal: true });
        let groups = scan(DuplicatesParams { files: &found, threads: 2, cancel: &cancel });

        assert_eq!(groups.len(), 1);
        let names: Vec<_> = groups[0].files.iter().map(|file| file.path.file_name().unwrap().to_string_lossy().into_owned()).collect();
        assert_eq!(names.len(), 2);
        assert!(names.contains(&"original.bin".to_string()) && names.contains(&"copia.bin".to_string()));
        let _ = fs::remove_dir_all(&root);
    }
}
