use serde::Deserialize;
use tauri::AppHandle;

use crate::services::{
    rename::{self, ApplyReport, RenameRequest, Row},
    space::{self, AnalyzeRequest, Place, SpaceView, SPACE_ACTION},
    tasks::{self, TaskSummary},
};

async fn blocking<T: Send + 'static>(work: impl FnOnce() -> Result<T, String> + Send + 'static) -> Result<T, String> {
    tauri::async_runtime::spawn_blocking(work).await.map_err(|error| error.to_string())?
}

// Tu carpeta and the disks of this PC, with their free and used space.
#[tauri::command]
pub fn get_space_places(app: AppHandle) -> Vec<Place> {
    space::places(&app)
}

// «Qué ocupa espacio» of a disk or folder, as a task; the screen reads the tree while it goes.
#[tauri::command]
pub async fn analyze_space(app: AppHandle, request: AnalyzeRequest) -> Result<TaskSummary, String> {
    let task = request.task_id.clone();
    if let Some(task) = &task {
        tasks::start(&app, task, SPACE_ACTION);
    }
    let worker = app.clone();
    let result = blocking(move || space::analyze(&worker, request)).await;
    if let Some(task) = &task {
        tasks::finish_summary(&app, task, &result);
    }
    result
}

// One folder of what was analyzed (0: the top).
#[tauri::command]
pub fn get_space_view(app: AppHandle, id: u32) -> Result<SpaceView, String> {
    space::view(&app, id)
}

// «Mandar a la papelera» (asked first on the screen); the folder it was in, updated.
#[tauri::command]
pub async fn trash_space_item(app: AppHandle, id: u32) -> Result<SpaceView, String> {
    blocking(move || space::trash(&app, id)).await
}

#[tauri::command]
pub async fn rename_preview(app: AppHandle, request: RenameRequest) -> Result<Vec<Row>, String> {
    blocking(move || Ok(rename::preview(&app, &request))).await
}

#[tauri::command]
pub async fn rename_folder_files(folder: String) -> Result<Vec<String>, String> {
    blocking(move || Ok(rename::folder_files(&folder))).await
}

#[tauri::command]
pub async fn apply_rename(app: AppHandle, request: RenameRequest) -> Result<ApplyReport, String> {
    blocking(move || rename::apply(&app, &request)).await
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UndoRenameRequest {
    pub id : String,
}

#[tauri::command]
pub async fn undo_rename(app: AppHandle, request: UndoRenameRequest) -> Result<TaskSummary, String> {
    blocking(move || rename::undo(&app, &request.id)).await
}
