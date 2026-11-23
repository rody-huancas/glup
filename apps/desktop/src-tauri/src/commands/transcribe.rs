use tauri::AppHandle;
use serde::Deserialize;

use crate::{
    commands::background::DownloadRequest,
    services::{
        background::model::ModelStatus,
        tasks::{self, TaskSummary},
        transcribe::{self, model::Level, SaveSubtitlesRequest, TranscribeReport, TranscribeRequest, DOWNLOAD_ACTION_ID, TRANSCRIBE_ACTION},
    },
};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LevelDownloadRequest {
    pub level: Level,
    #[serde(flatten)]
    pub download: DownloadRequest,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EstimateRequest {
    pub level: Level,
    pub seconds: f64,
}

// Whether that level is learned (with FFmpeg) and what its download weighs.
#[tauri::command]
pub fn get_transcribe_model(app: AppHandle, level: Level) -> Result<ModelStatus, String> {
    transcribe::status(&app, level)
}

// The one-time download (FFmpeg first if missing), only after the person says yes; a task.
#[tauri::command]
pub async fn download_transcribe_model(app: AppHandle, request: LevelDownloadRequest) -> Result<TaskSummary, String> {
    let task = request.download.task_id;
    if let Some(task) = &task {
        tasks::start(&app, task, DOWNLOAD_ACTION_ID);
    }

    let worker = app.clone();
    let id     = task.clone();
    let result = tauri::async_runtime::spawn_blocking(move || transcribe::download_model(&worker, &id, request.level))
        .await
        .map_err(|error| error.to_string())
        .and_then(|result| result);

    if let Some(task) = &task {
        tasks::finish_summary(&app, task, &result);
    }
    result
}

#[tauri::command]
pub async fn delete_transcribe_model(app: AppHandle, level: Level) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || transcribe::delete_model(&app, level)).await.map_err(|error| error.to_string()).and_then(|result| result)
}

// Listens to every file (off the main thread); the panel shows the text when it ends.
#[tauri::command]
pub async fn transcribe_audio(app: AppHandle, request: TranscribeRequest) -> Result<TranscribeReport, String> {
    let task = request.task_id.clone();
    if let Some(task) = &task {
        tasks::start(&app, task, TRANSCRIBE_ACTION);
    }

    let worker = app.clone();
    let result = tauri::async_runtime::spawn_blocking(move || transcribe::transcribe(&worker, request)).await.map_err(|error| error.to_string()).and_then(|result| result);

    if let Some(task) = &task {
        let summary = result.as_ref().map(|_| TaskSummary::success(String::new())).map_err(Clone::clone);
        tasks::finish_summary(&app, task, &summary);
    }
    result
}

#[tauri::command]
pub fn estimate_transcription(request: EstimateRequest) -> u64 {
    transcribe::estimate(request.level, request.seconds)
}

#[tauri::command]
pub async fn save_subtitles(request: SaveSubtitlesRequest) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || transcribe::save_subtitles(request)).await.map_err(|error| error.to_string()).and_then(|result| result)
}
