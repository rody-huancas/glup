// Windows notifications when a task ends and the person is not looking at Glup. A click opens the
// island on the screen that owns the task.
use serde::Deserialize;
use tauri::{AppHandle, Emitter};

#[cfg(windows)]
use tauri::Manager;

use crate::services::settings;

pub const NOTIFICATION_OPEN_EVENT: &str = "notification-open";
pub const NOTIFY_TITLE: &str            = "Glup";

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NotifyRequest {
    // The result line ("Listo · de 2,4 MB a 680 KB").
    pub body : String,
    // The screen to open on a click (home, cleanup…).
    pub page : String,
}

// The app id Windows shows the notification under: the installed app's own one; a dev build has no
// shortcut registered, so it borrows PowerShell's (as tauri-plugin-notification does).
#[cfg(windows)]
pub fn app_id(identifier: &str, debug: bool) -> String {
    if debug { tauri_winrt_notification::Toast::POWERSHELL_APP_ID.to_string() } else { identifier.to_string() }
}

// Glup's icon next to the text, written once to the app data folder (Windows needs a file path).
#[cfg(windows)]
fn icon_path(app: &AppHandle) -> Option<std::path::PathBuf> {
    const ICON: &[u8] = include_bytes!("../../icons/128x128.png");

    let path = app.path().app_data_dir().ok()?.join("notification-icon.png");
    if !path.exists() {
        std::fs::create_dir_all(path.parent()?).ok()?;
        std::fs::write(&path, ICON).ok()?;
    }
    Some(path)
}

fn open_on(app: &AppHandle, page: &str) {
    crate::services::island_window::request_open(app);
    let _ = app.emit_to(crate::ISLAND_WINDOW_LABEL, NOTIFICATION_OPEN_EVENT, page.to_string());
}

// Shows it, unless the person turned them off in Ajustes. True when it was shown (the panel then does
// not repeat it with its own notice).
pub fn notify(app: &AppHandle, request: NotifyRequest) -> bool {
    if settings::read(app).settings.notifications_off {
        return false;
    }
    show(app, request)
}

// Something the person has to fix (the shortcut was taken): shown even with the task notifications off.
pub fn alert(app: &AppHandle, request: NotifyRequest) -> bool {
    show(app, request)
}

#[cfg(windows)]
fn show(app: &AppHandle, request: NotifyRequest) -> bool {
    use tauri_winrt_notification::{IconCrop, Toast};

    let id        = app_id(&app.config().identifier, cfg!(debug_assertions));
    let handle    = app.clone();
    let page      = request.page.clone();
    let mut toast = Toast::new(&id).title(NOTIFY_TITLE).text1(&request.body).on_activated(move |_| {
        open_on(&handle, &page);
        Ok(())
    });

    if let Some(icon) = icon_path(app) {
        toast = toast.icon(&icon, IconCrop::Square, NOTIFY_TITLE);
    }

    toast.show().map_err(|error| eprintln!("[notify] {error}")).is_ok()
}

#[cfg(not(windows))]
fn show(_app: &AppHandle, _request: NotifyRequest) -> bool {
    false
}

// Whether the island is the window in front: with another app there, a task's end deserves a notification.
#[cfg(windows)]
pub fn island_in_front(app: &AppHandle) -> bool {
    use windows_sys::Win32::UI::WindowsAndMessaging::GetForegroundWindow;

    let Some(window) = app.get_webview_window(crate::ISLAND_WINDOW_LABEL) else { return false };
    let Ok(hwnd) = window.hwnd() else { return false };
    unsafe { GetForegroundWindow() as isize == hwnd.0 as isize }
}

#[cfg(not(windows))]
pub fn island_in_front(_app: &AppHandle) -> bool {
    true
}

#[cfg(all(test, windows))]
mod tests {
    use super::*;

    #[test]
    fn an_installed_glup_uses_its_own_app_id() {
        assert_eq!(app_id("dev.glup.desktop", false), "dev.glup.desktop");
        assert_eq!(app_id("dev.glup.desktop", true), tauri_winrt_notification::Toast::POWERSHELL_APP_ID);
    }
}
