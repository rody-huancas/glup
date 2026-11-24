use tauri::AppHandle;

use crate::services::{
    folder_sort::{self, PreviewRequest, SortPreview, SortReport, SortRequest, UndoReport, UndoRequest, SORT_ACTION_ID, UNDO_ACTION_ID},
    tasks,
};

// Descargas, proposed by default (None if Windows does not tell it).
#[tauri::command]
pub fn get_sort_folder() -> Option<String> {
    folder_sort::default_folder()
}

// The preview: nothing moves here.
#[tauri::command]
pub async fn preview_folder_sort(app: AppHandle, request: PreviewRequest) -> Result<SortPreview, String> {
    let worker = app.clone();
    tauri::async_runtime::spawn_blocking(move || folder_sort::preview(&worker, request)).await.map_err(|error| error.to_string()).and_then(|result| result)
}

// "Ordenar": a task like the actions, with its progress, Cancelar and notice.
#[tauri::command]
pub async fn sort_folder(app: AppHandle, request: SortRequest) -> Result<SortReport, String> {
    let task = request.task_id.clone();

    if let Some(task) = &task {
        tasks::start(&app, task, SORT_ACTION_ID);
    }

    let worker = app.clone();
    let id     = task.clone();
    let result = tauri::async_runtime::spawn_blocking(move || folder_sort::sort(&worker, &id)).await.map_err(|error| error.to_string()).and_then(|result| result);

    if let Some(task) = &task {
        tasks::finish_summary(&app, task, &result.as_ref().map(|report| report.summary.clone()).map_err(Clone::clone));
    }

    result
}

#[tauri::command]
pub async fn undo_folder_sort(app: AppHandle, request: UndoRequest) -> Result<UndoReport, String> {
    let task = request.task_id.clone();

    if let Some(task) = &task {
        tasks::start(&app, task, UNDO_ACTION_ID);
    }

    let worker = app.clone();
    let id     = task.clone();
    let result = tauri::async_runtime::spawn_blocking(move || folder_sort::undo(&worker, &request, &id)).await.map_err(|error| error.to_string()).and_then(|result| result);

    if let Some(task) = &task {
        tasks::finish_summary(&app, task, &result.as_ref().map(|report| report.summary.clone()).map_err(Clone::clone));
    }

    result
}
