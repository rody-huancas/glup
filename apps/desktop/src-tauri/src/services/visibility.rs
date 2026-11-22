use std::sync::Mutex;

use tauri::{AppHandle, Manager};

use crate::MAIN_WINDOW_LABEL;

#[derive(Default)]
struct VisibilityFlags {
    user_hidden: bool,
    fullscreen: bool,
}

#[derive(Default)]
pub struct Visibility(Mutex<VisibilityFlags>);

pub fn toggle_user_hidden(app: &AppHandle) {
    update(app, |flags| flags.user_hidden = !flags.user_hidden);
}

pub fn set_fullscreen(app: &AppHandle, fullscreen: bool) {
    update(app, |flags| flags.fullscreen = fullscreen);
}

pub fn apply(app: &AppHandle) {
    update(app, |_| {});
}

fn update(app: &AppHandle, change: impl FnOnce(&mut VisibilityFlags)) {
    let state = app.state::<Visibility>();
    let Ok(mut flags) = state.0.lock() else {
        return;
    };

    change(&mut flags);

    let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) else {
        return;
    };

    if flags.user_hidden || flags.fullscreen {
        let _ = window.hide();
    } else {
        let _ = window.show();
    }
}
