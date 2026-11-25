// Windows tells Glup when something changes in a watched folder (ReadDirectoryChangesW, only its loose
// files, never its subfolders). Nothing checks the folder every so often: each watcher sleeps until
// Windows wakes it or Glup asks it to stop.
use std::{path::PathBuf, sync::mpsc::Sender};

pub enum Signal {
    // Something changed with this file (arrived, grew, renamed, gone).
    Changed(PathBuf),
    // Windows lost count (too many changes at once): the folder is listed again.
    Rescan(PathBuf),
    // The rules changed: which folders to watch.
    Reload,
}

#[cfg(windows)]
mod windows {
    use std::{
        ffi::c_void,
        os::windows::ffi::OsStrExt,
        path::PathBuf,
        ptr,
        sync::mpsc::Sender,
        thread::JoinHandle,
    };

    use windows_sys::Win32::{
        Foundation::{CloseHandle, HANDLE, INVALID_HANDLE_VALUE, WAIT_OBJECT_0},
        Storage::FileSystem::{
            CreateFileW, ReadDirectoryChangesW, FILE_FLAG_BACKUP_SEMANTICS, FILE_FLAG_OVERLAPPED, FILE_LIST_DIRECTORY, FILE_NOTIFY_CHANGE_FILE_NAME, FILE_NOTIFY_CHANGE_LAST_WRITE,
            FILE_NOTIFY_CHANGE_SIZE, FILE_NOTIFY_INFORMATION, FILE_SHARE_DELETE, FILE_SHARE_READ, FILE_SHARE_WRITE, OPEN_EXISTING,
        },
        System::{
            Threading::{CreateEventW, ResetEvent, SetEvent, WaitForMultipleObjects, INFINITE},
            IO::{CancelIoEx, GetOverlappedResult, OVERLAPPED},
        },
    };

    use super::Signal;

    // 64 KB, aligned to 4 bytes as Windows asks.
    const BUFFER_WORDS: usize = 16 * 1024;

    // What the watcher's thread owns: the folder, its events, and the buffer and OVERLAPPED that Windows
    // writes into (on the heap, so they never move while a request is pending).
    struct Listening {
        folder     : HANDLE,
        changed    : HANDLE,
        stop       : HANDLE,
        buffer     : Vec<u32>,
        overlapped : Box<OVERLAPPED>,
    }

    unsafe impl Send for Listening {}

    impl Listening {
        // Asks Windows for the next changes; it keeps them from this call on.
        fn ask(&mut self) -> bool {
            *self.overlapped       = unsafe { std::mem::zeroed() };
            self.overlapped.hEvent  = self.changed;
            unsafe { ResetEvent(self.changed) };
            let filter = FILE_NOTIFY_CHANGE_FILE_NAME | FILE_NOTIFY_CHANGE_SIZE | FILE_NOTIFY_CHANGE_LAST_WRITE;
            unsafe { ReadDirectoryChangesW(self.folder, self.buffer.as_mut_ptr() as *mut c_void, (self.buffer.len() * 4) as u32, 0, filter, ptr::null_mut(), &mut *self.overlapped, None) != 0 }
        }

        fn close(&self) {
            unsafe {
                CloseHandle(self.folder);
                CloseHandle(self.changed);
            }
        }
    }

    pub struct Watcher {
        stop   : isize,
        thread : Option<JoinHandle<()>>,
    }

    impl Drop for Watcher {
        fn drop(&mut self) {
            unsafe { SetEvent(self.stop as HANDLE) };
            if let Some(thread) = self.thread.take() {
                let _ = thread.join();
            }
            unsafe { CloseHandle(self.stop as HANDLE) };
        }
    }

    pub fn watch(folder: PathBuf, signals: Sender<Signal>) -> Option<Watcher> {
        let wide: Vec<u16> = folder.as_os_str().encode_wide().chain(Some(0)).collect();
        let handle = unsafe {
            CreateFileW(wide.as_ptr(), FILE_LIST_DIRECTORY, FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE, ptr::null(), OPEN_EXISTING, FILE_FLAG_BACKUP_SEMANTICS | FILE_FLAG_OVERLAPPED, ptr::null_mut())
        };
        if handle == INVALID_HANDLE_VALUE {
            return None;
        }
        let changed       = unsafe { CreateEventW(ptr::null(), 1, 0, ptr::null()) };
        let stop          = unsafe { CreateEventW(ptr::null(), 1, 0, ptr::null()) };
        let mut listening = Listening { folder: handle, changed, stop, buffer: vec![0u32; BUFFER_WORDS], overlapped: Box::new(unsafe { std::mem::zeroed() }) };

        // The first request before returning: what arrives from now on is not lost.
        if !listening.ask() {
            listening.close();
            unsafe { CloseHandle(stop) };
            return None;
        }
        let thread = std::thread::spawn(move || listen(listening, folder, signals));
        Some(Watcher { stop: stop as isize, thread: Some(thread) })
    }

    fn listen(mut listening: Listening, folder: PathBuf, signals: Sender<Signal>) {
        loop {
            let waiting   = [listening.changed, listening.stop];
            let woke      = unsafe { WaitForMultipleObjects(2, waiting.as_ptr(), 0, INFINITE) };
            let mut bytes = 0u32;
            if woke != WAIT_OBJECT_0 {
                unsafe {
                    CancelIoEx(listening.folder, &*listening.overlapped);
                    GetOverlappedResult(listening.folder, &*listening.overlapped, &mut bytes, 1);
                }
                break;
            }
            if unsafe { GetOverlappedResult(listening.folder, &*listening.overlapped, &mut bytes, 0) } == 0 {
                break;
            }

            let sent = if bytes == 0 {
                signals.send(Signal::Rescan(folder.clone())).is_ok()
            } else {
                names(&listening.buffer, bytes as usize).into_iter().all(|name| signals.send(Signal::Changed(folder.join(name))).is_ok())
            };
            if !sent || !listening.ask() {
                break;
            }
        }
        listening.close();
    }

    // The names in Windows' list of changes (one after another, each saying where the next starts).
    fn names(buffer: &[u32], bytes: usize) -> Vec<String> {
        let base      = buffer.as_ptr() as *const u8;
        let mut found = Vec::new();
        let mut at    = 0usize;

        while at + std::mem::size_of::<FILE_NOTIFY_INFORMATION>() <= bytes {
            let entry  = unsafe { &*(base.add(at) as *const FILE_NOTIFY_INFORMATION) };
            let length = entry.FileNameLength as usize / 2;
            let name   = unsafe { std::slice::from_raw_parts(entry.FileName.as_ptr(), length) };
            found.push(String::from_utf16_lossy(name));
            if entry.NextEntryOffset == 0 {
                break;
            }
            at += entry.NextEntryOffset as usize;
        }
        found
    }
}

#[cfg(windows)]
pub use windows::Watcher;

#[cfg(windows)]
pub fn watch(folder: PathBuf, signals: Sender<Signal>) -> Option<Watcher> {
    windows::watch(folder, signals)
}

// Elsewhere Glup does not watch folders (only Windows is supported).
#[cfg(not(windows))]
pub struct Watcher;

#[cfg(not(windows))]
pub fn watch(_folder: PathBuf, _signals: Sender<Signal>) -> Option<Watcher> {
    None
}
