// Glup writes the clipboard from Rust ("Copiar texto de la pantalla", "Copiar de nuevo", the
// Portapapeles): the island rarely has the focus, so the webview could not. The island's window owns
// what it writes, which is also how the watcher knows not to keep Glup's own copies.
use tauri::AppHandle;

pub const CLIPBOARD_ERROR: &str = "No pude copiar el texto";
pub const IMAGE_ERROR: &str     = "No pude copiar la imagen";
// The format that keeps transparency, for the programs that read it.
pub const PNG_FORMAT: &str = "PNG";

// Windows wants UTF-16 with a closing zero and \r\n between lines.
pub fn to_clipboard_text(text: &str) -> Vec<u16> {
    text.replace("\r\n", "\n").replace('\n', "\r\n").encode_utf16().chain(std::iter::once(0)).collect()
}

fn utf16_bytes(units: &[u16]) -> Vec<u8> {
    units.iter().flat_map(|unit| unit.to_le_bytes()).collect()
}

#[cfg(windows)]
mod native {
    use tauri::{AppHandle, Manager};
    use windows_sys::Win32::{
        Foundation::GlobalFree,
        System::{
            DataExchange::{CloseClipboard, EmptyClipboard, OpenClipboard, RegisterClipboardFormatW, SetClipboardData},
            Memory::{GlobalAlloc, GlobalLock, GlobalUnlock, GMEM_MOVEABLE},
        },
    };

    const OPEN_ATTEMPTS: u32 = 10;

    pub fn register_format(name: &str) -> u32 {
        let wide: Vec<u16> = name.encode_utf16().chain(std::iter::once(0)).collect();
        unsafe { RegisterClipboardFormatW(wide.as_ptr()) }
    }

    // Puts every format at once (a text, or an image as DIB and PNG), replacing what was there.
    pub fn set(app: &AppHandle, formats: &[(u32, Vec<u8>)], error: &str) -> Result<(), String> {
        // With no owner window Windows may refuse the data, so the island's window owns it.
        let owner = app.get_webview_window(crate::ISLAND_WINDOW_LABEL).and_then(|window| window.hwnd().ok()).map_or(std::ptr::null_mut(), |hwnd| hwnd.0 as _);

        unsafe {
            // Another program may be holding the clipboard for a moment.
            let opened = (0..OPEN_ATTEMPTS).any(|attempt| {
                if attempt > 0 {
                    std::thread::sleep(std::time::Duration::from_millis(20));
                }
                OpenClipboard(owner) != 0
            });
            if !opened {
                return Err(error.to_string());
            }

            EmptyClipboard();
            let mut all_set = true;

            for (format, data) in formats {
                let memory = GlobalAlloc(GMEM_MOVEABLE, data.len().max(1));
                let target = if memory.is_null() { std::ptr::null_mut() } else { GlobalLock(memory) };

                if target.is_null() {
                    if !memory.is_null() {
                        GlobalFree(memory);
                    }
                    all_set = false;
                    continue;
                }

                std::ptr::copy_nonoverlapping(data.as_ptr(), target.cast::<u8>(), data.len());
                GlobalUnlock(memory);

                // Once set, the memory belongs to the system; only a failed set has to free it.
                if SetClipboardData(*format, memory).is_null() {
                    GlobalFree(memory);
                    all_set = false;
                }
            }

            CloseClipboard();
            if all_set { Ok(()) } else { Err(error.to_string()) }
        }
    }
}

#[cfg(windows)]
pub use native::register_format;

#[cfg(windows)]
pub fn copy_text(app: &AppHandle, text: &str) -> Result<(), String> {
    use windows_sys::Win32::System::Ole::CF_UNICODETEXT;

    native::set(app, &[(CF_UNICODETEXT as u32, utf16_bytes(&to_clipboard_text(text)))], CLIPBOARD_ERROR)
}

// An image kept as PNG goes back as a DIB (every program reads it) and as PNG (keeps transparency).
#[cfg(windows)]
pub fn copy_image(app: &AppHandle, png: &[u8]) -> Result<(), String> {
    use windows_sys::Win32::System::Ole::CF_DIB;

    let image = image::load_from_memory(png).map_err(|_| IMAGE_ERROR.to_string())?.to_rgba8();
    let dib   = crate::services::clipboard::dib::rgba_to_dib(&image);

    native::set(app, &[(CF_DIB as u32, dib), (native::register_format(PNG_FORMAT), png.to_vec())], IMAGE_ERROR)
}

#[cfg(not(windows))]
pub fn copy_text(_app: &AppHandle, _text: &str) -> Result<(), String> {
    Err(CLIPBOARD_ERROR.to_string())
}

#[cfg(not(windows))]
pub fn copy_image(_app: &AppHandle, _png: &[u8]) -> Result<(), String> {
    Err(IMAGE_ERROR.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lines_end_in_windows_style_and_the_text_closes_with_a_zero() {
        let expected: Vec<u16> = "a\r\nñ\r\nb".encode_utf16().chain([0]).collect();
        assert_eq!(to_clipboard_text("a\nñ\r\nb"), expected);
    }

    #[test]
    fn the_text_goes_as_little_endian_bytes() {
        assert_eq!(utf16_bytes(&[0x00F1, 0]), vec![0xF1, 0x00, 0x00, 0x00]);
    }
}
