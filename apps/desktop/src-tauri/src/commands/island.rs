use tauri::WebviewWindow;

use crate::services::island_window::{self, IslandSize};

// Replaced by set_island_area (the window no longer resizes).
// #[tauri::command]
// pub fn resize_island(window: WebviewWindow, size: IslandSize) -> Result<(), String> {
//     island_window::resize(&window, size).map_err(|error| error.to_string())
// }

#[tauri::command]
pub fn set_island_area(window: WebviewWindow, size: IslandSize) -> Result<(), String> {
    island_window::set_area(&window, size).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn set_island_focus(window: WebviewWindow, focused: bool) -> Result<(), String> {
    island_window::set_focus(&window, focused).map_err(|error| error.to_string())
}
