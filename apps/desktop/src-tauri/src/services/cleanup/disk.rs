use serde::Serialize;

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiskSpace {
    pub free: u64,
    pub total: u64,
}

// The system disk (where Windows is), free space as the user can use it.
#[cfg(windows)]
pub fn system_disk() -> Option<DiskSpace> {
    use std::{ffi::OsStr, os::windows::ffi::OsStrExt};

    use windows_sys::Win32::Storage::FileSystem::GetDiskFreeSpaceExW;

    let drive = std::env::var("SystemDrive").unwrap_or_else(|_| "C:".to_string());
    let root: Vec<u16> = OsStr::new(&format!("{drive}\\")).encode_wide().chain(Some(0)).collect();

    let (mut free, mut total, mut total_free) = (0u64, 0u64, 0u64);
    let ok = unsafe { GetDiskFreeSpaceExW(root.as_ptr(), &mut free, &mut total, &mut total_free) };

    (ok != 0).then_some(DiskSpace { free, total })
}

#[cfg(not(windows))]
pub fn system_disk() -> Option<DiskSpace> {
    None
}
