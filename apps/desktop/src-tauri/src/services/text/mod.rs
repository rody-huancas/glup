// "Sacar texto": the OCR of Windows for images and scanned pages; PDF pages that already have text are
// read by pdf.js in the webview. Here the text is put together, saved as .txt and kept in the history.
pub mod compose;
pub mod language;
pub mod ocr;

#[cfg(test)]
mod tests;

use std::{
    fs,
    path::{Path, PathBuf},
};

use chrono::Local;
use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use crate::services::{
    destination::{self, Destination},
    history::{self, NewEntryParams},
    naming::{output_path, OutputKind, OutputNameParams},
    text::compose::{compose, history_detail, pages_read, pages_with_text, to_windows_lines, FileText},
};

pub const TEXT_ACTION: &str    = "extract-text";
pub const TEXT_KIND: &str      = "text";
pub const TEXT_EXTENSION: &str = "txt";
// Several files share one .txt: textos-AAAA-MM-DD-HHmm.txt.
pub const SEVERAL_PREFIX: &str = "textos";

pub const READ_ERROR: &str = "No pude abrir esta imagen";
pub const SAVE_ERROR: &str = "No pude guardar el texto";

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TextSupport {
    // This system has an OCR (Windows).
    pub supported : bool,
    // The language it will read in, or None when none is installed.
    pub language  : Option<String>,
}

pub fn support() -> TextSupport {
    TextSupport { supported: cfg!(windows), language: ocr::language() }
}

// An image file, decoded and read.
pub fn read_image(path: &Path) -> Result<String, String> {
    let image = image::open(path).map_err(|_| READ_ERROR.to_string())?.to_rgba8();
    ocr::recognize(image)
}

// A PDF page rendered by pdf.js (PNG bytes), read.
pub fn read_page(bytes: &[u8]) -> Result<String, String> {
    let image = image::load_from_memory(bytes).map_err(|_| READ_ERROR.to_string())?.to_rgba8();
    ocr::recognize(image)
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FinishTextRequest {
    pub paths : Vec<String>,
    pub files : Vec<FileText>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TextReport {
    pub text     : String,
    // Pages and images read, and how many had text.
    pub pages    : u32,
    pub written  : u32,
    // The history line, to point it at the .txt if it is saved.
    pub entry_id : Option<String>,
}

// Puts the text together and keeps it in the history ("Texto sacado · 3 páginas"), pointing at the
// first file until a .txt is saved.
pub fn finish(app: &AppHandle, request: FinishTextRequest) -> TextReport {
    let text    = compose(&request.files);
    let pages   = pages_read(&request.files);
    let written = pages_with_text(&request.files);

    let entry_id = request.paths.first().filter(|_| !text.is_empty()).map(|first| {
        let entry = history::new_entry(NewEntryParams { output: Path::new(first), kind: TEXT_KIND, action: TEXT_ACTION, detail: history_detail(pages) });
        let id    = entry.id.clone();
        let _     = history::append(app, vec![entry]);
        id
    });

    TextReport { text, pages, written, entry_id }
}

pub struct TextNameParams<'a> {
    pub folder  : &'a Path,
    pub sources : &'a [PathBuf],
    pub stamp   : &'a str,
    pub exists  : &'a dyn Fn(&Path) -> bool,
}

// foto.txt or contrato.txt next to the original (with « (2)» if taken); several files: textos-<fecha>.txt.
pub fn text_path(params: TextNameParams) -> Option<PathBuf> {
    let first = params.sources.first()?;
    let name  = format!("{SEVERAL_PREFIX}-{}", params.stamp);
    let kind  = if params.sources.len() == 1 { OutputKind::Converted { extension: TEXT_EXTENSION } } else { OutputKind::Named { name: &name, extension: TEXT_EXTENSION } };

    Some(output_path(&OutputNameParams { folder: params.folder, source: first, kind }, params.exists))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveTextRequest {
    pub paths       : Vec<String>,
    pub text        : String,
    pub destination : Option<Destination>,
    pub entry_id    : Option<String>,
}

// "Guardar como .txt": in the destination chosen, never over another file.
pub fn save(app: &AppHandle, request: SaveTextRequest) -> Result<String, String> {
    let sources: Vec<PathBuf> = request.paths.iter().map(PathBuf::from).collect();
    let first                 = sources.first().ok_or(SAVE_ERROR)?;
    let folder                = destination::prepare(first, &request.destination.unwrap_or_default())?;
    let stamp                 = Local::now().format("%Y-%m-%d-%H%M").to_string();
    let output                = text_path(TextNameParams { folder: &folder, sources: &sources, stamp: &stamp, exists: &|path| path.exists() }).ok_or(SAVE_ERROR)?;

    fs::write(&output, to_windows_lines(&request.text)).map_err(|_| SAVE_ERROR.to_string())?;

    if let Some(id) = &request.entry_id {
        let _ = history::point_to(app, id, &output);
    }

    Ok(output.to_string_lossy().into_owned())
}
