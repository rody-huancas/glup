// The processes of the PC as Windows lists them, with what each one uses; the readable name
// and the icon of a program; and closing an app: first as its windows' "X" would, then (only if asked)
// by force. Grouping and what is protected are decided in apps.rs.
use super::apps::ProcessFacts;

#[derive(Clone, Copy, Debug, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub enum CloseOutcome {
    Closed,
    // Its windows were asked to close and it is still there (it may be asking to save).
    StillOpen,
    // It has no window to close: only forcing it would.
    NoWindow,
}

#[cfg(windows)]
mod engine {
    use std::{
        collections::{HashMap, HashSet},
        mem::size_of,
        ptr::null_mut,
        thread,
        time::{Duration, Instant},
    };

    use image::{codecs::png::PngEncoder, ImageEncoder, RgbaImage};
    use windows_sys::{
        Wdk::System::SystemInformation::{NtQuerySystemInformation, SystemProcessInformation},
        Win32::{
            Foundation::{CloseHandle, FILETIME, HANDLE, HWND, LPARAM, STATUS_INFO_LENGTH_MISMATCH, WAIT_TIMEOUT},
            Graphics::Gdi::{CreateCompatibleDC, DeleteDC, DeleteObject, GetDIBits, GetObjectW, BITMAP, BITMAPINFO, BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS},
            Storage::FileSystem::{GetFileVersionInfoSizeW, GetFileVersionInfoW, VerQueryValueW},
            System::{
                Threading::{
                    GetProcessTimes, OpenProcess, QueryFullProcessImageNameW, TerminateProcess, WaitForSingleObject, PROCESS_NAME_WIN32, PROCESS_QUERY_LIMITED_INFORMATION,
                    PROCESS_SYNCHRONIZE, PROCESS_TERMINATE,
                },
                WindowsProgramming::SYSTEM_PROCESS_INFORMATION,
            },
            UI::{
                Shell::{SHGetFileInfoW, SHFILEINFOW, SHGFI_ICON, SHGFI_LARGEICON},
                WindowsAndMessaging::{DestroyIcon, EnumWindows, GetIconInfo, GetWindow, GetWindowThreadProcessId, IsWindowVisible, PostMessageW, GW_OWNER, ICONINFO, WM_CLOSE},
            },
        },
    };

    use super::{CloseOutcome, ProcessFacts};

    const CLOSE_WAIT: Duration = Duration::from_secs(6);
    const CLOSE_STEP: Duration = Duration::from_millis(200);

    fn wide(text: &str) -> Vec<u16> {
        text.encode_utf16().chain(Some(0)).collect()
    }

    fn ticks(time: FILETIME) -> u64 {
        (u64::from(time.dwHighDateTime) << 32) | u64::from(time.dwLowDateTime)
    }

    struct Handle(HANDLE);

    impl Drop for Handle {
        fn drop(&mut self) {
            unsafe { CloseHandle(self.0) };
        }
    }

    fn open(pid: u32, access: u32) -> Option<Handle> {
        let handle = unsafe { OpenProcess(access, 0, pid) };
        (!handle.is_null()).then_some(Handle(handle))
    }

    fn image_path(handle: &Handle) -> Option<String> {
        let mut buffer = vec![0_u16; 1024];
        let mut size   = buffer.len() as u32;
        (unsafe { QueryFullProcessImageNameW(handle.0, PROCESS_NAME_WIN32, buffer.as_mut_ptr(), &mut size) } != 0).then(|| String::from_utf16_lossy(&buffer[..size as usize]))
    }

    // (started, processor time) of a process.
    fn times(handle: &Handle) -> Option<(u64, u64)> {
        let (mut created, mut exited, mut kernel, mut user) = (FILETIME::default(), FILETIME::default(), FILETIME::default(), FILETIME::default());
        (unsafe { GetProcessTimes(handle.0, &mut created, &mut exited, &mut kernel, &mut user) } != 0).then(|| (ticks(created), ticks(kernel) + ticks(user)))
    }

    // Paths are read once per process (its number and when it started say it is the same one).
    #[derive(Default)]
    pub struct PathCache {
        paths   : HashMap<(u32, u64), Option<String>>,
        session : Option<u32>,
        // Kept between readings: Windows' list needs a few MB and asking twice costs twice.
        buffer  : Vec<u64>,
    }

    // The session of Glup, from the last list.
    pub fn own_session(cache: &PathCache) -> u32 {
        cache.session.unwrap_or(u32::MAX)
    }

    fn le_u64(bytes: &[u8]) -> u64 {
        u64::from_le_bytes(bytes[..8].try_into().unwrap_or_default())
    }

    // Every process now, in one call (the one the Task Manager uses): number, parent, session, times
    // and private memory of all of them. Only a process never seen before is opened, for its path.
    pub fn snapshot(cache: &mut PathCache) -> Vec<ProcessFacts> {
        let mut buffer = std::mem::take(&mut cache.buffer);
        if buffer.is_empty() {
            buffer = vec![0; 1024 * 1024 / 8];
        }
        loop {
            let mut needed = 0_u32;
            let bytes      = (buffer.len() * 8) as u32;
            let status     = unsafe { NtQuerySystemInformation(SystemProcessInformation, buffer.as_mut_ptr().cast(), bytes, &mut needed) };
            if status == STATUS_INFO_LENGTH_MISMATCH && buffer.len() < 64 * 1024 * 1024 / 8 {
                // Room for the processes that start meanwhile.
                buffer = vec![0; (needed as usize + 256 * 1024) / 8 + 1];
                continue;
            }
            if status < 0 {
                cache.buffer = buffer;
                return Vec::new();
            }
            break;
        }

        let base      = buffer.as_ptr().cast::<u8>();
        let own       = std::process::id();
        let mut found = Vec::new();
        let mut alive = HashSet::new();
        let mut at    = 0_usize;

        loop {
            let entry: &SYSTEM_PROCESS_INFORMATION = unsafe { &*base.add(at).cast() };
            // Reserved1: private working set (0..8), started (24..32), user (32..40) and kernel time (40..48).
            let reserved = &entry.Reserved1;
            let pid      = entry.UniqueProcessId as usize as u32;
            let created  = le_u64(&reserved[24..32]);
            let name     = if entry.ImageName.Buffer.is_null() {
                if pid == 0 { "Idle".to_string() } else { String::new() }
            } else {
                String::from_utf16_lossy(unsafe { std::slice::from_raw_parts(entry.ImageName.Buffer, usize::from(entry.ImageName.Length) / 2) })
            };
            let exe = cache.paths.entry((pid, created)).or_insert_with(|| open(pid, PROCESS_QUERY_LIMITED_INFORMATION).and_then(|handle| image_path(&handle))).clone();

            if pid == own {
                cache.session = Some(entry.SessionId);
            }
            alive.insert((pid, created));
            found.push(ProcessFacts {
                pid,
                parent   : entry.Reserved2 as usize as u32,
                created,
                cpu_time : le_u64(&reserved[32..40]) + le_u64(&reserved[40..48]),
                memory   : le_u64(&reserved[0..8]),
                exe,
                name,
                session  : entry.SessionId,
            });

            if entry.NextEntryOffset == 0 {
                break;
            }
            at += entry.NextEntryOffset as usize;
        }

        cache.paths.retain(|key, _| alive.contains(key));
        cache.buffer = buffer;
        found
    }

    fn version_string(data: &[u8], key: &str) -> Option<String> {
        // The first language the file lists, then "040904B0" (English, Unicode) as a fallback.
        let mut pointer = null_mut();
        let mut length  = 0_u32;
        let languages   = unsafe { VerQueryValueW(data.as_ptr().cast(), wide(r"\VarFileInfo\Translation").as_ptr(), &mut pointer, &mut length) } != 0 && length >= 4;
        let mut tables  = Vec::new();
        if languages {
            let pair = unsafe { std::slice::from_raw_parts(pointer as *const u16, 2) };
            tables.push(format!("{:04x}{:04x}", pair[0], pair[1]));
        }
        tables.push("040904b0".to_string());

        tables.into_iter().find_map(|table| {
            let mut value  = null_mut();
            let mut length = 0_u32;
            let query      = wide(&format!(r"\StringFileInfo\{table}\{key}"));
            if unsafe { VerQueryValueW(data.as_ptr().cast(), query.as_ptr(), &mut value, &mut length) } == 0 || length == 0 {
                return None;
            }
            let text = String::from_utf16_lossy(unsafe { std::slice::from_raw_parts(value as *const u16, length as usize) });
            let text = text.trim_end_matches('\0').trim().to_string();
            (!text.is_empty()).then_some(text)
        })
    }

    // The name its maker gave it ("Google Chrome", "Visual Studio Code").
    pub fn program_name(path: &str) -> Option<String> {
        let path   = wide(path);
        let size   = unsafe { GetFileVersionInfoSizeW(path.as_ptr(), null_mut()) };
        if size == 0 {
            return None;
        }
        let mut data = vec![0_u8; size as usize];
        if unsafe { GetFileVersionInfoW(path.as_ptr(), 0, size, data.as_mut_ptr().cast()) } == 0 {
            return None;
        }
        version_string(&data, "FileDescription").or_else(|| version_string(&data, "ProductName"))
    }

    // Its icon as Explorer shows it (32 × 32), as a PNG.
    pub fn icon_png(path: &str) -> Option<Vec<u8>> {
        let mut info: SHFILEINFOW = unsafe { std::mem::zeroed() };
        let found = unsafe { SHGetFileInfoW(wide(path).as_ptr(), 0, &mut info, size_of::<SHFILEINFOW>() as u32, SHGFI_ICON | SHGFI_LARGEICON) };
        if found == 0 || info.hIcon.is_null() {
            return None;
        }

        let mut parts: ICONINFO = unsafe { std::mem::zeroed() };
        let read                = unsafe { GetIconInfo(info.hIcon, &mut parts) } != 0;
        let image               = read.then(|| bitmap_rgba(parts.hbmColor)).flatten();
        unsafe {
            if !parts.hbmColor.is_null() {
                DeleteObject(parts.hbmColor);
            }
            if !parts.hbmMask.is_null() {
                DeleteObject(parts.hbmMask);
            }
            DestroyIcon(info.hIcon);
        }

        let image      = image?;
        let mut buffer = Vec::new();
        PngEncoder::new(&mut buffer).write_image(image.as_raw(), image.width(), image.height(), image::ExtendedColorType::Rgba8).ok()?;
        Some(buffer)
    }

    fn bitmap_rgba(bitmap: windows_sys::Win32::Graphics::Gdi::HBITMAP) -> Option<RgbaImage> {
        if bitmap.is_null() {
            return None;
        }
        let mut header: BITMAP = unsafe { std::mem::zeroed() };
        if unsafe { GetObjectW(bitmap, size_of::<BITMAP>() as i32, (&mut header as *mut BITMAP).cast()) } == 0 {
            return None;
        }
        let (width, height) = (header.bmWidth.max(1) as u32, header.bmHeight.unsigned_abs().max(1));

        let mut info: BITMAPINFO = unsafe { std::mem::zeroed() };
        info.bmiHeader = BITMAPINFOHEADER {
            biSize        : size_of::<BITMAPINFOHEADER>() as u32,
            biWidth       : width as i32,
            // Negative: top row first.
            biHeight      : -(height as i32),
            biPlanes      : 1,
            biBitCount    : 32,
            biCompression : BI_RGB,
            ..unsafe { std::mem::zeroed() }
        };
        let mut pixels = vec![0_u8; (width * height * 4) as usize];
        let context    = unsafe { CreateCompatibleDC(null_mut()) };
        let lines      = unsafe { GetDIBits(context, bitmap, 0, height, pixels.as_mut_ptr().cast(), &mut info, DIB_RGB_COLORS) };
        unsafe { DeleteDC(context) };
        if lines == 0 {
            return None;
        }

        // BGRA → RGBA; old icons without alpha are fully opaque.
        let opaque = pixels.chunks_exact(4).all(|pixel| pixel[3] == 0);
        for pixel in pixels.chunks_exact_mut(4) {
            pixel.swap(0, 2);
            if opaque {
                pixel[3] = 255;
            }
        }
        RgbaImage::from_raw(width, height, pixels)
    }

    // Still the same process (its number was not given to a new one since).
    fn still_alive(pid: u32, created: u64) -> bool {
        let Some(handle) = open(pid, PROCESS_QUERY_LIMITED_INFORMATION | PROCESS_SYNCHRONIZE) else { return false };
        times(&handle).is_some_and(|(started, _)| started == created) && unsafe { WaitForSingleObject(handle.0, 0) } == WAIT_TIMEOUT
    }

    struct WindowSearch {
        pids    : HashSet<u32>,
        windows : Vec<HWND>,
    }

    unsafe extern "system" fn collect(window: HWND, data: LPARAM) -> windows_sys::core::BOOL {
        let search  = unsafe { &mut *(data as *mut WindowSearch) };
        let mut pid = 0_u32;
        unsafe { GetWindowThreadProcessId(window, &mut pid) };
        if search.pids.contains(&pid) && unsafe { IsWindowVisible(window) } != 0 && unsafe { GetWindow(window, GW_OWNER) }.is_null() {
            search.windows.push(window);
        }
        1
    }

    // As its windows' "X": each visible main window is asked to close; then it waits a little.
    pub fn close(members: &[(u32, u64)]) -> CloseOutcome {
        let mut search = WindowSearch { pids: members.iter().map(|(pid, _)| *pid).collect(), windows: Vec::new() };
        unsafe { EnumWindows(Some(collect), (&mut search as *mut WindowSearch) as LPARAM) };
        if search.windows.is_empty() {
            return CloseOutcome::NoWindow;
        }

        for window in &search.windows {
            unsafe { PostMessageW(*window, WM_CLOSE, 0, 0) };
        }

        let started = Instant::now();
        while started.elapsed() < CLOSE_WAIT {
            if members.iter().all(|(pid, created)| !still_alive(*pid, *created)) {
                return CloseOutcome::Closed;
            }
            thread::sleep(CLOSE_STEP);
        }
        CloseOutcome::StillOpen
    }

    // By force, only those very processes; true when none is left.
    pub fn force(members: &[(u32, u64)]) -> bool {
        for (pid, created) in members {
            let Some(handle) = open(*pid, PROCESS_TERMINATE | PROCESS_QUERY_LIMITED_INFORMATION) else { continue };
            if times(&handle).is_some_and(|(started, _)| started == *created) {
                unsafe { TerminateProcess(handle.0, 1) };
            }
        }
        thread::sleep(CLOSE_STEP);
        members.iter().all(|(pid, created)| !still_alive(*pid, *created))
    }
}

#[cfg(windows)]
pub use engine::*;

#[cfg(not(windows))]
mod engine {
    use super::{CloseOutcome, ProcessFacts};

    #[derive(Default)]
    pub struct PathCache;

    pub fn own_session(_: &PathCache) -> u32 {
        0
    }

    pub fn snapshot(_: &mut PathCache) -> Vec<ProcessFacts> {
        Vec::new()
    }

    pub fn program_name(_: &str) -> Option<String> {
        None
    }

    pub fn icon_png(_: &str) -> Option<Vec<u8>> {
        None
    }

    pub fn close(_: &[(u32, u64)]) -> CloseOutcome {
        CloseOutcome::NoWindow
    }

    pub fn force(_: &[(u32, u64)]) -> bool {
        false
    }
}

#[cfg(not(windows))]
pub use engine::*;
