use tauri::{AppHandle, State};

use crate::services::startup::{self, LaunchInfo, LaunchOpen};

#[tauri::command]
pub fn get_launch_info() -> LaunchInfo {
    startup::launch_info()
}

// True only the first time in this process, and only if Glup was opened by hand.
#[tauri::command]
pub fn take_launch_open(launch: State<'_, LaunchOpen>) -> bool {
    launch.take()
}

#[tauri::command]
pub fn get_autostart(app: AppHandle) -> bool {
    startup::is_enabled(&app)
}

#[tauri::command]
pub fn set_autostart(app: AppHandle, enabled: bool) -> Result<bool, String> {
    startup::set_enabled(&app, enabled)
}
