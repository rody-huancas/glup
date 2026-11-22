use tauri::{
    ipc::{InvokeBody, Request},
    AppHandle,
};

use crate::services::signatures::{self, SaveSignatureParams, SignatureFile, MAX_SIGNATURES, SIGNATURE_IMAGE_ERROR};

const KEEP_HEADER: &str = "x-glup-keep";

#[tauri::command]
pub fn list_signatures(app: AppHandle) -> Result<Vec<SignatureFile>, String> {
    Ok(signatures::list_in(&signatures::signatures_folder(&app)?))
}

// The PNG arrives as raw bytes; the header says whether to keep it for later (capped at 6).
#[tauri::command]
pub fn save_signature(app: AppHandle, request: Request<'_>) -> Result<SignatureFile, String> {
    let InvokeBody::Raw(bytes) = request.body() else {
        return Err(SIGNATURE_IMAGE_ERROR.to_string());
    };

    let keep = request.headers().get(KEEP_HEADER).and_then(|value| value.to_str().ok()) == Some("1");

    if keep {
        let folder = signatures::signatures_folder(&app)?;
        return signatures::save_in(SaveSignatureParams { folder: &folder, bytes, limit: Some(MAX_SIGNATURES) });
    }

    let folder = signatures::temporary_folder();
    signatures::save_in(SaveSignatureParams { folder: &folder, bytes, limit: None })
}

#[tauri::command]
pub fn delete_signature(app: AppHandle, id: String) -> Result<(), String> {
    signatures::delete_in(&signatures::signatures_folder(&app)?, &id)
}
