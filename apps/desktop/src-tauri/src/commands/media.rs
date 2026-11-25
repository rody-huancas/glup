use tauri::{ipc::Response, AppHandle};

use crate::services::{
    actions::{self, ActionReport},
    media::{self, OpenedMedia, TrimRequest, TRIM_ACTION},
    tasks,
};

async fn blocking<T: Send + 'static>(work: impl FnOnce() -> Result<T, String> + Send + 'static) -> Result<T, String> {
    tauri::async_runtime::spawn_blocking(work).await.map_err(|error| error.to_string())?
}

// The file for the trimming screen: what it is and, if the webview plays it, where it is served.
#[tauri::command]
pub async fn open_media(app: AppHandle, path: String) -> Result<OpenedMedia, String> {
    blocking(move || media::open(&app, &path)).await
}

// A light copy to see and hear a format the webview cannot play (MKV, AVI…).
#[tauri::command]
pub async fn make_media_preview(app: AppHandle, path: String) -> Result<String, String> {
    blocking(move || media::make_preview(&app, &path)).await
}

#[tauri::command]
pub async fn get_media_keyframes(app: AppHandle, path: String) -> Result<Vec<f64>, String> {
    blocking(move || media::keyframes(&app, &path)).await
}

// The frames of the timeline, as one JPEG.
#[tauri::command]
pub async fn get_media_strip(app: AppHandle, path: String, count: u32) -> Result<Response, String> {
    blocking(move || media::strip(&app, &path, count).map(Response::new)).await
}

#[tauri::command]
pub async fn get_media_wave(app: AppHandle, path: String, bars: usize) -> Result<Vec<f32>, String> {
    blocking(move || media::wave(&app, &path, bars)).await
}

// The screen was left: nothing is served any more and its copies are deleted.
#[tauri::command]
pub fn close_media(app: AppHandle) {
    media::close(&app);
}

// «Guardar recorte», as a task like the other actions.
#[tauri::command]
pub async fn trim_media(app: AppHandle, request: TrimRequest) -> Result<ActionReport, String> {
    let task = request.task_id.clone();
    if let Some(task) = &task {
        tasks::start(&app, task, TRIM_ACTION);
    }

    let worker = app.clone();
    let result = blocking(move || actions::trim_media(&worker, request)).await;

    if let Some(task) = &task {
        tasks::finish(&app, task, &result);
    }
    result
}
