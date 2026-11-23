use tauri::AppHandle;

use crate::services::notify::{self, NotifyRequest};

// A task ended while the person was not looking: a Windows notification (if not turned off). True if shown.
#[tauri::command]
pub fn notify_task(app: AppHandle, request: NotifyRequest) -> bool {
    notify::notify(&app, request)
}

// The island is the window in front (the person is using Glup right now).
#[tauri::command]
pub fn is_glup_in_front(app: AppHandle) -> bool {
    notify::island_in_front(&app)
}
