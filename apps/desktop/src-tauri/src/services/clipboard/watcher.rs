// Windows tells Glup each time something is copied (AddClipboardFormatListener on a message-only
// window): nothing is checked on a timer. The listener is always there; whether the copy is kept is
// decided by mod.rs (on, not paused, not private, not excluded).
use tauri::AppHandle;

#[cfg(windows)]
mod native {
    use std::sync::OnceLock;

    use tauri::AppHandle;
    use windows_sys::Win32::{
        Foundation::{HWND, LPARAM, LRESULT, WPARAM},
        System::{DataExchange::AddClipboardFormatListener, LibraryLoader::GetModuleHandleW},
        UI::WindowsAndMessaging::{CreateWindowExW, DefWindowProcW, DispatchMessageW, GetMessageW, RegisterClassW, TranslateMessage, HWND_MESSAGE, MSG, WM_CLIPBOARDUPDATE, WNDCLASSW},
    };

    static APP: OnceLock<AppHandle> = OnceLock::new();

    unsafe extern "system" fn window_proc(window: HWND, message: u32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
        if message == WM_CLIPBOARDUPDATE {
            if let Some(app) = APP.get() {
                crate::services::clipboard::on_change(app, window);
            }
            return 0;
        }

        DefWindowProcW(window, message, wparam, lparam)
    }

    pub fn spawn(app: AppHandle) {
        if APP.set(app).is_err() {
            return;
        }

        std::thread::spawn(|| unsafe {
            let class: Vec<u16> = "GlupClipboardWatcher".encode_utf16().chain(std::iter::once(0)).collect();
            let instance        = GetModuleHandleW(std::ptr::null());

            let mut definition: WNDCLASSW = std::mem::zeroed();
            definition.lpfnWndProc        = Some(window_proc);
            definition.hInstance          = instance;
            definition.lpszClassName      = class.as_ptr();
            RegisterClassW(&definition);

            let window = CreateWindowExW(0, class.as_ptr(), std::ptr::null(), 0, 0, 0, 0, 0, HWND_MESSAGE, std::ptr::null_mut(), instance, std::ptr::null());
            if window.is_null() || AddClipboardFormatListener(window) == 0 {
                eprintln!("[clipboard] the listener could not start");
                return;
            }

            let mut message: MSG = std::mem::zeroed();
            while GetMessageW(&mut message, std::ptr::null_mut(), 0, 0) > 0 {
                TranslateMessage(&message);
                DispatchMessageW(&message);
            }
        });
    }
}

#[cfg(windows)]
pub fn spawn(app: AppHandle) {
    native::spawn(app);
}

#[cfg(not(windows))]
pub fn spawn(_app: AppHandle) {}
