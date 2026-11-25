use tauri::{ipc::Response, AppHandle, WebviewWindow};

use crate::services::screen_text::{self, ReadZoneRequest};

// Habilidades › "Copiar texto de la pantalla" (the shortcut and the tray start it from Rust).
#[tauri::command]
pub fn start_screen_text(app: AppHandle) {
    screen_text::start(&app);
}

// The still of the overlay's own monitor, as raw PNG bytes (no JSON).
#[tauri::command]
pub async fn get_capture_image(app: AppHandle, window: WebviewWindow) -> Result<Response, String> {
    let label = window.label().to_string();

    tauri::async_runtime::spawn_blocking(move || screen_text::still_png(&app, &label))
        .await
        .map_err(|error| error.to_string())
        .and_then(|result| result)
        .map(Response::new)
}

#[tauri::command]
pub fn capture_ready(app: AppHandle, window: WebviewWindow) {
    screen_text::ready(&app, &window);
}

#[tauri::command]
pub async fn read_screen_text(app: AppHandle, window: WebviewWindow, request: ReadZoneRequest) -> Result<(), String> {
    let label = window.label().to_string();

    tauri::async_runtime::spawn_blocking(move || screen_text::read(&app, &label, request)).await.map_err(|error| error.to_string())
}

#[tauri::command]
pub fn cancel_screen_text(app: AppHandle) {
    screen_text::cancel(&app);
}

// "Copiar de nuevo": a text from the history back to the clipboard.
#[tauri::command]
pub fn copy_screen_text(app: AppHandle, text: String) -> Result<(), String> {
    screen_text::copy_again(&app, &text)
}
