use tauri::AppHandle;

use crate::services::cursor_tracker::{self, CursorPosition};

#[tauri::command]
pub fn get_cursor_position(app: AppHandle) -> Option<CursorPosition> {
    cursor_tracker::read(&app)
}
