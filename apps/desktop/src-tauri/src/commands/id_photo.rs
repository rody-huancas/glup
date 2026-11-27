use tauri::{ipc::Response, AppHandle};

use crate::services::{
    actions::{self, ActionReport, IdPhotoSaveRequest},
    id_photo::{self, PrepareReport, PrepareRequest},
    platform::{require, Feature},
    tasks,
};

// Removes the background and finds the head (the model can take a few seconds): off the main thread.
#[tauri::command]
pub async fn prepare_id_photo(app: AppHandle, request: PrepareRequest) -> Result<PrepareReport, String> {
    require(Feature::FaceDetection)?;
    tauri::async_runtime::spawn_blocking(move || id_photo::prepare(&app, request)).await.map_err(|error| error.to_string()).and_then(|result| result)
}

// The photo over white, smaller, for the preview (raw JPEG bytes).
#[tauri::command]
pub async fn id_photo_preview(app: AppHandle, session: u64) -> Result<Response, String> {
    tauri::async_runtime::spawn_blocking(move || id_photo::preview(&app, session).map(Response::new))
        .await
        .map_err(|error| error.to_string())
        .and_then(|result| result)
}

// "Listo": the photo and the sheet, like any other action (task, result, history).
#[tauri::command]
pub async fn save_id_photo(app: AppHandle, request: IdPhotoSaveRequest) -> Result<ActionReport, String> {
    let task = request.task_id.clone();
    if let Some(task) = &task {
        tasks::start(&app, task, id_photo::ID_ACTION);
    }

    let worker = app.clone();
    let result = tauri::async_runtime::spawn_blocking(move || actions::save_id_photo(&worker, request))
        .await
        .map_err(|error| error.to_string())
        .and_then(|result| result);

    if let Some(task) = &task {
        tasks::finish(&app, task, &result);
    }
    result
}
