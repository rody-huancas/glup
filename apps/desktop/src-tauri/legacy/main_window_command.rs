use tauri::AppHandle;

use crate::services::main_window;

#[tauri::command]
pub fn open_main_window(app: AppHandle) -> Result<(), String> {
    main_window::open(&app).map_err(|error| error.to_string())
}
