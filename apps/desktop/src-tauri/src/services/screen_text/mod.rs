// "Copiar texto de la pantalla": the island hides, each monitor gets an overlay with a still of what it
// showed, the person drags over the zone and its text goes to the clipboard. The still lives only in
// memory; the text is kept in the history (history.json, local) unless turned off in Ajustes.
pub mod capture;
pub mod region;

use std::{
    io::Cursor,
    sync::{
        atomic::{AtomicBool, Ordering},
        Mutex,
    },
    thread,
    time::Duration,
};

use image::{
    codecs::png::{CompressionType, FilterType as PngFilter, PngEncoder},
    imageops::{self, FilterType},
    ImageEncoder, RgbaImage,
};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, WebviewUrl, WebviewWindow, WebviewWindowBuilder, WindowEvent};

use crate::{
    services::{
        clipboard::write,
        history::{self, FilelessEntryParams},
        qr::read::{read_codes, ReadCode},
        screen_text::region::{count_words, crop_rect, overlay_frame, MonitorFrame, ZoneRequest},
        settings,
        text::ocr,
        visibility,
    },
    ISLAND_WINDOW_LABEL,
};

pub const CAPTURE_WINDOW_PREFIX: &str  = "capture-";
pub const SCREEN_TEXT_DONE_EVENT: &str = "screen-text-done";
pub const SCREEN_TEXT_KIND: &str       = "screen-text";
pub const SCREEN_TEXT_NAME: &str       = "Texto de la pantalla";

// Time for the island and the tray menu to fade out, so they are not in the still.
const SETTLE_DELAY: Duration = Duration::from_millis(220);
// Small text reads far better a little bigger; past this side the engine would have to shrink it again.
const UPSCALE_LIMIT: u32 = 2500;
const UPSCALE: u32       = 2;

struct Still {
    frame : MonitorFrame,
    image : RgbaImage,
}

// What the zone is read for: its text (and any code in it), or only its codes (Leer un QR).
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum CaptureMode {
    #[default]
    Text,
    Codes,
}

#[derive(Default)]
pub struct ScreenTextState {
    // From the shortcut until the text is copied: a second press meanwhile does nothing.
    busy   : AtomicBool,
    stills : Mutex<Option<Vec<Still>>>,
    mode   : Mutex<CaptureMode>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Outcome {
    Copied,
    // Leer un QR: codes found (no text copied).
    Codes,
    Empty,
    Failed,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScreenTextDone {
    pub outcome  : Outcome,
    pub words    : u32,
    // The history line with the text, for "Ver" (None when the history keeps none).
    pub entry_id : Option<String>,
    // The QR and barcodes found in the zone, to offer what they hold too.
    pub codes    : Vec<ReadCode>,
}

impl ScreenTextDone {
    fn without_text(outcome: Outcome) -> Self {
        Self { outcome, words: 0, entry_id: None, codes: Vec::new() }
    }
}

// "42 palabras", "1 palabra": the detail of its history line.
pub fn words_detail(words: u32) -> String {
    format!("{words} {}", if words == 1 { "palabra" } else { "palabras" })
}

#[derive(Deserialize)]
pub struct ReadZoneRequest {
    pub zone: ZoneRequest,
}

// "capture-1" is the overlay of the second monitor.
pub fn overlay_index(label: &str) -> Option<usize> {
    label.strip_prefix(CAPTURE_WINDOW_PREFIX)?.parse().ok()
}

// The monitor under the cursor, whose overlay takes the focus (for Esc).
pub fn monitor_at(frames: &[MonitorFrame], x: f64, y: f64) -> Option<usize> {
    frames.iter().position(|frame| {
        x >= frame.x as f64 && y >= frame.y as f64 && x < frame.x as f64 + frame.width as f64 && y < frame.y as f64 + frame.height as f64
    })
}

pub fn ocr_scale(width: u32, height: u32) -> u32 {
    if width.max(height) <= UPSCALE_LIMIT { UPSCALE } else { 1 }
}

// What the overlays are choosing a zone for (they word their hint by it).
pub fn mode(app: &AppHandle) -> CaptureMode {
    app.state::<ScreenTextState>().mode.lock().map(|mode| *mode).unwrap_or_default()
}

// From the shortcut, the tray or Habilidades. Off the main thread: it waits for the island to fade out.
pub fn start(app: &AppHandle) {
    start_for(app, CaptureMode::Text);
}

// «Desde la pantalla» of Leer un QR: the same zone, read only for its codes.
pub fn start_for(app: &AppHandle, mode: CaptureMode) {
    if app.state::<ScreenTextState>().busy.swap(true, Ordering::SeqCst) {
        return;
    }
    if let Ok(mut current) = app.state::<ScreenTextState>().mode.lock() {
        *current = mode;
    }

    let app = app.clone();
    thread::spawn(move || {
        if let Err(error) = open(&app) {
            eprintln!("[screen-text] {error}");
            close(&app);
            done(&app, ScreenTextDone::without_text(Outcome::Failed));
        }
    });
}

fn open(app: &AppHandle) -> Result<(), String> {
    visibility::set_capturing(app, true);
    thread::sleep(SETTLE_DELAY);

    let frames: Vec<MonitorFrame> = app
        .available_monitors()
        .map_err(|error| error.to_string())?
        .iter()
        .map(|monitor| MonitorFrame { x: monitor.position().x, y: monitor.position().y, width: monitor.size().width, height: monitor.size().height, scale: monitor.scale_factor() })
        .collect();

    if frames.is_empty() {
        return Err("no monitors".to_string());
    }

    let stills = frames.iter().map(|frame| capture::capture(frame).map(|image| Still { frame: *frame, image })).collect::<Result<Vec<_>, _>>()?;

    if let Ok(mut current) = app.state::<ScreenTextState>().stills.lock() {
        *current = Some(stills);
    }

    for (index, frame) in frames.iter().enumerate() {
        open_overlay(app, index, frame).map_err(|error| error.to_string())?;
    }

    Ok(())
}

fn open_overlay(app: &AppHandle, index: usize, frame: &MonitorFrame) -> tauri::Result<()> {
    let window = WebviewWindowBuilder::new(app, format!("{CAPTURE_WINDOW_PREFIX}{index}"), WebviewUrl::App("index.html".into()))
        .title("Glup")
        .decorations(false)
        .resizable(false)
        .maximizable(false)
        .minimizable(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .shadow(false)
        .focused(false)
        .visible(false)
        .disable_drag_drop_handler()
        .build()?;

    // Position first: landing on a monitor with another scale resizes the window, so the exact size
    // goes after it (and the position again, in case the resize moved it).
    let (x, y, width, height) = overlay_frame(frame);
    window.set_position(PhysicalPosition::new(x, y))?;
    window.set_size(PhysicalSize::new(width, height))?;
    window.set_position(PhysicalPosition::new(x, y))?;

    // Closed some other way (Alt+F4): the capture ends as if cancelled.
    let handle = app.clone();
    window.on_window_event(move |event| {
        if matches!(event, WindowEvent::Destroyed) {
            cancel(&handle);
        }
    });

    Ok(())
}

// The still of the overlay's monitor, as a quick PNG for the webview (in memory, never on disk).
pub fn still_png(app: &AppHandle, label: &str) -> Result<Vec<u8>, String> {
    let index = overlay_index(label).ok_or(capture::CAPTURE_ERROR)?;
    let image = app
        .state::<ScreenTextState>()
        .stills
        .lock()
        .ok()
        .and_then(|stills| stills.as_ref().and_then(|stills| stills.get(index)).map(|still| still.image.clone()))
        .ok_or(capture::CAPTURE_ERROR)?;

    let mut bytes = Vec::new();
    PngEncoder::new_with_quality(Cursor::new(&mut bytes), CompressionType::Fast, PngFilter::Adaptive)
        .write_image(image.as_raw(), image.width(), image.height(), image::ExtendedColorType::Rgba8)
        .map_err(|_| capture::CAPTURE_ERROR.to_string())?;

    Ok(bytes)
}

// The overlay drew its still: it shows, and the one under the cursor takes the focus.
pub fn ready(app: &AppHandle, window: &WebviewWindow) {
    let _ = window.show();

    let frames: Vec<MonitorFrame> = app
        .state::<ScreenTextState>()
        .stills
        .lock()
        .ok()
        .and_then(|stills| stills.as_ref().map(|stills| stills.iter().map(|still| still.frame).collect()))
        .unwrap_or_default();

    let under = app.cursor_position().ok().and_then(|cursor| monitor_at(&frames, cursor.x, cursor.y));

    if under.is_none() || under == overlay_index(window.label()) {
        let _ = window.set_focus();
    }
}

fn take_stills(app: &AppHandle) -> Option<Vec<Still>> {
    app.state::<ScreenTextState>().stills.lock().ok().and_then(|mut stills| stills.take())
}

// The overlays go away and the island comes back.
fn close(app: &AppHandle) {
    let _ = take_stills(app);

    for (label, window) in app.webview_windows() {
        if overlay_index(&label).is_some() {
            let _ = window.destroy();
        }
    }

    visibility::set_capturing(app, false);
}

fn done(app: &AppHandle, result: ScreenTextDone) {
    app.state::<ScreenTextState>().busy.store(false, Ordering::SeqCst);
    let _ = app.emit_to(ISLAND_WINDOW_LABEL, SCREEN_TEXT_DONE_EVENT, result);
}

// Esc or a right click: nothing is read and the clipboard stays as it was.
pub fn cancel(app: &AppHandle) {
    if take_stills(app).is_none() {
        return;
    }

    close(app);
    app.state::<ScreenTextState>().busy.store(false, Ordering::SeqCst);
}

fn read_zone(image: RgbaImage) -> Result<String, String> {
    let scale = ocr_scale(image.width(), image.height());
    let image = if scale > 1 { imageops::resize(&image, image.width() * scale, image.height() * scale, FilterType::CatmullRom) } else { image };
    ocr::recognize(image)
}

// The zone chosen on one overlay: cropped from its still, read, and its text copied.
pub fn read(app: &AppHandle, label: &str, request: ReadZoneRequest) {
    let Some(stills) = take_stills(app) else {
        return;
    };

    let zone = overlay_index(label).and_then(|index| stills.get(index)).and_then(|still| {
        crop_rect(request.zone, still.image.width(), still.image.height()).map(|rect| imageops::crop_imm(&still.image, rect.x, rect.y, rect.width, rect.height).to_image())
    });
    drop(stills);
    close(app);

    let mode  = app.state::<ScreenTextState>().mode.lock().map(|mode| *mode).unwrap_or_default();
    let codes = zone.as_ref().map(|image| read_codes(&image::DynamicImage::ImageRgba8(image.clone()))).unwrap_or_default();
    if mode == CaptureMode::Codes {
        let outcome = if codes.is_empty() { Outcome::Empty } else { Outcome::Codes };
        return done(app, ScreenTextDone { codes, ..ScreenTextDone::without_text(outcome) });
    }

    let result = match zone.map(read_zone) {
        None => ScreenTextDone::without_text(Outcome::Empty),
        Some(Err(_)) => ScreenTextDone::without_text(Outcome::Failed),
        Some(Ok(text)) if count_words(&text) == 0 => ScreenTextDone { codes: codes.clone(), ..ScreenTextDone::without_text(if codes.is_empty() { Outcome::Empty } else { Outcome::Codes }) },
        Some(Ok(text)) => match write::copy_text(app, &text) {
            Ok(()) => ScreenTextDone { outcome: Outcome::Copied, words: count_words(&text), entry_id: remember(app, text), codes },
            Err(_) => ScreenTextDone::without_text(Outcome::Failed),
        },
    };

    done(app, result);
}

// Into the history, unless "Guardar en el historial lo que copio de la pantalla" is off.
fn remember(app: &AppHandle, text: String) -> Option<String> {
    if settings::read(app).settings.screen_text_history_off {
        return None;
    }

    let params = FilelessEntryParams { name: SCREEN_TEXT_NAME, kind: SCREEN_TEXT_KIND, action: SCREEN_TEXT_KIND, detail: words_detail(count_words(&text)) };
    let entry  = history::text_entry(params, text);
    let id     = entry.id.clone();
    history::append(app, vec![entry]).ok().map(|_| id)
}

// "Copiar de nuevo" in the history.
pub fn copy_again(app: &AppHandle, text: &str) -> Result<(), String> {
    write::copy_text(app, text)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn each_overlay_knows_its_monitor() {
        assert_eq!(overlay_index("capture-0"), Some(0));
        assert_eq!(overlay_index("capture-2"), Some(2));
        assert_eq!(overlay_index("island"), None);
        assert_eq!(overlay_index("capture-x"), None);
    }

    #[test]
    fn the_cursor_finds_its_monitor_on_any_side_of_the_main_one() {
        let frames = [
            MonitorFrame { x: 0, y: 0, width: 1920, height: 1080, scale: 1.25 },
            MonitorFrame { x: -2560, y: 0, width: 2560, height: 1440, scale: 1.5 },
            MonitorFrame { x: 0, y: -1024, width: 1280, height: 1024, scale: 1.0 },
        ];

        assert_eq!(monitor_at(&frames, 960.0, 540.0), Some(0));
        assert_eq!(monitor_at(&frames, -1.0, 1439.0), Some(1));
        assert_eq!(monitor_at(&frames, 100.0, -1.0), Some(2));
        assert_eq!(monitor_at(&frames, 1920.0, 0.0), None);
        assert_eq!(monitor_at(&frames, 1500.0, -10.0), None);
    }

    #[test]
    fn the_history_line_counts_the_words() {
        assert_eq!(words_detail(1), "1 palabra");
        assert_eq!(words_detail(42), "42 palabras");
    }

    #[test]
    fn small_zones_are_read_bigger() {
        assert_eq!(ocr_scale(300, 40), 2);
        assert_eq!(ocr_scale(2500, 900), 2);
        assert_eq!(ocr_scale(3840, 2160), 1);
    }
}
