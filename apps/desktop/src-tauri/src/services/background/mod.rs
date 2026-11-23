pub mod download;
pub mod mask;
pub mod model;
pub mod session;

#[cfg(test)]
mod tests;

use std::{io::Cursor, path::Path};

use image::{
    codecs::png::{CompressionType, FilterType, PngEncoder},
    DynamicImage, ImageEncoder, RgbaImage,
};
use serde::Deserialize;
use tauri::{AppHandle, Manager};

use crate::services::{
    actions::{ActionControl, ActionProgress},
    background::{
        download::{fetch_http, DownloadEnd, DownloadParams},
        mask::{apply_mask, mask_from_logits, on_white, preprocess, resize_mask, MODEL_SIDE},
        model::{model_path, models_folder, BACKGROUND_MODEL},
        session::BackgroundSession,
    },
    image::{
        convert::encode_jpeg,
        decode::decode,
    },
    progress::{self, DownloadSpan, Stage},
    tasks::TaskSummary,
};

pub const DOWNLOAD_ACTION_ID: &str = "download-background-model";
pub const REMOVED_SUFFIX: &str     = "sin-fondo";
// Photos for documents: a little above the usual JPG quality, the edges matter.
pub const WHITE_JPEG_QUALITY: u8   = 90;

pub const ENCODE_ERROR: &str      = "No pude crear la imagen sin fondo";
pub const NOT_LEARNED_ERROR: &str = "Primero tengo que aprender a quitar fondos";
pub const LEARNED_MESSAGE: &str   = "Listo, ya sé quitar fondos";
pub const CANCELLED_MESSAGE: &str = "Dejé la descarga a medias. La próxima vez sigo desde ahí.";

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum BackgroundKind {
    // PNG with alpha: for designs.
    #[default]
    Transparent,
    // JPG over white: for photos for documents.
    White,
}

impl BackgroundKind {
    pub fn extension(self) -> &'static str {
        match self {
            Self::Transparent => "png",
            Self::White       => "jpg",
        }
    }
}

pub struct Removed {
    pub bytes: Vec<u8>,
    pub extension: &'static str,
}

pub struct CutoutParams<'a> {
    pub image: &'a DynamicImage,
    // The model's answer for this image (MODEL_SIDE x MODEL_SIDE logits).
    pub logits: &'a [f32],
    pub kind: BackgroundKind,
}

// Always with alpha, and with the default compression: the best one takes seconds on a big photo.
fn encode_cutout_png(image: &RgbaImage) -> Result<Vec<u8>, String> {
    let mut buffer = Vec::new();
    let encoder    = PngEncoder::new_with_quality(Cursor::new(&mut buffer), CompressionType::Default, FilterType::Adaptive);

    encoder
        .write_image(image.as_raw(), image.width(), image.height(), image::ExtendedColorType::Rgba8)
        .map_err(|_| ENCODE_ERROR.to_string())?;
    Ok(buffer)
}

// From the model's answer to the finished file: the mask at the original size, as alpha or over white.
pub fn cutout(params: CutoutParams) -> Result<Removed, String> {
    let mask  = mask_from_logits(params.logits, MODEL_SIDE)?;
    let mask  = resize_mask(&mask, params.image.width(), params.image.height());
    let image = apply_mask(&params.image.to_rgba8(), &mask);

    let bytes = match params.kind {
        BackgroundKind::Transparent => encode_cutout_png(&image)?,
        BackgroundKind::White       => encode_jpeg(&DynamicImage::ImageRgb8(on_white(&image)), WHITE_JPEG_QUALITY)?,
    };

    Ok(Removed { bytes, extension: params.kind.extension() })
}

// One image: read it upright, ask the model, cut it out. The original is only read.
pub fn remove(app: &AppHandle, source: &Path, kind: BackgroundKind) -> Result<Removed, String> {
    let model = model_path(&models_folder(app)?, &BACKGROUND_MODEL);
    if !model.exists() {
        return Err(NOT_LEARNED_ERROR.to_string());
    }

    let image  = decode(source)?;
    let input  = preprocess(&image.to_rgb8());
    let logits = app.state::<BackgroundSession>().run(&model, &input)?;

    cutout(CutoutParams { image: &image, logits: &logits, kind })
}

// "12,4 MB de 109,2 MB": now progress::download_detail.
// pub fn download_detail(done: u64, total: u64) -> String {
//     format!("{} de {}", format_size(done), format_size(total))
// }

// fn emit_download(app: &AppHandle, task: &Option<String>, done: u64) { … }: now DownloadSpan.

// The one-time download, as a task: progress in MB, Cancelar keeps the part to resume later.
pub fn download_model(app: &AppHandle, task: &Option<String>) -> Result<TaskSummary, String> {
    let control = app.state::<ActionControl>();
    control.begin(task);
    // control.cancelled.store(false, Ordering::SeqCst);

    let folder = models_folder(app)?;
    let span   = DownloadSpan::single(task, BACKGROUND_MODEL.size);
    let end    = download::download(DownloadParams {
        folder       : &folder,
        model        : &BACKGROUND_MODEL,
        cancel       : &control.cancelled,
        on_progress  : &|done| progress::emit(app, span.downloading(done)),
        on_verifying : &|| progress::emit(app, span.verifying()),
        fetch        : &|start| fetch_http(BACKGROUND_MODEL.url, start),
    })?;

    Ok(match end {
        DownloadEnd::Installed => TaskSummary::success(LEARNED_MESSAGE.to_string()),
        DownloadEnd::Cancelled => TaskSummary::calm(CANCELLED_MESSAGE.to_string()),
    })
}

// The first image waits for the model to load: shown as "Preparándome…" (a failure shows on each file).
pub fn prepare(app: &AppHandle, task: &Option<String>) {
    let Ok(folder) = models_folder(app) else { return };
    let path       = model_path(&folder, &BACKGROUND_MODEL);
    let session    = app.state::<BackgroundSession>();

    if path.exists() && !session.is_loaded(&path) {
        progress::emit(app, ActionProgress::at(task, Stage::Preparing));
        let _ = session.prepare(&path);
    }
}

// "Borrar" in Ajustes: the session lets go of the file first.
pub fn delete_model(app: &AppHandle) -> Result<(), String> {
    app.state::<BackgroundSession>().release();
    model::delete_in(&models_folder(app)?, &BACKGROUND_MODEL)
}
