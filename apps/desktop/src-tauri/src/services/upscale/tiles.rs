// A big photo in pieces (tiles) so the model never needs all of it in memory. Each piece is read with a
// border of the photo around it (the overlap, so its edges have context and no seam shows) and only its
// own part is kept from what comes out. Pure.
use image::{imageops::FilterType, Rgb, RgbImage};

// Over this many pixels the result would be too big to open or share (a 40 MP photo is 7300 × 5475).
pub const MAX_OUTPUT_PIXELS: u64 = 40_000_000;
pub const OVERLAP: u32           = 16;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Rect {
    pub x      : u32,
    pub y      : u32,
    pub width  : u32,
    pub height : u32,
}

// What the model reads (`input`) and what of it is kept (`core`), both in the photo's pixels.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Tile {
    pub core  : Rect,
    pub input : Rect,
}

// The cores cover the photo exactly, side by side; each input is its core with `overlap` more on every
// side the photo has.
pub fn plan(width: u32, height: u32, side: u32, overlap: u32) -> Vec<Tile> {
    let side = side.max(1);
    let mut tiles = Vec::new();
    for y in (0..height).step_by(side as usize) {
        for x in (0..width).step_by(side as usize) {
            let core  = Rect { x, y, width: side.min(width - x), height: side.min(height - y) };
            let left  = x.saturating_sub(overlap);
            let top   = y.saturating_sub(overlap);
            let right = (x + core.width + overlap).min(width);
            let below = (y + core.height + overlap).min(height);
            tiles.push(Tile { core, input: Rect { x: left, y: top, width: right - left, height: below - top } });
        }
    }
    tiles
}

// Whether the photo fits at that scale, and how big it would be.
pub fn output_size(width: u32, height: u32, scale: u32) -> (u32, u32) {
    (width * scale, height * scale)
}

pub fn fits(width: u32, height: u32, scale: u32) -> bool {
    let (out_width, out_height) = output_size(width, height, scale);
    u64::from(out_width) * u64::from(out_height) <= MAX_OUTPUT_PIXELS
}

// Every piece goes to the model at this one size (the last pixel repeated to the right and below):
// the graphics card prepares the model once for a size, so pieces of different sizes would cost that
// each time.
pub fn padded_side(side: u32, overlap: u32) -> u32 {
    side + overlap * 2
}

// The piece of the photo as the model reads it, `size` × `size`: RGB planes from 0 to 1.
pub fn tensor_of(image: &RgbImage, rect: Rect, size: u32) -> Vec<f32> {
    let plane      = (size * size) as usize;
    let mut values = vec![0.0; plane * 3];
    for row in 0..size {
        for column in 0..size {
            let pixel = image.get_pixel(rect.x + column.min(rect.width - 1), rect.y + row.min(rect.height - 1));
            let at    = (row * size + column) as usize;
            for channel in 0..3 {
                values[channel * plane + at] = f32::from(pixel[channel]) / 255.0;
            }
        }
    }
    values
}

// The model's answer (planes of width × height) back into a picture; NaN and out-of-range values clamped.
pub fn image_of(values: &[f32], width: u32, height: u32) -> RgbImage {
    let plane = (width * height) as usize;
    RgbImage::from_fn(width, height, |column, row| {
        let at    = (row * width + column) as usize;
        let value = |channel: usize| {
            let raw = values.get(channel * plane + at).copied().unwrap_or(0.0);
            if raw.is_nan() { 0 } else { (raw.clamp(0.0, 1.0) * 255.0).round() as u8 }
        };
        Rgb([value(0), value(1), value(2)])
    })
}

pub struct PasteParams<'a> {
    pub output    : &'a mut RgbImage,
    pub tile      : Tile,
    // What the model made of `tile.input` (padded on the right and below), at its own scale (4).
    pub upscaled  : &'a RgbImage,
    pub model     : u32,
    // The scale asked for (2 or 4).
    pub scale     : u32,
}

// The core of the piece into its place. At x2 each pixel is the average of the 2 × 2 the model made
// there: an exact half, quick, and with nothing taken from beyond the core (so no seams). At x1
// («Mismo tamaño») the whole piece goes back to its own size with Lanczos (sharper, less noise): the
// border of the piece gives the filter its neighbours, so no seam shows either.
pub fn paste(params: PasteParams) {
    if params.scale == 1 {
        let side  = params.upscaled.width() / params.model;
        let small = image::imageops::resize(params.upscaled, side, params.upscaled.height() / params.model, FilterType::Lanczos3);
        let (left, top) = (params.tile.core.x - params.tile.input.x, params.tile.core.y - params.tile.input.y);
        let core  = image::imageops::crop_imm(&small, left, top, params.tile.core.width, params.tile.core.height).to_image();
        image::imageops::replace(params.output, &core, i64::from(params.tile.core.x), i64::from(params.tile.core.y));
        return;
    }
    let scale  = params.scale;
    let step   = (params.model / scale).max(1);
    let left   = (params.tile.core.x - params.tile.input.x) * params.model;
    let top    = (params.tile.core.y - params.tile.input.y) * params.model;
    let blocks = f32::from((step * step) as u16);
    for row in 0..params.tile.core.height * scale {
        for column in 0..params.tile.core.width * scale {
            let mut sum = [0.0f32; 3];
            for dy in 0..step {
                for dx in 0..step {
                    let pixel = params.upscaled.get_pixel(left + column * step + dx, top + row * step + dy);
                    for channel in 0..3 {
                        sum[channel] += f32::from(pixel[channel]);
                    }
                }
            }
            let pixel = Rgb(sum.map(|value| (value / blocks).round() as u8));
            params.output.put_pixel(params.tile.core.x * scale + column, params.tile.core.y * scale + row, pixel);
        }
    }
}

// The safety net: the result brought back to the photo's size should still be the photo. Black (the
// model gave nothing) or far from it (stains, stripes) is not saved.
pub fn looks_broken(original: &RgbImage, result: &RgbImage) -> bool {
    let back   = image::imageops::resize(result, original.width(), original.height(), FilterType::Triangle);
    let pixels = f64::from(original.width() * original.height()).max(1.0);
    let mean   = |image: &RgbImage| image.pixels().map(|pixel| pixel.0.iter().map(|value| f64::from(*value)).sum::<f64>() / 3.0).sum::<f64>() / pixels;
    let diff   = original.pixels().zip(back.pixels()).map(|(a, b)| a.0.iter().zip(b.0.iter()).map(|(x, y)| f64::from(x.abs_diff(*y))).sum::<f64>() / 3.0).sum::<f64>() / pixels;

    let black = mean(&back) < 4.0 && mean(original) > 16.0;
    black || diff > 30.0
}
