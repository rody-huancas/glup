use tauri::{AppHandle, Manager, Result, Window, WindowEvent};

use crate::MAIN_WINDOW_LABEL;

pub fn open(app: &AppHandle) -> Result<()> {
    let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) else {
        return Ok(());
    };

    if window.is_minimized()? {
        window.unminimize()?;
    }

    window.show()?;
    window.set_focus()
}

// Closing the main window only hides it; the app keeps living in the island.
pub fn handle_event(window: &Window, event: &WindowEvent) {
    if window.label() != MAIN_WINDOW_LABEL {
        return;
    }

    if let WindowEvent::CloseRequested { api, .. } = event {
        api.prevent_close();
        let _ = window.hide();
    }
}
