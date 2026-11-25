use tauri::{
    ipc::{InvokeBody, Request},
    AppHandle,
};

use crate::services::{
    qr::{self, read::ReadCode, FileCodes, QrPreview, QrRequest, SaveQrRequest, WifiRequest},
    screen_text::{self, CaptureMode},
};

async fn blocking<T: Send + 'static>(work: impl FnOnce() -> Result<T, String> + Send + 'static) -> Result<T, String> {
    tauri::async_runtime::spawn_blocking(work).await.map_err(|error| error.to_string())?
}

// The QR as it looks now (SVG), whether Glup's reader reads it back, and what to watch.
#[tauri::command]
pub async fn qr_preview(request: QrRequest) -> Result<QrPreview, String> {
    blocking(move || qr::preview(&request)).await
}

// PNG, SVG or PDF in the folder chosen; its path.
#[tauri::command]
pub async fn save_qr(app: AppHandle, request: SaveQrRequest) -> Result<String, String> {
    blocking(move || qr::save(&app, &request)).await
}

#[tauri::command]
pub async fn copy_qr(app: AppHandle, request: QrRequest) -> Result<(), String> {
    blocking(move || qr::copy(&app, &request)).await
}

#[tauri::command]
pub async fn read_qr_files(paths: Vec<String>) -> Result<Vec<FileCodes>, String> {
    blocking(move || Ok(qr::read_files(&paths))).await
}

// A page of a PDF drawn by the screen, as raw PNG bytes.
#[tauri::command]
pub async fn read_qr_bytes(request: Request<'_>) -> Result<Vec<ReadCode>, String> {
    let InvokeBody::Raw(bytes) = request.body() else { return Err(crate::services::image::READ_ERROR.to_string()) };
    let bytes = bytes.clone();
    blocking(move || qr::read_bytes(&bytes)).await
}

#[tauri::command]
pub async fn read_qr_clipboard() -> Result<Vec<ReadCode>, String> {
    blocking(qr::read_clipboard).await
}

// The overlay asks whether the zone is for text or only for codes (to word its hint).
#[tauri::command]
pub fn is_capturing_codes(app: AppHandle) -> bool {
    screen_text::mode(&app) == CaptureMode::Codes
}

// «Desde la pantalla»: the zone of «Copiar texto de la pantalla», read for its codes only.
#[tauri::command]
pub fn start_screen_qr(app: AppHandle) {
    screen_text::start_for(&app, CaptureMode::Codes);
}

#[tauri::command]
pub async fn save_qr_contact(path: String, vcard: String) -> Result<(), String> {
    blocking(move || qr::save_contact(&path, &vcard)).await
}

// «Abrir en el navegador», only when the person asks, and only web links (never a file or a program).
#[tauri::command]
pub fn open_qr_link(url: String) -> Result<(), String> {
    let lower = url.trim().to_lowercase();
    if !(lower.starts_with("https://") || lower.starts_with("http://")) {
        return Err("Eso no es un enlace web".to_string());
    }
    tauri_plugin_opener::open_url(url.trim(), None::<&str>).map_err(|error| error.to_string())
}

// «Conectarme» (asked first on the screen).
#[tauri::command]
pub async fn connect_qr_wifi(request: WifiRequest) -> Result<(), String> {
    blocking(move || qr::connect_wifi(&request)).await
}
