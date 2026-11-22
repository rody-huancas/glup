use std::{
    fs,
    path::{Path, PathBuf},
};

use chrono::Local;
use serde::Serialize;
use tauri::{AppHandle, Manager};

pub const MAX_SIGNATURES: usize = 6;

pub const SIGNATURE_FULL_ERROR: &str  = "Ya tienes 6 firmas guardadas: borra una para guardar otra";
pub const SIGNATURE_SAVE_ERROR: &str  = "No pude guardar la firma";
pub const SIGNATURE_IMAGE_ERROR: &str = "La firma no es una imagen PNG válida";

const SIGNATURES_FOLDER: &str = "firmas";
const TEMPORARY_FOLDER: &str  = "glup-firmas-temporales";
const FILE_PREFIX: &str       = "firma-";
const FILE_EXTENSION: &str    = "png";

// A signature PNG on disk; the id is its file name.
#[derive(Clone, Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SignatureFile {
    pub id: String,
    pub path: String,
    // Saved to be used again (listed), or only for the current signing.
    pub kept: bool,
}

pub struct SaveSignatureParams<'a> {
    pub folder: &'a Path,
    pub bytes: &'a [u8],
    // Saved signatures are capped at MAX_SIGNATURES; temporary ones are not.
    pub limit: Option<usize>,
}

// Saved signatures live in the app data folder; the ones not kept, in a temporary folder.
pub fn signatures_folder(app: &AppHandle) -> Result<PathBuf, String> {
    app.path().app_data_dir().map(|folder| folder.join(SIGNATURES_FOLDER)).map_err(|_| SIGNATURE_SAVE_ERROR.to_string())
}

pub fn temporary_folder() -> PathBuf {
    std::env::temp_dir().join(TEMPORARY_FOLDER)
}

fn is_signature_name(name: &str) -> bool {
    name.starts_with(FILE_PREFIX)
        && name.ends_with(&format!(".{FILE_EXTENSION}"))
        && name.chars().all(|character| character.is_ascii_alphanumeric() || matches!(character, '-' | '.'))
}

// Newest first.
pub fn list_in(folder: &Path) -> Vec<SignatureFile> {
    let Ok(entries) = fs::read_dir(folder) else { return Vec::new() };

    let mut files: Vec<SignatureFile> = entries
        .filter_map(Result::ok)
        .filter_map(|entry| {
            let id = entry.file_name().to_string_lossy().into_owned();
            is_signature_name(&id).then(|| SignatureFile { path: entry.path().to_string_lossy().into_owned(), id, kept: true })
        })
        .collect();

    files.sort_by(|a, b| b.id.cmp(&a.id));
    files
}

// Only real PNGs are written, under a new firma-<timestamp>.png name.
pub fn save_in(params: SaveSignatureParams) -> Result<SignatureFile, String> {
    image::load_from_memory_with_format(params.bytes, image::ImageFormat::Png).map_err(|_| SIGNATURE_IMAGE_ERROR.to_string())?;

    if params.limit.is_some_and(|limit| list_in(params.folder).len() >= limit) {
        return Err(SIGNATURE_FULL_ERROR.to_string());
    }

    fs::create_dir_all(params.folder).map_err(|_| SIGNATURE_SAVE_ERROR.to_string())?;

    let stamp = Local::now().format("%Y%m%d-%H%M%S-%3f").to_string();
    let id    = (0..)
        .map(|copy| if copy == 0 { format!("{FILE_PREFIX}{stamp}.{FILE_EXTENSION}") } else { format!("{FILE_PREFIX}{stamp}-{copy}.{FILE_EXTENSION}") })
        .find(|name| !params.folder.join(name).exists())
        .unwrap_or_default();
    let path = params.folder.join(&id);

    fs::write(&path, params.bytes).map_err(|_| SIGNATURE_SAVE_ERROR.to_string())?;
    Ok(SignatureFile { id, path: path.to_string_lossy().into_owned(), kept: params.limit.is_some() })
}

// Ids that do not look like ours are ignored, so nothing outside the folder can be removed.
pub fn delete_in(folder: &Path, id: &str) -> Result<(), String> {
    if !is_signature_name(id) {
        return Ok(());
    }

    match fs::remove_file(folder.join(id)) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(_) => Err(SIGNATURE_SAVE_ERROR.to_string()),
    }
}

// Temporary signatures used by a signing are removed once it is done.
pub fn remove_temporary(paths: &[&str]) {
    let folder = temporary_folder();

    for path in paths.iter().map(Path::new).filter(|path| path.parent() == Some(folder.as_path())) {
        let _ = fs::remove_file(path);
    }
}

#[cfg(test)]
mod tests {
    use image::{Rgba, RgbaImage};

    use super::*;

    fn png() -> Vec<u8> {
        let mut bytes = Vec::new();
        RgbaImage::from_pixel(4, 2, Rgba([0, 0, 0, 255])).write_to(&mut std::io::Cursor::new(&mut bytes), image::ImageFormat::Png).unwrap();
        bytes
    }

    fn folder(name: &str) -> PathBuf {
        let folder = std::env::temp_dir().join(format!("glup-signatures-{}-{name}", std::process::id()));
        let _      = fs::remove_dir_all(&folder);
        folder
    }

    #[test]
    fn saves_lists_and_deletes() {
        let folder = folder("cycle");
        let bytes  = png();

        let first  = save_in(SaveSignatureParams { folder: &folder, bytes: &bytes, limit: Some(MAX_SIGNATURES) }).unwrap();
        let second = save_in(SaveSignatureParams { folder: &folder, bytes: &bytes, limit: Some(MAX_SIGNATURES) }).unwrap();
        assert_ne!(first.id, second.id);
        assert_eq!(list_in(&folder).len(), 2);

        delete_in(&folder, &first.id).unwrap();
        assert_eq!(list_in(&folder), vec![second]);
        let _ = fs::remove_dir_all(&folder);
    }

    #[test]
    fn stops_at_six_saved_signatures() {
        let folder = folder("full");
        let bytes  = png();

        for _ in 0..MAX_SIGNATURES {
            save_in(SaveSignatureParams { folder: &folder, bytes: &bytes, limit: Some(MAX_SIGNATURES) }).unwrap();
        }

        assert_eq!(save_in(SaveSignatureParams { folder: &folder, bytes: &bytes, limit: Some(MAX_SIGNATURES) }).unwrap_err(), SIGNATURE_FULL_ERROR);
        let _ = fs::remove_dir_all(&folder);
    }

    #[test]
    fn refuses_files_that_are_not_png_and_foreign_ids() {
        let folder = folder("refuse");

        assert_eq!(save_in(SaveSignatureParams { folder: &folder, bytes: b"no", limit: None }).unwrap_err(), SIGNATURE_IMAGE_ERROR);
        assert!(delete_in(&folder, "../settings.json").is_ok());
        assert!(!is_signature_name("../firma-1.png"));
    }
}
