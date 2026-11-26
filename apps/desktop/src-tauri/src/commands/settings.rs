use tauri::AppHandle;

use crate::services::settings::{self, Settings, SettingsView};

// The name the Windows account shows, for the greeting when none was written in Ajustes.
#[tauri::command]
pub fn get_account_name() -> Option<String> {
    crate::services::account::display_name()
}

#[tauri::command]
pub fn get_settings(app: AppHandle) -> SettingsView {
    settings::read(&app)
}

#[tauri::command]
pub fn update_settings(app: AppHandle, settings: Settings) -> Result<SettingsView, String> {
    settings::update(&app, settings)
}
