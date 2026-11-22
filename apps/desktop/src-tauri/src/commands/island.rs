use tauri::WebviewWindow;

use crate::services::island_window::{self, IslandSize};

#[tauri::command]
pub fn resize_island(window: WebviewWindow, size: IslandSize) -> Result<(), String> {
    island_window::resize(&window, size).map_err(|error| error.to_string())
}
