use tauri::{ipc::Response, AppHandle};

use crate::services::{
    actions::{self, ActionReport},
    scan::{self, ScanPhoto, ScanPreviewRequest, ScanRequest},
    tasks,
};

// A photo opened for review: its proportion and the corners of the sheet (found, or the whole photo).
// «Volver a detectar» asks again.
#[tauri::command]
pub async fn open_scan_photo(app: AppHandle, path: String) -> Result<ScanPhoto, String> {
    tauri::async_runtime::spawn_blocking(move || scan::open(&app, &path)).await.map_err(|error| error.to_string())?
}

// The photo, upright and small, as JPG bytes (the webview cannot show HEIC).
#[tauri::command]
pub async fn get_scan_photo(app: AppHandle, path: String, size: u32) -> Result<Response, String> {
    tauri::async_runtime::spawn_blocking(move || scan::photo_preview(&app, &path, size).map(Response::new)).await.map_err(|error| error.to_string())?
}

// The chosen page as it will come out (straight, turned and cleaned), as JPG bytes.
#[tauri::command]
pub async fn get_scan_preview(app: AppHandle, request: ScanPreviewRequest) -> Result<Response, String> {
    tauri::async_runtime::spawn_blocking(move || scan::page_preview(&app, &request).map(Response::new)).await.map_err(|error| error.to_string())?
}

// The screen was left without saving: the photos it kept go.
#[tauri::command]
pub fn close_scan(app: AppHandle) {
    scan::close(&app);
}

// The PDF, as a task like the other actions: progress by stage, Cancelar, result and history.
#[tauri::command]
pub async fn scan_document(app: AppHandle, request: ScanRequest) -> Result<ActionReport, String> {
    let task = request.task_id.clone();

    if let Some(task) = &task {
        tasks::start(&app, task, scan::SCAN_ACTION);
    }

    let worker = app.clone();
    let result = tauri::async_runtime::spawn_blocking(move || actions::scan_document(&worker, request))
        .await
        .map_err(|error| error.to_string())
        .and_then(|result| result);

    if let Some(task) = &task {
        tasks::finish(&app, task, &result);
    }

    result
}
