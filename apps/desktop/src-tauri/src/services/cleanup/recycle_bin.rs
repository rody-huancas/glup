use crate::services::cleanup::walk::FileEntry;

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct BinSize {
    pub bytes: u64,
    pub items: u64,
}

// What the recycle bin holds on every drive, as Windows counts it.
#[cfg(windows)]
pub fn size() -> Option<BinSize> {
    use windows_sys::Win32::UI::Shell::{SHQueryRecycleBinW, SHQUERYRBINFO};

    let mut info = SHQUERYRBINFO { cbSize: std::mem::size_of::<SHQUERYRBINFO>() as u32, i64Size: 0, i64NumItems: 0 };
    let result   = unsafe { SHQueryRecycleBinW(std::ptr::null(), &mut info) };

    (result == 0).then_some(BinSize { bytes: info.i64Size.max(0) as u64, items: info.i64NumItems.max(0) as u64 })
}

#[cfg(not(windows))]
pub fn size() -> Option<BinSize> {
    None
}

// Its items, to show them (original place, size, date it was deleted). Emptying is all or nothing.
#[cfg(windows)]
pub fn items() -> Vec<FileEntry> {
    let Ok(list) = trash::os_limited::list() else { return Vec::new() };

    list.into_iter()
        .map(|item| {
            let size = match trash::os_limited::metadata(&item).map(|data| data.size) {
                Ok(trash::TrashItemSize::Bytes(bytes)) => bytes,
                _ => 0,
            };
            let deleted = item.time_deleted.max(0) * 1000;

            FileEntry { path: item.original_path(), size, modified: deleted, created: deleted }
        })
        .collect()
}

// Windows' own "Vaciar papelera", without its confirmation dialog (Glup already asked).
#[cfg(windows)]
pub fn empty() -> bool {
    use windows_sys::Win32::UI::Shell::{SHEmptyRecycleBinW, SHERB_NOCONFIRMATION, SHERB_NOPROGRESSUI, SHERB_NOSOUND};

    unsafe { SHEmptyRecycleBinW(std::ptr::null_mut(), std::ptr::null(), SHERB_NOCONFIRMATION | SHERB_NOPROGRESSUI | SHERB_NOSOUND) == 0 }
}

// Liberar espacio is not there yet off Windows (see platform.rs); macOS has no list of the bin in trash.
#[cfg(not(windows))]
pub fn items() -> Vec<FileEntry> {
    Vec::new()
}

#[cfg(not(windows))]
pub fn empty() -> bool {
    false
}

