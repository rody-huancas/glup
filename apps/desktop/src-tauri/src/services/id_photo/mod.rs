// "Foto tamaño carnet": the background removed (the "Quitar fondo" model), pure white behind, the head
// framed from the face found by Windows and the top of the hair in the mask, and a sheet to print.
pub mod face;
pub mod layout;
pub mod portrait;

#[cfg(test)]
mod tests;

use std::{
    collections::HashMap,
    fs,
    io::Cursor,
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicU64, Ordering},
        Mutex,
    },
};

use image::{imageops::FilterType, DynamicImage, ImageFormat, Rgb, RgbImage};
use jpeg_encoder::{ColorType, Encoder, PixelDensity, PixelDensityUnit};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

use crate::services::{
    background::{
        mask::{mask_from_logits, preprocess, resize_mask, MODEL_SIDE},
        model::{model_path, models_folder, BACKGROUND_MODEL},
        session::BackgroundSession,
        NOT_LEARNED_ERROR,
    },
    destination::{self, Destination},
    image::decode::decode,
    id_photo::{
        face::{chin_of, detect},
        layout::{crop_for, history_detail, sheet_layout, sheet_note, too_close_to_edge, Crop, EdgeParams, Head, IdFormat, SheetLayout, DPI},
        portrait::{hair_top, on_white, render_crop},
    },
};

pub const ID_ACTION: &str      = "id-photo";
pub const PHOTO_SUFFIX: &str   = "carnet";
pub const SHEET_SUFFIX: &str   = "carnet-hoja";
pub const JPEG_QUALITY: u8     = 95;
// The preview goes to the webview a little smaller than the photo.
pub const PREVIEW_SIDE: u32    = 1400;
// The cut lines between copies: thin and light, enough to see where to cut.
pub const CUT_LINE: Rgb<u8>    = Rgb([200, 200, 200]);
pub const CUT_LINE_WIDTH: u32  = 2;

pub const FACE_ERROR: &str     = "Necesito una foto con una sola persona, de frente";
pub const EDGE_WARNING: &str   = "Tu cabeza queda muy al borde. Prueba con una foto donde se vea con más espacio arriba";
pub const SESSION_ERROR: &str  = "Se cerró la foto. Vuelve a elegirla";
pub const SIZE_ERROR: &str     = "Esa medida no la puedo hacer";
pub const SAVE_ERROR: &str     = "No pude guardar la foto";
pub const NOTHING_ERROR: &str  = "Elige la foto sola, la hoja o las dos";

// A photo ready to frame: over white, at its own size, with where the head is.
struct Prepared {
    source : PathBuf,
    white  : RgbImage,
}

#[derive(Default)]
pub struct IdPhotoSessions {
    next     : AtomicU64,
    sessions : Mutex<HashMap<u64, Prepared>>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrepareRequest {
    pub path   : String,
    pub format : IdFormat,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PrepareReport {
    pub session : u64,
    pub width   : u32,
    pub height  : u32,
    // The framing Glup suggests, in the photo's pixels.
    pub crop    : Crop,
    pub warning : Option<String>,
}

// The face (exactly one) and the head from the top of the hair to the chin.
fn find_head(image: &RgbImage, mask: &crate::services::background::mask::Mask) -> Result<(Head, Option<String>), String> {
    let faces = detect(image)?;
    let [face] = faces.as_slice() else {
        return Err(FACE_ERROR.to_string());
    };

    let top  = hair_top(mask, face.x, face.width).map(f64::from).unwrap_or(face.y - face.height * 0.4).max(0.0);
    let head = Head { center_x: face.x + face.width / 2.0, top, chin: chin_of(*face) };
    let edge = too_close_to_edge(EdgeParams { head, face: (face.x, face.y, face.width, face.height), image: image.dimensions() });

    Ok((head, edge.then(|| EDGE_WARNING.to_string())))
}

// Reads the photo upright, removes the background, puts it over white and finds the head. Kept in a
// session for the preview and the save.
pub fn prepare(app: &AppHandle, request: PrepareRequest) -> Result<PrepareReport, String> {
    let model = model_path(&models_folder(app)?, &BACKGROUND_MODEL);
    if !model.exists() {
        return Err(NOT_LEARNED_ERROR.to_string());
    }

    let source = PathBuf::from(&request.path);
    let image  = decode(&source)?;
    let rgb    = image.to_rgb8();
    let logits = app.state::<BackgroundSession>().run(&model, &preprocess(&rgb))?;
    let mask   = resize_mask(&mask_from_logits(&logits, MODEL_SIDE)?, rgb.width(), rgb.height());

    let (head, warning) = find_head(&rgb, &mask)?;
    let white           = on_white(&image.to_rgba8(), &mask);
    let crop            = crop_for(head, request.format);
    let (width, height) = white.dimensions();

    let sessions = app.state::<IdPhotoSessions>();
    let session  = sessions.next.fetch_add(1, Ordering::SeqCst) + 1;
    if let Ok(mut map) = sessions.sessions.lock() {
        // Only the last photo is kept: it is the one on screen.
        map.clear();
        map.insert(session, Prepared { source, white });
    }

    Ok(PrepareReport { session, width, height, crop, warning })
}

// The white photo, smaller, as JPEG for the preview (raw bytes, no JSON).
pub fn preview(app: &AppHandle, session: u64) -> Result<Vec<u8>, String> {
    let sessions = app.state::<IdPhotoSessions>();
    let map      = sessions.sessions.lock().map_err(|_| SESSION_ERROR.to_string())?;
    let prepared = map.get(&session).ok_or(SESSION_ERROR)?;

    let (width, height) = prepared.white.dimensions();
    let scale           = (PREVIEW_SIDE as f64 / width.max(height) as f64).min(1.0);
    let small           = DynamicImage::ImageRgb8(prepared.white.clone()).resize((width as f64 * scale) as u32, (height as f64 * scale) as u32, FilterType::Triangle);

    let mut bytes = Vec::new();
    small.write_to(&mut Cursor::new(&mut bytes), ImageFormat::Jpeg).map_err(|_| SAVE_ERROR.to_string())?;
    Ok(bytes)
}

// JPEG that says 300 ppp, so it prints at its size in centimeters.
pub fn encode_300dpi(image: &RgbImage) -> Result<Vec<u8>, String> {
    let mut bytes   = Vec::new();
    let mut encoder = Encoder::new(&mut bytes, JPEG_QUALITY);
    encoder.set_density(PixelDensity { density: (DPI as u16, DPI as u16), unit: PixelDensityUnit::Inches });
    encoder.encode(image.as_raw(), image.width() as u16, image.height() as u16, ColorType::Rgb).map_err(|_| SAVE_ERROR.to_string())?;
    Ok(bytes)
}

// Every copy on white, with a thin line around each one where to cut.
pub fn render_sheet(photo: &RgbImage, layout: &SheetLayout) -> RgbImage {
    let mut sheet = RgbImage::from_pixel(layout.width, layout.height, Rgb([255, 255, 255]));
    let (width, height) = photo.dimensions();

    for &(left, top) in &layout.positions {
        image::imageops::replace(&mut sheet, photo, left as i64, top as i64);

        for offset in 0..CUT_LINE_WIDTH {
            for x in left..(left + width).min(layout.width) {
                for y in [top + offset, (top + height).saturating_sub(1 + offset)] {
                    if y < layout.height { sheet.put_pixel(x, y, CUT_LINE); }
                }
            }
            for y in top..(top + height).min(layout.height) {
                for x in [left + offset, (left + width).saturating_sub(1 + offset)] {
                    if x < layout.width { sheet.put_pixel(x, y, CUT_LINE); }
                }
            }
        }
    }

    sheet
}

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Outputs {
    pub photo : bool,
    pub sheet : bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveRequest {
    pub session     : u64,
    pub crop        : Crop,
    pub format      : IdFormat,
    pub outputs     : Outputs,
    pub destination : Option<Destination>,
}

pub struct Saved {
    pub source : PathBuf,
    // What was written (the photo, the sheet), in that order.
    pub files  : Vec<PathBuf>,
    pub detail : String,
    // "8 fotos en una hoja de 10 × 15".
    pub note   : Option<String>,
}

pub struct SaveParams<'a> {
    pub request : SaveRequest,
    // Picks a free name for each file (from naming.rs, so nothing is overwritten).
    pub name    : &'a dyn Fn(&Path, &Path, &str) -> PathBuf,
}

pub fn save(app: &AppHandle, params: SaveParams) -> Result<Saved, String> {
    let SaveParams { request, name } = params;
    if !request.format.is_valid() {
        return Err(SIZE_ERROR.to_string());
    }
    if !request.outputs.photo && !request.outputs.sheet {
        return Err(NOTHING_ERROR.to_string());
    }

    let sessions = app.state::<IdPhotoSessions>();
    let map      = sessions.sessions.lock().map_err(|_| SESSION_ERROR.to_string())?;
    let prepared = map.get(&request.session).ok_or(SESSION_ERROR)?;

    let photo  = render_crop(&prepared.white, request.crop, request.format.pixels());
    let folder = destination::prepare(&prepared.source, &request.destination.unwrap_or_default())?;
    let mut files  = Vec::new();
    let mut copies = None;

    if request.outputs.photo {
        let path = name(&folder, &prepared.source, PHOTO_SUFFIX);
        fs::write(&path, encode_300dpi(&photo)?).map_err(|_| SAVE_ERROR.to_string())?;
        files.push(path);
    }

    if request.outputs.sheet {
        let layout = sheet_layout(photo.dimensions());
        let path   = name(&folder, &prepared.source, SHEET_SUFFIX);
        fs::write(&path, encode_300dpi(&render_sheet(&photo, &layout))?).map_err(|_| SAVE_ERROR.to_string())?;
        copies = Some(layout.copies());
        files.push(path);
    }

    Ok(Saved { source: prepared.source.clone(), files, detail: history_detail(request.format, copies), note: copies.map(sheet_note) })
}
