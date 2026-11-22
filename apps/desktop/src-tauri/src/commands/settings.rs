use tauri::AppHandle;

use crate::services::settings::{self, Settings, SettingsView};

#[tauri::command]
pub fn get_settings(app: AppHandle) -> SettingsView {
    settings::read(&app)
}

#[tauri::command]
pub fn update_settings(app: AppHandle, settings: Settings) -> Result<SettingsView, String> {
    settings::update(&app, settings)
}
