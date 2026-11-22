use std::path::Path;

use image::{metadata::Orientation, DynamicImage, ImageDecoder, ImageReader, Rgba, RgbaImage};

use super::{ImageResult, SourceFormat, READ_ERROR};

// AVIF decoding needs dav1d (a system C library), which is not bundled on Windows.
pub const AVIF_READ_ERROR: &str = "Todavía no puedo leer imágenes AVIF";

// Reads any supported image, upright according to its EXIF orientation.
pub fn decode(path: &Path) -> ImageResult<DynamicImage> {
    if SourceFormat::from_path(path) == Some(SourceFormat::Avif) {
        return Err(AVIF_READ_ERROR.to_string());
    }

    let reader      = ImageReader::open(path).map_err(|_| READ_ERROR.to_string())?;
    let reader      = reader.with_guessed_format().map_err(|_| READ_ERROR.to_string())?;
    let mut decoder = reader.into_decoder().map_err(|_| READ_ERROR.to_string())?;
    let orientation = decoder.orientation().unwrap_or(Orientation::NoTransforms);
    let mut image   = DynamicImage::from_decoder(decoder).map_err(|_| READ_ERROR.to_string())?;

    image.apply_orientation(orientation);
    Ok(image)
}

// EXIF orientation only, without decoding the pixels.
pub fn orientation(path: &Path) -> Orientation {
    ImageReader::open(path)
        .ok()
        .and_then(|reader| reader.with_guessed_format().ok())
        .and_then(|reader| reader.into_decoder().ok())
        .and_then(|mut decoder| decoder.orientation().ok())
        .unwrap_or(Orientation::NoTransforms)
}

// True only when some pixel is actually see-through, not just when the format has an alpha channel.
pub fn has_transparency(image: &DynamicImage) -> bool {
    if !image.color().has_alpha() {
        return false;
    }

    match image.as_rgba8() {
        Some(rgba) => rgba.pixels().any(|pixel| pixel[3] < u8::MAX),
        None       => image.to_rgba8().pixels().any(|pixel| pixel[3] < u8::MAX),
    }
}

// Blends transparent pixels over white, for formats without alpha such as JPG.
pub fn flatten_on_white(image: &DynamicImage) -> DynamicImage {
    if !has_transparency(image) {
        return DynamicImage::ImageRgb8(image.to_rgb8());
    }

    let mut canvas = RgbaImage::from_pixel(image.width(), image.height(), Rgba([255, 255, 255, 255]));
    image::imageops::overlay(&mut canvas, &image.to_rgba8(), 0, 0);

    DynamicImage::ImageRgb8(DynamicImage::ImageRgba8(canvas).to_rgb8())
}
