use std::{thread, time::Duration};

use tauri::{AppHandle, Emitter};

use crate::services::visibility;

pub const FULLSCREEN_CHANGED_EVENT: &str = "fullscreen-changed";

const POLL_INTERVAL: Duration = Duration::from_millis(500);

pub fn spawn(app: AppHandle) {
    thread::spawn(move || {
        let mut last = false;

        loop {
            let current = is_foreground_fullscreen();

            if current != last {
                last = current;
                visibility::set_fullscreen(&app, current);
                let _ = app.emit(FULLSCREEN_CHANGED_EVENT, current);
            }

            thread::sleep(POLL_INTERVAL);
        }
    });
}

#[cfg(windows)]
fn is_foreground_fullscreen() -> bool {
    use windows_sys::Win32::{
        Foundation::RECT,
        Graphics::Gdi::{GetMonitorInfoW, MonitorFromWindow, MONITORINFO, MONITOR_DEFAULTTONEAREST},
        UI::WindowsAndMessaging::{
            GetClassNameW, GetForegroundWindow, GetWindowRect, GetWindowThreadProcessId,
            MONITORINFOF_PRIMARY,
        },
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
        let mut info: MONITORINFO = std::mem::zeroed();
        info.cbSize               = std::mem::size_of::<MONITORINFO>() as u32;

        if GetMonitorInfoW(monitor, &mut info) == 0 || info.dwFlags & MONITORINFOF_PRIMARY == 0 {
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
fn is_foreground_fullscreen() -> bool {
    false
}
