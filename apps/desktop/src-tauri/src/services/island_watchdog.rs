use std::{thread, time::Duration};

use tauri::{AppHandle, Manager, WebviewWindow};

use crate::{
    services::{island_window, visibility},
    ISLAND_WINDOW_LABEL,
};

const CHECK_INTERVAL: Duration = Duration::from_secs(2);

// Every 2 s the real window is checked against what it should be: visible unless a fullscreen app or the
// tray hides it, the startup size, and the region last asked for. Any difference is fixed and logged.
pub fn spawn(app: AppHandle) {
    thread::spawn(move || loop {
        thread::sleep(CHECK_INTERVAL);

        if let Some(window) = app.get_webview_window(ISLAND_WINDOW_LABEL) {
            check(&app, &window);
        }
    });
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

    if let (Some(expected), Ok(actual)) = (island_window::expected_frame(window), window.outer_size()) {
        if expected != actual {
            eprintln!("[glup:vigilante] tamaño {}x{} y debería ser {}x{}: corrijo", actual.width, actual.height, expected.width, expected.height);
            let _ = window.set_size(expected);
            let _ = island_window::center_top(window);
        }
    }

    let expected = island_window::current_area(window);
    let applied  = island_window::applied_region(window);

    if let Some(expected) = expected {
        if !applied.is_some_and(|applied| island_window::regions_match(applied, expected)) {
            eprintln!("[glup:vigilante] región {applied:?} y debería ser {expected:?}: corrijo");
            let _ = island_window::reapply_area(window);
        }
    }
}
