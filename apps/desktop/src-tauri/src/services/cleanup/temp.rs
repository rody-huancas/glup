use std::{path::Path, sync::atomic::AtomicBool};

use crate::services::cleanup::walk::{self, FileEntry, ParallelWalkParams};

// Files touched in the last 24 h may belong to something running right now.
pub const MIN_AGE_MS: i64 = 24 * 60 * 60 * 1000;

pub struct TempParams<'a> {
    pub root: &'a Path,
    pub now: i64,
    pub cancel: &'a AtomicBool,
}

// The user's temporary folder: only files older than 24 h.
pub fn scan(params: TempParams) -> Vec<FileEntry> {
    walk::files_in_parallel(ParallelWalkParams { roots: &[params.root.to_path_buf()], cancel: params.cancel, personal: false })
        .into_iter()
        .filter(|file| params.now - file.newest() > MIN_AGE_MS)
        .collect()
}

#[cfg(test)]
mod tests {
    use std::fs;

    use super::*;
    use crate::services::cleanup::tests::{age_file, now, temp_folder, write_file, DAY_MS};

    #[test]
    fn keeps_files_from_the_last_24_hours() {
        let root   = temp_folder("temp-age");
        let cancel = AtomicBool::new(false);
        write_file(&root.join("nuevo.tmp"), 10);
        write_file(&root.join("viejo").join("viejo.tmp"), 10);
        age_file(&root.join("viejo").join("viejo.tmp"), 2 * DAY_MS);

        let found = scan(TempParams { root: &root, now: now(), cancel: &cancel });

        assert_eq!(found.len(), 1);
        assert!(found[0].path.ends_with("viejo.tmp"));
        let _ = fs::remove_dir_all(&root);
    }
}
