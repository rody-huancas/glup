// "Tamaño para redes": a photo at the exact size a network asks for. Either the frame chosen on the
// screen is cut out (Recortar) or the whole photo goes in, the rest filled with a colour or with the
// same photo blurred (Que entre completa). The original is only read.
#[cfg(test)]
mod tests;

use std::path::Path;

use image::{imageops::FilterType, DynamicImage, Rgb, RgbImage};
use serde::{Deserialize, Serialize};

use crate::services::image::{
    convert::{encode_jpeg, encode_png, encode_webp},
    decode::decode,
    TargetFormat,
};

pub const SOCIAL_ACTION: &str = "social-size";
pub const SIZE_ERROR: &str    = "Esa medida no es válida";
pub const QUALITY: u8         = 90;
// Larger than any network asks for.
pub const MAX_SIDE: u32       = 8000;

// A part of the photo, each value from 0 to 1 of its width or height.
#[derive(Clone, Copy, Debug, Default, PartialEq, Deserialize, Serialize)]
pub struct Frame {
    pub x      : f64,
    pub y      : f64,
    pub width  : f64,
    pub height : f64,
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum FitMode {
    // «Recortar».
    #[default]
    Crop,
    // «Que entre completa».
    Contain,
}

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SocialOptions {
    pub width   : u32,
    pub height  : u32,
    // "Instagram historia": goes in the name of the file.
    pub tag     : String,
    pub format  : Option<TargetFormat>,
    pub fit     : FitMode,
    // The colour around the photo (#RRGGBB), or the same photo blurred.
    pub fill    : Option<String>,
    #[serde(default)]
    pub blur    : bool,
    // The frame of each photo, in the order they came (Recortar).
    #[serde(default)]
    pub frames  : Vec<Frame>,
}

// The frame in the photo's pixels, inside it and at least one pixel.
pub fn frame_pixels(frame: Frame, width: u32, height: u32) -> (u32, u32, u32, u32) {
    let (w, h)   = (f64::from(width), f64::from(height));
    let left     = (frame.x.clamp(0.0, 1.0) * w).round() as u32;
    let top      = (frame.y.clamp(0.0, 1.0) * h).round() as u32;
    let across   = ((frame.width.clamp(0.0, 1.0) * w).round() as u32).clamp(1, width.saturating_sub(left).max(1));
    let down     = ((frame.height.clamp(0.0, 1.0) * h).round() as u32).clamp(1, height.saturating_sub(top).max(1));
    (left.min(width - 1), top.min(height - 1), across, down)
}

// The largest frame of the target's shape in the middle of the photo (when the screen sent none).
pub fn centered_frame(width: u32, height: u32, target_w: u32, target_h: u32) -> Frame {
    let photo  = f64::from(width) / f64::from(height.max(1));
    let target = f64::from(target_w) / f64::from(target_h.max(1));
    if photo > target {
        let share = target / photo;
        Frame { x: (1.0 - share) / 2.0, y: 0.0, width: share, height: 1.0 }
    } else {
        let share = photo / target;
        Frame { x: 0.0, y: (1.0 - share) / 2.0, width: 1.0, height: share }
    }
}

// Where the whole photo goes inside the target, as big as it fits, in the middle: (x, y, width, height).
pub fn contain_rect(width: u32, height: u32, target_w: u32, target_h: u32) -> (u32, u32, u32, u32) {
    let scale = (f64::from(target_w) / f64::from(width)).min(f64::from(target_h) / f64::from(height));
    let fit_w = ((f64::from(width) * scale).round() as u32).clamp(1, target_w);
    let fit_h = ((f64::from(height) * scale).round() as u32).clamp(1, target_h);
    ((target_w - fit_w) / 2, (target_h - fit_h) / 2, fit_w, fit_h)
}

// "#F6C36B" (or "f6c36b") to a colour; white when it cannot be read.
pub fn parse_color(text: &str) -> Rgb<u8> {
    let hex = text.trim().trim_start_matches('#');
    let part = |at: usize| hex.get(at..at + 2).and_then(|pair| u8::from_str_radix(pair, 16).ok());
    match (hex.len(), part(0), part(2), part(4)) {
        (6, Some(red), Some(green), Some(blue)) => Rgb([red, green, blue]),
        _                                       => Rgb([255, 255, 255]),
    }
}

// The same photo covering the target, blurred: made small, softened and brought back (soft and quick).
fn blurred_backdrop(image: &RgbImage, target_w: u32, target_h: u32) -> RgbImage {
    let (small_w, small_h) = ((target_w / 12).max(8), (target_h / 12).max(8));
    let cover              = centered_frame(image.width(), image.height(), small_w, small_h);
    let (x, y, w, h)       = frame_pixels(cover, image.width(), image.height());
    let piece              = image::imageops::crop_imm(image, x, y, w, h).to_image();
    let small              = image::imageops::resize(&piece, small_w, small_h, FilterType::Triangle);
    let soft               = image::imageops::blur(&small, 2.5);
    let darker             = RgbImage::from_fn(small_w, small_h, |column, row| {
        let pixel = soft.get_pixel(column, row);
        Rgb(pixel.0.map(|value| (f64::from(value) * 0.85) as u8))
    });
    image::imageops::resize(&darker, target_w, target_h, FilterType::Triangle)
}

pub struct ComposeParams<'a> {
    pub image   : &'a RgbImage,
    pub options : &'a SocialOptions,
    pub frame   : Option<Frame>,
}

// The picture at the target size.
pub fn compose(params: ComposeParams) -> Result<RgbImage, String> {
    let (target_w, target_h) = (params.options.width, params.options.height);
    if target_w == 0 || target_h == 0 || target_w > MAX_SIDE || target_h > MAX_SIDE {
        return Err(SIZE_ERROR.to_string());
    }
    let image = params.image;

    match params.options.fit {
        FitMode::Crop => {
            let frame        = params.frame.unwrap_or_else(|| centered_frame(image.width(), image.height(), target_w, target_h));
            let (x, y, w, h) = frame_pixels(frame, image.width(), image.height());
            let piece        = image::imageops::crop_imm(image, x, y, w, h).to_image();
            Ok(image::imageops::resize(&piece, target_w, target_h, FilterType::Lanczos3))
        }
        FitMode::Contain => {
            let mut canvas = if params.options.blur {
                blurred_backdrop(image, target_w, target_h)
            } else {
                RgbImage::from_pixel(target_w, target_h, parse_color(params.options.fill.as_deref().unwrap_or("#FFFFFF")))
            };
            let (x, y, w, h) = contain_rect(image.width(), image.height(), target_w, target_h);
            let photo        = image::imageops::resize(image, w, h, FilterType::Lanczos3);
            image::imageops::replace(&mut canvas, &photo, i64::from(x), i64::from(y));
            Ok(canvas)
        }
    }
}

pub fn format_of(options: &SocialOptions) -> TargetFormat {
    match options.format {
        Some(TargetFormat::Png)  => TargetFormat::Png,
        Some(TargetFormat::Webp) => TargetFormat::Webp,
        _                        => TargetFormat::Jpg,
    }
}

// One photo at the size of the network, encoded.
pub fn resize_for(source: &Path, options: &SocialOptions, frame: Option<Frame>) -> Result<Vec<u8>, String> {
    let image   = decode(source)?.to_rgb8();
    let picture = DynamicImage::ImageRgb8(compose(ComposeParams { image: &image, options, frame })?);
    match format_of(options) {
        TargetFormat::Png  => encode_png(&picture),
        TargetFormat::Webp => encode_webp(&picture, QUALITY),
        _                  => encode_jpeg(&picture, QUALITY),
    }
}

// "Instagram historia · 1080 × 1920 px".
pub fn detail(options: &SocialOptions) -> String {
    format!("{} · {} × {} px", options.tag, options.width, options.height)
}

// The biggest face of the photo (for the first frame), each value from 0 to 1. Only on Windows.
pub fn face_of(source: &Path) -> Option<Frame> {
    use crate::services::id_photo::face::{detect, DETECT_SIDE};

    let image  = decode(source).ok()?;
    let small  = image.resize(DETECT_SIDE, DETECT_SIDE, FilterType::Triangle).to_rgb8();
    let faces  = detect(&small).ok()?;
    let face   = faces.into_iter().max_by(|a, b| (a.width * a.height).total_cmp(&(b.width * b.height)))?;
    let (w, h) = (f64::from(small.width()), f64::from(small.height()));
    Some(Frame { x: face.x / w, y: face.y / h, width: face.width / w, height: face.height / h })
}
