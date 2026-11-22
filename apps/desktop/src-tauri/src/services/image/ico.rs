use std::io::Cursor;

use image::{
    codecs::ico::{IcoEncoder, IcoFrame},
    imageops::{self, FilterType},
    DynamicImage, ExtendedColorType, Rgba, RgbaImage,
};

use super::{ImageResult, ENCODE_ERROR};

pub const ICO_SIZES: [u32; 6] = [16, 32, 48, 64, 128, 256];

// Centers the image on a transparent square canvas, without cropping.
pub fn pad_to_square(image: &DynamicImage) -> RgbaImage {
    let side       = image.width().max(image.height());
    let mut canvas = RgbaImage::from_pixel(side, side, Rgba([0, 0, 0, 0]));
    let x          = i64::from((side - image.width()) / 2);
    let y          = i64::from((side - image.height()) / 2);

    imageops::overlay(&mut canvas, &image.to_rgba8(), x, y);
    canvas
}

// A single .ico holding every size in ICO_SIZES, each stored as PNG.
pub fn encode_ico(image: &DynamicImage) -> ImageResult<Vec<u8>> {
    let square = pad_to_square(image);

    let frames = ICO_SIZES
        .iter()
        .map(|&size| {
            let resized = imageops::resize(&square, size, size, FilterType::Lanczos3);
            IcoFrame::as_png(resized.as_raw(), size, size, ExtendedColorType::Rgba8)
        })
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| ENCODE_ERROR.to_string())?;

    let mut buffer = Vec::new();
    IcoEncoder::new(Cursor::new(&mut buffer)).encode_images(&frames).map_err(|_| ENCODE_ERROR.to_string())?;

    Ok(buffer)
}
