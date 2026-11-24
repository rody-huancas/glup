use std::{thread, time::Duration};

use tauri::{AppHandle, Emitter};

use crate::services::visibility;

pub const FULLSCREEN_CHANGED_EVENT: &str = "fullscreen-changed";

const POLL_INTERVAL: Duration = Duration::from_millis(500);

pub fn spawn(app: AppHandle) {
    thread::spawn(move || {
        let mut last = false;

        loop {
            let current = is_foreground_fullscreen(&app);

            if current != last {
                last = current;
                visibility::set_fullscreen(&app, current);
                let _ = app.emit(FULLSCREEN_CHANGED_EVENT, current);
            }

            thread::sleep(POLL_INTERVAL);
        }
    });
}

// A fullscreen app on the island's own screen (wherever it is docked) hides it; on another, it does not.
#[cfg(windows)]
fn is_foreground_fullscreen(app: &AppHandle) -> bool {
    use tauri::Manager;
    use windows_sys::Win32::{
        Foundation::RECT,
        Graphics::Gdi::{GetMonitorInfoW, MonitorFromWindow, MONITORINFO, MONITOR_DEFAULTTONEAREST, MONITOR_DEFAULTTOPRIMARY},
        UI::WindowsAndMessaging::{GetClassNameW, GetForegroundWindow, GetWindowRect, GetWindowThreadProcessId},
    };

    let Some(island) = app.get_webview_window(crate::ISLAND_WINDOW_LABEL).and_then(|window| window.hwnd().ok()) else {
        return false;
    };

    const IGNORED_CLASSES: [&str; 4] = ["Progman", "WorkerW", "Shell_TrayWnd", "Shell_SecondaryTrayWnd"];

    unsafe {
        let window = GetForegroundWindow();

        if window.is_null() {
            return false;
        }

        let mut process_id = 0;
        GetWindowThreadProcessId(window, &mut process_id);

        if process_id == std::process::id() {
            return false;
        }

        let mut class_buffer = [0u16; 256];
        let class_length     = GetClassNameW(window, class_buffer.as_mut_ptr(), class_buffer.len() as i32);
        let class_name       = String::from_utf16_lossy(&class_buffer[..class_length.max(0) as usize]);

        if IGNORED_CLASSES.contains(&class_name.as_str()) {
            return false;
        }

        let mut rect: RECT = std::mem::zeroed();

        if GetWindowRect(window, &mut rect) == 0 {
            return false;
        }

        let monitor               = MonitorFromWindow(window, MONITOR_DEFAULTTONEAREST);
        let island_monitor        = MonitorFromWindow(island.0 as _, MONITOR_DEFAULTTOPRIMARY);
        let mut info: MONITORINFO = std::mem::zeroed();
        info.cbSize               = std::mem::size_of::<MONITORINFO>() as u32;

        if monitor != island_monitor || GetMonitorInfoW(monitor, &mut info) == 0 {
            return false;
        }

        let screen = info.rcMonitor;

        rect.left <= screen.left
            && rect.top <= screen.top
            && rect.right >= screen.right
            && rect.bottom >= screen.bottom
    }
}

#[cfg(not(windows))]
fn is_foreground_fullscreen(_app: &AppHandle) -> bool {
    false
}
