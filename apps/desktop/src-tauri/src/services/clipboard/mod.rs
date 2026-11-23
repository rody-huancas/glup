// "Portapapeles": Glup remembers what is copied (texts and images) so it can be found and copied again.
// Off until the person turns it on. It never keeps what Windows marks as private (password managers),
// what comes from an excluded program or what Glup itself copied; it can be paused from the tray. Kept
// only on this PC, encrypted with the person's Windows protection (crypt.rs); nothing leaves it.
pub mod crypt;
pub mod dib;
pub mod privacy;
pub mod read;
pub mod source;
pub mod storage;
pub mod store;
pub mod watcher;
pub mod write;

use std::{
    io::Cursor,
    path::PathBuf,
    sync::Mutex,
    thread,
    time::Duration,
};

use chrono::{DateTime, Local};
use image::{codecs::png::PngEncoder, imageops::FilterType, DynamicImage, ImageEncoder, RgbaImage};
use serde::Serialize;
use tauri::{menu::MenuItem, AppHandle, Emitter, Manager, Wry};

use crate::services::{
    clipboard::{
        privacy::KeepParams,
        store::{clamp_limit, ClipItem, ClipKind, ClipView},
    },
    notify,
    settings::{self, Settings},
};

pub const CLIPBOARD_CHANGED_EVENT: &str = "clipboard-changed";
pub const CLIPBOARD_PAGE: &str          = "clipboard";
pub const PAUSE_MINUTES: u32            = 60;

pub const MISSING_ERROR: &str = "Eso ya no está en el portapapeles de Glup";
pub const SAVE_ERROR: &str    = "No pude guardar el portapapeles";

// A text this long is a document, not a copy to remember.
const MAX_TEXT_CHARS: usize = 1_000_000;
const THUMB_SIDE: u32       = 160;

pub const PAUSE_LABEL: &str  = "Pausar el portapapeles 1 hora";
pub const RESUME_LABEL: &str = "Reanudar el portapapeles";

#[derive(Default)]
pub struct ClipboardState {
    // Loaded from disk the first time it is needed.
    items        : Mutex<Option<Vec<ClipItem>>>,
    paused_until : Mutex<Option<DateTime<Local>>>,
    // "Pausar el portapapeles 1 hora" in the tray, to change its text.
    pub tray     : Mutex<Option<MenuItem<Wry>>>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClipboardStatus {
    // This system can keep it (Windows, with its protection).
    pub supported    : bool,
    pub enabled      : bool,
    pub paused_until : Option<String>,
    pub count        : usize,
    pub limit        : u32,
    pub excluded     : Vec<String>,
}

fn folder(app: &AppHandle) -> Option<PathBuf> {
    app.path().app_data_dir().ok().map(|data| data.join(storage::FOLDER))
}

// Works on the list (loading it once) and, when it changed, saves it and tells the screen.
fn with_items<T>(app: &AppHandle, change: impl FnOnce(&mut Vec<ClipItem>) -> (T, bool)) -> Option<T> {
    let folder    = folder(app)?;
    let state     = app.state::<ClipboardState>();
    let mut items = state.items.lock().ok()?;
    let list      = items.get_or_insert_with(|| storage::load_items(&folder));

    let (result, changed) = change(list);

    if changed {
        if let Err(error) = storage::save_items(&folder, list) {
            eprintln!("[clipboard] {SAVE_ERROR}: {error}");
        }
        drop(items);
        let _ = app.emit(CLIPBOARD_CHANGED_EVENT, ());
    }

    Some(result)
}

fn paused_until(app: &AppHandle) -> Option<DateTime<Local>> {
    let state     = app.state::<ClipboardState>();
    let mut until = state.paused_until.lock().ok()?;

    if until.is_some_and(|time| time <= Local::now()) {
        *until = None;
    }
    *until
}

fn refresh_tray(app: &AppHandle) {
    let label = if paused_until(app).is_some() { RESUME_LABEL } else { PAUSE_LABEL };

    if let Some(item) = app.state::<ClipboardState>().tray.lock().ok().and_then(|item| item.clone()) {
        let _ = item.set_text(label);
    }
}

pub fn status(app: &AppHandle) -> ClipboardStatus {
    let saved = settings::read(app).settings;
    let count = with_items(app, |items| (items.len(), false)).unwrap_or(0);

    ClipboardStatus {
        supported    : cfg!(windows),
        enabled      : saved.clipboard_on,
        paused_until : paused_until(app).map(|time| time.to_rfc3339()),
        count,
        limit        : clamp_limit(saved.clipboard_limit) as u32,
        excluded     : saved.clipboard_excluded,
    }
}

fn update_settings(app: &AppHandle, change: impl FnOnce(Settings) -> Settings) -> Result<ClipboardStatus, String> {
    let saved = settings::read(app).settings;
    settings::update(app, change(saved))?;
    let _ = app.emit(CLIPBOARD_CHANGED_EVENT, ());
    Ok(status(app))
}

pub fn set_enabled(app: &AppHandle, enabled: bool) -> Result<ClipboardStatus, String> {
    update_settings(app, |saved| Settings { clipboard_on: enabled, ..saved })
}

// A lower limit takes effect at once: the oldest that are not pinned go.
pub fn set_limit(app: &AppHandle, limit: u32) -> Result<ClipboardStatus, String> {
    let limit = clamp_limit(Some(limit));
    let gone  = with_items(app, |items| {
        let (kept, dropped) = store::trim(std::mem::take(items), limit);
        *items              = kept;
        let changed         = !dropped.is_empty();
        (dropped, changed)
    });

    if let (Some(folder), Some(gone)) = (folder(app), gone) {
        storage::delete_images(&folder, &gone);
    }
    update_settings(app, |saved| Settings { clipboard_limit: Some(limit as u32), ..saved })
}

pub fn set_excluded(app: &AppHandle, excluded: Vec<String>) -> Result<ClipboardStatus, String> {
    update_settings(app, |saved| Settings { clipboard_excluded: excluded, ..saved })
}

// None resumes. A pause ends by itself; the tray and the screen are told then too.
pub fn pause(app: &AppHandle, minutes: Option<u32>) -> ClipboardStatus {
    let until = minutes.map(|minutes| Local::now() + chrono::Duration::minutes(minutes as i64));

    if let Ok(mut current) = app.state::<ClipboardState>().paused_until.lock() {
        *current = until;
    }

    if let (Some(until), Some(minutes)) = (until, minutes) {
        let handle = app.clone();
        thread::spawn(move || {
            thread::sleep(Duration::from_secs(minutes as u64 * 60));
            let still = handle.state::<ClipboardState>().paused_until.lock().ok().is_some_and(|current| *current == Some(until));
            if still {
                pause(&handle, None);
            }
        });
    }

    refresh_tray(app);
    let _ = app.emit(CLIPBOARD_CHANGED_EVENT, ());
    status(app)
}

// The tray item: pauses for an hour, or resumes when paused.
pub fn toggle_pause(app: &AppHandle) {
    let minutes = if paused_until(app).is_some() { None } else { Some(PAUSE_MINUTES) };
    pause(app, minutes);
}

pub fn open_screen(app: &AppHandle) {
    notify::open_page(app, CLIPBOARD_PAGE);
}

pub fn list(app: &AppHandle, query: &str) -> Vec<ClipView> {
    with_items(app, |items| (store::view(items, query), false)).unwrap_or_default()
}

pub fn image(app: &AppHandle, id: &str, thumb: bool) -> Result<Vec<u8>, String> {
    let folder = folder(app).ok_or(MISSING_ERROR)?;
    storage::load_image(&folder, id, thumb).ok_or_else(|| MISSING_ERROR.to_string())
}

// Copied again: to the clipboard (Glup's own copy, so the watcher skips it) and up to the top.
pub fn copy(app: &AppHandle, id: &str) -> Result<(), String> {
    let item = with_items(app, |items| (items.iter().find(|item| item.id == id).cloned(), false)).flatten().ok_or(MISSING_ERROR)?;

    match item.kind {
        ClipKind::Text  => write::copy_text(app, item.text.as_deref().unwrap_or_default())?,
        ClipKind::Image => write::copy_image(app, &image(app, id, false)?)?,
    }

    let now = Local::now().to_rfc3339();
    with_items(app, |items| {
        *items = store::touch(std::mem::take(items), id, &now);
        ((), true)
    });
    Ok(())
}

pub fn remove(app: &AppHandle, ids: &[String]) {
    with_items(app, |items| {
        *items = store::remove(std::mem::take(items), ids);
        ((), true)
    });

    if let Some(folder) = folder(app) {
        storage::delete_images(&folder, ids);
    }
}

pub fn set_pinned(app: &AppHandle, id: &str, pinned: bool) {
    with_items(app, |items| {
        *items = store::set_pinned(std::mem::take(items), id, pinned);
        ((), true)
    });
}

pub fn spawn(app: AppHandle) {
    watcher::spawn(app);
}

// The same content has the same id, so copying it again moves it up instead of repeating it.
pub fn content_id(kind: ClipKind, bytes: &[u8]) -> String {
    let mut hasher = blake3::Hasher::new();
    hasher.update(if kind == ClipKind::Text { b"text:" } else { b"image:" });
    hasher.update(bytes);
    hasher.finalize().to_hex()[..32].to_string()
}

fn encode_png(image: &RgbaImage) -> Option<Vec<u8>> {
    let mut bytes = Vec::new();
    PngEncoder::new(Cursor::new(&mut bytes)).write_image(image.as_raw(), image.width(), image.height(), image::ExtendedColorType::Rgba8).ok()?;
    Some(bytes)
}

fn thumbnail(image: &RgbaImage) -> Option<Vec<u8>> {
    let small = DynamicImage::ImageRgba8(image.clone()).resize(THUMB_SIDE, THUMB_SIDE, FilterType::Triangle).to_rgba8();
    encode_png(&small)
}

fn text_item(text: String, source: Option<String>) -> Option<ClipItem> {
    if text.trim().is_empty() || text.chars().count() > MAX_TEXT_CHARS {
        return None;
    }

    let id = content_id(ClipKind::Text, text.as_bytes());
    Some(ClipItem { id, kind: ClipKind::Text, text: Some(text), width: 0, height: 0, source, date: Local::now().to_rfc3339(), pinned: false })
}

// The image and its thumbnail are written (encrypted) before the line that points at them.
fn image_item(app: &AppHandle, image: RgbaImage, source: Option<String>) -> Option<ClipItem> {
    let id     = content_id(ClipKind::Image, image.as_raw());
    let folder = folder(app)?;

    if storage::load_image(&folder, &id, true).is_none() {
        storage::save_image(&folder, &id, &encode_png(&image)?, &thumbnail(&image)?).ok()?;
    }

    Some(ClipItem { id, kind: ClipKind::Image, text: None, width: image.width(), height: image.height(), source, date: Local::now().to_rfc3339(), pinned: false })
}

// Something was copied (from the watcher's thread). Nothing is read while off or paused.
#[cfg(windows)]
pub fn on_change(app: &AppHandle, window: windows_sys::Win32::Foundation::HWND) {
    use crate::services::clipboard::read::{self, ClipContent};

    let saved = settings::read(app).settings;
    if !saved.clipboard_on || paused_until(app).is_some() {
        return;
    }

    let own   = std::process::id();
    let allow = |origin: &read::ClipOrigin| privacy::keep(KeepParams { marks: origin.marks, pid: origin.pid, path: origin.path, own, excluded: &saved.clipboard_excluded });
    let Some(copied) = read::read(window, &allow) else { return };

    let source = copied.path.as_deref().and_then(source::display_name);
    let item   = match copied.content {
        ClipContent::Text(text)   => text_item(text, source),
        ClipContent::Image(image) => image_item(app, image, source),
    };
    let Some(item) = item else { return };

    let limit = clamp_limit(saved.clipboard_limit);
    let gone  = with_items(app, |items| {
        let (kept, dropped) = store::add(std::mem::take(items), item, limit);
        *items              = kept;
        (dropped, true)
    });

    if let (Some(folder), Some(gone)) = (folder(app), gone) {
        storage::delete_images(&folder, &gone);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_same_content_has_the_same_id_and_kinds_never_mix() {
        assert_eq!(content_id(ClipKind::Text, b"hola"), content_id(ClipKind::Text, b"hola"));
        assert_ne!(content_id(ClipKind::Text, b"hola"), content_id(ClipKind::Text, b"hola "));
        assert_ne!(content_id(ClipKind::Text, b"hola"), content_id(ClipKind::Image, b"hola"));
        assert_eq!(content_id(ClipKind::Text, b"x").len(), 32);
    }

    #[test]
    fn empty_or_huge_texts_are_not_kept() {
        assert!(text_item("   \n ".to_string(), None).is_none());
        assert!(text_item("a".repeat(MAX_TEXT_CHARS + 1), None).is_none());

        let item = text_item("Hola".to_string(), Some("Bloc de notas".to_string())).unwrap();
        assert_eq!((item.kind, item.text.as_deref(), item.source.as_deref()), (ClipKind::Text, Some("Hola"), Some("Bloc de notas")));
    }

    #[test]
    fn a_thumbnail_is_small() {
        let image = RgbaImage::new(1200, 600);
        let thumb = image::load_from_memory(&thumbnail(&image).unwrap()).unwrap();
        assert_eq!((thumb.width(), thumb.height()), (THUMB_SIDE, THUMB_SIDE / 2));
    }
}
