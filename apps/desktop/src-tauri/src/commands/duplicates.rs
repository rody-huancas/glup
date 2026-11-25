use tauri::AppHandle;

use crate::services::{
    duplicates::{self, DuplicateDefaults, DuplicatesScan, RemoveReport, RemoveRequest, ScanRequest, REMOVE_ACTION, SCAN_ACTION},
    tasks,
};

// Descargas, Documentos, Imágenes, Escritorio and Videos, and the smallest size looked at.
#[tauri::command]
pub fn get_duplicate_defaults() -> DuplicateDefaults {
    duplicates::defaults()
}

// Why a folder cannot be added (Windows, programs, AppData, the recycle bin), or None.
#[tauri::command]
pub fn check_duplicate_folder(path: String) -> Option<String> {
    duplicates::folder_problem(&path)
}

// The search, as a task (progress by stage, Cancelar, notice); nothing is touched.
#[tauri::command]
pub async fn scan_duplicates(app: AppHandle, request: ScanRequest) -> Result<DuplicatesScan, String> {
    let task = request.task_id.clone();
    if let Some(task) = &task {
        tasks::start(&app, task, SCAN_ACTION);
    }

    let worker = app.clone();
    let result = tauri::async_runtime::spawn_blocking(move || duplicates::scan(&worker, &request)).await.map_err(|error| error.to_string());

    if let Some(task) = &task {
        tasks::finish_summary(&app, task, &result.as_ref().map(|scan| scan.summary.clone()).map_err(Clone::clone));
    }
    result
}

// «Quitar»: what was marked, to the recycle bin in batches.
#[tauri::command]
pub async fn remove_duplicates(app: AppHandle, request: RemoveRequest) -> Result<RemoveReport, String> {
    let task = request.task_id.clone();
    if let Some(task) = &task {
        tasks::start(&app, task, REMOVE_ACTION);
    }

    let worker = app.clone();
    let result = tauri::async_runtime::spawn_blocking(move || duplicates::remove(&worker, &request)).await.map_err(|error| error.to_string());

    if let Some(task) = &task {
        tasks::finish_summary(&app, task, &result.as_ref().map(|report| report.summary.clone()).map_err(Clone::clone));
    }
    result
}
