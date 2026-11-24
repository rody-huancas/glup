use tauri::{ipc::Response, AppHandle, Manager};

use crate::services::performance::{self, processes::CloseOutcome, startup::StartupEntry, Overview, PerformanceState};

fn blocking<T: Send + 'static>(work: impl FnOnce() -> T + Send + 'static) -> impl std::future::Future<Output = Result<T, String>> {
    async move { tauri::async_runtime::spawn_blocking(work).await.map_err(|error| error.to_string()) }
}

// One reading: the PC, its disks and battery, and the five apps using the most.
#[tauri::command]
pub async fn get_performance(app: AppHandle) -> Result<Overview, String> {
    blocking(move || performance::read(&app.state::<PerformanceState>())).await
}

// "Cerrar": as its windows' "X"; it waits a few seconds to see whether it closed.
#[tauri::command]
pub async fn close_app(app: AppHandle, id: String) -> Result<CloseOutcome, String> {
    blocking(move || performance::close_app(&app.state::<PerformanceState>(), &id)).await?
}

// "Forzar", only after "Cerrar" did not work.
#[tauri::command]
pub async fn force_close_app(app: AppHandle, id: String) -> Result<(), String> {
    blocking(move || performance::force_app(&app.state::<PerformanceState>(), &id)).await?
}

#[tauri::command]
pub async fn get_startup_apps() -> Result<Vec<StartupEntry>, String> {
    blocking(performance::startup_apps).await
}

#[tauri::command]
pub async fn set_startup_app(id: String, enabled: bool) -> Result<(), String> {
    blocking(move || performance::set_startup_app(&id, enabled)).await?
}

// The icon of a program or shortcut (PNG); empty when it has none.
#[tauri::command]
pub async fn get_app_icon(path: String) -> Result<Response, String> {
    blocking(move || Response::new(performance::icon(&path).unwrap_or_default())).await
}
