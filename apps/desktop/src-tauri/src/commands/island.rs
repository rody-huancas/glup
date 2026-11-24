use serde::Deserialize;
use tauri::{AppHandle, WebviewWindow};

use crate::services::{
    island_drag,
    island_window::{self, FrameRequest, IslandRect, IslandScreen, IslandStatus},
    settings::{self, IslandDock, Settings},
    taskbar,
};

// The visible part of the window, in its CSS pixels. Not clickable (hidden at rest) it is only what the
// cursor tracker watches to reveal Glup; the window's region stays empty.
#[tauri::command]
pub fn set_island_area(window: WebviewWindow, rect: IslandRect, clickable: Option<bool>) -> Result<(), String> {
    island_window::set_area(&window, rect, clickable.unwrap_or(true)).map_err(|error| error.to_string())
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

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IslandModeRequest {
    pub hidden       : Option<bool>,
    pub reveal_delay : Option<u32>,
    pub intro_seen   : Option<bool>,
}

// "Cómo se muestra" in Ajustes: island or hidden, the delay before a hidden one comes out, and whether
// its notice was seen. What is not sent stays as it was.
#[tauri::command]
pub fn set_island_mode(app: AppHandle, request: IslandModeRequest) -> Result<(), String> {
    let saved = settings::read(&app).settings;
    let next  = Settings {
        island_hidden     : request.hidden.unwrap_or(saved.island_hidden),
        reveal_delay      : request.reveal_delay.or(saved.reveal_delay),
        hidden_intro_seen : request.intro_seen.unwrap_or(saved.hidden_intro_seen),
        ..saved
    };
    settings::update(&app, next).map(|_| ())
}

// Whether the taskbar hides by itself and on which edge: a hidden Glup on that edge would compete with it.
#[tauri::command]
pub fn get_taskbar_state() -> taskbar::TaskbarState {
    taskbar::state()
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
