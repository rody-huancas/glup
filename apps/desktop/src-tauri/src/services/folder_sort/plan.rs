// The preview: the loose files of the folder (never its subfolders, never a folder), where each one would
// go and what is left and why. Nothing is moved here.
use std::{
    fs, io,
    path::{Path, PathBuf},
    time::UNIX_EPOCH,
};

use serde::{Deserialize, Serialize};

use crate::services::folder_sort::{
    classify::{self, SortTable},
    filters::{self, FileFacts, SkipReason},
};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SortMode {
    Type,
    Date,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PlannedMove {
    pub source   : PathBuf,
    pub size     : u64,
    pub modified : i64,
    // The subfolders inside the chosen folder: ["PDFs"] or ["2026", "11 - Noviembre"].
    pub folders  : Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SkippedFile {
    pub name   : String,
    pub reason : SkipReason,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Plan {
    pub folder  : PathBuf,
    pub mode    : SortMode,
    pub moves   : Vec<PlannedMove>,
    pub skipped : Vec<SkippedFile>,
}

pub struct PlanParams<'a> {
    pub folder : &'a Path,
    pub mode   : SortMode,
    pub table  : &'a SortTable,
    pub now    : i64,
    // Injected so the plan can be tested without another program holding a file.
    pub in_use : &'a dyn Fn(&Path) -> bool,
}

pub fn millis(metadata: &fs::Metadata) -> i64 {
    metadata.modified().ok().and_then(|time| time.duration_since(UNIX_EPOCH).ok()).map_or(0, |since| since.as_millis() as i64)
}

pub fn destination(table: &SortTable, mode: SortMode, name: &str, modified: i64) -> Vec<String> {
    match mode {
        SortMode::Type => vec![classify::type_folder(table, name)],
        SortMode::Date => classify::date_folders(modified).to_vec(),
    }
}

pub fn plan(params: PlanParams) -> io::Result<Plan> {
    let mut moves   = Vec::new();
    let mut skipped = Vec::new();
    let mut entries: Vec<_> = fs::read_dir(params.folder)?.filter_map(Result::ok).collect();
    entries.sort_by_key(|entry| entry.file_name().to_string_lossy().to_lowercase());

    for entry in entries {
        // Not followed: a link or a folder stays where it is.
        let Ok(metadata) = fs::symlink_metadata(entry.path()) else { continue };
        if !metadata.is_file() {
            continue;
        }

        let name     = entry.file_name().to_string_lossy().into_owned();
        let modified = millis(&metadata);
        let facts    = FileFacts {
            downloading : classify::is_downloading(params.table, &name),
            hidden      : filters::is_hidden(&metadata, &name),
            modified,
            now         : params.now,
        };

        let reason = filters::skip_reason(&facts).or_else(|| (params.in_use)(&entry.path()).then_some(SkipReason::InUse));
        if let Some(reason) = reason {
            skipped.push(SkippedFile { name, reason });
            continue;
        }

        let folders = destination(params.table, params.mode, &name, modified);
        moves.push(PlannedMove { source: entry.path(), size: metadata.len(), modified, folders });
    }

    Ok(Plan { folder: params.folder.to_path_buf(), mode: params.mode, moves, skipped })
}

#[cfg(test)]
mod tests {
    use std::time::{Duration, SystemTime};

    use super::*;
    use crate::services::folder_sort::classify::table;

    struct Sandbox(PathBuf);

    impl Sandbox {
        fn new(name: &str) -> Self {
            let folder = std::env::temp_dir().join(format!("glup-sort-plan-{name}-{}", std::process::id()));
            let _      = fs::remove_dir_all(&folder);
            fs::create_dir_all(&folder).unwrap();
            Self(folder)
        }

        // A file modified `age` ago.
        fn file(&self, name: &str, age: Duration) -> PathBuf {
            let path = self.0.join(name);
            fs::write(&path, name.as_bytes()).unwrap();
            fs::File::options().write(true).open(&path).unwrap().set_modified(SystemTime::now() - age).unwrap();
            path
        }
    }

    impl Drop for Sandbox {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }

    const HOUR: Duration = Duration::from_secs(3600);

    fn now() -> i64 {
        SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis() as i64
    }

    fn plan_of(folder: &Path, mode: SortMode, busy: &[&str]) -> Plan {
        let busy: Vec<PathBuf> = busy.iter().map(|name| folder.join(name)).collect();
        let in_use             = move |path: &Path| busy.iter().any(|item| item == path);
        plan(PlanParams { folder, mode, table: table(), now: now(), in_use: &in_use }).unwrap()
    }

    #[test]
    fn only_loose_files_go_by_type_and_subfolders_are_not_entered() {
        let sandbox = Sandbox::new("type");
        sandbox.file("foto.jpg", HOUR);
        sandbox.file("contrato.pdf", HOUR);
        sandbox.file("plano.dwg", HOUR);
        fs::create_dir_all(sandbox.0.join("Trabajo")).unwrap();
        fs::write(sandbox.0.join("Trabajo").join("adentro.pdf"), b"pdf").unwrap();

        let plan  = plan_of(&sandbox.0, SortMode::Type, &[]);
        let moves: Vec<_> = plan.moves.iter().map(|item| (item.source.file_name().unwrap().to_string_lossy().into_owned(), item.folders.clone())).collect();

        assert_eq!(moves, [
            ("contrato.pdf".to_string(), vec!["PDFs".to_string()]),
            ("foto.jpg".to_string(), vec!["Imágenes".to_string()]),
            ("plano.dwg".to_string(), vec!["Otros".to_string()]),
        ]);
        assert!(plan.skipped.is_empty());
    }

    #[test]
    fn by_date_each_file_goes_to_its_year_and_month() {
        let sandbox  = Sandbox::new("date");
        let path     = sandbox.file("viejo.txt", HOUR * 24 * 40);
        let modified = millis(&fs::metadata(&path).unwrap());

        let plan = plan_of(&sandbox.0, SortMode::Date, &[]);
        assert_eq!(plan.moves[0].folders, classify::date_folders(modified).to_vec());
    }

    #[test]
    fn what_is_not_touched_is_counted_with_its_reason() {
        let sandbox = Sandbox::new("skip");
        sandbox.file("pelicula.mp4.crdownload", HOUR);
        sandbox.file("recien.pdf", Duration::from_secs(30));
        sandbox.file("abierto.docx", HOUR);
        sandbox.file("tranquilo.pdf", HOUR);

        let plan    = plan_of(&sandbox.0, SortMode::Type, &["abierto.docx"]);
        let skipped: Vec<_> = plan.skipped.iter().map(|item| (item.name.as_str(), item.reason)).collect();

        assert_eq!(skipped, [("abierto.docx", SkipReason::InUse), ("pelicula.mp4.crdownload", SkipReason::Downloading), ("recien.pdf", SkipReason::Recent)]);
        assert_eq!(plan.moves.len(), 1);
    }

    #[cfg(windows)]
    #[test]
    fn hidden_and_system_files_stay() {
        use std::os::windows::fs::OpenOptionsExt;

        let sandbox = Sandbox::new("hidden");
        sandbox.file("visible.pdf", HOUR);
        // FILE_ATTRIBUTE_HIDDEN | FILE_ATTRIBUTE_SYSTEM, as desktop.ini.
        fs::OpenOptions::new().write(true).create_new(true).attributes(0x2 | 0x4).open(sandbox.0.join("desktop.ini")).unwrap();
        fs::File::options().write(true).open(sandbox.0.join("desktop.ini")).unwrap().set_modified(SystemTime::now() - HOUR).unwrap();

        let plan = plan_of(&sandbox.0, SortMode::Type, &[]);
        assert_eq!(plan.skipped, [SkippedFile { name: "desktop.ini".to_string(), reason: SkipReason::Hidden }]);
        assert_eq!(plan.moves.len(), 1);
    }
}
