// "Marca de agua" on photos: a text or a logo at one of nine places or «En mosaico» (repeated and turned,
// to protect them), sized by each photo. The original is never touched: "<nombre> (marca).jpg". The
// last choices are kept in marca.json (with the logo's path) for next time.
pub mod draw;
pub mod layout;

#[cfg(test)]
mod tests;

use std::{fs, path::Path};

use image::{DynamicImage, RgbaImage};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

use self::{
    draw::{lay, load_font, logo_stamp, rotate, text_stamp, FontChoice, LayParams, TextStamp},
    layout::{mark_height, mosaic_centers, place, Place, MOSAIC_ANGLE},
};
use crate::services::{
    image::{
        convert::{encode_jpeg, encode_png, encode_webp},
        decode::{decode, has_transparency},
    },
    social::parse_color,
};

pub const MARK_ACTION: &str = "photo-mark";
pub const MARK_TAG: &str    = "marca";
pub const EMPTY_ERROR: &str = "Escribe el texto de la marca o elige un logo";
pub const QUALITY: u8       = 92;
const CONFIG_FILE: &str     = "marca.json";

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum MarkKind {
    #[default]
    Text,
    Logo,
}

#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", default)]
pub struct MarkOptions {
    pub kind    : MarkKind,
    pub text    : String,
    pub font    : FontChoice,
    // #RRGGBB.
    pub color   : String,
    pub shadow  : bool,
    pub logo    : Option<String>,
    pub place   : Place,
    // Of the shorter side of each photo (0.01 to 0.5).
    pub size    : f64,
    // 0 to 1.
    pub opacity : f64,
}

impl Default for MarkOptions {
    fn default() -> Self {
        Self { kind: MarkKind::Text, text: String::new(), font: FontChoice::Sans, color: "#FFFFFF".to_string(), shadow: true, logo: None, place: Place::BottomRight, size: 0.06, opacity: 0.7 }
    }
}

// The mark at the size it takes on a photo of that width and height.
pub fn stamp_for(options: &MarkOptions, width: u32, height: u32) -> Result<RgbaImage, String> {
    let tall = mark_height(width, height, options.size);
    match options.kind {
        MarkKind::Logo => logo_stamp(Path::new(options.logo.as_deref().ok_or(EMPTY_ERROR)?), tall),
        MarkKind::Text => {
            let text = options.text.trim();
            if text.is_empty() {
                return Err(EMPTY_ERROR.to_string());
            }
            let font = load_font(options.font)?;
            Ok(text_stamp(TextStamp { font: &font, text, height: tall, color: parse_color(&options.color).0, shadow: options.shadow }))
        }
    }
}

// The mark on the photo: once at its place, or turned all over it.
pub fn apply(photo: &mut RgbaImage, options: &MarkOptions) -> Result<(), String> {
    let (width, height) = (photo.width(), photo.height());
    let stamp           = stamp_for(options, width, height)?;

    if options.place == Place::Mosaic {
        let turned = rotate(&stamp, MOSAIC_ANGLE);
        for (x, y) in mosaic_centers(width, height, stamp.width(), stamp.height()) {
            let (left, top) = ((x - f64::from(turned.width()) / 2.0).round() as i64, (y - f64::from(turned.height()) / 2.0).round() as i64);
            lay(LayParams { photo, stamp: &turned, x: left, y: top, opacity: options.opacity });
        }
    } else {
        let (x, y) = place(options.place, width, height, stamp.width(), stamp.height());
        lay(LayParams { photo, stamp: &stamp, x, y, opacity: options.opacity });
    }
    Ok(())
}

// One photo with its mark, in its own format (JPG, PNG or WebP; anything else as JPG).
pub fn mark(source: &Path, options: &MarkOptions) -> Result<(Vec<u8>, &'static str), String> {
    let image     = decode(source)?;
    let alpha     = has_transparency(&image);
    let mut photo = image.to_rgba8();
    apply(&mut photo, options)?;

    let picture   = if alpha { DynamicImage::ImageRgba8(photo) } else { DynamicImage::ImageRgb8(DynamicImage::ImageRgba8(photo).to_rgb8()) };
    let extension = source.extension().map(|value| value.to_string_lossy().to_lowercase()).unwrap_or_default();
    match extension.as_str() {
        "png"  => Ok((encode_png(&picture)?, "png")),
        "webp" => Ok((encode_webp(&picture, QUALITY)?, "webp")),
        _ if alpha => Ok((encode_png(&picture)?, "png")),
        _      => Ok((encode_jpeg(&picture, QUALITY)?, "jpg")),
    }
}

pub fn detail(options: &MarkOptions) -> String {
    let what = match options.kind {
        MarkKind::Text => format!("Marca «{}»", options.text.trim()),
        MarkKind::Logo => "Marca con logo".to_string(),
    };
    if options.place == Place::Mosaic { format!("{what} en mosaico") } else { what }
}

// --- The last choices ---

fn config_path(app: &AppHandle) -> Option<std::path::PathBuf> {
    app.path().app_data_dir().ok().map(|folder| folder.join(CONFIG_FILE))
}

pub fn load_config(app: &AppHandle) -> MarkOptions {
    config_path(app).and_then(|path| fs::read_to_string(path).ok()).and_then(|text| serde_json::from_str(&text).ok()).unwrap_or_default()
}

pub fn save_config(app: &AppHandle, options: &MarkOptions) {
    if let (Some(path), Ok(text)) = (config_path(app), serde_json::to_string_pretty(options)) {
        let _ = path.parent().map(fs::create_dir_all);
        let _ = fs::write(path, text);
    }
}
