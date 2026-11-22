use std::{
    fs,
    path::{Path, PathBuf},
};

use serde::Serialize;
use tauri::{AppHandle, Manager};

// The model Glup downloads once, pinned to one exact file (never "the latest"). To move it to a copy
// in the repo's Releases, change the url (and the hash, if the file changes).
pub struct ModelFile {
    pub name: &'static str,
    pub url: &'static str,
    pub sha256: &'static str,
    pub size: u64,
}

// BiRefNet_lite (MIT, ZhengPeng7), ONNX export by onnx-community, fp16 weights.
pub const BACKGROUND_MODEL: ModelFile = ModelFile {
    name   : "birefnet-lite-fp16.onnx",
    url    : "https://huggingface.co/onnx-community/BiRefNet_lite-ONNX/resolve/de15b22ba131738a16dff04aab8bdf8dc32e3ac1/onnx/model_fp16.onnx",
    sha256 : "d39b897ceb16ae654c1731f3dba0cf9b368d9cae74b5a57459b455cc8bfec402",
    size   : 114_538_221,
};

pub const MODELS_FOLDER: &str  = "models";
pub const PART_EXTENSION: &str = "part";

pub const FOLDER_ERROR: &str = "No pude preparar la carpeta de lo que aprendo";
pub const DELETE_ERROR: &str = "No pude borrarlo";

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelStatus {
    pub installed: bool,
    // What the download weighs (shown before asking) or what it takes on disk once installed.
    pub size: u64,
    // Bytes already downloaded from an interrupted download.
    pub partial: u64,
}

pub fn models_folder(app: &AppHandle) -> Result<PathBuf, String> {
    let folder = app.path().app_data_dir().map_err(|_| FOLDER_ERROR.to_string())?.join(MODELS_FOLDER);
    fs::create_dir_all(&folder).map_err(|_| FOLDER_ERROR.to_string())?;
    Ok(folder)
}

pub fn model_path(folder: &Path, model: &ModelFile) -> PathBuf {
    folder.join(model.name)
}

// The download in progress lives next to it with .part until its hash is checked.
pub fn part_path(folder: &Path, model: &ModelFile) -> PathBuf {
    folder.join(format!("{}.{PART_EXTENSION}", model.name))
}

fn size_of(path: &Path) -> Option<u64> {
    fs::metadata(path).ok().map(|data| data.len())
}

pub fn status_in(folder: &Path, model: &ModelFile) -> ModelStatus {
    match size_of(&model_path(folder, model)) {
        Some(size) => ModelStatus { installed: true, size, partial: 0 },
        None       => ModelStatus { installed: false, size: model.size, partial: size_of(&part_path(folder, model)).unwrap_or(0) },
    }
}

pub fn status(app: &AppHandle) -> Result<ModelStatus, String> {
    Ok(status_in(&models_folder(app)?, &BACKGROUND_MODEL))
}

// "Borrar" in Ajustes: the model and any half download. It is Glup's own file, not the person's.
pub fn delete_in(folder: &Path, model: &ModelFile) -> Result<(), String> {
    for path in [model_path(folder, model), part_path(folder, model)] {
        if path.exists() {
            fs::remove_file(&path).map_err(|_| DELETE_ERROR.to_string())?;
        }
    }

    Ok(())
}
