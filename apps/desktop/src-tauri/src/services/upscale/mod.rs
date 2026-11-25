// "Mejorar calidad": small or blurry photos made two or four times bigger by Real-ESRGAN, with the same
// ONNX Runtime session as Quitar fondo (the graphics card through DirectML, the processor if it fails),
// piece by piece so a big photo never fills the memory. The original is only read.
pub mod model;
pub mod tiles;

#[cfg(test)]
mod tests;

use std::{
    io::Cursor,
    path::Path,
    sync::atomic::{AtomicBool, Ordering},
};

use image::{codecs::png::PngEncoder, imageops::FilterType, DynamicImage, ImageEncoder, RgbImage};
use serde::Deserialize;
use tauri::{AppHandle, Manager};

use self::{
    model::{UpscaleLevel, MODEL_SCALE},
    tiles::{fits, image_of, looks_broken, output_size, padded_side, paste, plan, tensor_of, PasteParams, OVERLAP},
};
use crate::services::{
    actions::{ActionControl, Via},
    background::{
        download::{self, fetch_http, DownloadEnd, DownloadParams},
        model::{delete_in, model_path, models_folder, status_in, ModelStatus},
        session::{BackgroundSession, Device},
    },
    image::{
        convert::{encode_jpeg, encode_webp},
        decode::{decode, has_transparency},
    },
    progress::{self, DownloadSpan},
    tasks::TaskSummary,
};

pub const UPSCALE_ACTION: &str    = "upscale";
pub const DOWNLOAD_ACTION_ID: &str = "download-upscale-model";
pub const NOT_LEARNED: &str       = "Primero tengo que aprender a mejorar fotos";
pub const LEARNED_MESSAGE: &str   = "Listo, ya sé mejorar fotos";
pub const CANCELLED_MESSAGE: &str = "Dejé la descarga a medias. La próxima vez sigo desde ahí.";
pub const BROKEN_ERROR: &str      = "El resultado salió mal (oscuro o con manchas), así que no lo guardé";
pub const ENCODE_ERROR: &str      = "No pude guardar la foto mejorada";
pub const JPEG_QUALITY: u8        = 92;

pub fn too_big(width: u32, height: u32) -> String {
    format!("Saldría de {width} × {height} px, demasiado grande. Prueba con x2 o con una foto más chica")
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpscaleOptions {
    pub level : UpscaleLevel,
    // 1 («Mismo tamaño», by default), 2 or 4.
    pub scale : u32,
}

impl UpscaleOptions {
    pub fn scale(self) -> u32 {
        match self.scale {
            2 => 2,
            4 => 4,
            _ => 1,
        }
    }

    // What goes in the name: "<nombre> (mejorada).jpg", "<nombre> (x4).jpg".
    pub fn tag(self) -> String {
        if self.scale() == 1 { "mejorada".to_string() } else { format!("x{}", self.scale()) }
    }
}

// --- What Glup has learned ---

pub fn status(app: &AppHandle, level: UpscaleLevel) -> Result<ModelStatus, String> {
    Ok(status_in(&models_folder(app)?, level.model()))
}

// The one-time download of that level, as a task: progress in MB, Cancelar keeps the part to resume.
pub fn download_model(app: &AppHandle, task: &Option<String>, level: UpscaleLevel) -> Result<TaskSummary, String> {
    let control = app.state::<ActionControl>();
    control.begin(task);

    let model  = level.model();
    let folder = models_folder(app)?;
    let span   = DownloadSpan::single(task, model.size);
    let end    = download::download(DownloadParams {
        folder       : &folder,
        model,
        cancel       : &control.cancelled,
        on_progress  : &|done| progress::emit(app, span.downloading(done)),
        on_verifying : &|| progress::emit(app, span.verifying()),
        fetch        : &|start| fetch_http(model.url, start),
    })?;

    Ok(match end {
        DownloadEnd::Installed => TaskSummary::success(LEARNED_MESSAGE.to_string()),
        DownloadEnd::Cancelled => TaskSummary::calm(CANCELLED_MESSAGE.to_string()),
    })
}

// "Borrar" in Ajustes: the session lets go of the file first.
pub fn delete_model(app: &AppHandle, level: UpscaleLevel) -> Result<(), String> {
    app.state::<BackgroundSession>().release();
    delete_in(&models_folder(app)?, level.model())
}

// --- Making it bigger ---

pub fn via(device: Device) -> Via {
    match device {
        Device::Gpu => Via::Gpu,
        Device::Cpu => Via::Cpu,
    }
}

pub struct EnlargeParams<'a> {
    pub session  : &'a BackgroundSession,
    pub model    : &'a Path,
    pub image    : &'a RgbImage,
    pub options  : UpscaleOptions,
    pub cancel   : &'a AtomicBool,
    // Pieces done, of all, and where the last one ran.
    pub on_tile  : &'a dyn Fn(usize, usize, Device),
}

// The photo piece by piece (None: cancelled between two pieces).
pub fn enlarge(params: EnlargeParams) -> Result<Option<RgbImage>, String> {
    let scale            = params.options.scale();
    let (width, height)  = (params.image.width(), params.image.height());
    let (out_w, out_h)   = output_size(width, height, scale);
    let pieces           = plan(width, height, params.options.level.tile(), OVERLAP);
    let size             = padded_side(params.options.level.tile(), OVERLAP);
    let mut output       = RgbImage::new(out_w, out_h);

    for (index, tile) in pieces.iter().enumerate() {
        if params.cancel.load(Ordering::SeqCst) {
            return Ok(None);
        }
        let input             = tensor_of(params.image, tile.input, size);
        let (values, device)  = params.session.run_shaped(params.model, &input, [1, 3, size as usize, size as usize])?;
        let upscaled          = image_of(&values, size * MODEL_SCALE, size * MODEL_SCALE);
        paste(PasteParams { output: &mut output, tile: *tile, upscaled: &upscaled, model: MODEL_SCALE, scale });
        (params.on_tile)(index + 1, pieces.len(), device);
    }
    Ok(Some(output))
}

// The first photo waits for the model to load: shown as "Preparándome…".
pub fn prepare(app: &AppHandle, task: &Option<String>, level: UpscaleLevel) {
    let Ok(folder) = models_folder(app) else { return };
    let path       = model_path(&folder, level.model());
    let session    = app.state::<BackgroundSession>();
    if path.exists() && !session.is_loaded(&path) {
        progress::emit(app, crate::services::actions::ActionProgress::at(task, crate::services::progress::Stage::Preparing));
        let _ = session.prepare(&path);
    }
}

pub struct Enlarged {
    pub bytes     : Vec<u8>,
    pub extension : &'static str,
    pub width     : u32,
    pub height    : u32,
}

// Its own format when it can keep it (JPG stays JPG, WebP stays WebP), PNG otherwise; transparency
// made bigger with the photo.
fn encode_result(source: &Path, original: &DynamicImage, result: RgbImage) -> Result<(Vec<u8>, &'static str), String> {
    let extension = source.extension().map(|value| value.to_string_lossy().to_lowercase()).unwrap_or_default();
    let alpha     = has_transparency(original);
    let picture   = if alpha {
        let mask = image::imageops::resize(&original.to_luma_alpha8(), result.width(), result.height(), FilterType::Lanczos3);
        let mut rgba = DynamicImage::ImageRgb8(result).to_rgba8();
        for (pixel, mask) in rgba.pixels_mut().zip(mask.pixels()) {
            pixel.0[3] = mask.0[1];
        }
        DynamicImage::ImageRgba8(rgba)
    } else {
        DynamicImage::ImageRgb8(result)
    };

    match extension.as_str() {
        "jpg" | "jpeg" if !alpha => Ok((encode_jpeg(&picture, JPEG_QUALITY)?, "jpg")),
        "webp"                   => Ok((encode_webp(&picture, JPEG_QUALITY)?, "webp")),
        _                        => {
            let mut bytes = Vec::new();
            PngEncoder::new(Cursor::new(&mut bytes)).write_image(picture.as_bytes(), picture.width(), picture.height(), picture.color().into()).map_err(|_| ENCODE_ERROR.to_string())?;
            Ok((bytes, "png"))
        }
    }
}

pub struct UpscaleParams<'a> {
    pub app     : &'a AppHandle,
    pub source  : &'a Path,
    pub options : UpscaleOptions,
    pub cancel  : &'a AtomicBool,
    pub on_tile : &'a dyn Fn(usize, usize, Device),
}

// One photo: read upright, checked against the size limit, made bigger, checked again (the safety
// net) and encoded. None: cancelled.
pub fn upscale(params: UpscaleParams) -> Result<Option<Enlarged>, String> {
    let model = model_path(&models_folder(params.app)?, params.options.level.model());
    if !model.exists() {
        return Err(NOT_LEARNED.to_string());
    }

    let original        = decode(params.source)?;
    let rgb             = original.to_rgb8();
    let scale           = params.options.scale();
    let (out_w, out_h)  = output_size(rgb.width(), rgb.height(), scale);
    if !fits(rgb.width(), rgb.height(), scale) {
        return Err(too_big(out_w, out_h));
    }

    let session = params.app.state::<BackgroundSession>();
    let Some(result) = enlarge(EnlargeParams { session: &session, model: &model, image: &rgb, options: params.options, cancel: params.cancel, on_tile: params.on_tile })? else {
        return Ok(None);
    };
    if looks_broken(&rgb, &result) {
        return Err(BROKEN_ERROR.to_string());
    }

    let (bytes, extension) = encode_result(params.source, &original, result)?;
    Ok(Some(Enlarged { bytes, extension, width: out_w, height: out_h }))
}

// --- Before and after ---

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PreviewRequest {
    pub path    : String,
    pub options : UpscaleOptions,
    // Where to look, from 0 to 1 (the middle by default).
    pub x       : Option<f64>,
    pub y       : Option<f64>,
}

// The side of the piece compared, in the photo's pixels (what comes out is 512 to 640 px).
pub fn preview_side(scale: u32) -> u32 {
    match scale {
        1 => 512,
        2 => 256,
        _ => 160,
    }
}

// A piece of the photo, `side` wide, around (x, y) from 0 to 1, inside the photo.
pub fn preview_rect(width: u32, height: u32, side: u32, x: f64, y: f64) -> tiles::Rect {
    let (piece_w, piece_h) = (side.min(width), side.min(height));
    let left = ((x * f64::from(width)) - f64::from(piece_w) / 2.0).round().clamp(0.0, f64::from(width - piece_w)) as u32;
    let top  = ((y * f64::from(height)) - f64::from(piece_h) / 2.0).round().clamp(0.0, f64::from(height - piece_h)) as u32;
    tiles::Rect { x: left, y: top, width: piece_w, height: piece_h }
}

// «Antes / Después» on a piece of the photo, before doing them all.
pub fn preview(app: &AppHandle, request: &PreviewRequest) -> Result<(Vec<u8>, Via), String> {
    let model = model_path(&models_folder(app)?, request.options.level.model());
    if !model.exists() {
        return Err(NOT_LEARNED.to_string());
    }

    let original = decode(Path::new(&request.path))?.to_rgb8();
    let scale    = request.options.scale();
    let rect     = preview_rect(original.width(), original.height(), preview_side(scale), request.x.unwrap_or(0.5), request.y.unwrap_or(0.5));
    let piece    = image::imageops::crop_imm(&original, rect.x, rect.y, rect.width, rect.height).to_image();
    let cancel   = AtomicBool::new(false);
    let device   = std::cell::Cell::new(Device::Cpu);
    let session  = app.state::<BackgroundSession>();
    let after    = enlarge(EnlargeParams { session: &session, model: &model, image: &piece, options: request.options, cancel: &cancel, on_tile: &|_, _, used| device.set(used) })?.ok_or(ENCODE_ERROR)?;
    let before   = image::imageops::resize(&piece, after.width(), after.height(), FilterType::CatmullRom);

    let mut both = RgbImage::new(after.width() * 2, after.height());
    image::imageops::replace(&mut both, &before, 0, 0);
    image::imageops::replace(&mut both, &after, i64::from(after.width()), 0);
    Ok((encode_jpeg(&DynamicImage::ImageRgb8(both), JPEG_QUALITY)?, via(device.get())))
}

// "Mejorada x4 · 2400 × 1600 px", "Mejorada, mismo tamaño · 1000 × 750 px".
pub fn detail(options: UpscaleOptions, width: u32, height: u32) -> String {
    match options.scale() {
        1     => format!("Mejorada, mismo tamaño · {width} × {height} px"),
        scale => format!("Mejorada x{scale} · {width} × {height} px"),
    }
}
