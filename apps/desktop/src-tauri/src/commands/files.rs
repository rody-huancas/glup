use crate::services::file_info::{self, FileInfo};

#[tauri::command]
pub fn get_files_info(paths: Vec<String>) -> Vec<FileInfo> {
    paths.iter().map(|path| file_info::read(path)).collect()
}
