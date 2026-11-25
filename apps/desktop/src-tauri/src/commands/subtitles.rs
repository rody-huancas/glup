use tauri::AppHandle;

use crate::services::{
    actions::ActionReport,
    media::{self, AnimationPreview, AnimationRequest, GIF_ACTION},
    subtitles::{self, ListenRequest, SaveRequest, SubtitlesDraft, SUBTITLES_ACTION},
    tasks::{self, TaskSummary},
};

// "Subtítulos": the video heard and made into phrases to review (a task: the mascot and Cancelar).
#[tauri::command]
pub async fn listen_subtitles(app: AppHandle, request: ListenRequest) -> Result<SubtitlesDraft, String> {
    let task = request.task_id.clone();
    if let Some(task) = &task {
        tasks::start(&app, task, SUBTITLES_ACTION);
    }

    let worker = app.clone();
    let result = tauri::async_runtime::spawn_blocking(move || subtitles::listen(&worker, request)).await.map_err(|error| error.to_string()).and_then(|result| result);

    if let Some(task) = &task {
        let summary = result.as_ref().map(|_| TaskSummary::success(String::new())).map_err(Clone::clone);
        tasks::finish_summary(&app, task, &summary);
    }
    result
}

// «Guardar» the reviewed phrases: a .srt, a track inside the video or drawn on it.
#[tauri::command]
pub async fn save_video_subtitles(app: AppHandle, request: SaveRequest) -> Result<ActionReport, String> {
    let task = request.task_id.clone();
    if let Some(task) = &task {
        tasks::start(&app, task, SUBTITLES_ACTION);
    }

    let worker = app.clone();
    let result = tauri::async_runtime::spawn_blocking(move || subtitles::save(&worker, request)).await.map_err(|error| error.to_string()).and_then(|result| result);

    if let Some(task) = &task {
        tasks::finish(&app, task, &result);
    }
    result
}

// "Video a GIF": the real animation of the stretch, to see it and its weight before saving.
#[tauri::command]
pub async fn preview_animation(app: AppHandle, request: AnimationRequest) -> Result<AnimationPreview, String> {
    tauri::async_runtime::spawn_blocking(move || media::preview_animation(&app, &request)).await.map_err(|error| error.to_string())?
}

#[tauri::command]
pub async fn save_animation(app: AppHandle, request: AnimationRequest) -> Result<ActionReport, String> {
    let task = request.task_id.clone();
    if let Some(task) = &task {
        tasks::start(&app, task, GIF_ACTION);
    }

    let worker = app.clone();
    let result = tauri::async_runtime::spawn_blocking(move || media::save_animation(&worker, request)).await.map_err(|error| error.to_string()).and_then(|result| result);

    if let Some(task) = &task {
        tasks::finish(&app, task, &result);
    }
    result
}
