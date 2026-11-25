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

// What one reading of the pointer means for the drag: an update to send (or none) and whether it goes on.
// A pointer that cannot be read (the session locked, a secure desktop) ends the drag where it was last
// seen: the island must always hear the drop, or it would stay "being dragged" and never open again.
pub fn drag_step(reading: Option<(i32, i32, bool)>, last: Option<(i32, i32)>, timed_out: bool) -> (Option<DragUpdate>, bool) {
    let Some((x, y, pressed)) = reading else {
        let (x, y) = last.unwrap_or((0, 0));
        return (Some(DragUpdate { x, y, done: true }), false);
    };

    let done = !pressed || timed_out;
    let send = (done || last != Some((x, y))).then_some(DragUpdate { x, y, done });
    (send, !done)
}

pub fn is_dragging(app: &AppHandle) -> bool {
    app.state::<IslandDrag>().0.load(Ordering::SeqCst)
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
            let (update, goes_on) = drag_step(pointer(), last, started.elapsed() > MAX_DRAG);
            if let Some(update) = update {
                last = Some((update.x, update.y));
                let _ = app.emit_to(ISLAND_WINDOW_LABEL, ISLAND_DRAG_EVENT, update);
            }
            if !goes_on {
                break;
            }
            thread::sleep(POLL_INTERVAL);
        }

        app.state::<IslandDrag>().0.store(false, Ordering::SeqCst);
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_drag_follows_the_pointer_and_ends_when_the_button_comes_up() {
        assert_eq!(drag_step(Some((10, 20, true)), None, false), (Some(DragUpdate { x: 10, y: 20, done: false }), true));
        // Not moved: nothing to send.
        assert_eq!(drag_step(Some((10, 20, true)), Some((10, 20)), false), (None, true));
        assert_eq!(drag_step(Some((12, 20, false)), Some((10, 20)), false), (Some(DragUpdate { x: 12, y: 20, done: true }), false));
        // A button that never came up.
        assert_eq!(drag_step(Some((10, 20, true)), Some((10, 20)), true), (Some(DragUpdate { x: 10, y: 20, done: true }), false));
    }

    #[test]
    fn a_pointer_that_cannot_be_read_still_drops_it_where_it_was() {
        assert_eq!(drag_step(None, Some((300, 4)), false), (Some(DragUpdate { x: 300, y: 4, done: true }), false));
        assert_eq!(drag_step(None, None, false), (Some(DragUpdate { x: 0, y: 0, done: true }), false));
    }
}
