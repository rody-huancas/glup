// Where the mark goes on a photo, and how big: by the photo's shorter side, so it looks the same on a
// small or a big one. The screen draws its preview with the same rules (modules/photo-mark/utils). Pure.
use serde::{Deserialize, Serialize};

// The margin to the edges, of the shorter side.
pub const MARGIN: f64 = 0.04;
// «En mosaico»: the marks are turned this much (degrees, counter-clockwise) and spaced like this.
pub const MOSAIC_ANGLE: f64 = 30.0;
pub const MOSAIC_GAP_X: f64 = 0.6;
pub const MOSAIC_GAP_Y: f64 = 2.2;

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum Place {
    TopLeft,
    Top,
    TopRight,
    Left,
    Center,
    Right,
    BottomLeft,
    Bottom,
    #[default]
    BottomRight,
    // Repeated and turned all over the photo.
    Mosaic,
}

// The height of the mark in pixels: `size` (from 0 to 1) of the shorter side.
pub fn mark_height(width: u32, height: u32, size: f64) -> u32 {
    ((f64::from(width.min(height)) * size.clamp(0.01, 0.5)).round() as u32).max(4)
}

pub fn margin(width: u32, height: u32) -> i64 {
    (f64::from(width.min(height)) * MARGIN).round() as i64
}

// The top-left corner of a mark of that size at one of the nine places.
pub fn place(place: Place, width: u32, height: u32, mark_w: u32, mark_h: u32) -> (i64, i64) {
    let edge   = margin(width, height);
    let (w, h) = (i64::from(width), i64::from(height));
    let (mw, mh) = (i64::from(mark_w), i64::from(mark_h));
    let column = match place {
        Place::TopLeft | Place::Left | Place::BottomLeft    => edge,
        Place::Top | Place::Center | Place::Bottom | Place::Mosaic => (w - mw) / 2,
        Place::TopRight | Place::Right | Place::BottomRight => w - mw - edge,
    };
    let row = match place {
        Place::TopLeft | Place::Top | Place::TopRight          => edge,
        Place::Left | Place::Center | Place::Right | Place::Mosaic => (h - mh) / 2,
        Place::BottomLeft | Place::Bottom | Place::BottomRight => h - mh - edge,
    };
    (column, row)
}

// «En mosaico»: the centres of the turned marks, on a grid turned with them (every other row shifted
// half a step), covering the whole photo and a little past its edges.
pub fn mosaic_centers(width: u32, height: u32, mark_w: u32, mark_h: u32) -> Vec<(f64, f64)> {
    let step_x  = f64::from(mark_w) * (1.0 + MOSAIC_GAP_X);
    let step_y  = f64::from(mark_h) * (1.0 + MOSAIC_GAP_Y);
    let (w, h)  = (f64::from(width), f64::from(height));
    let reach   = (w * w + h * h).sqrt() / 2.0 + f64::from(mark_w.max(mark_h));
    let angle   = -MOSAIC_ANGLE.to_radians();
    let (sin, cos) = angle.sin_cos();
    let (cx, cy)   = (w / 2.0, h / 2.0);
    let rows    = (reach / step_y).ceil() as i64;
    let columns = (reach / step_x).ceil() as i64 + 1;

    let mut centers = Vec::new();
    for row in -rows..=rows {
        let shift = if row.rem_euclid(2) == 1 { step_x / 2.0 } else { 0.0 };
        for column in -columns..=columns {
            let (gx, gy) = (column as f64 * step_x + shift, row as f64 * step_y);
            let (x, y)   = (cx + gx * cos - gy * sin, cy + gx * sin + gy * cos);
            let pad      = f64::from(mark_w.max(mark_h));
            if x > -pad && x < w + pad && y > -pad && y < h + pad {
                centers.push((x, y));
            }
        }
    }
    centers
}
