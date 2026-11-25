// "Escanear documento" (familia PDF): photos of sheets, taken with the phone, made into one straight,
// clean PDF like a scanner's. Each photo is read once and kept small while it is reviewed (the corners
// are found and moved on that copy, as shares of it); the final PDF reads them again at full size.
pub mod detect;
pub mod document;
pub mod enhance;
pub mod geometry;
pub mod warp;

#[cfg(test)]
mod tests;

use std::{
    collections::HashMap,
    path::Path,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
};

use image::{imageops::FilterType, DynamicImage, RgbImage};
use jpeg_encoder::{ColorType, Encoder};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

use self::{
    detect::detect,
    document::{build, PaperChoice, ScanPdfPage},
    enhance::{enhance, ScanMode},
    geometry::{is_convex, order_corners, page_pixels, scale_quad, Point, Quad},
    warp::{rotate, warp, WarpParams},
};
use crate::services::{
    actions::ActionProgress,
    image::decode::decode,
    progress::{self, Stage},
    text::ocr,
};

pub const SCAN_ACTION: &str   = "scan";
pub const SCAN_SUFFIX: &str   = "escaneado";
pub const NO_PAGES: &str      = "No hay hojas para escanear";
pub const BAD_CORNERS: &str   = "Las esquinas de una hoja se cruzan: acomódalas para que formen la hoja";
const PREVIEW_JPEG: u8        = 85;
// The copy kept for the review (corners, previews): enough to judge, light to keep several.
const REVIEW_SIDE: u32        = 1600;
// The long side of a finished page: about 260 ppp on an A4 for black and white (text stays sharp),
// about 190 ppp for colour and grey (JPEG pages stay light).
const BW_LONG: f64            = 3000.0;
const PHOTO_LONG: f64         = 2200.0;
const PREVIEW_LONG: f64       = 1100.0;

// The photos under review, small (by path).
#[derive(Default)]
pub struct ScanState(Mutex<HashMap<String, Arc<RgbImage>>>);

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanPhoto {
    pub path    : String,
    // The proportion of the photo (its review copy), upright.
    pub width   : u32,
    pub height  : u32,
    // Shares of the photo, in order: top left, top right, bottom right, bottom left.
    pub corners : Quad,
    // A sheet was found; if not, the corners are the whole photo.
    pub found   : bool,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanPage {
    pub path     : String,
    pub corners  : Quad,
    // Clockwise quarter turns of the straight page: 0, 90, 180 or 270.
    pub rotation : u32,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanPreviewRequest {
    pub page : ScanPage,
    pub mode : ScanMode,
}

fn review_copy(app: &AppHandle, path: &str) -> Result<Arc<RgbImage>, String> {
    let state = app.state::<ScanState>();
    if let Some(found) = state.0.lock().ok().and_then(|cache| cache.get(path).cloned()) {
        return Ok(found);
    }

    let photo = decode(Path::new(path))?;
    let small = Arc::new(shrink(photo, REVIEW_SIDE));
    if let Ok(mut cache) = state.0.lock() {
        cache.insert(path.to_string(), small.clone());
    }
    Ok(small)
}

fn shrink(photo: DynamicImage, side: u32) -> RgbImage {
    let (width, height) = (photo.width(), photo.height());
    if width.max(height) <= side {
        return photo.to_rgb8();
    }
    photo.resize(side, side, FilterType::Triangle).to_rgb8()
}

// A photo opened for review: its proportion and the corners of the sheet found in it.
pub fn open(app: &AppHandle, path: &str) -> Result<ScanPhoto, String> {
    let photo     = review_copy(app, path)?;
    let detection = detect(&photo);
    Ok(ScanPhoto { path: path.to_string(), width: photo.width(), height: photo.height(), corners: detection.corners, found: detection.found })
}

fn encode_jpeg(image: &RgbImage) -> Result<Vec<u8>, String> {
    let mut bytes = Vec::new();
    Encoder::new(&mut bytes, PREVIEW_JPEG).encode(image.as_raw(), image.width() as u16, image.height() as u16, ColorType::Rgb).map_err(|_| document::ENCODE_ERROR.to_string())?;
    Ok(bytes)
}

// The photo itself, upright and small (the webview shows neither HEIC nor every EXIF turn the same).
pub fn photo_preview(app: &AppHandle, path: &str, size: u32) -> Result<Vec<u8>, String> {
    let photo = review_copy(app, path)?;
    encode_jpeg(&shrink(DynamicImage::ImageRgb8((*photo).clone()), size.max(64)))
}

// The page as it will come out (straight, turned and cleaned), from the review copy.
pub fn page_preview(app: &AppHandle, request: &ScanPreviewRequest) -> Result<Vec<u8>, String> {
    let photo = review_copy(app, &request.page.path)?;
    let page  = straighten(&photo, &request.page, PREVIEW_LONG)?;
    encode_jpeg(&enhance(&page.image, request.mode).to_rgb())
}

// Lets the review copies go (the screen was closed or the PDF saved).
pub fn close(app: &AppHandle) {
    if let Ok(mut cache) = app.state::<ScanState>().0.lock() {
        cache.clear();
    }
}

pub struct Straight {
    pub image : RgbImage,
    pub paper : geometry::PaperMatch,
}

// The sheet cut out of the photo, straight, at its real proportion, turned as asked.
pub fn straighten(photo: &RgbImage, page: &ScanPage, max_long: f64) -> Result<Straight, String> {
    let corners = scale_quad(&order_corners(clamp_corners(page.corners)), photo.width() as f64, photo.height() as f64);
    if !is_convex(&corners) {
        return Err(BAD_CORNERS.to_string());
    }

    let (width, height, paper) = page_pixels(&corners, max_long);
    let image                  = warp(WarpParams { photo, corners, width, height }).ok_or_else(|| BAD_CORNERS.to_string())?;
    Ok(Straight { image: rotate(image, page.rotation), paper })
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanRequest {
    pub pages       : Vec<ScanPage>,
    pub mode        : ScanMode,
    pub paper       : PaperChoice,
    // «Que se pueda buscar el texto»: the words go in as invisible text.
    pub searchable  : bool,
    pub destination : Option<crate::services::destination::Destination>,
    pub task_id     : Option<String>,
}

pub struct ScanDocument {
    pub bytes : Vec<u8>,
    pub pages : usize,
    // Pages whose text could be read (with «Que se pueda buscar el texto»).
    pub read  : usize,
}

pub struct RenderParams<'a> {
    pub app     : &'a AppHandle,
    pub request : &'a ScanRequest,
    pub cancel  : &'a AtomicBool,
}

fn emit(app: &AppHandle, task: &Option<String>, stage: Stage, current: usize, total: usize) {
    progress::emit(app, ActionProgress { current, total, ..ActionProgress::at(task, stage) });
}

// Every page straightened and cleaned, then read, then put together. None when cancelled (between pages).
pub fn render(params: RenderParams) -> Result<Option<ScanDocument>, String> {
    let RenderParams { app, request, cancel } = params;
    let task  = &request.task_id;
    let total = request.pages.len();
    if total == 0 {
        return Err(NO_PAGES.to_string());
    }

    let long      = if request.mode == ScanMode::Bw { BW_LONG } else { PHOTO_LONG };
    let mut pages = Vec::with_capacity(total);

    for (index, page) in request.pages.iter().enumerate() {
        if cancel.load(Ordering::SeqCst) {
            return Ok(None);
        }
        emit(app, task, Stage::Straightening, index, total);

        let photo    = decode(Path::new(&page.path))?.to_rgb8();
        let straight = straighten(&photo, page, long)?;
        pages.push(ScanPdfPage { image: enhance(&straight.image, request.mode), words: Vec::new(), paper: straight.paper });
    }

    let mut read = 0;
    if request.searchable {
        for (index, page) in pages.iter_mut().enumerate() {
            if cancel.load(Ordering::SeqCst) {
                return Ok(None);
            }
            emit(app, task, Stage::Reading, index, total);

            // A page the reader cannot make out stays an image: the PDF is made all the same.
            if let Ok(words) = ocr::recognize_words(DynamicImage::ImageRgb8(page.image.to_rgb()).to_rgba8()) {
                read += usize::from(!words.is_empty());
                page.words = words;
            }
        }
    }

    if cancel.load(Ordering::SeqCst) {
        return Ok(None);
    }
    progress::emit(app, ActionProgress::at(task, Stage::Saving));

    let bytes = build(&pages, request.paper)?;
    Ok(Some(ScanDocument { bytes, pages: total, read }))
}

// "Escaneado · 3 páginas · con texto que se puede buscar".
pub fn detail(document: &ScanDocument) -> String {
    let pages = if document.pages == 1 { "1 página".to_string() } else { format!("{} páginas", document.pages) };
    if document.read > 0 { format!("Escaneado · {pages} · con texto que se puede buscar") } else { format!("Escaneado · {pages}") }
}

// The corners the person moved, kept inside the photo.
pub fn clamp_corners(corners: Quad) -> Quad {
    corners.map(|point| Point::new(point.x.clamp(0.0, 1.0), point.y.clamp(0.0, 1.0)))
}
