use std::{io::Cursor, path::Path};

use image::{
    codecs::{
        avif::AvifEncoder,
        jpeg::JpegEncoder,
        png::{CompressionType, FilterType, PngEncoder},
    },
    DynamicImage,
};

use super::{
    decode::{decode, flatten_on_white, has_transparency},
    ico::encode_ico,
    ImageResult, Quality, TargetFormat, AVIF_SPEED, CONVERT_QUALITY, ENCODE_ERROR,
};

pub struct EncodeParams<'a> {
    pub image: &'a DynamicImage,
    pub format: TargetFormat,
    pub quality: Quality,
}

fn encode_error<E>(_: E) -> String {
    ENCODE_ERROR.to_string()
}

pub fn encode_jpeg(image: &DynamicImage, quality: u8) -> ImageResult<Vec<u8>> {
    let mut buffer = Vec::new();
    let encoder    = JpegEncoder::new_with_quality(&mut buffer, quality);

    flatten_on_white(image).write_with_encoder(encoder).map_err(encode_error)?;
    Ok(buffer)
}

// Lossy WebP through libwebp; image's own encoder is lossless only.
pub fn encode_webp(image: &DynamicImage, quality: u8) -> ImageResult<Vec<u8>> {
    let (width, height) = (image.width(), image.height());

    let memory = if has_transparency(image) {
        let rgba = image.to_rgba8();
        webp::Encoder::from_rgba(&rgba, width, height).encode_simple(false, f32::from(quality))
    } else {
        let rgb = image.to_rgb8();
        webp::Encoder::from_rgb(&rgb, width, height).encode_simple(false, f32::from(quality))
    };

    memory.map(|data| data.to_vec()).map_err(encode_error)
}

pub fn encode_png(image: &DynamicImage) -> ImageResult<Vec<u8>> {
    let mut buffer = Vec::new();
    let encoder    = PngEncoder::new_with_quality(Cursor::new(&mut buffer), CompressionType::Best, FilterType::Adaptive);
    let pixels     = if has_transparency(image) { DynamicImage::ImageRgba8(image.to_rgba8()) } else { DynamicImage::ImageRgb8(image.to_rgb8()) };

    pixels.write_with_encoder(encoder).map_err(encode_error)?;
    Ok(buffer)
}

pub fn encode_avif(image: &DynamicImage, quality: u8) -> ImageResult<Vec<u8>> {
    let mut buffer = Vec::new();
    let encoder    = AvifEncoder::new_with_speed_quality(&mut buffer, AVIF_SPEED, quality);
    let pixels     = if has_transparency(image) { DynamicImage::ImageRgba8(image.to_rgba8()) } else { DynamicImage::ImageRgb8(image.to_rgb8()) };

    pixels.write_with_encoder(encoder).map_err(encode_error)?;
    Ok(buffer)
}

pub fn encode(params: &EncodeParams) -> ImageResult<Vec<u8>> {
    let EncodeParams { image, format, quality } = params;

    match format {
        TargetFormat::Webp => encode_webp(image, quality.webp),
        TargetFormat::Jpg  => encode_jpeg(image, quality.jpg),
        TargetFormat::Png  => encode_png(image),
        TargetFormat::Avif => encode_avif(image, quality.avif),
        TargetFormat::Ico  => encode_ico(image),
    }
}

// Reads the image upright and encodes it in the chosen format with the conversion qualities.
pub fn convert(path: &Path, format: TargetFormat) -> ImageResult<Vec<u8>> {
    let image = decode(path)?;
    encode(&EncodeParams { image: &image, format, quality: CONVERT_QUALITY })
}
