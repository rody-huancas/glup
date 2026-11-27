use tauri::{
    ipc::{InvokeBody, Request},
    AppHandle,
};
use serde::Deserialize;

use crate::services::text::{self, FinishTextRequest, SaveTextRequest, TextReport, TextSupport, READ_ERROR};
use crate::services::platform::{require, Feature};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageTextRequest {
    pub path: String,
}

// Whether this system can read text from images, and in which language.
#[tauri::command]
pub async fn get_text_support() -> Result<TextSupport, String> {
    tauri::async_runtime::spawn_blocking(text::support).await.map_err(|error| error.to_string())
}

// The text of one image file (OCR, off the main thread).
#[tauri::command]
pub async fn read_image_text(request: ImageTextRequest) -> Result<String, String> {
    require(Feature::ReadText)?;
    tauri::async_runtime::spawn_blocking(move || text::read_image(std::path::Path::new(&request.path)))
        .await
        .map_err(|error| error.to_string())
        .and_then(|result| result)
}

// A scanned PDF page rendered by pdf.js, sent as raw PNG bytes (no JSON).
#[tauri::command]
pub async fn read_page_text(request: Request<'_>) -> Result<String, String> {
    require(Feature::ReadText)?;
    let InvokeBody::Raw(bytes) = request.body() else {
        return Err(READ_ERROR.to_string());
    };
    let bytes = bytes.clone();

    tauri::async_runtime::spawn_blocking(move || text::read_page(&bytes)).await.map_err(|error| error.to_string()).and_then(|result| result)
}

#[tauri::command]
pub fn finish_text(app: AppHandle, request: FinishTextRequest) -> TextReport {
    text::finish(&app, request)
}

#[tauri::command]
pub async fn save_text(app: AppHandle, request: SaveTextRequest) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || text::save(&app, request)).await.map_err(|error| error.to_string()).and_then(|result| result)
}
