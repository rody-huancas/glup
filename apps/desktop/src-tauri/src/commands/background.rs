use serde::Deserialize;
use tauri::AppHandle;

use crate::services::{
    background::{self, model::{self, ModelStatus}, DOWNLOAD_ACTION_ID},
    tasks::{self, TaskSummary},
};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadRequest {
    pub task_id: Option<String>,
}

// Whether "Quitar fondo" is learned, and what it weighs (to ask before downloading, or in Ajustes).
#[tauri::command]
pub fn get_background_model(app: AppHandle) -> Result<ModelStatus, String> {
    model::status(&app)
}

// The one-time download, only after the person says yes; a task like the actions.
#[tauri::command]
pub async fn download_background_model(app: AppHandle, request: DownloadRequest) -> Result<TaskSummary, String> {
    let task = request.task_id;

    if let Some(task) = &task {
        tasks::start(&app, task, DOWNLOAD_ACTION_ID);
    }

    let worker = app.clone();
    let id     = task.clone();
    let result = tauri::async_runtime::spawn_blocking(move || background::download_model(&worker, &id))
        .await
        .map_err(|error| error.to_string())
        .and_then(|result| result);

    if let Some(task) = &task {
        tasks::finish_summary(&app, task, &result);
    }

    result
}

#[tauri::command]
pub async fn delete_background_model(app: AppHandle) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || background::delete_model(&app)).await.map_err(|error| error.to_string()).and_then(|result| result)
}
