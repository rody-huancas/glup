use std::sync::Mutex;

use tauri::{AppHandle, Emitter, Manager};

use crate::{services::island_window, ISLAND_WINDOW_LABEL};

pub const TRAY_VISIBILITY_EVENT: &str = "island-tray-visibility";
pub const SCREEN_CAPTURE_EVENT: &str  = "island-screen-capture";

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct VisibilityFlags {
    pub user_hidden: bool,
    pub fullscreen: bool,
    // "Copiar texto de la pantalla": the person is choosing a zone over a still of the screen.
    pub capturing: bool,
}

impl VisibilityFlags {
    // The island is hidden only for a fullscreen app, from the tray or while a zone of the screen is chosen.
    pub fn should_show(&self) -> bool {
        !self.user_hidden && !self.fullscreen && !self.capturing
    }
}

#[derive(Default)]
pub struct Visibility(Mutex<VisibilityFlags>);

// "Mostrar/Ocultar Glup": when it shows again it always comes back as a clean, working pill, whatever
// state the webview was in.
pub fn toggle_user_hidden(app: &AppHandle) {
    let flags = update(app, |flags| flags.user_hidden = !flags.user_hidden);
    announce_tray(app, flags);
}

pub fn show_for_user(app: &AppHandle) {
    let was_hidden = snapshot(app).user_hidden;
    let flags      = update(app, |flags| flags.user_hidden = false);

    if was_hidden {
        announce_tray(app, flags);
    }
}

pub fn set_fullscreen(app: &AppHandle, fullscreen: bool) {
    update(app, |flags| flags.fullscreen = fullscreen);
}

// Hidden while the zone is chosen (so it is not in the still); back as a clean pill afterwards.
pub fn set_capturing(app: &AppHandle, capturing: bool) {
    let flags = update(app, |flags| flags.capturing = capturing);

    if flags.should_show() {
        if let Some(window) = app.get_webview_window(ISLAND_WINDOW_LABEL) {
            island_window::recover(&window);
        }
    }

    let _ = app.emit_to(ISLAND_WINDOW_LABEL, SCREEN_CAPTURE_EVENT, capturing);
}

pub fn apply(app: &AppHandle) {
    update(app, |_| {});
}

pub fn snapshot(app: &AppHandle) -> VisibilityFlags {
    app.state::<Visibility>().0.lock().map(|flags| *flags).unwrap_or_default()
}

fn announce_tray(app: &AppHandle, flags: VisibilityFlags) {
    if !flags.user_hidden {
        if let Some(window) = app.get_webview_window(ISLAND_WINDOW_LABEL) {
            island_window::recover(&window);
        }
    }

    let _ = app.emit_to(ISLAND_WINDOW_LABEL, TRAY_VISIBILITY_EVENT, flags.user_hidden);
}

fn update(app: &AppHandle, change: impl FnOnce(&mut VisibilityFlags)) -> VisibilityFlags {
    let state = app.state::<Visibility>();
    let Ok(mut flags) = state.0.lock() else {
        return VisibilityFlags::default();
    };

    change(&mut flags);
    let result = *flags;
    drop(flags);

    if let Some(window) = app.get_webview_window(ISLAND_WINDOW_LABEL) {
        if result.should_show() {
            let _ = window.show();
        } else {
            let _ = window.hide();
        }
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hides_only_for_fullscreen_the_tray_or_a_capture() {
        assert!(VisibilityFlags::default().should_show());
        assert!(!VisibilityFlags { user_hidden: true, ..Default::default() }.should_show());
        assert!(!VisibilityFlags { fullscreen: true, ..Default::default() }.should_show());
        assert!(!VisibilityFlags { capturing: true, ..Default::default() }.should_show());
    }
}
