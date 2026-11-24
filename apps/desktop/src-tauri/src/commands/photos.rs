use std::path::PathBuf;

use tauri::ipc::Response;

use crate::services::image::heif::{self, HeifSupport};

// Whether Windows opens HEIC and AVIF itself, and whether FFmpeg is here to do it instead.
#[tauri::command]
pub async fn get_heif_support() -> Result<HeifSupport, String> {
    tauri::async_runtime::spawn_blocking(heif::support).await.map_err(|error| error.to_string())
}

// A small JPG of a HEIC, HEIF or AVIF for the lists and previews: the webview cannot show HEIC.
#[tauri::command]
pub async fn get_image_preview(path: String, size: u32) -> Result<Response, String> {
    tauri::async_runtime::spawn_blocking(move || heif::preview(&PathBuf::from(path), size).map(Response::new))
        .await
        .map_err(|error| error.to_string())?
}
