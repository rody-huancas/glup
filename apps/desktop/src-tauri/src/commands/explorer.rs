use tauri::AppHandle;

use crate::services::{
    explorer::{self, ExplorerChange, ExplorerRequest},
    island_window,
    platform::{require, Feature},
};

// What came from the Explorer and is ready (gathered), taken once.
#[tauri::command]
pub fn take_explorer_requests(app: AppHandle) -> Vec<ExplorerRequest> {
    explorer::take(&app)
}

// Ajustes › General: "Mostrar Glup en el clic derecho".
#[tauri::command]
pub async fn set_explorer_menu(app: AppHandle, enabled: bool) -> Result<(), String> {
    require(Feature::ExplorerMenu)?;
    tauri::async_runtime::spawn_blocking(move || explorer::change(&app, ExplorerChange { menu: Some(enabled), send_to: None })).await.map_err(|error| error.to_string())?
}

// Ajustes › General: "En Enviar a".
#[tauri::command]
pub async fn set_send_to(app: AppHandle, enabled: bool) -> Result<(), String> {
    require(Feature::ExplorerMenu)?;
    tauri::async_runtime::spawn_blocking(move || explorer::change(&app, ExplorerChange { menu: None, send_to: Some(enabled) })).await.map_err(|error| error.to_string())?
}

// Files from the Explorer that need a step: the island opens on it like a click (shown even if hidden
// in the tray), not pinned.
#[tauri::command]
pub fn open_island(app: AppHandle) {
    island_window::request_show(&app);
}
