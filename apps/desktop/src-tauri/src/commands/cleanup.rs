use tauri::AppHandle;

use crate::services::{
    cleanup::{self, disk, CleanReport, CleanRequest, CleanupScan, ScanRequest, CLEAN_ACTION_ID, SCAN_ACTION_ID},
    platform::{require, Feature},
    tasks,
};

pub const DISK_ERROR: &str = "No pude leer el espacio del disco";

#[tauri::command]
pub fn get_disk_space() -> Result<disk::DiskSpace, String> {
    require(Feature::Cleanup)?;
    disk::system_disk().ok_or_else(|| DISK_ERROR.to_string())
}

// "Revisar mi PC": a task like the actions, on a worker thread; nothing is deleted.
#[tauri::command]
pub async fn scan_cleanup(app: AppHandle, request: ScanRequest) -> Result<CleanupScan, String> {
    require(Feature::Cleanup)?;
    let task = request.task_id.clone();

    if let Some(task) = &task {
        tasks::start(&app, task, SCAN_ACTION_ID);
    }

    let worker = app.clone();
    let id     = task.clone();
    let result = tauri::async_runtime::spawn_blocking(move || cleanup::scan(&worker, &id)).await.map_err(|error| error.to_string());

    if let Some(task) = &task {
        tasks::finish_summary(&app, task, &result.as_ref().map(|scan| scan.summary.clone()).map_err(Clone::clone));
    }

    result
}

// "Liberar": only what the last scan found and the person marked.
#[tauri::command]
pub async fn clean_up(app: AppHandle, request: CleanRequest) -> Result<CleanReport, String> {
    require(Feature::Cleanup)?;
    let task = request.task_id.clone();

    if let Some(task) = &task {
        tasks::start(&app, task, CLEAN_ACTION_ID);
    }

    let worker = app.clone();
    let result = tauri::async_runtime::spawn_blocking(move || cleanup::clean(&worker, &request)).await.map_err(|error| error.to_string());

    if let Some(task) = &task {
        tasks::finish_summary(&app, task, &result.as_ref().map(|report| report.summary.clone()).map_err(Clone::clone));
    }

    result
}
