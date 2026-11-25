use std::{env, path::PathBuf};

// The user's own folders. Nothing outside them (and the browser caches) is ever looked at.
#[derive(Clone, Debug, Default)]
pub struct UserFolders {
    pub temp: Option<PathBuf>,
    pub local_app_data: Option<PathBuf>,
    pub roaming_app_data: Option<PathBuf>,
    pub downloads: Option<PathBuf>,
    // Downloads, Desktop, Documents and Pictures.
    pub personal: Vec<PathBuf>,
}

fn env_folder(name: &str) -> Option<PathBuf> {
    env::var_os(name).map(PathBuf::from).filter(|path| path.is_dir())
}

#[cfg(windows)]
fn known_folder(id: &windows_sys::core::GUID) -> Option<PathBuf> {
    use std::{ffi::OsString, os::windows::ffi::OsStringExt};

    use windows_sys::Win32::{System::Com::CoTaskMemFree, UI::Shell::{SHGetKnownFolderPath, KF_FLAG_DEFAULT}};

    let mut raw: windows_sys::core::PWSTR = std::ptr::null_mut();

    unsafe {
        let result = SHGetKnownFolderPath(id, KF_FLAG_DEFAULT as u32, std::ptr::null_mut(), &mut raw);
        if result != 0 || raw.is_null() {
            if !raw.is_null() {
                CoTaskMemFree(raw as _);
            }
            return None;
        }

        let length = (0..).take_while(|&index| *raw.add(index) != 0).count();
        let path   = PathBuf::from(OsString::from_wide(std::slice::from_raw_parts(raw, length)));
        CoTaskMemFree(raw as _);

        Some(path).filter(|path| path.is_dir())
    }
}

// "Archivos repetidos" looks by default in Descargas, Documentos, Imágenes, Escritorio and Videos.
#[cfg(windows)]
pub fn duplicate_folders() -> Vec<PathBuf> {
    use windows_sys::Win32::UI::Shell::{FOLDERID_Desktop, FOLDERID_Documents, FOLDERID_Downloads, FOLDERID_Pictures, FOLDERID_Videos};

    [&FOLDERID_Downloads, &FOLDERID_Documents, &FOLDERID_Pictures, &FOLDERID_Desktop, &FOLDERID_Videos].into_iter().filter_map(known_folder).collect()
}

#[cfg(not(windows))]
pub fn duplicate_folders() -> Vec<PathBuf> {
    Vec::new()
}

// Known folders follow the user's choices (moved Documents, OneDrive redirection).
#[cfg(windows)]
pub fn user_folders() -> UserFolders {
    use windows_sys::Win32::UI::Shell::{FOLDERID_Desktop, FOLDERID_Documents, FOLDERID_Downloads, FOLDERID_Pictures};

    let downloads = known_folder(&FOLDERID_Downloads);
    let personal  = [Some(downloads.clone()).flatten(), known_folder(&FOLDERID_Desktop), known_folder(&FOLDERID_Documents), known_folder(&FOLDERID_Pictures)]
        .into_iter()
        .flatten()
        .collect();

    UserFolders {
        temp             : Some(env::temp_dir()).filter(|path| path.is_dir()),
        local_app_data   : env_folder("LOCALAPPDATA"),
        roaming_app_data : env_folder("APPDATA"),
        downloads,
        personal,
    }
}

#[cfg(not(windows))]
pub fn user_folders() -> UserFolders {
    UserFolders { temp: Some(env::temp_dir()), ..UserFolders::default() }
}
