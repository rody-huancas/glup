use tauri::{ipc::Response, AppHandle};

use crate::services::clipboard::{self, store::ClipView, ClipboardStatus};

#[tauri::command]
pub fn get_clipboard_status(app: AppHandle) -> ClipboardStatus {
    clipboard::status(&app)
}

#[tauri::command]
pub fn set_clipboard_enabled(app: AppHandle, enabled: bool) -> Result<ClipboardStatus, String> {
    clipboard::set_enabled(&app, enabled)
}

#[tauri::command]
pub async fn set_clipboard_limit(app: AppHandle, limit: u32) -> Result<ClipboardStatus, String> {
    tauri::async_runtime::spawn_blocking(move || clipboard::set_limit(&app, limit)).await.map_err(|error| error.to_string()).and_then(|result| result)
}

#[tauri::command]
pub fn set_clipboard_excluded(app: AppHandle, excluded: Vec<String>) -> Result<ClipboardStatus, String> {
    clipboard::set_excluded(&app, excluded)
}

// minutes None resumes.
#[tauri::command]
pub fn pause_clipboard(app: AppHandle, minutes: Option<u32>) -> ClipboardStatus {
    clipboard::pause(&app, minutes)
}

// Pinned on top, then the newest first; only what the search finds.
#[tauri::command]
pub async fn list_clips(app: AppHandle, query: String) -> Result<Vec<ClipView>, String> {
    tauri::async_runtime::spawn_blocking(move || clipboard::list(&app, &query)).await.map_err(|error| error.to_string())
}

// An image (or its thumbnail), decrypted, as raw PNG bytes (no JSON).
#[tauri::command]
pub async fn get_clip_image(app: AppHandle, id: String, thumb: bool) -> Result<Response, String> {
    tauri::async_runtime::spawn_blocking(move || clipboard::image(&app, &id, thumb))
        .await
        .map_err(|error| error.to_string())
        .and_then(|result| result)
        .map(Response::new)
}

#[tauri::command]
pub async fn copy_clip(app: AppHandle, id: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || clipboard::copy(&app, &id)).await.map_err(|error| error.to_string()).and_then(|result| result)
}

#[tauri::command]
pub async fn remove_clips(app: AppHandle, ids: Vec<String>) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || clipboard::remove(&app, &ids)).await.map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn set_clip_pinned(app: AppHandle, id: String, pinned: bool) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || clipboard::set_pinned(&app, &id, pinned)).await.map_err(|error| error.to_string())
}
