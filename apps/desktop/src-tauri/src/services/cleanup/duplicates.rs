use std::sync::atomic::AtomicBool;

use crate::services::{
    cleanup::walk::FileEntry,
    duplicates::same::{same_content, SameParams},
};

// Small files are not worth it for Limpieza: only copies of 1 MB or more (the same comparison as
// "Archivos repetidos", services/duplicates/same.rs).
pub const MIN_SIZE: u64 = 1024 * 1024;

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

// Groups of copies, the most space to free first.
pub fn scan(params: DuplicatesParams) -> Vec<DuplicateGroup> {
    let mut groups: Vec<DuplicateGroup> = same_content(SameParams { files: params.files, min_size: MIN_SIZE, threads: params.threads, cancel: params.cancel, on_progress: &|_, _| {} })
        .into_iter()
        .map(|files| DuplicateGroup { files })
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
