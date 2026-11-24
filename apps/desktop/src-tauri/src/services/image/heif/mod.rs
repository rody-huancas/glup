// HEIC/HEIF (iPhone photos) and AVIF as input to every image tool. Nothing in Glup decodes HEVC or AV1:
// Windows does, with its free extensions, and if it cannot, the FFmpeg Glup downloads with permission
// for videos. In that order: what the computer already has first.
pub mod colour;
pub mod container;
pub mod ffmpeg;
pub mod wic;

#[cfg(test)]
mod tests;

use std::{
    fs,
    io::Cursor,
    path::{Path, PathBuf},
    sync::OnceLock,
};

use image::{codecs::jpeg::JpegEncoder, imageops::FilterType, DynamicImage, RgbaImage};
use serde::Serialize;

use super::{ImageResult, READ_ERROR};
use crate::services::video::tool::ffmpeg_in;
use container::{Codec, HeifInfo};
use wic::WicError;

// Only seen when the panel could not ask first (Sacar texto, Quitar fondo, Foto tamaño carnet):
// "Convertir" or "A JPG" ask to download what opens them.
pub const HEIC_MISSING: &str = "Tu Windows todavía no abre fotos HEIC (las del iPhone). Instala «Extensiones de imagen HEIF» y «Extensiones de vídeo HEVC» desde Microsoft Store, o usa «Convertir» y te pido descargar lo que me falta para abrirlas yo.";
pub const AVIF_MISSING: &str = "Tu Windows todavía no abre imágenes AVIF. Instala «Extensión de vídeo AV1» desde Microsoft Store, o usa «Convertir» y te pido descargar lo que me falta para abrirlas yo.";

const PREVIEW_QUALITY: u8 = 82;

// Two tiny pictures to ask Windows whether it can decode each format.
const SAMPLE_HEIC: &[u8] = include_bytes!("../../../../fixtures/heif/rafaga.heic");
const SAMPLE_AVIF: &[u8] = include_bytes!("../../../../fixtures/heif/diez-bits.avif");

static TOOLS: OnceLock<PathBuf> = OnceLock::new();
static WINDOWS: OnceLock<(bool, bool)> = OnceLock::new();

// Where the downloaded tools live (FFmpeg), told once at start-up.
pub fn remember_tools(folder: PathBuf) {
    let _ = TOOLS.set(folder);
}

fn ffmpeg() -> Option<PathBuf> {
    TOOLS.get().map(|folder| ffmpeg_in(folder)).filter(|path| path.is_file())
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HeifSupport {
    // Windows decodes them itself.
    pub heic   : bool,
    pub avif   : bool,
    // FFmpeg is here: it can open both.
    pub ffmpeg : bool,
}

pub fn support() -> HeifSupport {
    let (heic, avif) = *WINDOWS.get_or_init(|| (wic::decode(SAMPLE_HEIC, Some(8)).is_ok(), wic::decode(SAMPLE_AVIF, Some(8)).is_ok()));
    HeifSupport { heic, avif, ffmpeg: ffmpeg().is_some() }
}

pub fn is_heif(path: &Path) -> bool {
    container::has_heif_extension(path)
}

fn missing(info: &HeifInfo) -> String {
    if info.codec == Some(Codec::Av1) { AVIF_MISSING } else { HEIC_MISSING }.to_string()
}

// Who decodes: Windows, or FFmpeg (and which one).
#[derive(Clone, Copy)]
pub enum Via<'a> {
    Windows,
    Ffmpeg(&'a Path),
}

pub struct DecodeParams<'a> {
    pub path  : &'a Path,
    pub bytes : &'a [u8],
    pub info  : &'a HeifInfo,
    pub via   : Via<'a>,
    // The longest side, for previews.
    pub fit   : Option<u32>,
}

fn fitted(image: RgbaImage, fit: Option<u32>) -> RgbaImage {
    match fit {
        Some(fit) if image.width().max(image.height()) > fit => DynamicImage::ImageRgba8(image).resize(fit, fit, FilterType::Triangle).to_rgba8(),
        _ => image,
    }
}

pub fn decode_via(params: &DecodeParams) -> Result<RgbaImage, WicError> {
    match params.via {
        Via::Windows        => wic::decode(params.bytes, params.fit),
        Via::Ffmpeg(ffmpeg) => ffmpeg::decode(ffmpeg, params.path, params.info)
            .map(|image| fitted(DynamicImage::ImageRgb8(image).to_rgba8(), params.fit))
            .ok_or(WicError::Broken),
    }
}

// Windows first; FFmpeg if Windows cannot and it is here; otherwise what to install.
fn decode_rgba(path: &Path, fit: Option<u32>) -> ImageResult<RgbaImage> {
    let bytes  = fs::read(path).map_err(|_| READ_ERROR.to_string())?;
    let info   = container::parse(&bytes).ok_or(READ_ERROR)?;
    let params = |via| DecodeParams { path, bytes: &bytes, info: &info, via, fit };

    match decode_via(&params(Via::Windows)) {
        Ok(image)               => Ok(image),
        Err(windows)            => match ffmpeg() {
            Some(ffmpeg) => decode_via(&params(Via::Ffmpeg(&ffmpeg))).map_err(|_| READ_ERROR.to_string()),
            None if windows == WicError::Missing => Err(missing(&info)),
            None                 => Err(READ_ERROR.to_string()),
        },
    }
}

// The photo upright and in sRGB, at 8 bits (RGB when nothing is see-through).
pub fn decode(path: &Path) -> ImageResult<DynamicImage> {
    let image = DynamicImage::ImageRgba8(decode_rgba(path, None)?);
    Ok(if super::decode::has_transparency(&image) { image } else { DynamicImage::ImageRgb8(image.to_rgb8()) })
}

// A small JPG for the lists and the previews (the webview cannot show HEIC).
pub fn preview(path: &Path, fit: u32) -> ImageResult<Vec<u8>> {
    let image      = DynamicImage::ImageRgba8(decode_rgba(path, Some(fit))?);
    let mut buffer = Vec::new();
    super::decode::flatten_on_white(&image).write_with_encoder(JpegEncoder::new_with_quality(Cursor::new(&mut buffer), PREVIEW_QUALITY)).map_err(|_| READ_ERROR.to_string())?;
    Ok(buffer)
}

// The EXIF of the primary picture (its TIFF part), for the date it was taken.
pub fn exif(path: &Path) -> Option<Vec<u8>> {
    container::read(path)?.exif
}
