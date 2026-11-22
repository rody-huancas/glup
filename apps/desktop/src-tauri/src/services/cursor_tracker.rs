use std::{thread, time::Duration};

use serde::Serialize;
use tauri::{AppHandle, Emitter};

pub const CURSOR_MOVED_EVENT: &str = "cursor-moved";

const POLL_INTERVAL: Duration = Duration::from_millis(33);

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

        loop {
            let current = read(&app);

            if current.is_some() && current != last {
                last = current;
                let _ = app.emit(CURSOR_MOVED_EVENT, current);
            }

            thread::sleep(POLL_INTERVAL);
        }
    });
}
