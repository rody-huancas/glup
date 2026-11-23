// Reads what was just copied. The privacy marks and the program come first: when the copy must not be
// kept, its content is never read.
use image::RgbaImage;

use crate::services::clipboard::privacy::PrivacyMarks;

pub enum ClipContent {
    Text(String),
    Image(RgbaImage),
}

// Who copied it, as the filter of mod.rs needs it.
pub struct ClipOrigin<'a> {
    pub marks : PrivacyMarks,
    pub pid   : Option<u32>,
    pub path  : Option<&'a str>,
}

pub struct ClipRead {
    pub path    : Option<String>,
    pub content : ClipContent,
}

#[cfg(windows)]
mod native {
    use windows_sys::Win32::{
        Foundation::HWND,
        System::{
            DataExchange::{CloseClipboard, GetClipboardData, GetClipboardOwner, IsClipboardFormatAvailable, OpenClipboard},
            Memory::{GlobalLock, GlobalSize, GlobalUnlock},
            Ole::{CF_DIB, CF_UNICODETEXT},
        },
        UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowThreadProcessId},
    };

    use super::{ClipContent, ClipOrigin, ClipRead};
    use crate::services::clipboard::{
        dib::{dib_size, dib_to_rgba, fits},
        privacy::{PrivacyMarks, CLOUD_FORMAT, EXCLUDE_FORMAT, HISTORY_FORMAT},
        source::process_path,
        write::{register_format, PNG_FORMAT},
    };

    const OPEN_ATTEMPTS: u32 = 10;

    // The bytes of one format, copied out while the clipboard is open.
    unsafe fn bytes_of(format: u32) -> Option<Vec<u8>> {
        let handle = GetClipboardData(format);
        if handle.is_null() {
            return None;
        }

        let size = GlobalSize(handle);
        let data = GlobalLock(handle);
        if data.is_null() {
            return None;
        }

        let bytes = std::slice::from_raw_parts(data.cast::<u8>(), size).to_vec();
        GlobalUnlock(handle);
        Some(bytes)
    }

    unsafe fn dword_of(format: u32) -> Option<u32> {
        let bytes = bytes_of(format)?;
        bytes.get(..4).map(|value| u32::from_le_bytes([value[0], value[1], value[2], value[3]]))
    }

    unsafe fn marks() -> PrivacyMarks {
        let [exclude, history, cloud] = [EXCLUDE_FORMAT, HISTORY_FORMAT, CLOUD_FORMAT].map(register_format);
        let present                   = |format: u32| IsClipboardFormatAvailable(format) != 0;

        PrivacyMarks {
            exclude : present(exclude),
            history : present(history).then(|| dword_of(history)).flatten(),
            cloud   : present(cloud).then(|| dword_of(cloud)).flatten(),
        }
    }

    // The owner window says who copied; some programs leave none, then the window in front did.
    unsafe fn owner_pid() -> Option<u32> {
        let owner  = GetClipboardOwner();
        let window = if owner.is_null() { GetForegroundWindow() } else { owner };
        if window.is_null() {
            return None;
        }

        let mut pid = 0u32;
        GetWindowThreadProcessId(window, &mut pid);
        (pid != 0).then_some(pid)
    }

    unsafe fn text() -> Option<String> {
        if IsClipboardFormatAvailable(CF_UNICODETEXT as u32) == 0 {
            return None;
        }

        let bytes           = bytes_of(CF_UNICODETEXT as u32)?;
        let units: Vec<u16> = bytes.chunks_exact(2).map(|pair| u16::from_le_bytes([pair[0], pair[1]])).take_while(|unit| *unit != 0).collect();
        Some(String::from_utf16_lossy(&units).replace("\r\n", "\n"))
    }

    // PNG first (it keeps transparency), then the DIB every program puts. Too big: skipped before decoding.
    unsafe fn picture() -> Option<image::RgbaImage> {
        let png = register_format(PNG_FORMAT);

        if IsClipboardFormatAvailable(png) != 0 {
            if let Some(image) = bytes_of(png).and_then(|bytes| image::load_from_memory(&bytes).ok()).map(|image| image.to_rgba8()) {
                return fits(image.width(), image.height()).then_some(image);
            }
        }

        if IsClipboardFormatAvailable(CF_DIB as u32) == 0 {
            return None;
        }

        let bytes           = bytes_of(CF_DIB as u32)?;
        let (width, height) = dib_size(&bytes)?;
        if !fits(width, height) {
            return None;
        }
        dib_to_rgba(&bytes)
    }

    pub fn read(window: HWND, allow: &dyn Fn(&ClipOrigin) -> bool) -> Option<ClipRead> {
        unsafe {
            let opened = (0..OPEN_ATTEMPTS).any(|attempt| {
                if attempt > 0 {
                    std::thread::sleep(std::time::Duration::from_millis(20));
                }
                OpenClipboard(window) != 0
            });
            if !opened {
                return None;
            }

            let pid    = owner_pid();
            let path   = pid.and_then(process_path);
            let origin = ClipOrigin { marks: marks(), pid, path: path.as_deref() };

            let content = if allow(&origin) { text().map(ClipContent::Text).or_else(|| picture().map(ClipContent::Image)) } else { None };
            CloseClipboard();

            content.map(|content| ClipRead { path, content })
        }
    }
}

#[cfg(windows)]
pub use native::read;
