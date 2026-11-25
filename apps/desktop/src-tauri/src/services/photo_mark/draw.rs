// The mark as a picture: the text in one of the fonts of Windows (with a soft shadow), or the logo
// chosen; turned for the mosaic; laid on the photo with its opacity.
use std::path::{Path, PathBuf};

use ab_glyph::{Font, FontVec, PxScale, ScaleFont};
use image::{imageops::FilterType, Rgba, RgbaImage};
use serde::{Deserialize, Serialize};

pub const FONT_ERROR: &str = "No encontré esa letra en tu PC";
pub const LOGO_ERROR: &str = "No pude abrir el logo";

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum FontChoice {
    #[default]
    Sans,
    Arial,
    Serif,
    Mono,
    Impact,
    Script,
}

// The files of Windows for each font (bold where there is one); the first one that is there.
pub fn font_files(font: FontChoice) -> &'static [&'static str] {
    match font {
        FontChoice::Sans   => &["segoeuib.ttf", "arialbd.ttf"],
        FontChoice::Arial  => &["arialbd.ttf", "arial.ttf"],
        FontChoice::Serif  => &["georgiab.ttf", "timesbd.ttf"],
        FontChoice::Mono   => &["consolab.ttf", "courbd.ttf"],
        FontChoice::Impact => &["impact.ttf", "arialbd.ttf"],
        FontChoice::Script => &["segoesc.ttf", "segoescb.ttf"],
    }
}

pub fn fonts_folder() -> PathBuf {
    std::env::var_os("WINDIR").map(PathBuf::from).unwrap_or_else(|| PathBuf::from(r"C:\Windows")).join("Fonts")
}

pub fn load_font(font: FontChoice) -> Result<FontVec, String> {
    let folder = fonts_folder();
    font_files(font)
        .iter()
        .find_map(|name| std::fs::read(folder.join(name)).ok().and_then(|bytes| FontVec::try_from_vec(bytes).ok()))
        .ok_or_else(|| FONT_ERROR.to_string())
}

// The coverage of the text (0 to 255) on one line, `height` pixels tall (the size of its letters).
pub fn text_mask(font: &FontVec, text: &str, height: u32) -> image::GrayImage {
    let scaled  = font.as_scaled(PxScale::from(height as f32));
    let ascent  = scaled.ascent();
    let mut pen = 0.0f32;
    let mut glyphs = Vec::new();
    let mut previous = None;
    for character in text.chars() {
        let id = scaled.glyph_id(character);
        if let Some(before) = previous {
            pen += scaled.kern(before, id);
        }
        glyphs.push(id.with_scale_and_position(scaled.scale(), ab_glyph::point(pen, ascent)));
        pen     += scaled.h_advance(id);
        previous = Some(id);
    }

    let width    = pen.ceil().max(1.0) as u32;
    let line     = (scaled.ascent() - scaled.descent()).ceil().max(1.0) as u32;
    let mut mask = image::GrayImage::new(width, line);
    for glyph in glyphs {
        let Some(outlined) = font.outline_glyph(glyph) else { continue };
        let bounds = outlined.px_bounds();
        outlined.draw(|x, y, coverage| {
            let (column, row) = (bounds.min.x as i64 + i64::from(x), bounds.min.y as i64 + i64::from(y));
            if column >= 0 && row >= 0 && (column as u32) < width && (row as u32) < line {
                let pixel = mask.get_pixel_mut(column as u32, row as u32);
                pixel.0[0] = pixel.0[0].max((coverage * 255.0).round() as u8);
            }
        });
    }
    mask
}

pub struct TextStamp<'a> {
    pub font   : &'a FontVec,
    pub text   : &'a str,
    pub height : u32,
    pub color  : [u8; 3],
    // A soft dark shadow under the letters, so they read on light and dark parts.
    pub shadow : bool,
}

// The text in its colour, with room around it for the shadow.
pub fn text_stamp(params: TextStamp) -> RgbaImage {
    let mask   = text_mask(params.font, params.text, params.height);
    let pad    = if params.shadow { (params.height / 8).max(2) } else { 0 };
    let offset = (params.height / 22).max(1);
    let (w, h) = (mask.width() + pad * 2, mask.height() + pad * 2);
    let mut stamp = RgbaImage::new(w, h);

    if params.shadow {
        let mut shadow = image::GrayImage::new(w, h);
        image::imageops::replace(&mut shadow, &mask, i64::from(pad + offset), i64::from(pad + offset));
        let soft = image::imageops::blur(&shadow, (params.height as f32 / 24.0).max(1.0));
        for (pixel, value) in stamp.pixels_mut().zip(soft.pixels()) {
            *pixel = Rgba([0, 0, 0, (f32::from(value.0[0]) * 0.55) as u8]);
        }
    }
    for (x, y, value) in mask.enumerate_pixels() {
        let alpha = value.0[0];
        if alpha == 0 {
            continue;
        }
        let under = stamp.get_pixel_mut(x + pad, y + pad);
        *under    = over(*under, Rgba([params.color[0], params.color[1], params.color[2], alpha]));
    }
    stamp
}

// The logo `height` pixels tall, keeping its shape.
pub fn logo_stamp(path: &Path, height: u32) -> Result<RgbaImage, String> {
    let logo  = crate::services::image::decode::decode(path).map_err(|_| LOGO_ERROR.to_string())?.to_rgba8();
    let width = ((f64::from(logo.width()) * f64::from(height) / f64::from(logo.height().max(1))).round() as u32).max(1);
    Ok(image::imageops::resize(&logo, width, height, FilterType::Lanczos3))
}

// One colour with alpha over another.
pub fn over(below: Rgba<u8>, above: Rgba<u8>) -> Rgba<u8> {
    let (top, bottom) = (f32::from(above.0[3]) / 255.0, f32::from(below.0[3]) / 255.0);
    let alpha = top + bottom * (1.0 - top);
    if alpha <= 0.0 {
        return Rgba([0, 0, 0, 0]);
    }
    let mix = |channel: usize| ((f32::from(above.0[channel]) * top + f32::from(below.0[channel]) * bottom * (1.0 - top)) / alpha).round() as u8;
    Rgba([mix(0), mix(1), mix(2), (alpha * 255.0).round() as u8])
}

// The stamp turned `degrees` counter-clockwise around its middle, on a canvas that holds all of it.
pub fn rotate(stamp: &RgbaImage, degrees: f64) -> RgbaImage {
    let (sin, cos) = degrees.to_radians().sin_cos();
    let (w, h)     = (f64::from(stamp.width()), f64::from(stamp.height()));
    let out_w      = (w * cos.abs() + h * sin.abs()).ceil() as u32;
    let out_h      = (w * sin.abs() + h * cos.abs()).ceil() as u32;
    let (cx, cy)   = (w / 2.0, h / 2.0);
    let (ox, oy)   = (f64::from(out_w) / 2.0, f64::from(out_h) / 2.0);

    RgbaImage::from_fn(out_w, out_h, |column, row| {
        // Back from the turned picture to the stamp (the y axis goes down).
        let (dx, dy) = (f64::from(column) + 0.5 - ox, f64::from(row) + 0.5 - oy);
        let (sx, sy) = (dx * cos - dy * sin + cx - 0.5, dx * sin + dy * cos + cy - 0.5);
        sample(stamp, sx, sy)
    })
}

// Bilinear, transparent outside.
fn sample(image: &RgbaImage, x: f64, y: f64) -> Rgba<u8> {
    let (x0, y0) = (x.floor(), y.floor());
    let (fx, fy) = (x - x0, y - y0);
    let at = |column: f64, row: f64| -> [f64; 4] {
        if column < 0.0 || row < 0.0 || column >= f64::from(image.width()) || row >= f64::from(image.height()) {
            return [0.0; 4];
        }
        let pixel = image.get_pixel(column as u32, row as u32);
        let alpha = f64::from(pixel.0[3]);
        [f64::from(pixel.0[0]) * alpha, f64::from(pixel.0[1]) * alpha, f64::from(pixel.0[2]) * alpha, alpha]
    };
    let (a, b, c, d) = (at(x0, y0), at(x0 + 1.0, y0), at(x0, y0 + 1.0), at(x0 + 1.0, y0 + 1.0));
    let mixed: [f64; 4] = std::array::from_fn(|channel| a[channel] * (1.0 - fx) * (1.0 - fy) + b[channel] * fx * (1.0 - fy) + c[channel] * (1.0 - fx) * fy + d[channel] * fx * fy);
    if mixed[3] <= 0.0 {
        return Rgba([0, 0, 0, 0]);
    }
    Rgba([(mixed[0] / mixed[3]).round() as u8, (mixed[1] / mixed[3]).round() as u8, (mixed[2] / mixed[3]).round() as u8, mixed[3].round() as u8])
}

pub struct LayParams<'a> {
    pub photo   : &'a mut RgbaImage,
    pub stamp   : &'a RgbaImage,
    pub x       : i64,
    pub y       : i64,
    // 0 to 1.
    pub opacity : f64,
}

// The stamp on the photo at (x, y), with its opacity; what falls outside is left out.
pub fn lay(params: LayParams) {
    let opacity = params.opacity.clamp(0.0, 1.0);
    for (column, row, pixel) in params.stamp.enumerate_pixels() {
        let (x, y) = (params.x + i64::from(column), params.y + i64::from(row));
        if pixel.0[3] == 0 || x < 0 || y < 0 || x >= i64::from(params.photo.width()) || y >= i64::from(params.photo.height()) {
            continue;
        }
        let faded = Rgba([pixel.0[0], pixel.0[1], pixel.0[2], (f64::from(pixel.0[3]) * opacity).round() as u8]);
        let under = params.photo.get_pixel_mut(x as u32, y as u32);
        *under    = over(*under, faded);
    }
}
