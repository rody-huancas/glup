use std::{thread, time::Duration};

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, WebviewWindow};

use crate::{services::island_window, ISLAND_WINDOW_LABEL};

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

// The zone is the island's visible area, which always matches the current state.
fn zone_contains(window: &WebviewWindow, cursor: CursorPosition) -> bool {
    if !window.is_visible().unwrap_or(false) {
        return false;
    }

    let (Ok(position), Ok(scale), Some(area)) = (window.outer_position(), window.scale_factor(), island_window::current_area(window)) else {
        return false;
    };

    let margin = (ZONE_MARGIN * scale).round() as i32;
    let left   = position.x + area.left - margin;
    let top    = position.y + area.top - margin;
    let right  = position.x + area.right + margin;
    let bottom = position.y + area.bottom + margin;

    cursor.x >= left && cursor.x <= right && cursor.y >= top && cursor.y <= bottom
}

// fn zone_contains(window: &WebviewWindow, cursor: CursorPosition) -> bool {
//     if !window.is_visible().unwrap_or(false) {
//         return false;
//     }
//
//     let (Ok(position), Ok(size), Ok(scale)) = (window.outer_position(), window.outer_size(), window.scale_factor()) else {
//         return false;
//     };
//
//     let margin = (ZONE_MARGIN * scale).round() as i32;
//     let left   = position.x - margin;
//     let top    = position.y - margin;
//     let right  = position.x + size.width as i32 + margin;
//     let bottom = position.y + size.height as i32 + margin;
//
//     cursor.x >= left && cursor.x <= right && cursor.y >= top && cursor.y <= bottom
// }
