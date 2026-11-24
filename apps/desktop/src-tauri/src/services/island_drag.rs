// Dragging the collapsed island to another edge, corner or screen. The webview starts it once the
// pointer moved past its threshold; from then on Rust follows the cursor until the button is released,
// because the window itself moves under the cursor (and may change screen) while it goes.
use std::{
    sync::atomic::{AtomicBool, Ordering},
    thread,
    time::{Duration, Instant},
};

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};

use crate::ISLAND_WINDOW_LABEL;

pub const ISLAND_DRAG_EVENT: &str = "island-drag";

// About 60 updates a second, as smooth as the screen.
const POLL_INTERVAL: Duration = Duration::from_millis(16);
// A button that never comes up (a lost release) does not keep the drag alive forever.
const MAX_DRAG: Duration = Duration::from_secs(120);

#[derive(Default)]
pub struct IslandDrag(AtomicBool);

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
pub struct DragUpdate {
    // The cursor, in physical pixels of the desktop.
    pub x    : i32,
    pub y    : i32,
    // The button came up: this is where it was dropped.
    pub done : bool,
}

#[cfg(windows)]
fn pointer() -> Option<(i32, i32, bool)> {
    use windows_sys::Win32::{
        Foundation::POINT,
        UI::{
            Input::KeyboardAndMouse::{GetAsyncKeyState, VK_LBUTTON},
            WindowsAndMessaging::GetCursorPos,
        },
    };

    unsafe {
        let mut point: POINT = std::mem::zeroed();
        if GetCursorPos(&mut point) == 0 {
            return None;
        }
        // The high bit says the button is down now.
        let pressed = (GetAsyncKeyState(VK_LBUTTON as i32) as u16 & 0x8000) != 0;
        Some((point.x, point.y, pressed))
    }
}

#[cfg(not(windows))]
fn pointer() -> Option<(i32, i32, bool)> {
    None
}

// One drag at a time; a second start while one runs does nothing.
pub fn begin(app: &AppHandle) {
    if app.state::<IslandDrag>().0.swap(true, Ordering::SeqCst) {
        return;
    }

    let app = app.clone();
    thread::spawn(move || {
        let started  = Instant::now();
        let mut last = None;

        loop {
            let Some((x, y, pressed)) = pointer() else { break };
            let done = !pressed || started.elapsed() > MAX_DRAG;

            if done || last != Some((x, y)) {
                last = Some((x, y));
                let _ = app.emit_to(ISLAND_WINDOW_LABEL, ISLAND_DRAG_EVENT, DragUpdate { x, y, done });
            }

            if done {
                break;
            }
            thread::sleep(POLL_INTERVAL);
        }

        // Without a pointer to follow (other systems), the drag ends where it is.
        if last.is_none() {
            let _ = app.emit_to(ISLAND_WINDOW_LABEL, ISLAND_DRAG_EVENT, DragUpdate { x: 0, y: 0, done: true });
        }
        app.state::<IslandDrag>().0.store(false, Ordering::SeqCst);
    });
}
