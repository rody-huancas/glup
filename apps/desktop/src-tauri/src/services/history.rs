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
    // "Copiar texto de la pantalla": what was read, to see it and copy it again (only in this file,
    // which never leaves the computer).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,
    // "Ordenar una carpeta": the record to undo it, while it can still be undone.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub undo: Option<String>,
    // Bytes it saved (a reduced file, a cleaning), for "Tu semana" in Inicio.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub saved: Option<u64>,
    // Seconds of audio passed to text, for "Tu semana" in Inicio.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub seconds: Option<f64>,
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
        date    : now.to_rfc3339(),
        text    : None,
        undo    : None,
        saved   : None,
        seconds : None,
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
        date    : now.to_rfc3339(),
        text    : None,
        undo    : None,
        saved   : None,
        seconds : None,
    }
}

// An entry that keeps a text instead of pointing at a file (Copiar texto de la pantalla).
pub fn text_entry(params: FilelessEntryParams, text: String) -> HistoryEntry {
    HistoryEntry { text: Some(text), ..fileless_entry(params) }
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

// Points an entry at another file (the .txt saved after "Sacar texto"); the rest stays as it was.
pub fn point_entry(mut entries: Vec<HistoryEntry>, id: &str, output: &Path) -> Vec<HistoryEntry> {
    if let Some(entry) = entries.iter_mut().find(|entry| entry.id == id) {
        entry.name = output.file_name().map(|value| value.to_string_lossy().into_owned()).unwrap_or_default();
        entry.path = output.to_string_lossy().into_owned();
    }
    entries
}

// Reads, changes and writes the list under its lock, and tells the windows.
pub fn update(app: &AppHandle, change: impl FnOnce(Vec<HistoryEntry>) -> Vec<HistoryEntry>) -> Result<(), String> {
    let store = app.state::<HistoryStore>();
    let _lock = store.0.lock();
    let path  = file_path(app).ok_or("no app data folder")?;

    write_file(&path, &change(read_file(&path)))?;
    let _ = app.emit(HISTORY_CHANGED_EVENT, ());
    Ok(())
}

pub fn point_to(app: &AppHandle, id: &str, output: &Path) -> Result<(), String> {
    update(app, |entries| point_entry(entries, id, output))
}

// The entry in its place if it is already there (same id, keeping its date), or first if not.
pub fn upserted(mut entries: Vec<HistoryEntry>, entry: HistoryEntry) -> Vec<HistoryEntry> {
    if let Some(found) = entries.iter_mut().find(|item| item.id == entry.id) {
        *found = HistoryEntry { date: found.date.clone(), ..entry };
        return entries;
    }
    merge(entries, vec![entry])
}

// An undone sort: its line stays, says so and no longer offers "Deshacer".
pub fn undone(mut entries: Vec<HistoryEntry>, undo: &str) -> Vec<HistoryEntry> {
    if let Some(entry) = entries.iter_mut().find(|entry| entry.undo.as_deref() == Some(undo)) {
        entry.undo   = None;
        entry.detail = format!("{} · deshecho", entry.detail);
    }
    entries
}

pub fn mark_undone(app: &AppHandle, undo: &str) -> Result<(), String> {
    update(app, |entries| undone(entries, undo))
}

// "Quitar seleccionados": the list without those entries, in the same order.
pub fn without(entries: Vec<HistoryEntry>, ids: &[String]) -> Vec<HistoryEntry> {
    entries.into_iter().filter(|entry| !ids.contains(&entry.id)).collect()
}

// Like clearing, it only rewrites Glup's list: the files of those entries stay where they are.
pub fn remove_from_file(path: &Path, ids: &[String]) -> Result<(), String> {
    write_file(path, &without(read_file(path), ids))
}

pub fn remove(app: &AppHandle, ids: &[String]) -> Result<(), String> {
    let store = app.state::<HistoryStore>();
    let _lock = store.0.lock();
    let path  = file_path(app).ok_or("no app data folder")?;

    remove_from_file(&path, ids)?;
    let _ = app.emit(HISTORY_CHANGED_EVENT, ());
    Ok(())
}

// "Limpiar historial": only Glup's list is emptied. The files its entries point at are never opened,
// moved or deleted.
pub fn clear_file(path: &Path) -> Result<(), String> {
    write_file(path, &[])
}

pub fn clear(app: &AppHandle) -> Result<(), String> {
    let store = app.state::<HistoryStore>();
    let _lock = store.0.lock();
    let path  = file_path(app).ok_or("no app data folder")?;

    clear_file(&path)?;
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
            date    : String::new(),
            text    : None,
            undo    : None,
            saved   : None,
            seconds : None,
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
    fn clearing_empties_the_list_and_leaves_the_files_alone() {
        let folder = std::env::temp_dir().join(format!("glup-history-{}", std::process::id()));
        let data   = folder.join("datos");
        let output = folder.join("foto-comprimida.jpg");
        let other  = folder.join("contrato.pdf");
        fs::create_dir_all(&data).unwrap();
        fs::write(&output, b"jpeg").unwrap();
        fs::write(&other, b"pdf").unwrap();

        let history = data.join(HISTORY_FILE);
        let saved   = new_entry(NewEntryParams { output: &output, kind: "image", action: "compress", detail: String::new() });
        write_file(&history, &[saved]).unwrap();
        assert_eq!(read_file(&history).len(), 1);

        clear_file(&history).unwrap();

        assert!(read_file(&history).is_empty());
        assert_eq!(fs::read(&output).unwrap(), b"jpeg");
        assert_eq!(fs::read(&other).unwrap(), b"pdf");
        let mut left: Vec<_> = fs::read_dir(&folder).unwrap().map(|item| item.unwrap().file_name()).collect();
        left.sort();
        assert_eq!(left, ["contrato.pdf", "datos", "foto-comprimida.jpg"]);

        fs::remove_dir_all(&folder).unwrap();
    }

    #[test]
    fn removing_some_entries_keeps_the_rest_and_the_files() {
        let folder = std::env::temp_dir().join(format!("glup-history-remove-{}", std::process::id()));
        let output = folder.join("foto-comprimida.jpg");
        fs::create_dir_all(&folder).unwrap();
        fs::write(&output, b"jpeg").unwrap();

        let history = folder.join(HISTORY_FILE);
        let saved   = new_entry(NewEntryParams { output: &output, kind: "image", action: "compress", detail: String::new() });
        let copied  = text_entry(FilelessEntryParams { name: "Texto de la pantalla", kind: "screen-text", action: "screen-text", detail: "2 palabras".to_string() }, "Hola Glup".to_string());
        let kept    = entry("kept");
        write_file(&history, &[saved.clone(), copied.clone(), kept]).unwrap();

        remove_from_file(&history, &[saved.id.clone(), copied.id.clone()]).unwrap();

        let left: Vec<_> = read_file(&history).into_iter().map(|entry| entry.id).collect();
        assert_eq!(left, ["kept"]);
        assert_eq!(fs::read(&output).unwrap(), b"jpeg");

        fs::remove_dir_all(&folder).unwrap();
    }

    #[test]
    fn a_copied_text_is_kept_and_old_entries_read_without_one() {
        let copied = text_entry(FilelessEntryParams { name: "Texto de la pantalla", kind: "screen-text", action: "screen-text", detail: String::new() }, "Hola".to_string());
        let json   = serde_json::to_string(&copied).unwrap();
        assert!(json.contains("\"text\":\"Hola\""));

        let old: HistoryEntry = serde_json::from_str(r#"{ "id": "1", "name": "a.jpg", "path": "C:/a.jpg", "type": "image", "action": "compress", "detail": "", "date": "" }"#).unwrap();
        assert_eq!(old.text, None);
        assert!(!serde_json::to_string(&old).unwrap().contains("text"));
    }

    #[test]
    fn an_undone_sort_says_so_and_no_longer_offers_to_undo() {
        let sorted = HistoryEntry { undo: Some("123".to_string()), detail: "120 archivos en 7 carpetas".to_string(), ..entry("orden") };
        let left   = undone(vec![entry("otra"), sorted], "123");

        assert_eq!(left[1].undo, None);
        assert_eq!(left[1].detail, "120 archivos en 7 carpetas · deshecho");
        assert_eq!(left[0].detail, "");
        assert!(!serde_json::to_string(&left[0]).unwrap().contains("undo"));
    }

    #[test]
    fn an_entry_is_updated_in_its_place_or_added_first() {
        let running = HistoryEntry { detail: "120 archivos · en curso".to_string(), date: "ayer".to_string(), ..entry("orden-1") };
        let entries = upserted(vec![entry("otra")], running);
        assert_eq!(entries.iter().map(|item| item.id.as_str()).collect::<Vec<_>>(), ["orden-1", "otra"]);

        let done    = HistoryEntry { detail: "120 archivos en 7 carpetas".to_string(), date: "hoy".to_string(), ..entry("orden-1") };
        let entries = upserted(entries, done);
        assert_eq!(entries.len(), 2);
        assert_eq!((entries[0].detail.as_str(), entries[0].date.as_str()), ("120 archivos en 7 carpetas", "ayer"));
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
