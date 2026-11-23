// "Foto tamaño carnet": sizes, the framing of the head and the print sheet. All pure.
use serde::{Deserialize, Serialize};

// Printed at 300 dots per inch.
pub const DPI: f64 = 300.0;
pub const CM_PER_INCH: f64 = 2.54;

// The print sheet: 10 × 15 cm, with a small margin so no photo touches the edge of the paper.
pub const SHEET_CM: (f64, f64) = (10.0, 15.0);
pub const SHEET_MARGIN_CM: f64 = 0.3;

// Custom sizes Glup accepts (same limits as the frontend).
pub const MIN_CUSTOM_CM: f64 = 1.0;
pub const MAX_CUSTOM_CM: f64 = 10.0;

pub fn cm_to_px(cm: f64) -> u32 {
    (cm / CM_PER_INCH * DPI).round() as u32
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum IdKind {
    // 3,5 × 4,5 cm.
    #[default]
    Passport,
    // 5 × 5 cm.
    Square,
    Custom,
}

// How the head sits in each format: how much of the height it takes (chin to the top of the hair) and
// the space above it, both as shares of the photo height.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Framing {
    pub head_share : f64,
    pub top_margin : f64,
}

pub fn framing(kind: IdKind) -> Framing {
    match kind {
        IdKind::Passport => Framing { head_share: 0.75, top_margin: 0.08 },
        IdKind::Square   => Framing { head_share: 0.62, top_margin: 0.12 },
        IdKind::Custom   => Framing { head_share: 0.72, top_margin: 0.09 },
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IdFormat {
    pub kind      : IdKind,
    pub width_cm  : f64,
    pub height_cm : f64,
}

// The two fixed formats (the frontend sends the same numbers).
#[cfg(test)]
impl IdFormat {
    pub const PASSPORT: IdFormat = IdFormat { kind: IdKind::Passport, width_cm: 3.5, height_cm: 4.5 };
    pub const SQUARE: IdFormat   = IdFormat { kind: IdKind::Square, width_cm: 5.0, height_cm: 5.0 };
}

impl IdFormat {
    pub fn pixels(&self) -> (u32, u32) {
        (cm_to_px(self.width_cm), cm_to_px(self.height_cm))
    }

    pub fn is_valid(&self) -> bool {
        let fits = |cm: f64| (MIN_CUSTOM_CM..=MAX_CUSTOM_CM).contains(&cm);
        fits(self.width_cm) && fits(self.height_cm)
    }
}

// Where the head is in the photo, in its pixels: across (center) and from the top of the hair to the chin.
#[derive(Clone, Copy, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Head {
    pub center_x : f64,
    pub top      : f64,
    pub chin     : f64,
}

// The part of the photo that becomes the ID photo, in its pixels. It may go past the edges (white there).
#[derive(Clone, Copy, Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Crop {
    pub x      : f64,
    pub y      : f64,
    pub width  : f64,
    pub height : f64,
}

// The head at its share of the height, centered across, with its margin above.
pub fn crop_for(head: Head, format: IdFormat) -> Crop {
    let rule   = framing(format.kind);
    let size   = (head.chin - head.top).max(1.0);
    let height = size / rule.head_share;
    let width  = height * format.width_cm / format.height_cm;

    Crop { x: head.center_x - width / 2.0, y: head.top - height * rule.top_margin, width, height }
}

pub struct EdgeParams {
    pub head      : Head,
    // The face's box from the detector (x, y, width, height).
    pub face      : (f64, f64, f64, f64),
    pub image     : (u32, u32),
}

// The head touches the top of the photo (the hair may be cut) or the face is against a side or the bottom.
pub fn too_close_to_edge(params: EdgeParams) -> bool {
    let (width, height) = (params.image.0 as f64, params.image.1 as f64);
    let (x, y, face_w, face_h) = params.face;
    let edge = height.min(width) * 0.01;

    params.head.top <= edge || x <= edge || y <= edge || x + face_w >= width - edge || y + face_h >= height - edge
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SheetLayout {
    // The sheet in pixels, turned to fit more copies (15 × 10 or 10 × 15).
    pub width     : u32,
    pub height    : u32,
    pub columns   : u32,
    pub rows      : u32,
    // Top-left corner of every copy.
    pub positions : Vec<(u32, u32)>,
}

impl SheetLayout {
    pub fn copies(&self) -> u32 {
        self.columns * self.rows
    }
}

fn layout_on(sheet: (u32, u32), photo: (u32, u32)) -> SheetLayout {
    let margin  = cm_to_px(SHEET_MARGIN_CM);
    let usable  = (sheet.0.saturating_sub(margin * 2), sheet.1.saturating_sub(margin * 2));
    let columns = if photo.0 == 0 { 0 } else { usable.0 / photo.0 };
    let rows    = if photo.1 == 0 { 0 } else { usable.1 / photo.1 };

    // The block of copies is centered; they touch each other so one cut line serves both.
    let left = (sheet.0 - columns * photo.0) / 2;
    let top  = (sheet.1 - rows * photo.1) / 2;
    let positions = (0..rows).flat_map(|row| (0..columns).map(move |column| (left + column * photo.0, top + row * photo.1))).collect();

    SheetLayout { width: sheet.0, height: sheet.1, columns, rows, positions }
}

// All the copies that fit on a 10 × 15 cm sheet, upright or turned, whichever fits more.
pub fn sheet_layout(photo: (u32, u32)) -> SheetLayout {
    let upright = (cm_to_px(SHEET_CM.0), cm_to_px(SHEET_CM.1));
    let tall    = layout_on(upright, photo);
    let wide    = layout_on((upright.1, upright.0), photo);
    if wide.copies() > tall.copies() { wide } else { tall }
}

// "Foto carnet 3,5 × 4,5 cm · hoja con 8".
pub fn history_detail(format: IdFormat, copies: Option<u32>) -> String {
    let cm = |value: f64| {
        let text = format!("{value:.1}");
        text.trim_end_matches(".0").replace('.', ",")
    };
    let size = format!("Foto carnet {} × {} cm", cm(format.width_cm), cm(format.height_cm));
    match copies {
        Some(count) => format!("{size} · hoja con {count}"),
        None        => size,
    }
}

// "8 fotos en una hoja de 10 × 15".
pub fn sheet_note(copies: u32) -> String {
    format!("{copies} {} en una hoja de 10 × 15", if copies == 1 { "foto" } else { "fotos" })
}
