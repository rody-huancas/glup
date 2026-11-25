use std::path::Path;

use image::{metadata::Orientation, DynamicImage, ImageDecoder, ImageReader, Rgba, RgbaImage};

use super::{heif, ImageResult, READ_ERROR};

// Reads any supported image, upright according to its EXIF orientation. HEIC, HEIF and AVIF go to
// Windows' decoders or FFmpeg (services/image/heif), upright and in sRGB too.
pub fn decode(path: &Path) -> ImageResult<DynamicImage> {
    if heif::is_heif(path) {
        return heif::decode(path);
    }

    let reader      = ImageReader::open(path).map_err(|_| READ_ERROR.to_string())?;
    let reader      = reader.with_guessed_format().map_err(|_| READ_ERROR.to_string())?;
    let mut decoder = reader.into_decoder().map_err(|_| READ_ERROR.to_string())?;
    let orientation = decoder.orientation().unwrap_or(Orientation::NoTransforms);
    let mut image   = DynamicImage::from_decoder(decoder).map_err(|_| READ_ERROR.to_string())?;

    image.apply_orientation(orientation);
    Ok(image)
}

// The size as shown (turned by its EXIF orientation), reading only the header when it can.
pub fn upright_size(path: &Path) -> Option<(u32, u32)> {
    if heif::is_heif(path) {
        return decode(path).ok().map(|image| (image.width(), image.height()));
    }
    let (width, height) = ImageReader::open(path).ok()?.with_guessed_format().ok()?.into_dimensions().ok()?;
    let turned          = matches!(orientation(path), Orientation::Rotate90 | Orientation::Rotate270 | Orientation::Rotate90FlipH | Orientation::Rotate270FlipH);
    Some(if turned { (height, width) } else { (width, height) })
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
