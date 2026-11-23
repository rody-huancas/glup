use tauri::AppHandle;

use crate::{
    commands::background::DownloadRequest,
    services::{
        background::model::ModelStatus,
        tasks::{self, TaskSummary},
        video::{self, tool, PlanRequest, VideoPlanReport, DOWNLOAD_ACTION_ID},
    },
};

// Whether Glup can work with videos, and what the download weighs (to ask first, or for Ajustes).
#[tauri::command]
pub fn get_video_tool(app: AppHandle) -> Result<ModelStatus, String> {
    tool::status(&app)
}

// The one-time download of ffmpeg.exe, only after the person says yes; a task like the actions.
#[tauri::command]
pub async fn download_video_tool(app: AppHandle, request: DownloadRequest) -> Result<TaskSummary, String> {
    let task = request.task_id;

    if let Some(task) = &task {
        tasks::start(&app, task, DOWNLOAD_ACTION_ID);
    }

    let worker = app.clone();
    let id     = task.clone();
    let result = tauri::async_runtime::spawn_blocking(move || video::download_tool(&worker, &id))
        .await
        .map_err(|error| error.to_string())
        .and_then(|result| result);

    if let Some(task) = &task {
        tasks::finish_summary(&app, task, &result);
    }

    result
}

#[tauri::command]
pub async fn delete_video_tool(app: AppHandle) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || video::delete_tool(&app)).await.map_err(|error| error.to_string()).and_then(|result| result)
}

// How each video would come out with the option chosen (FFmpeg reads them: off the main thread).
#[tauri::command]
pub async fn plan_videos(app: AppHandle, request: PlanRequest) -> Result<Vec<VideoPlanReport>, String> {
    tauri::async_runtime::spawn_blocking(move || video::plan_videos(&app, request)).await.map_err(|error| error.to_string()).and_then(|result| result)
}
