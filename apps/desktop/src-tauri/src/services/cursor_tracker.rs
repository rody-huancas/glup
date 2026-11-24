use std::{thread, time::Duration};

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, WebviewWindow};

use crate::{
    services::island_window::{self, AreaRect},
    ISLAND_WINDOW_LABEL,
};

pub const CURSOR_MOVED_EVENT: &str  = "cursor-moved";
pub const ISLAND_ZONE_EVENT: &str   = "island-zone-changed";

const POLL_INTERVAL: Duration = Duration::from_millis(33);
const ZONE_MARGIN: f64        = 8.0;

#[derive(Clone, Copy, PartialEq, Serialize)]
pub struct CursorPosition {
    pub x: i32,
    pub y: i32,
}

pub fn read(app: &AppHandle) -> Option<CursorPosition> {
    let position = app.cursor_position().ok()?;

    Some(CursorPosition {
        x: position.x.round() as i32,
        y: position.y.round() as i32,
    })
}

pub fn spawn(app: AppHandle) {
    thread::spawn(move || {
        let mut last: Option<CursorPosition> = None;
        let mut was_inside                   = false;

        loop {
            let current = read(&app);

            if current.is_some() && current != last {
                last = current;
                let _ = app.emit(CURSOR_MOVED_EVENT, current);
            }

            let inside = match (current, app.get_webview_window(ISLAND_WINDOW_LABEL)) {
                (Some(cursor), Some(window)) => zone_contains(&window, cursor),
                _                            => false,
            };

            if inside != was_inside {
                was_inside = inside;
                let _ = app.emit(ISLAND_ZONE_EVENT, inside);
            }

            thread::sleep(POLL_INTERVAL);
        }
    });
}

pub struct ZoneParams {
    // The window's top-left corner on the desktop and its scale.
    pub window : (i32, i32),
    pub scale  : f64,
    // The island's area in physical pixels of the window (a thin strip at the edge when hidden).
    pub area   : AreaRect,
    pub cursor : CursorPosition,
}

// The cursor is over the island's area, with a small margin around it so the edge of the screen counts:
// hidden at rest, pushing the cursor against that edge is enough.
pub fn zone_hit(params: ZoneParams) -> bool {
    let margin = (ZONE_MARGIN * params.scale).round() as i32;
    let left   = params.window.0 + params.area.left - margin;
    let top    = params.window.1 + params.area.top - margin;
    let right  = params.window.0 + params.area.right + margin;
    let bottom = params.window.1 + params.area.bottom + margin;
    let cursor = params.cursor;

    cursor.x >= left && cursor.x <= right && cursor.y >= top && cursor.y <= bottom
}

// The zone is the island's area, which always matches the current state (the pill, the open panel, or
// hidden at rest the strip where the pill would be).
fn zone_contains(window: &WebviewWindow, cursor: CursorPosition) -> bool {
    if !window.is_visible().unwrap_or(false) {
        return false;
    }

    let (Ok(position), Ok(scale), Some(area)) = (window.outer_position(), window.scale_factor(), island_window::current_area(window)) else {
        return false;
    };

    zone_hit(ZoneParams { window: (position.x, position.y), scale, area, cursor })
}

#[cfg(test)]
mod tests {
    use super::*;

    // A window on top in the middle of a 1920 x 1080 screen, its strip 184 px along and 2 deep.
    fn on_strip(x: i32, y: i32, scale: f64) -> bool {
        let strip = island_window::area_rect(island_window::IslandRect { x: 508.0, y: 0.0, width: 184.0, height: 2.0 }, scale);
        zone_hit(ZoneParams { window: (360, 0), scale, area: strip, cursor: CursorPosition { x, y } })
    }

    #[test]
    fn pushing_the_cursor_against_the_edge_where_the_pill_would_be_reveals_it() {
        assert!(on_strip(960, 0, 1.0));
        assert!(on_strip(960, 9, 1.0));
    }

    #[test]
    fn a_bit_further_in_or_beside_it_does_not() {
        assert!(!on_strip(960, 12, 1.0));
        assert!(!on_strip(500, 0, 1.0));
        assert!(!on_strip(1300, 0, 1.0));
    }

    #[test]
    fn the_margin_grows_with_the_scale() {
        // The same strip at the window's corner, at 100 % and at 150 %.
        let hit = |y: i32, scale: f64| {
            let strip = island_window::area_rect(island_window::IslandRect { x: 0.0, y: 0.0, width: 184.0, height: 2.0 }, scale);
            zone_hit(ZoneParams { window: (0, 0), scale, area: strip, cursor: CursorPosition { x: 90, y } })
        };

        assert!(!hit(12, 1.0));
        assert!(hit(12, 1.5));
    }
}
