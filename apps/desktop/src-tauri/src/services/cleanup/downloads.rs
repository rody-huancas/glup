use std::{path::Path, sync::atomic::AtomicBool};

use crate::services::cleanup::walk::{self, FileEntry, WalkParams};

// "Viejo" for installers and archives: not touched in 30 days.
pub const OLD_AFTER_MS: i64 = 30 * 24 * 60 * 60 * 1000;

const INSTALLERS: [&str; 2] = ["exe", "msi"];
const ARCHIVES: [&str; 3]   = ["zip", "rar", "7z"];

pub struct DownloadsParams<'a> {
    pub folder: &'a Path,
    pub now: i64,
    pub cancel: &'a AtomicBool,
}

fn has_extension(path: &Path, extensions: &[&str]) -> bool {
    path.extension().is_some_and(|extension| extensions.iter().any(|known| extension.eq_ignore_ascii_case(known)))
}

// Only the first level of Downloads: an .exe inside an unzipped folder may be a program in use.
fn top_level(params: &DownloadsParams) -> Vec<FileEntry> {
    walk::files(WalkParams { root: params.folder, recursive: false, cancel: params.cancel, personal: true })
}

// .exe and .msi older than 30 days.
pub fn installers(params: DownloadsParams) -> Vec<FileEntry> {
    top_level(&params)
        .into_iter()
        .filter(|file| has_extension(&file.path, &INSTALLERS) && params.now - file.newest() > OLD_AFTER_MS)
        .collect()
}

// .zip, .rar and .7z already unzipped next to them (a folder with the same name), or older than 30 days.
pub fn archives(params: DownloadsParams) -> Vec<FileEntry> {
    top_level(&params)
        .into_iter()
        .filter(|file| has_extension(&file.path, &ARCHIVES))
        .filter(|file| {
            let opened = file.path.file_stem().is_some_and(|stem| params.folder.join(stem).is_dir());
            opened || params.now - file.newest() > OLD_AFTER_MS
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use std::fs;

    use super::*;
    use crate::services::cleanup::tests::{age_file, now, temp_folder, write_file, DAY_MS};

    // They back-date the creation time too (age_file), which only Windows lets a test do.
    #[cfg(windows)]
    #[test]
    fn finds_old_installers_on_the_first_level_only() {
        let folder = temp_folder("downloads-installers");
        let cancel = AtomicBool::new(false);
        for name in ["viejo.exe", "nuevo.msi", "juego/juego.exe", "foto.jpg"] {
            write_file(&folder.join(name), 10);
        }
        age_file(&folder.join("viejo.exe"), 40 * DAY_MS);
        age_file(&folder.join("juego/juego.exe"), 40 * DAY_MS);
        age_file(&folder.join("foto.jpg"), 40 * DAY_MS);

        let found = installers(DownloadsParams { folder: &folder, now: now(), cancel: &cancel });

        assert_eq!(found.len(), 1);
        assert!(found[0].path.ends_with("viejo.exe"));
        let _ = fs::remove_dir_all(&folder);
    }

    // They back-date the creation time too (age_file), which only Windows lets a test do.
    #[cfg(windows)]
    #[test]
    fn finds_archives_already_opened_or_old() {
        let folder = temp_folder("downloads-archives");
        let cancel = AtomicBool::new(false);
        for name in ["fotos.zip", "fotos/1.jpg", "viejo.rar", "nuevo.7z"] {
            write_file(&folder.join(name), 10);
        }
        age_file(&folder.join("viejo.rar"), 40 * DAY_MS);

        let mut names: Vec<_> = archives(DownloadsParams { folder: &folder, now: now(), cancel: &cancel })
            .into_iter()
            .map(|file| file.path.file_name().unwrap().to_string_lossy().into_owned())
            .collect();
        names.sort();

        assert_eq!(names, vec!["fotos.zip", "viejo.rar"]);
        let _ = fs::remove_dir_all(&folder);
    }
}
