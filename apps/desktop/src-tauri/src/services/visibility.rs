use std::sync::Mutex;

use tauri::{AppHandle, Emitter, Manager};

use crate::{services::island_window, ISLAND_WINDOW_LABEL};

pub const TRAY_VISIBILITY_EVENT: &str = "island-tray-visibility";

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct VisibilityFlags {
    pub user_hidden: bool,
    pub fullscreen: bool,
}

impl VisibilityFlags {
    // The island is hidden only for a fullscreen app or from the tray.
    pub fn should_show(&self) -> bool {
        !self.user_hidden && !self.fullscreen
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

// Previous version kept the lock while showing or hiding and did not tell the webview about the tray.
// fn update(app: &AppHandle, change: impl FnOnce(&mut VisibilityFlags)) {
//     let state = app.state::<Visibility>();
//     let Ok(mut flags) = state.0.lock() else {
//         return;
//     };
//
//     change(&mut flags);
//
//     let Some(window) = app.get_webview_window(ISLAND_WINDOW_LABEL) else {
//         return;
//     };
//
//     if flags.user_hidden || flags.fullscreen {
//         let _ = window.hide();
//     } else {
//         let _ = window.show();
//     }
// }

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hides_only_for_fullscreen_or_the_tray() {
        assert!(VisibilityFlags::default().should_show());
        assert!(!VisibilityFlags { user_hidden: true, fullscreen: false }.should_show());
        assert!(!VisibilityFlags { user_hidden: false, fullscreen: true }.should_show());
    }
}
