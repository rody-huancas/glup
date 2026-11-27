use tauri::AppHandle;

use crate::services::auto_folders::{self, runner, AutoFoldersView, RuleInput, RulePreview, SaveRuleRequest};
use crate::services::platform::{require, Feature};

async fn blocking<T: Send + 'static>(work: impl FnOnce() -> Result<T, String> + Send + 'static) -> Result<T, String> {
    tauri::async_runtime::spawn_blocking(work).await.map_err(|error| error.to_string())?
}

#[tauri::command]
pub fn get_auto_folders(app: AppHandle) -> AutoFoldersView {
    auto_folders::view(&app)
}

// Saves a new or edited rule; with «también lo que ya está», what is in the folder goes to the queue.
#[tauri::command]
pub async fn save_auto_rule(app: AppHandle, request: SaveRuleRequest) -> Result<AutoFoldersView, String> {
    require(Feature::AutoFolders)?;
    blocking(move || auto_folders::save_rule(&app, request)).await
}

#[tauri::command]
pub fn delete_auto_rule(app: AppHandle, id: String) -> Result<AutoFoldersView, String> {
    auto_folders::delete_rule(&app, &id)
}

#[tauri::command]
pub fn duplicate_auto_rule(app: AppHandle, id: String) -> Result<AutoFoldersView, String> {
    auto_folders::duplicate_rule(&app, &id)
}

#[tauri::command]
pub fn set_auto_rule_enabled(app: AppHandle, id: String, enabled: bool) -> Result<AutoFoldersView, String> {
    require(Feature::AutoFolders)?;
    auto_folders::set_enabled(&app, &id, enabled)
}

#[tauri::command]
pub fn set_auto_folders_paused(app: AppHandle, paused: bool) -> AutoFoldersView {
    auto_folders::set_paused_all(&app, paused)
}

// What a rule would do with what is already in its folder, without doing it.
#[tauri::command]
pub async fn preview_auto_rule(app: AppHandle, rule: RuleInput) -> Result<RulePreview, String> {
    blocking(move || auto_folders::preview(&app, &rule)).await
}

#[tauri::command]
pub fn answer_auto_catch_up(app: AppHandle, id: String, process: bool) -> AutoFoldersView {
    auto_folders::answer_catch_up(&app, &id, process)
}

// The download the rule waited for is here.
#[tauri::command]
pub fn resume_auto_rule(app: AppHandle, id: String) -> AutoFoldersView {
    auto_folders::resume(&app, &id)
}

// «Deshacer» of an original sent to the bin by a rule.
#[tauri::command]
pub async fn undo_auto_trash(app: AppHandle, undo: String) -> Result<String, String> {
    blocking(move || runner::undo_trash(&app, &undo)).await
}
