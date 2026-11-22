use std::{
    fs,
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicU64, Ordering},
        Mutex,
    },
};

use chrono::Local;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};

pub const HISTORY_CHANGED_EVENT: &str = "history-changed";

const HISTORY_FILE: &str    = "history.json";
const MAX_ENTRIES: usize    = 200;
const SIZE_BASE: f64        = 1024.0;
const SIZE_UNITS: [&str; 5] = ["B", "KB", "MB", "GB", "TB"];

static NEXT_ID: AtomicU64 = AtomicU64::new(0);

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct HistoryEntry {
    pub id: String,
    pub name: String,
    pub path: String,
    #[serde(rename = "type")]
    pub kind: String,
    pub action: String,
    pub detail: String,
    pub date: String,
}

pub struct NewEntryParams<'a> {
    pub output: &'a Path,
    pub kind: &'a str,
    pub action: &'a str,
    pub detail: String,
}

// An entry with no file to open (Limpieza).
pub struct FilelessEntryParams<'a> {
    pub name: &'a str,
    pub kind: &'a str,
    pub action: &'a str,
    pub detail: String,
}

// Serializes reads and writes of history.json.
#[derive(Default)]
pub struct HistoryStore(Mutex<()>);

// "2,4 MB", "680 KB": the same style as the panel (Spanish decimal comma, one decimal from MB up).
pub fn format_size(bytes: u64) -> String {
    let value    = bytes as f64;
    let exponent = if bytes > 0 { value.log(SIZE_BASE).floor() as usize } else { 0 };
    let unit     = exponent.min(SIZE_UNITS.len() - 1);
    let scaled   = value / SIZE_BASE.powi(unit as i32);

    let number = if unit >= 2 {
        let rounded = (scaled * 10.0).round() / 10.0;
        if rounded.fract() == 0.0 { format!("{rounded:.0}") } else { format!("{rounded:.1}").replace('.', ",") }
    } else {
        format!("{:.0}", scaled.round())
    };

    format!("{number} {}", SIZE_UNITS[unit])
}

// "Peso reducido: de 2,4 MB a 680 KB"
pub fn reduced_detail(before: u64, after: u64) -> String {
    format!("Peso reducido: de {} a {}", format_size(before), format_size(after))
}

// "Peso reducido al máximo: de 3,8 MB a 1,6 MB"
pub fn reduced_max_detail(before: u64, after: u64) -> String {
    format!("Peso reducido al máximo: de {} a {}", format_size(before), format_size(after))
}

pub struct SignedDetailParams {
    pub signatures: usize,
    pub texts: usize,
    pub pages: usize,
}

fn counted(count: usize, singular: &str, plural: &str) -> String {
    format!("{count} {}", if count == 1 { singular } else { plural })
}

// "Firmado · 2 firmas en 2 páginas", "Firmado · 1 firma y 1 texto en 1 página".
pub fn signed_detail(params: SignedDetailParams) -> String {
    let signatures = (params.signatures > 0).then(|| counted(params.signatures, "firma", "firmas"));
    let texts      = (params.texts > 0).then(|| counted(params.texts, "texto", "textos"));
    let placed     = [signatures, texts].into_iter().flatten().collect::<Vec<_>>().join(" y ");

    format!("Firmado · {placed} en {}", counted(params.pages, "página", "páginas"))
}

// pub fn size_change_detail(before: u64, after: u64) -> String {
//     format!("De {} a {}", format_size(before), format_size(after))
// }

// Newest first, never more than MAX_ENTRIES.
pub fn merge(mut current: Vec<HistoryEntry>, added: Vec<HistoryEntry>) -> Vec<HistoryEntry> {
    let mut merged = added;
    merged.append(&mut current);
    merged.truncate(MAX_ENTRIES);
    merged
}

pub fn new_entry(params: NewEntryParams) -> HistoryEntry {
    let now = Local::now();
    let id  = format!("{}-{}", now.timestamp_millis(), NEXT_ID.fetch_add(1, Ordering::Relaxed));

    HistoryEntry {
        id,
        name   : params.output.file_name().map(|value| value.to_string_lossy().into_owned()).unwrap_or_default(),
        path   : params.output.to_string_lossy().into_owned(),
        kind   : params.kind.to_string(),
        action : params.action.to_string(),
        detail : params.detail,
        date   : now.to_rfc3339(),
    }
}

pub fn fileless_entry(params: FilelessEntryParams) -> HistoryEntry {
    let now = Local::now();
    let id  = format!("{}-{}", now.timestamp_millis(), NEXT_ID.fetch_add(1, Ordering::Relaxed));

    HistoryEntry {
        id,
        name   : params.name.to_string(),
        path   : String::new(),
        kind   : params.kind.to_string(),
        action : params.action.to_string(),
        detail : params.detail,
        date   : now.to_rfc3339(),
    }
}

fn file_path(app: &AppHandle) -> Option<PathBuf> {
    app.path().app_data_dir().ok().map(|folder| folder.join(HISTORY_FILE))
}

fn read_file(path: &Path) -> Vec<HistoryEntry> {
    fs::read(path).ok().and_then(|data| serde_json::from_slice(&data).ok()).unwrap_or_default()
}

fn write_file(path: &Path, entries: &[HistoryEntry]) -> Result<(), String> {
    if let Some(folder) = path.parent() {
        fs::create_dir_all(folder).map_err(|error| error.to_string())?;
    }

    let data = serde_json::to_vec_pretty(entries).map_err(|error| error.to_string())?;
    fs::write(path, data).map_err(|error| error.to_string())
}

pub fn read(app: &AppHandle) -> Vec<HistoryEntry> {
    let store = app.state::<HistoryStore>();
    let _lock = store.0.lock();

    file_path(app).map(|path| read_file(&path)).unwrap_or_default()
}

pub fn append(app: &AppHandle, added: Vec<HistoryEntry>) -> Result<(), String> {
    if added.is_empty() {
        return Ok(());
    }

    let store = app.state::<HistoryStore>();
    let _lock = store.0.lock();
    let path  = file_path(app).ok_or("no app data folder")?;

    write_file(&path, &merge(read_file(&path), added))?;
    let _ = app.emit(HISTORY_CHANGED_EVENT, ());
    Ok(())
}

pub fn clear(app: &AppHandle) -> Result<(), String> {
    let store = app.state::<HistoryStore>();
    let _lock = store.0.lock();
    let path  = file_path(app).ok_or("no app data folder")?;

    write_file(&path, &[])?;
    let _ = app.emit(HISTORY_CHANGED_EVENT, ());
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn entry(id: &str) -> HistoryEntry {
        HistoryEntry {
            id     : id.to_string(),
            name   : String::new(),
            path   : String::new(),
            kind   : "image".to_string(),
            action : "compress".to_string(),
            detail : String::new(),
            date   : String::new(),
        }
    }

    #[test]
    fn sizes_use_the_panel_style() {
        assert_eq!(format_size(0), "0 B");
        assert_eq!(format_size(512), "512 B");
        assert_eq!(format_size(680 * 1024), "680 KB");
        assert_eq!(format_size(2_516_582), "2,4 MB");
        assert_eq!(format_size(3 * 1024 * 1024), "3 MB");
        assert_eq!(reduced_detail(2_516_582, 696_320), "Peso reducido: de 2,4 MB a 680 KB");
        assert_eq!(reduced_max_detail(3_984_589, 1_677_722), "Peso reducido al máximo: de 3,8 MB a 1,6 MB");
        assert_eq!(signed_detail(SignedDetailParams { signatures: 2, texts: 0, pages: 2 }), "Firmado · 2 firmas en 2 páginas");
        assert_eq!(signed_detail(SignedDetailParams { signatures: 1, texts: 1, pages: 1 }), "Firmado · 1 firma y 1 texto en 1 página");
        assert_eq!(signed_detail(SignedDetailParams { signatures: 0, texts: 3, pages: 1 }), "Firmado · 3 textos en 1 página");
    }

    #[test]
    fn merge_puts_new_entries_first_and_caps_the_list() {
        let current: Vec<_> = (0..MAX_ENTRIES).map(|index| entry(&format!("old-{index}"))).collect();
        let merged          = merge(current, vec![entry("new")]);

        assert_eq!(merged.len(), MAX_ENTRIES);
        assert_eq!(merged[0].id, "new");
        assert_eq!(merged[MAX_ENTRIES - 1].id, format!("old-{}", MAX_ENTRIES - 2));
    }
}
