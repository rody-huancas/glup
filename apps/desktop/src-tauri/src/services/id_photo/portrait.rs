// The person over pure white: the top of the hair from the model's mask, and an edge with no colored halo.
use image::{Rgb, RgbImage, RgbaImage};

use crate::services::background::mask::Mask;

// A column belongs to the person when the mask says so this much.
const SUBJECT: f32 = 0.5;
// The hair starts on the first row where this share of the columns over the face is the person.
const HAIR_ROW_SHARE: f64 = 0.04;
// Columns looked at: the face box widened on each side by this share of its width (hair is wider).
const HAIR_WIDEN: f64 = 0.25;

// Below this the pixel is background (pure white); above the other, fully the person; smooth between.
// Raising the low end drops the faint fringe that keeps the old background's color.
pub const EDGE_LOW: f32  = 0.30;
pub const EDGE_HIGH: f32 = 0.80;

// The first row, from the top, where the person shows over the face's columns.
pub fn hair_top(mask: &Mask, face_x: f64, face_width: f64) -> Option<u32> {
    let width = mask.width() as f64;
    let from  = (face_x - face_width * HAIR_WIDEN).max(0.0) as u32;
    let to    = ((face_x + face_width * (1.0 + HAIR_WIDEN)).min(width) as u32).max(from + 1);
    let need  = (((to - from) as f64) * HAIR_ROW_SHARE).ceil().max(1.0) as u32;

    (0..mask.height()).find(|&y| (from..to).filter(|&x| mask.get_pixel(x, y)[0] > SUBJECT).count() as u32 >= need)
}

pub fn smoothstep(value: f32) -> f32 {
    let t = ((value - EDGE_LOW) / (EDGE_HIGH - EDGE_LOW)).clamp(0.0, 1.0);
    t * t * (3.0 - 2.0 * t)
}

// Over pure white with the refined edge. Where the edge is partly see-through, the color is pulled
// towards the person's own (darker) tone instead of mixing the old background in.
pub fn on_white(image: &RgbaImage, mask: &Mask) -> RgbImage {
    RgbImage::from_fn(image.width(), image.height(), |x, y| {
        let pixel = image.get_pixel(x, y);
        let alpha = smoothstep(mask.get_pixel(x, y)[0]);
        let blend = |channel: u8| (channel as f32 * alpha + 255.0 * (1.0 - alpha)).round().clamp(0.0, 255.0) as u8;
        Rgb([blend(pixel[0]), blend(pixel[1]), blend(pixel[2])])
    })
}

// The crop out of the white photo, at the final size. Outside the photo it is white.
pub fn render_crop(source: &RgbImage, crop: crate::services::id_photo::layout::Crop, size: (u32, u32)) -> RgbImage {
    let scale_x = crop.width / size.0 as f64;
    let scale_y = crop.height / size.1 as f64;

    RgbImage::from_fn(size.0, size.1, |x, y| {
        let source_x = crop.x + (x as f64 + 0.5) * scale_x;
        let source_y = crop.y + (y as f64 + 0.5) * scale_y;
        sample(source, source_x, source_y)
    })
}

// Bilinear, white beyond the edges.
fn sample(image: &RgbImage, x: f64, y: f64) -> Rgb<u8> {
    let (width, height) = (image.width() as i64, image.height() as i64);
    let x0              = (x - 0.5).floor();
    let y0              = (y - 0.5).floor();
    let (dx, dy)        = (x - 0.5 - x0, y - 0.5 - y0);

    let at = |px: i64, py: i64| -> [f64; 3] {
        if px < 0 || py < 0 || px >= width || py >= height {
            return [255.0; 3];
        }
        let pixel = image.get_pixel(px as u32, py as u32);
        [pixel[0] as f64, pixel[1] as f64, pixel[2] as f64]
    };

    let (x0, y0) = (x0 as i64, y0 as i64);
    let corners  = [at(x0, y0), at(x0 + 1, y0), at(x0, y0 + 1), at(x0 + 1, y0 + 1)];
    let weights  = [(1.0 - dx) * (1.0 - dy), dx * (1.0 - dy), (1.0 - dx) * dy, dx * dy];

    let mut out = [0u8; 3];
    for (channel, value) in out.iter_mut().enumerate() {
        let total: f64 = corners.iter().zip(weights).map(|(corner, weight)| corner[channel] * weight).sum();
        *value = total.round().clamp(0.0, 255.0) as u8;
    }
    Rgb(out)
}
