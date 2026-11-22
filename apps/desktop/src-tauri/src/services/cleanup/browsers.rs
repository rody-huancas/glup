use std::{
    fs::{self, OpenOptions},
    path::{Path, PathBuf},
    sync::atomic::AtomicBool,
};

use crate::services::cleanup::walk::{self, FileEntry, WalkParams};

// Only these cache folders; history, passwords, cookies and bookmarks live elsewhere and are never read.
const CHROMIUM_CACHES: [&str; 3] = ["Cache", "Code Cache", "GPUCache"];
const FIREFOX_CACHE: &str        = "cache2";

// Windows ERROR_SHARING_VIOLATION: the browser holds its lock file while open.
const SHARING_VIOLATION: i32 = 32;

struct Chromium {
    name: &'static str,
    // Under %LOCALAPPDATA%.
    folder: &'static str,
}

const CHROMIUM: [Chromium; 3] = [
    Chromium { name: "Chrome", folder: "Google/Chrome/User Data" },
    Chromium { name: "Edge", folder: "Microsoft/Edge/User Data" },
    Chromium { name: "Brave", folder: "BraveSoftware/Brave-Browser/User Data" },
];

const FIREFOX_NAME: &str     = "Firefox";
const FIREFOX_PROFILES: &str = "Mozilla/Firefox/Profiles";

pub struct BrowsersParams<'a> {
    pub local_app_data: &'a Path,
    pub roaming_app_data: Option<&'a Path>,
    pub cancel: &'a AtomicBool,
}

#[derive(Debug, Default)]
pub struct BrowsersScan {
    pub files: Vec<FileEntry>,
    // Open browsers: their caches are listed anyway, the files in use will be skipped.
    pub running: Vec<String>,
}

fn subfolders(path: &Path) -> Vec<PathBuf> {
    let Ok(entries) = fs::read_dir(path) else { return Vec::new() };

    entries
        .filter_map(Result::ok)
        .filter(|entry| entry.file_type().is_ok_and(|kind| kind.is_dir() && !kind.is_symlink()))
        .map(|entry| entry.path())
        .collect()
}

// Read-only probe: opening never changes the lock file, and fails only while the browser holds it.
fn is_locked(lock: &Path) -> bool {
    lock.is_file() && OpenOptions::new().read(true).open(lock).is_err_and(|error| error.raw_os_error() == Some(SHARING_VIOLATION))
}

fn cache_files(folder: &Path, cancel: &AtomicBool) -> Vec<FileEntry> {
    walk::files(WalkParams { root: folder, recursive: true, cancel, personal: false })
}

// Cache folders of Chrome, Edge, Brave (every profile) and Firefox.
pub fn scan(params: BrowsersParams) -> BrowsersScan {
    let mut result = BrowsersScan::default();

    for browser in CHROMIUM {
        let base = params.local_app_data.join(browser.folder);
        if !base.is_dir() {
            continue;
        }

        if is_locked(&base.join("lockfile")) {
            result.running.push(browser.name.to_string());
        }

        for profile in subfolders(&base) {
            for cache in CHROMIUM_CACHES.iter().map(|name| profile.join(name)).filter(|folder| folder.is_dir()) {
                result.files.extend(cache_files(&cache, params.cancel));
            }
        }
    }

    let profiles = subfolders(&params.local_app_data.join(FIREFOX_PROFILES));
    let running  = profiles.iter().any(|profile| {
        let name = profile.file_name().unwrap_or_default();
        is_locked(&profile.join("parent.lock"))
            || params.roaming_app_data.is_some_and(|roaming| is_locked(&roaming.join(FIREFOX_PROFILES).join(name).join("parent.lock")))
    });

    if running {
        result.running.push(FIREFOX_NAME.to_string());
    }

    for cache in profiles.iter().map(|profile| profile.join(FIREFOX_CACHE)).filter(|folder| folder.is_dir()) {
        result.files.extend(cache_files(&cache, params.cancel));
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::cleanup::tests::{temp_folder, write_file};

    #[test]
    fn lists_only_cache_folders() {
        let local   = temp_folder("browsers");
        let cancel  = AtomicBool::new(false);
        let profile = local.join("Google/Chrome/User Data/Default");
        write_file(&profile.join("Cache/Cache_Data/f_0001"), 10);
        write_file(&profile.join("Code Cache/js/index"), 10);
        write_file(&profile.join("History"), 10);
        write_file(&profile.join("Login Data"), 10);
        write_file(&profile.join("Network/Cookies"), 10);
        write_file(&local.join("Mozilla/Firefox/Profiles/abc.default/cache2/entries/A1"), 10);
        write_file(&local.join("Mozilla/Firefox/Profiles/abc.default/places.sqlite"), 10);

        let scan  = scan(BrowsersParams { local_app_data: &local, roaming_app_data: None, cancel: &cancel });
        let names: Vec<_> = scan.files.iter().map(|file| file.path.file_name().unwrap().to_string_lossy().into_owned()).collect();

        assert_eq!(scan.files.len(), 3, "{names:?}");
        assert!(!names.iter().any(|name| ["History", "Login Data", "Cookies", "places.sqlite"].contains(&name.as_str())));
        let _ = fs::remove_dir_all(&local);
    }
}
