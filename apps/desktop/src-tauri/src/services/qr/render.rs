// The QR drawn: its dots (squares, rounded or circles), its three corners, the colours, the margin and
// an optional logo in the middle (with the highest error correction, so it is still read), as a picture
// or as SVG. Pure.
use image::{imageops::FilterType, Rgba, RgbaImage};
use qrcode::{Color, EcLevel, QrCode};
use serde::{Deserialize, Serialize};

use crate::services::social::parse_color;

pub const TOO_LONG: &str = "Es demasiado para un QR: acórtalo";
// The logo covers at most this share of the code's side (high correction recovers up to 30 %).
pub const LOGO_SHARE: f64 = 0.22;

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Shape {
    #[default]
    Square,
    Rounded,
    Circle,
}

#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", default)]
pub struct QrStyle {
    // #RRGGBB.
    pub dark    : String,
    pub light   : String,
    pub dots    : Shape,
    pub corners : Shape,
    // In modules (4 is what the standard asks).
    pub margin  : u32,
    // The logo as PNG bytes (Glup's or the one chosen; read by the caller).
    #[serde(skip)]
    pub logo    : Option<RgbaImage>,
}

impl Default for QrStyle {
    fn default() -> Self {
        Self { dark: "#000000".to_string(), light: "#FFFFFF".to_string(), dots: Shape::Square, corners: Shape::Square, margin: 4, logo: None }
    }
}

// The modules of the code (true: dark) and its side.
pub struct Matrix {
    pub width   : usize,
    pub modules : Vec<bool>,
    pub level   : EcLevel,
}

impl Matrix {
    pub fn dark(&self, x: usize, y: usize) -> bool {
        self.modules.get(y * self.width + x).copied().unwrap_or(false)
    }
}

// A logo needs the highest correction; otherwise M, a fair balance of size and strength.
pub fn matrix(payload: &str, with_logo: bool) -> Result<Matrix, String> {
    let level = if with_logo { EcLevel::H } else { EcLevel::M };
    let code  = QrCode::with_error_correction_level(payload.as_bytes(), level).map_err(|_| TOO_LONG.to_string())?;
    Ok(Matrix { width: code.width(), modules: code.to_colors().into_iter().map(|color| color == Color::Dark).collect(), level })
}

// The three big squares of the corners: 7 × 7 modules each.
pub fn in_finder(x: usize, y: usize, width: usize) -> Option<(usize, usize)> {
    [(0, 0), (width - 7, 0), (0, width - 7)].into_iter().find(|(left, top)| x >= *left && x < left + 7 && y >= *top && y < top + 7)
}

// The modules hidden under the logo (square, in the middle, LOGO_SHARE of the side plus a module around).
pub fn logo_box(width: usize) -> (f64, f64) {
    let side  = (width as f64 * LOGO_SHARE).round();
    let start = (width as f64 - side) / 2.0;
    (start, side)
}

fn under_logo(x: usize, y: usize, width: usize) -> bool {
    let (start, side) = logo_box(width);
    let (x, y)        = (x as f64 + 0.5, y as f64 + 0.5);
    x > start - 0.5 && x < start + side + 0.5 && y > start - 0.5 && y < start + side + 0.5
}

// Inside a rounded square of (0, 0)–(side, side) with that radius.
fn in_rounded(x: f64, y: f64, side: f64, radius: f64) -> bool {
    if x < 0.0 || y < 0.0 || x > side || y > side {
        return false;
    }
    let cx = x.clamp(radius, side - radius);
    let cy = y.clamp(radius, side - radius);
    (x - cx).powi(2) + (y - cy).powi(2) <= radius * radius
}

// A point of a corner square (in its 7 × 7 modules): its ring and its middle.
fn in_corner(x: f64, y: f64, shape: Shape) -> bool {
    match shape {
        Shape::Square  => (x < 7.0 && y < 7.0) && !((1.0..6.0).contains(&x) && (1.0..6.0).contains(&y)) || ((2.0..5.0).contains(&x) && (2.0..5.0).contains(&y)),
        Shape::Rounded => (in_rounded(x, y, 7.0, 2.0) && !in_rounded(x - 1.0, y - 1.0, 5.0, 1.4)) || in_rounded(x - 2.0, y - 2.0, 3.0, 0.9),
        Shape::Circle  => {
            let distance = ((x - 3.5).powi(2) + (y - 3.5).powi(2)).sqrt();
            (2.5..=3.5).contains(&distance) || distance <= 1.6
        }
    }
}

// A point of a dot (in its module, 0 to 1).
fn in_dot(x: f64, y: f64, shape: Shape) -> bool {
    match shape {
        Shape::Square  => true,
        Shape::Rounded => in_rounded(x - 0.04, y - 0.04, 0.92, 0.32),
        Shape::Circle  => (x - 0.5).powi(2) + (y - 0.5).powi(2) <= 0.44 * 0.44,
    }
}

// Whether the point (in modules, the margin not counted) is dark.
fn dark_at(matrix: &Matrix, style: &QrStyle, x: f64, y: f64) -> bool {
    let width = matrix.width;
    if x < 0.0 || y < 0.0 || x >= width as f64 || y >= width as f64 {
        return false;
    }
    let (column, row) = (x as usize, y as usize);
    if let Some((left, top)) = in_finder(column, row, width) {
        return in_corner(x - left as f64, y - top as f64, style.corners);
    }
    if style.logo.is_some() && under_logo(column, row, width) {
        return false;
    }
    matrix.dark(column, row) && in_dot(x - column as f64, y - row as f64, style.dots)
}

// The picture, `size` pixels on its side, softened at the edges of the shapes (4 × 4 samples a pixel).
pub fn to_image(matrix: &Matrix, style: &QrStyle, size: u32) -> RgbaImage {
    let total  = (matrix.width + style.margin as usize * 2) as f64;
    let module = f64::from(size) / total;
    let margin = f64::from(style.margin);
    let (dark, light) = (parse_color(&style.dark), parse_color(&style.light));
    const SAMPLES: u32 = 4;

    let mut picture = RgbaImage::from_fn(size, size, |px, py| {
        let mut hits = 0;
        for sy in 0..SAMPLES {
            for sx in 0..SAMPLES {
                let x = (f64::from(px) + (f64::from(sx) + 0.5) / f64::from(SAMPLES)) / module - margin;
                let y = (f64::from(py) + (f64::from(sy) + 0.5) / f64::from(SAMPLES)) / module - margin;
                hits += u32::from(dark_at(matrix, style, x, y));
            }
        }
        let share = f64::from(hits) / f64::from(SAMPLES * SAMPLES);
        let mix   = |channel: usize| (f64::from(dark.0[channel]) * share + f64::from(light.0[channel]) * (1.0 - share)).round() as u8;
        Rgba([mix(0), mix(1), mix(2), 255])
    });

    if let Some(logo) = &style.logo {
        let (start, side) = logo_box(matrix.width);
        let inner  = side * 0.86;
        let fit    = (inner * module).round() as u32;
        let scale  = (f64::from(fit) / f64::from(logo.width().max(logo.height()))).min(8.0);
        let (w, h) = (((f64::from(logo.width()) * scale).round() as u32).max(1), ((f64::from(logo.height()) * scale).round() as u32).max(1));
        let small  = image::imageops::resize(logo, w, h, FilterType::Lanczos3);
        let middle = (margin + start + side / 2.0) * module;
        image::imageops::overlay(&mut picture, &small, (middle - f64::from(w) / 2.0).round() as i64, (middle - f64::from(h) / 2.0).round() as i64);
    }
    picture
}

fn rounded_path(x: f64, y: f64, side: f64, radius: f64) -> String {
    let r = radius.min(side / 2.0);
    format!(
        "M{:.3} {:.3}h{:.3}a{r:.3} {r:.3} 0 0 1 {r:.3} {r:.3}v{:.3}a{r:.3} {r:.3} 0 0 1 -{r:.3} {r:.3}h-{:.3}a{r:.3} {r:.3} 0 0 1 -{r:.3} -{r:.3}v-{:.3}a{r:.3} {r:.3} 0 0 1 {r:.3} -{r:.3}z",
        x + r, y, side - 2.0 * r, side - 2.0 * r, side - 2.0 * r, side - 2.0 * r,
    )
}

fn circle_path(cx: f64, cy: f64, radius: f64) -> String {
    format!("M{:.3} {cy:.3}a{radius:.3} {radius:.3} 0 1 0 {:.3} 0a{radius:.3} {radius:.3} 0 1 0 -{:.3} 0z", cx - radius, radius * 2.0, radius * 2.0)
}

fn corner_path(left: f64, top: f64, shape: Shape) -> String {
    match shape {
        Shape::Square  => format!("M{left} {top}h7v7h-7zM{} {}v5h5v-5zM{} {}h3v3h-3z", left + 1.0, top + 1.0, left + 2.0, top + 2.0),
        Shape::Rounded => format!("{}{}{}", rounded_path(left, top, 7.0, 2.0), rounded_path(left + 1.0, top + 1.0, 5.0, 1.4), rounded_path(left + 2.0, top + 2.0, 3.0, 0.9)),
        Shape::Circle  => format!("{}{}{}", circle_path(left + 3.5, top + 3.5, 3.5), circle_path(left + 3.5, top + 3.5, 2.5), circle_path(left + 3.5, top + 3.5, 1.6)),
    }
}

pub struct SvgParams<'a> {
    pub matrix : &'a Matrix,
    pub style  : &'a QrStyle,
    // The logo already as PNG, embedded in the file.
    pub logo   : Option<&'a [u8]>,
}

// The same drawing as SVG (lines that never blur, at any size), in modules.
pub fn to_svg(params: SvgParams) -> String {
    let (matrix, style) = (params.matrix, params.style);
    let width  = matrix.width;
    let margin = style.margin as f64;
    let total  = width as f64 + margin * 2.0;
    let mut dots = String::new();
    for y in 0..width {
        for x in 0..width {
            if !matrix.dark(x, y) || in_finder(x, y, width).is_some() || (style.logo.is_some() && under_logo(x, y, width)) {
                continue;
            }
            let (left, top) = (x as f64 + margin, y as f64 + margin);
            dots.push_str(&match style.dots {
                Shape::Square  => format!("M{left} {top}h1v1h-1z"),
                Shape::Rounded => rounded_path(left + 0.04, top + 0.04, 0.92, 0.32),
                Shape::Circle  => circle_path(left + 0.5, top + 0.5, 0.44),
            });
        }
    }
    for (left, top) in [(0, 0), (width - 7, 0), (0, width - 7)] {
        dots.push_str(&corner_path(left as f64 + margin, top as f64 + margin, style.corners));
    }

    let logo = match (params.logo, &style.logo) {
        (Some(png), Some(_)) => {
            let (start, side) = logo_box(width);
            let inner = side * 0.86;
            let at    = margin + start + (side - inner) / 2.0;
            format!("<image x=\"{at:.3}\" y=\"{at:.3}\" width=\"{inner:.3}\" height=\"{inner:.3}\" preserveAspectRatio=\"xMidYMid meet\" href=\"data:image/png;base64,{}\"/>", base64(png))
        }
        _ => String::new(),
    };
    format!(
        "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 {total} {total}\" shape-rendering=\"geometricPrecision\"><rect width=\"{total}\" height=\"{total}\" fill=\"{}\"/><path fill=\"{}\" fill-rule=\"evenodd\" d=\"{dots}\"/>{logo}</svg>",
        style.light, style.dark,
    )
}

pub fn base64(bytes: &[u8]) -> String {
    const ALPHABET: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity(bytes.len().div_ceil(3) * 4);
    for chunk in bytes.chunks(3) {
        let value = (u32::from(chunk[0]) << 16) | (u32::from(*chunk.get(1).unwrap_or(&0)) << 8) | u32::from(*chunk.get(2).unwrap_or(&0));
        for (index, shift) in [18, 12, 6, 0].into_iter().enumerate() {
            if index <= chunk.len() {
                out.push(ALPHABET[((value >> shift) & 63) as usize] as char);
            } else {
                out.push('=');
            }
        }
    }
    out
}

// How well the dots stand out from the background (WCAG contrast, 1 to 21), and whether they are
// lighter than it (many phones do not read a code like that).
#[derive(Clone, Copy, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Contrast {
    pub ratio    : f64,
    pub low      : bool,
    pub inverted : bool,
}

pub const MIN_CONTRAST: f64 = 3.0;

fn luminance(hex: &str) -> f64 {
    let color = parse_color(hex);
    let channel = |value: u8| {
        let value = f64::from(value) / 255.0;
        if value <= 0.03928 { value / 12.92 } else { ((value + 0.055) / 1.055).powf(2.4) }
    };
    0.2126 * channel(color.0[0]) + 0.7152 * channel(color.0[1]) + 0.0722 * channel(color.0[2])
}

pub fn contrast(dark: &str, light: &str) -> Contrast {
    let (a, b)  = (luminance(dark), luminance(light));
    let ratio   = (a.max(b) + 0.05) / (a.min(b) + 0.05);
    Contrast { ratio: (ratio * 10.0).round() / 10.0, low: ratio < MIN_CONTRAST, inverted: a > b }
}
