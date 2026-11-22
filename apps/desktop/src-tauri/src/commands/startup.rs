use tauri::AppHandle;

use crate::services::startup::{self, LaunchInfo};

#[tauri::command]
pub fn get_launch_info() -> LaunchInfo {
    startup::launch_info()
}

#[tauri::command]
pub fn get_autostart(app: AppHandle) -> bool {
    startup::is_enabled(&app)
}

#[tauri::command]
pub fn set_autostart(app: AppHandle, enabled: bool) -> Result<bool, String> {
    startup::set_enabled(&app, enabled)
}
