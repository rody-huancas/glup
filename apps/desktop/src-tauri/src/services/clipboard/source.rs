// Which program a copy came from: its file (for the exclusions of Ajustes) and the name people know it by
// ("Google Chrome" rather than chrome.exe).
use std::path::Path;

// chrome.exe → "chrome", when the program has no description.
pub fn fallback_name(path: &str) -> Option<String> {
    Path::new(path).file_stem().map(|stem| stem.to_string_lossy().into_owned())
}

#[cfg(windows)]
mod native {
    use std::ffi::c_void;

    use windows_sys::Win32::{
        Foundation::CloseHandle,
        Storage::FileSystem::{GetFileVersionInfoSizeW, GetFileVersionInfoW, VerQueryValueW},
        System::Threading::{OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32, PROCESS_QUERY_LIMITED_INFORMATION},
    };

    use super::fallback_name;

    const PATH_LENGTH: usize = 1024;
    // English (US), Unicode: used when the file does not list its languages.
    const DEFAULT_TRANSLATION: (u16, u16) = (0x0409, 0x04B0);

    fn wide(text: &str) -> Vec<u16> {
        text.encode_utf16().chain(std::iter::once(0)).collect()
    }

    pub fn process_path(pid: u32) -> Option<String> {
        unsafe {
            let process = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
            if process.is_null() {
                return None;
            }

            let mut buffer = vec![0u16; PATH_LENGTH];
            let mut length = buffer.len() as u32;
            let done       = QueryFullProcessImageNameW(process, PROCESS_NAME_WIN32, buffer.as_mut_ptr(), &mut length);
            CloseHandle(process);

            (done != 0).then(|| String::from_utf16_lossy(&buffer[..length as usize]))
        }
    }

    unsafe fn query(data: &[u8], key: &str) -> Option<(*const c_void, u32)> {
        let mut value: *mut c_void = std::ptr::null_mut();
        let mut length             = 0u32;
        let found                  = VerQueryValueW(data.as_ptr().cast(), wide(key).as_ptr(), &mut value, &mut length);
        (found != 0 && !value.is_null() && length > 0).then_some((value as *const c_void, length))
    }

    // The "FileDescription" of the program's version information.
    fn description(path: &str) -> Option<String> {
        unsafe {
            let file = wide(path);
            let size = GetFileVersionInfoSizeW(file.as_ptr(), std::ptr::null_mut());
            if size == 0 {
                return None;
            }

            let mut data = vec![0u8; size as usize];
            if GetFileVersionInfoW(file.as_ptr(), 0, size, data.as_mut_ptr().cast()) == 0 {
                return None;
            }

            let (language, page) = query(&data, "\\VarFileInfo\\Translation")
                .filter(|(_, length)| *length >= 4)
                .map(|(value, _)| (*(value as *const u16), *(value as *const u16).add(1)))
                .unwrap_or(DEFAULT_TRANSLATION);

            let (value, length) = query(&data, &format!("\\StringFileInfo\\{language:04x}{page:04x}\\FileDescription"))?;
            let units           = std::slice::from_raw_parts(value as *const u16, length as usize);
            let text            = String::from_utf16_lossy(units).trim_end_matches('\0').trim().to_string();

            (!text.is_empty()).then_some(text)
        }
    }

    pub fn display_name(path: &str) -> Option<String> {
        description(path).or_else(|| fallback_name(path))
    }
}

#[cfg(windows)]
pub use native::{display_name, process_path};

// Program paths of Windows (C:\…\x.exe): their file name splits on \ only there.
#[cfg(all(test, windows))]
mod tests {
    use super::*;

    #[test]
    fn without_a_description_the_file_name_is_used() {
        assert_eq!(fallback_name(r"C:\Program Files\App\Banco.exe").as_deref(), Some("Banco"));
    }

    #[cfg(windows)]
    #[test]
    fn windows_programs_have_their_own_name() {
        let notepad = std::env::var("WINDIR").map(|folder| format!(r"{folder}\System32\notepad.exe")).unwrap_or_default();
        assert!(display_name(&notepad).is_some_and(|name| !name.is_empty()));
        assert_eq!(process_path(std::process::id()).as_deref().and_then(|path| fallback_name(path)).is_some(), true);
    }
}
