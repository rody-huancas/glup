use tauri::AppHandle;

use crate::services::shortcuts::{self, ShortcutRequest, ShortcutTarget, ShortcutView};

#[tauri::command]
pub fn get_shortcut(app: AppHandle, target: ShortcutTarget) -> ShortcutView {
    shortcuts::view(&app, target)
}

#[tauri::command]
pub fn set_shortcut(app: AppHandle, request: ShortcutRequest) -> Result<ShortcutView, String> {
    shortcuts::change(&app, request)
}

// While Ajustes listens for a new combination.
#[tauri::command]
pub fn pause_shortcuts(app: AppHandle, paused: bool) {
    shortcuts::pause(&app, paused);
}
