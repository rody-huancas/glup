use crate::services::cleanup::walk::FileEntry;

pub const MIN_SIZE: u64      = 500 * 1024 * 1024;
// Not modified in about six months.
pub const UNTOUCHED_MS: i64 = 182 * 24 * 60 * 60 * 1000;

pub struct LargeFilesParams<'a> {
    pub files: &'a [FileEntry],
    pub now: i64,
}

// More than 500 MB and untouched for six months, largest first.
pub fn scan(params: LargeFilesParams) -> Vec<FileEntry> {
    let mut found: Vec<FileEntry> = params.files.iter().filter(|file| file.size > MIN_SIZE && params.now - file.newest() > UNTOUCHED_MS).cloned().collect();

    found.sort_by_key(|file| std::cmp::Reverse(file.size));
    found
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use super::*;
    use crate::services::cleanup::tests::DAY_MS;

    fn entry(size: u64, age_days: i64, now: i64) -> FileEntry {
        FileEntry { path: PathBuf::from(format!("{size}-{age_days}")), size, modified: now - age_days * DAY_MS, created: now - age_days * DAY_MS }
    }

    #[test]
    fn needs_both_size_and_age() {
        let now   = 1_000 * DAY_MS;
        let files = [entry(MIN_SIZE + 1, 200, now), entry(MIN_SIZE + 1, 30, now), entry(MIN_SIZE - 1, 400, now)];

        assert_eq!(scan(LargeFilesParams { files: &files, now }), vec![files[0].clone()]);
    }
}
