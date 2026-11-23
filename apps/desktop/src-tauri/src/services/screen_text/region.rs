// The geometry of "Copiar texto de la pantalla", kept pure: where each overlay goes and which pixels of
// the still a zone chosen on it covers. Everything is in physical pixels, the unit of the still.
use serde::{Deserialize, Serialize};

// Zones thinner than this are a click, not a choice.
pub const MIN_SIDE: u32 = 4;

// One monitor as the system reports it: its place on the virtual desktop (it can be negative, left of
// or above the main one) and its scale (1.0, 1.25, 1.5…).
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct MonitorFrame {
    pub x      : i32,
    pub y      : i32,
    pub width  : u32,
    pub height : u32,
    pub scale  : f64,
}

// A zone in pixels of one monitor's still, as the overlay sends it.
#[derive(Clone, Copy, Debug, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ZoneRequest {
    pub x      : f64,
    pub y      : f64,
    pub width  : f64,
    pub height : f64,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
pub struct CropRect {
    pub x      : u32,
    pub y      : u32,
    pub width  : u32,
    pub height : u32,
}

// The overlay of a monitor covers exactly that monitor, in physical pixels: inside one monitor the
// window has its scale, so one pixel of the still is one pixel on screen.
pub fn overlay_frame(monitor: &MonitorFrame) -> (i32, i32, u32, u32) {
    (monitor.x, monitor.y, monitor.width, monitor.height)
}

// The pixels of the still a zone covers: outward to whole pixels (no letter cut in half), clamped to the
// still, and None when what is left is too small to read.
pub fn crop_rect(zone: ZoneRequest, still_width: u32, still_height: u32) -> Option<CropRect> {
    let finite = [zone.x, zone.y, zone.width, zone.height].iter().all(|value| value.is_finite());
    if !finite || zone.width <= 0.0 || zone.height <= 0.0 {
        return None;
    }

    let clamp  = |value: f64, max: u32| value.max(0.0).min(max as f64);
    let left   = clamp(zone.x.floor(), still_width) as u32;
    let top    = clamp(zone.y.floor(), still_height) as u32;
    let right  = clamp((zone.x + zone.width).ceil(), still_width) as u32;
    let bottom = clamp((zone.y + zone.height).ceil(), still_height) as u32;

    if right.saturating_sub(left) < MIN_SIDE || bottom.saturating_sub(top) < MIN_SIDE {
        return None;
    }

    Some(CropRect { x: left, y: top, width: right - left, height: bottom - top })
}

// "Copié 42 palabras": the words of what was read.
pub fn count_words(text: &str) -> u32 {
    text.split_whitespace().count() as u32
}

#[cfg(test)]
mod tests {
    use super::*;

    fn zone(x: f64, y: f64, width: f64, height: f64) -> ZoneRequest {
        ZoneRequest { x, y, width, height }
    }

    #[test]
    fn each_overlay_covers_its_monitor_whatever_the_scale() {
        // Main 1920x1080 at 125 %, a 2560x1440 at 150 % on its left and a 1280x1024 at 100 % above.
        let monitors = [
            MonitorFrame { x: 0, y: 0, width: 1920, height: 1080, scale: 1.25 },
            MonitorFrame { x: -2560, y: 0, width: 2560, height: 1440, scale: 1.5 },
            MonitorFrame { x: 0, y: -1024, width: 1280, height: 1024, scale: 1.0 },
        ];

        assert_eq!(overlay_frame(&monitors[0]), (0, 0, 1920, 1080));
        assert_eq!(overlay_frame(&monitors[1]), (-2560, 0, 2560, 1440));
        assert_eq!(overlay_frame(&monitors[2]), (0, -1024, 1280, 1024));
    }

    #[test]
    fn a_zone_maps_to_the_same_pixels_of_the_still() {
        assert_eq!(crop_rect(zone(125.0, 250.0, 375.0, 62.5), 1920, 1080), Some(CropRect { x: 125, y: 250, width: 375, height: 63 }));
    }

    #[test]
    fn fractions_of_a_pixel_grow_outward() {
        assert_eq!(crop_rect(zone(10.4, 20.6, 100.2, 30.1), 1920, 1080), Some(CropRect { x: 10, y: 20, width: 101, height: 31 }));
    }

    #[test]
    fn a_zone_past_the_edges_is_clamped_to_the_still() {
        assert_eq!(crop_rect(zone(-15.0, 1000.0, 200.0, 300.0), 1920, 1080), Some(CropRect { x: 0, y: 1000, width: 185, height: 80 }));
        assert_eq!(crop_rect(zone(2500.0, 1400.0, 100.0, 100.0), 2560, 1440), Some(CropRect { x: 2500, y: 1400, width: 60, height: 40 }));
    }

    #[test]
    fn a_click_or_a_broken_zone_is_nothing() {
        assert_eq!(crop_rect(zone(100.0, 100.0, 2.0, 50.0), 1920, 1080), None);
        assert_eq!(crop_rect(zone(100.0, 100.0, 0.0, 0.0), 1920, 1080), None);
        assert_eq!(crop_rect(zone(5000.0, 100.0, 50.0, 50.0), 1920, 1080), None);
        assert_eq!(crop_rect(zone(f64::NAN, 100.0, 50.0, 50.0), 1920, 1080), None);
    }

    #[test]
    fn words_are_counted_across_lines() {
        assert_eq!(count_words("Hola mundo\n\nesto  es\tGlup"), 5);
        assert_eq!(count_words("  \n "), 0);
    }
}
