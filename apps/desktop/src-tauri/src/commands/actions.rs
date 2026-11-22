use tauri::AppHandle;

use crate::services::actions::{self, ActionReport, ActionRequest};

// Heavy image work runs on a blocking worker, so the island never freezes.
#[tauri::command]
pub async fn run_action(app: AppHandle, request: ActionRequest) -> Result<ActionReport, String> {
    tauri::async_runtime::spawn_blocking(move || actions::run(&app, request))
        .await
        .map_err(|error| error.to_string())?
}

// The file in progress finishes; the next ones are not started.
#[tauri::command]
pub fn cancel_action(app: AppHandle) {
    actions::cancel(&app);
}
