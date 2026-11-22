use std::sync::Mutex;

use serde::Serialize;
use tauri::{menu::CheckMenuItem, AppHandle, Emitter, Manager, Wry};
use tauri_plugin_autostart::ManagerExt;

// Passed by Windows when Glup starts with the computer: it then stays as the quiet pill.
pub const AUTOSTART_ARG: &str           = "--autostart";
pub const AUTOSTART_CHANGED_EVENT: &str = "autostart-changed";
pub const AUTOSTART_ERROR: &str         = "No pude cambiar el inicio automático";

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchInfo {
    pub autostart: bool,
}

// The tray's "Abrir al encender la computadora", kept in sync with Ajustes.
#[derive(Default)]
pub struct TrayAutostart(pub Mutex<Option<CheckMenuItem<Wry>>>);

pub fn launched_by_autostart<I: IntoIterator<Item = String>>(args: I) -> bool {
    args.into_iter().any(|arg| arg == AUTOSTART_ARG)
}

pub fn launch_info() -> LaunchInfo {
    LaunchInfo { autostart: launched_by_autostart(std::env::args()) }
}

// What Windows really has, not what was saved.
pub fn is_enabled(app: &AppHandle) -> bool {
    app.autolaunch().is_enabled().unwrap_or(false)
}

fn sync(app: &AppHandle, enabled: bool) {
    if let Some(item) = app.state::<TrayAutostart>().0.lock().ok().and_then(|item| item.clone()) {
        let _ = item.set_checked(enabled);
    }

    let _ = app.emit(AUTOSTART_CHANGED_EVENT, enabled);
}

// Turns it on or off and tells the tray and the panel the real state afterwards.
pub fn set_enabled(app: &AppHandle, enabled: bool) -> Result<bool, String> {
    let manager = app.autolaunch();
    let result  = if enabled { manager.enable() } else { manager.disable() };
    let now     = is_enabled(app);

    sync(app, now);
    result.map(|_| now).map_err(|_| AUTOSTART_ERROR.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn recognizes_the_autostart_launch() {
        let args = |list: &[&str]| list.iter().map(|arg| arg.to_string()).collect::<Vec<_>>();

        assert!(launched_by_autostart(args(&["glup.exe", "--autostart"])));
        assert!(!launched_by_autostart(args(&["glup.exe"])));
    }
}
