use tauri::AppHandle;

use crate::services::history::{self, HistoryEntry};

#[tauri::command]
pub fn get_history(app: AppHandle) -> Vec<HistoryEntry> {
    history::read(&app)
}

// "Quitar seleccionados": only those lines of Glup's list.
#[tauri::command]
pub fn remove_history_entries(app: AppHandle, ids: Vec<String>) -> Result<(), String> {
    history::remove(&app, &ids)
}

#[tauri::command]
pub fn clear_history(app: AppHandle) -> Result<(), String> {
    history::clear(&app)
}
