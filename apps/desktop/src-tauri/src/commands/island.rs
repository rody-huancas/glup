use tauri::{AppHandle, WebviewWindow};

use crate::services::{
    island_drag,
    island_window::{self, FrameRequest, IslandRect, IslandScreen, IslandStatus},
    settings::{self, IslandDock, Settings},
};

// The visible and clickable part of the window, in its CSS pixels.
#[tauri::command]
pub fn set_island_area(window: WebviewWindow, rect: IslandRect) -> Result<(), String> {
    island_window::set_area(&window, rect).map_err(|error| error.to_string())
}

// The monitors with their work areas, for the island's dock.
#[tauri::command]
pub fn get_island_screens(app: AppHandle) -> Vec<IslandScreen> {
    island_window::screens(&app)
}

// Where the window goes for the island's dock (the webview works it out from the screens).
#[tauri::command]
pub fn set_island_frame(window: WebviewWindow, request: FrameRequest) -> Result<(), String> {
    island_window::set_frame(&window, request).map_err(|error| error.to_string())
}

// The collapsed island is being dragged: Rust follows the cursor until the button comes up.
#[tauri::command]
pub fn begin_island_drag(app: AppHandle) {
    island_drag::begin(&app);
}

#[tauri::command]
pub fn set_island_dock(app: AppHandle, dock: IslandDock) -> Result<(), String> {
    let saved = settings::read(&app).settings;
    settings::update(&app, Settings { island_dock: Some(dock), ..saved }).map(|_| ())
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
