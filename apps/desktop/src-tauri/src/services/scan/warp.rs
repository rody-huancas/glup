// Straightens the sheet: every pixel of the new page looks up where it was in the photo (through the
// homography of its four corners) and takes it with bilinear interpolation.
use image::{imageops, Rgb, RgbImage};
use rayon::prelude::*;

use super::geometry::{Homography, Point, Quad};

pub struct WarpParams<'a> {
    pub photo   : &'a RgbImage,
    // The corners in pixels of the photo, in order (order_corners).
    pub corners : Quad,
    pub width   : u32,
    pub height  : u32,
}

pub fn warp(params: WarpParams) -> Option<RgbImage> {
    let (width, height) = (params.width.max(1), params.height.max(1));
    let page            = [Point::new(0.0, 0.0), Point::new(width as f64, 0.0), Point::new(width as f64, height as f64), Point::new(0.0, height as f64)];
    let mapping         = Homography::between(&page, &params.corners)?;
    let photo           = params.photo;

    let mut out = RgbImage::new(width, height);
    out.par_chunks_mut(width as usize * 3).enumerate().for_each(|(y, row)| {
        for x in 0..width as usize {
            let source = mapping.apply(Point::new(x as f64 + 0.5, y as f64 + 0.5));
            let pixel  = sample(photo, source.x - 0.5, source.y - 0.5);
            row[x * 3..x * 3 + 3].copy_from_slice(&pixel.0);
        }
    });
    Some(out)
}

// Bilinear, with the edge repeated outside the photo.
fn sample(photo: &RgbImage, x: f64, y: f64) -> Rgb<u8> {
    let (width, height) = (photo.width() as i64, photo.height() as i64);
    let (x0, y0)        = (x.floor(), y.floor());
    let (fx, fy)        = (x - x0, y - y0);
    let at              = |px: i64, py: i64| photo.get_pixel(px.clamp(0, width - 1) as u32, py.clamp(0, height - 1) as u32).0;

    let (x0, y0)            = (x0 as i64, y0 as i64);
    let (a, b, c, d)        = (at(x0, y0), at(x0 + 1, y0), at(x0, y0 + 1), at(x0 + 1, y0 + 1));
    let mut pixel           = [0u8; 3];
    for channel in 0..3 {
        let top    = a[channel] as f64 * (1.0 - fx) + b[channel] as f64 * fx;
        let bottom = c[channel] as f64 * (1.0 - fx) + d[channel] as f64 * fx;
        pixel[channel] = (top * (1.0 - fy) + bottom * fy).round().clamp(0.0, 255.0) as u8;
    }
    Rgb(pixel)
}

// A quarter turn at a time, clockwise (0, 90, 180 or 270).
pub fn rotate(image: RgbImage, degrees: u32) -> RgbImage {
    match degrees % 360 {
        90  => imageops::rotate90(&image),
        180 => imageops::rotate180(&image),
        270 => imageops::rotate270(&image),
        _   => image,
    }
}
