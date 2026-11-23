// The text goes to the clipboard from here: the overlay is gone by then and the island never has the
// focus, so the webview could not write it.
use tauri::AppHandle;

pub const CLIPBOARD_ERROR: &str = "No pude copiar el texto";

// Windows wants UTF-16 with a closing zero and \r\n between lines.
pub fn to_clipboard_text(text: &str) -> Vec<u16> {
    text.replace("\r\n", "\n").replace('\n', "\r\n").encode_utf16().chain(std::iter::once(0)).collect()
}

#[cfg(windows)]
pub fn copy(app: &AppHandle, text: &str) -> Result<(), String> {
    use windows_sys::Win32::{
        Foundation::GlobalFree,
        System::{
            DataExchange::{CloseClipboard, EmptyClipboard, OpenClipboard, SetClipboardData},
            Memory::{GlobalAlloc, GlobalLock, GlobalUnlock, GMEM_MOVEABLE},
            Ole::CF_UNICODETEXT,
        },
    };

    use tauri::Manager;

    const OPEN_ATTEMPTS: u32 = 10;

    // With no owner window Windows may refuse the data, so the island's window owns it.
    let owner = app.get_webview_window(crate::ISLAND_WINDOW_LABEL).and_then(|window| window.hwnd().ok()).map_or(std::ptr::null_mut(), |hwnd| hwnd.0 as _);
    let units = to_clipboard_text(text);
    let bytes = units.len() * std::mem::size_of::<u16>();

    unsafe {
        // Another program may be holding the clipboard for a moment.
        let opened = (0..OPEN_ATTEMPTS).any(|attempt| {
            if attempt > 0 {
                std::thread::sleep(std::time::Duration::from_millis(20));
            }
            OpenClipboard(owner) != 0
        });
        if !opened {
            return Err(CLIPBOARD_ERROR.to_string());
        }

        let memory = GlobalAlloc(GMEM_MOVEABLE, bytes);
        let target = if memory.is_null() { std::ptr::null_mut() } else { GlobalLock(memory) };

        if target.is_null() {
            if !memory.is_null() {
                GlobalFree(memory);
            }
            CloseClipboard();
            return Err(CLIPBOARD_ERROR.to_string());
        }

        std::ptr::copy_nonoverlapping(units.as_ptr(), target.cast::<u16>(), units.len());
        GlobalUnlock(memory);
        EmptyClipboard();

        // Once set, the memory belongs to the system; only a failed set has to free it.
        let set = !SetClipboardData(CF_UNICODETEXT as u32, memory).is_null();
        if !set {
            GlobalFree(memory);
        }
        CloseClipboard();

        if set { Ok(()) } else { Err(CLIPBOARD_ERROR.to_string()) }
    }
}

#[cfg(not(windows))]
pub fn copy(_app: &AppHandle, _text: &str) -> Result<(), String> {
    Err(CLIPBOARD_ERROR.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lines_end_in_windows_style_and_the_text_closes_with_a_zero() {
        let expected: Vec<u16> = "a\r\nñ\r\nb".encode_utf16().chain([0]).collect();
        assert_eq!(to_clipboard_text("a\nñ\r\nb"), expected);
    }
}
