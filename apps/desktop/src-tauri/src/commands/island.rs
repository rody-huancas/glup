use tauri::WebviewWindow;

use crate::services::island_window::{self, IslandSize, IslandStatus};

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

// What the webview watchdog compares its state machine with.
#[tauri::command]
pub fn get_island_status(window: WebviewWindow) -> IslandStatus {
    island_window::status(&window)
}

// Dev only: the island's transitions, printed in the terminal running tauri dev.
#[tauri::command]
pub fn log_island(line: String) {
    #[cfg(debug_assertions)]
    eprintln!("[glup:isla] {line}");
    #[cfg(not(debug_assertions))]
    let _ = line;
}
