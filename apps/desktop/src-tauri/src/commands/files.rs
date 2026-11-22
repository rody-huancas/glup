use std::path::Path;

use crate::services::file_info::{self, FileInfo};

// Lets the frontend tell a deleted file apart from any other failure.
pub const MISSING_FILE: &str = "missing";

// Async and off the main thread, so a long list never blocks the island.
#[tauri::command]
pub async fn get_files_info(paths: Vec<String>) -> Result<Vec<FileInfo>, String> {
    tauri::async_runtime::spawn_blocking(move || file_info::read_all(&paths))
        .await
        .map_err(|error| error.to_string())
}

// #[tauri::command]
// pub fn get_files_info(paths: Vec<String>) -> Vec<FileInfo> {
//     paths.iter().map(|path| file_info::read(path)).collect()
// }

#[tauri::command]
pub fn open_file(path: String) -> Result<(), String> {
    if !Path::new(&path).exists() {
        return Err(MISSING_FILE.to_string());
    }

    tauri_plugin_opener::open_path(&path, None::<&str>).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn reveal_file(path: String) -> Result<(), String> {
    if !Path::new(&path).exists() {
        return Err(MISSING_FILE.to_string());
    }

    tauri_plugin_opener::reveal_item_in_dir(&path).map_err(|error| error.to_string())
}
