use tauri::AppHandle;

use crate::services::updates::{self, UpdateInfo};

// What the last check found, without asking GitHub again.
#[tauri::command]
pub fn get_update(app: AppHandle) -> Option<UpdateInfo> {
    updates::pending(&app)
}

// "Buscar actualizaciones" in Ajustes.
#[tauri::command]
pub async fn check_update(app: AppHandle) -> Result<Option<UpdateInfo>, String> {
    updates::check(&app).await
}

// "Actualizar ahora": Glup closes and opens again in the new version.
#[tauri::command]
pub async fn install_update(app: AppHandle) -> Result<(), String> {
    updates::install(&app).await
}
