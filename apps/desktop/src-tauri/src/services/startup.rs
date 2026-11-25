use std::sync::{
    atomic::{AtomicBool, Ordering},
    Mutex,
};

use serde::Serialize;
use tauri::{menu::CheckMenuItem, AppHandle, Emitter, Manager, Wry};
use tauri_plugin_autostart::ManagerExt;

use crate::services::{explorer, island_window};

// Passed by Windows when Glup starts with the computer: it then stays as the quiet pill.
pub const AUTOSTART_ARG: &str           = "--autostart";
pub const AUTOSTART_CHANGED_EVENT: &str = "autostart-changed";
pub const AUTOSTART_ERROR: &str         = "No pude cambiar el inicio automático";
// In development the open on launch is off (every Rust rebuild restarts the process); this turns it on.
pub const LAUNCH_OPEN_VAR: &str         = "GLUP_LAUNCH_OPEN";

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchInfo {
    pub autostart: bool,
}

// The tray's "Abrir al encender la computadora", kept in sync with Ajustes.
#[derive(Default)]
pub struct TrayAutostart(pub Mutex<Option<CheckMenuItem<Wry>>>);

// Whether this process still owes the "opened by hand" expand. Decided once in Rust at start: the
// webview can reload (Vite in dev, a WebView2 recovery) and must never take that for a new launch.
pub struct LaunchOpen(AtomicBool);

impl LaunchOpen {
    pub fn new(pending: bool) -> Self {
        LaunchOpen(AtomicBool::new(pending))
    }

    // True only the first time it is asked.
    pub fn take(&self) -> bool {
        self.0.swap(false, Ordering::SeqCst)
    }
}

pub struct LaunchOpenParams {
    // Started by Windows at startup, or by the Explorer with files (the panel decides whether to open).
    pub autostart: bool,
    // A development build (debug_assertions).
    pub debug: bool,
    // GLUP_LAUNCH_OPEN=1, to try the open on launch in development on purpose.
    pub forced: bool,
}

// Opened by hand expands the island, except by Windows at startup and, in development, unless forced.
pub fn opens_on_launch(params: LaunchOpenParams) -> bool {
    !params.autostart && (!params.debug || params.forced)
}

pub fn launch_open_pending() -> bool {
    opens_on_launch(LaunchOpenParams {
        autostart : launch_info().autostart || explorer::parse_args(&std::env::args().collect::<Vec<_>>()).is_some(),
        debug     : cfg!(debug_assertions),
        forced    : std::env::var(LAUNCH_OPEN_VAR).is_ok_and(|value| value == "1"),
    })
}

pub fn launched_by_autostart<I: IntoIterator<Item = String>>(args: I) -> bool {
    args.into_iter().any(|arg| arg == AUTOSTART_ARG)
}

pub fn launch_info() -> LaunchInfo {
    LaunchInfo { autostart: launched_by_autostart(std::env::args()) }
}

// Someone tried to open a second Glup: the running one shows its island. A second launch by Windows at
// startup is not someone asking for it; one from the Explorer brings files (gathered, see explorer).
pub fn second_launch(app: &AppHandle, args: Vec<String>) {
    if explorer::receive(app, &args) {
        return;
    }
    if launched_by_autostart(args) {
        return;
    }

    #[cfg(debug_assertions)]
    eprintln!("[glup:isla] abrir fijada: se intentó abrir otro Glup");
    island_window::request_open(app);
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
    fn launch_open_is_taken_only_once() {
        let launch = LaunchOpen::new(true);

        assert!(launch.take());
        assert!(!launch.take());
        assert!(!LaunchOpen::new(false).take());
    }

    #[test]
    fn opens_on_launch_only_by_hand_and_in_development_only_when_forced() {
        let open = |autostart, debug, forced| opens_on_launch(LaunchOpenParams { autostart, debug, forced });

        assert!(open(false, false, false));
        assert!(!open(true, false, false));
        assert!(!open(false, true, false));
        assert!(open(false, true, true));
        assert!(!open(true, true, true));
    }

    #[test]
    fn recognizes_the_autostart_launch() {
        let args = |list: &[&str]| list.iter().map(|arg| arg.to_string()).collect::<Vec<_>>();

        assert!(launched_by_autostart(args(&["glup.exe", "--autostart"])));
        assert!(!launched_by_autostart(args(&["glup.exe"])));
    }
}
