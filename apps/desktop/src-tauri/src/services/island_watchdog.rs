use std::{thread, time::Duration};

use tauri::{AppHandle, Manager, WebviewWindow};

use crate::{
    services::{island_window, visibility},
    ISLAND_WINDOW_LABEL,
};

const CHECK_INTERVAL: Duration = Duration::from_secs(2);
// A move or resize within this many physical pixels is rounding, not a drift.
const FRAME_TOLERANCE: i32 = 2;

// Every 2 s the real window is checked against what it should be: visible unless a fullscreen app, the
// tray or a capture hides it, the frame of its dock, and the region last asked for. Any difference is
// fixed and logged.
pub fn spawn(app: AppHandle) {
    thread::spawn(move || loop {
        thread::sleep(CHECK_INTERVAL);

        if let Some(window) = app.get_webview_window(ISLAND_WINDOW_LABEL) {
            check(&app, &window);
        }
    });
}

fn close(a: i32, b: i32) -> bool {
    (a - b).abs() <= FRAME_TOLERANCE
}

fn check(app: &AppHandle, window: &WebviewWindow) {
    let should_show = visibility::snapshot(app).should_show();
    let visible     = window.is_visible().unwrap_or(should_show);

    if visible != should_show {
        eprintln!("[glup:vigilante] visibilidad {visible} y debería ser {should_show}: corrijo");
        visibility::apply(app);
        return;
    }

    if !should_show {
        return;
    }

    if let (Some(expected), Ok(position), Ok(size)) = (island_window::expected_frame(window), window.outer_position(), window.outer_size()) {
        let same = close(position.x, expected.position.x)
            && close(position.y, expected.position.y)
            && close(size.width as i32, expected.size.width as i32)
            && close(size.height as i32, expected.size.height as i32);

        if !same {
            eprintln!("[glup:vigilante] marco {}x{} en {},{} y debería ser {}x{} en {},{}: corrijo", size.width, size.height, position.x, position.y, expected.size.width, expected.size.height, expected.position.x, expected.position.y);
            let _ = island_window::reapply_frame(window);
        }
    }

    let clickable = island_window::stored_state(window).is_none_or(|state| state.clickable);
    let expected  = island_window::current_area(window);
    let applied   = island_window::applied_region(window);

    // Hidden at rest the region has to stay empty: nothing of the window takes clicks.
    if !clickable {
        if applied.is_some() {
            eprintln!("[glup:vigilante] región {applied:?} y debería estar vacía (oculta): corrijo");
            let _ = island_window::reapply_area(window);
        }
        return;
    }

    if let Some(expected) = expected {
        if !applied.is_some_and(|applied| island_window::regions_match(applied, expected)) {
            eprintln!("[glup:vigilante] región {applied:?} y debería ser {expected:?}: corrijo");
            let _ = island_window::reapply_area(window);
        }
    }
}
