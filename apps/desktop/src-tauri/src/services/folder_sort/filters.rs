// What is never moved: a download in progress, a hidden or system file, one modified a moment ago and
// one another program has open. Deciding is pure; reading the attributes and trying the file are apart.
use std::{fs::Metadata, path::Path};

use serde::Serialize;

// Modified less than this long ago (ms): it may still be being written.
pub const RECENT_MS: i64 = 2 * 60 * 1000;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum SkipReason {
    Downloading,
    Hidden,
    Recent,
    InUse,
    // Between the preview and "Ordenar" it changed, was moved or deleted.
    Changed,
}

pub struct FileFacts {
    pub downloading : bool,
    pub hidden      : bool,
    pub modified    : i64,
    pub now         : i64,
}

// The cheap checks, in order; trying whether it is in use comes after (only for the ones that pass).
pub fn skip_reason(facts: &FileFacts) -> Option<SkipReason> {
    if facts.downloading {
        return Some(SkipReason::Downloading);
    }
    if facts.hidden {
        return Some(SkipReason::Hidden);
    }
    if facts.now - facts.modified < RECENT_MS {
        return Some(SkipReason::Recent);
    }
    None
}

// Hidden or system for Windows (desktop.ini, thumbs.db); a dot file elsewhere.
#[cfg(windows)]
pub fn is_hidden(metadata: &Metadata, _name: &str) -> bool {
    use std::os::windows::fs::MetadataExt;

    const HIDDEN: u32 = 0x2;
    const SYSTEM: u32 = 0x4;
    metadata.file_attributes() & (HIDDEN | SYSTEM) != 0
}

#[cfg(not(windows))]
pub fn is_hidden(_metadata: &Metadata, name: &str) -> bool {
    name.starts_with('.')
}

// Opened with no sharing at all: if another program has it open, Windows refuses (sharing or lock
// violation, or access denied). Only reading is asked for; the file is not changed.
#[cfg(windows)]
pub fn in_use(path: &Path) -> bool {
    use std::{fs::OpenOptions, os::windows::fs::OpenOptionsExt};

    const SHARING_VIOLATION: i32 = 32;
    const LOCK_VIOLATION: i32    = 33;
    const ACCESS_DENIED: i32     = 5;

    match OpenOptions::new().read(true).share_mode(0).open(path) {
        Ok(_)      => false,
        Err(error) => matches!(error.raw_os_error(), Some(SHARING_VIOLATION | LOCK_VIOLATION | ACCESS_DENIED)),
    }
}

#[cfg(not(windows))]
pub fn in_use(_path: &Path) -> bool {
    false
}

#[cfg(test)]
mod tests {
    use super::*;

    const NOW: i64 = 1_800_000_000_000;

    fn facts(downloading: bool, hidden: bool, age: i64) -> FileFacts {
        FileFacts { downloading, hidden, modified: NOW - age, now: NOW }
    }

    #[test]
    fn a_quiet_file_of_a_while_ago_is_moved() {
        assert_eq!(skip_reason(&facts(false, false, RECENT_MS)), None);
        assert_eq!(skip_reason(&facts(false, false, 3 * 24 * 60 * 60 * 1000)), None);
    }

    #[test]
    fn downloads_in_progress_hidden_files_and_recent_ones_are_left() {
        assert_eq!(skip_reason(&facts(true, false, RECENT_MS * 10)), Some(SkipReason::Downloading));
        assert_eq!(skip_reason(&facts(false, true, RECENT_MS * 10)), Some(SkipReason::Hidden));
        assert_eq!(skip_reason(&facts(false, false, 60 * 1000)), Some(SkipReason::Recent));
        // A date ahead of the clock counts as recent too.
        assert_eq!(skip_reason(&facts(false, false, -5000)), Some(SkipReason::Recent));
    }

    #[test]
    fn a_download_says_so_even_when_it_is_also_recent() {
        assert_eq!(skip_reason(&facts(true, true, 1000)), Some(SkipReason::Downloading));
    }

    #[cfg(windows)]
    #[test]
    fn a_file_another_program_has_open_is_in_use_and_free_once_closed() {
        use std::{fs, fs::OpenOptions, os::windows::fs::OpenOptionsExt};

        let folder = std::env::temp_dir().join(format!("glup-sort-inuse-{}", std::process::id()));
        fs::create_dir_all(&folder).unwrap();
        let path = folder.join("abierto.txt");
        fs::write(&path, b"hola").unwrap();

        let holder = OpenOptions::new().read(true).share_mode(0).open(&path).unwrap();
        assert!(in_use(&path));
        drop(holder);
        assert!(!in_use(&path));
        assert_eq!(fs::read(&path).unwrap(), b"hola");

        fs::remove_dir_all(&folder).unwrap();
    }
}
