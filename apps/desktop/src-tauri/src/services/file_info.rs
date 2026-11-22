use std::{fs, path::Path};

use serde::Serialize;

const PDF_EXTENSIONS: [&str; 1]   = ["pdf"];
const IMAGE_EXTENSIONS: [&str; 6] = ["png", "jpg", "jpeg", "webp", "gif", "bmp"];

#[derive(Clone, Copy, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum FileKind {
    Pdf,
    Image,
    Other,
}

#[derive(Serialize)]
pub struct FileInfo {
    pub path: String,
    pub name: String,
    pub extension: String,
    pub size: u64,
    pub kind: FileKind,
}

pub fn read(path: &str) -> FileInfo {
    let file_path = Path::new(path);
    let metadata  = fs::metadata(file_path).ok();
    let is_file   = metadata.as_ref().is_some_and(|data| data.is_file());

    let name = file_path
        .file_name()
        .map(|value| value.to_string_lossy().into_owned())
        .unwrap_or_else(|| path.to_string());

    let extension = file_path
        .extension()
        .map(|value| value.to_string_lossy().to_lowercase())
        .unwrap_or_default();

    let kind = if is_file { kind_of(&extension) } else { FileKind::Other };

    FileInfo {
        path: path.to_string(),
        name,
        extension,
        size: metadata.map(|data| data.len()).unwrap_or(0),
        kind,
    }
}

fn kind_of(extension: &str) -> FileKind {
    if PDF_EXTENSIONS.contains(&extension) {
        FileKind::Pdf
    } else if IMAGE_EXTENSIONS.contains(&extension) {
        FileKind::Image
    } else {
        FileKind::Other
    }
}
