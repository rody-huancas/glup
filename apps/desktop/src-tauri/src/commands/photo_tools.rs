use std::path::{Path, PathBuf};

use image::imageops::FilterType;
use serde::Deserialize;
use tauri::{ipc::Response, AppHandle};

use crate::services::{
    background::model::ModelStatus,
    image::{convert::encode_jpeg, decode::decode},
    photo_mark::{self, MarkOptions},
    social::{self, Frame},
    tasks::{self, TaskSummary},
    upscale::{self, model::UpscaleLevel, PreviewRequest},
};

async fn blocking<T: Send + 'static>(work: impl FnOnce() -> Result<T, String> + Send + 'static) -> Result<T, String> {
    tauri::async_runtime::spawn_blocking(work).await.map_err(|error| error.to_string())?
}

// The photo upright, at most `size` on its longer side, as a JPG for the screens (HEIC too).
#[tauri::command]
pub async fn get_photo_preview(path: String, size: u32) -> Result<Response, String> {
    blocking(move || {
        let image = decode(Path::new(&path))?;
        let small = if image.width().max(image.height()) > size { image.resize(size, size, FilterType::Triangle) } else { image };
        encode_jpeg(&small, 88).map(Response::new)
    })
    .await
}

// The biggest face of the photo, to start the frame on it (None: there is none, or not on Windows).
#[tauri::command]
pub async fn find_photo_face(path: String) -> Result<Option<Frame>, String> {
    blocking(move || Ok(social::face_of(&PathBuf::from(path)))).await
}

// The size of each photo as shown (upright), or None when it cannot be read.
#[tauri::command]
pub async fn get_photo_sizes(paths: Vec<String>) -> Result<Vec<Option<(u32, u32)>>, String> {
    blocking(move || Ok(paths.iter().map(|path| crate::services::image::decode::upright_size(Path::new(path))).collect())).await
}

#[tauri::command]
pub fn get_mark_config(app: AppHandle) -> MarkOptions {
    photo_mark::load_config(&app)
}

#[tauri::command]
pub fn save_mark_config(app: AppHandle, options: MarkOptions) {
    photo_mark::save_config(&app, &options);
}

#[tauri::command]
pub fn get_upscale_model(app: AppHandle, level: UpscaleLevel) -> Result<ModelStatus, String> {
    upscale::status(&app, level)
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpscaleDownloadRequest {
    pub level   : UpscaleLevel,
    pub task_id : Option<String>,
}

// The one-time download of a level of "Mejorar calidad", as a task.
#[tauri::command]
pub async fn download_upscale_model(app: AppHandle, request: UpscaleDownloadRequest) -> Result<TaskSummary, String> {
    let task = request.task_id.clone();
    if let Some(task) = &task {
        tasks::start(&app, task, upscale::DOWNLOAD_ACTION_ID);
    }
    let worker = app.clone();
    let result = blocking(move || upscale::download_model(&worker, &request.task_id, request.level)).await;
    if let Some(task) = &task {
        tasks::finish_summary(&app, task, &result);
    }
    result
}

#[tauri::command]
pub fn delete_upscale_model(app: AppHandle, level: UpscaleLevel) -> Result<(), String> {
    upscale::delete_model(&app, level)
}

// «Antes / Después» on a piece of the photo: one JPG, before on the left half and after on the right.
#[tauri::command]
pub async fn get_upscale_preview(app: AppHandle, request: PreviewRequest) -> Result<Response, String> {
    blocking(move || upscale::preview(&app, &request).map(|(bytes, _)| Response::new(bytes))).await
}
