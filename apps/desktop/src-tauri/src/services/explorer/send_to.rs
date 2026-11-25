// "Enviar a › Glup": a shortcut in the person's SendTo folder. Windows hands it every selected file at
// once, so it always makes a single selection.
use std::{
    fs,
    path::{Path, PathBuf},
};

pub const SEND_TO_ARG: &str  = "--send-to";
const SHORTCUT_NAME: &str    = "Glup.lnk";
const DESCRIPTION: &str      = "Dárselo a Glup";

// %APPDATA%\Microsoft\Windows\SendTo
pub fn folder() -> Option<PathBuf> {
    std::env::var_os("APPDATA").map(|data| PathBuf::from(data).join(r"Microsoft\Windows\SendTo"))
}

pub fn shortcut_in(folder: &Path) -> PathBuf {
    folder.join(SHORTCUT_NAME)
}

pub struct ShortcutParams<'a> {
    pub path   : &'a Path,
    pub target : &'a Path,
}

#[cfg(windows)]
pub fn write_shortcut(params: ShortcutParams) -> bool {
    use windows::{
        core::{Interface, HSTRING},
        Win32::{
            System::Com::{CoCreateInstance, CoInitializeEx, IPersistFile, CLSCTX_INPROC_SERVER, COINIT_APARTMENTTHREADED},
            UI::Shell::{IShellLinkW, ShellLink},
        },
    };

    if let Some(folder) = params.path.parent() {
        let _ = fs::create_dir_all(folder);
    }

    let write = || -> windows::core::Result<()> {
        // Each thread joins COM once; a second call just says it already did.
        let _ = unsafe { CoInitializeEx(None, COINIT_APARTMENTTHREADED) };
        let link: IShellLinkW = unsafe { CoCreateInstance(&ShellLink, None, CLSCTX_INPROC_SERVER)? };
        unsafe {
            link.SetPath(&HSTRING::from(params.target.as_os_str()))?;
            link.SetArguments(&HSTRING::from(SEND_TO_ARG))?;
            link.SetIconLocation(&HSTRING::from(params.target.as_os_str()), 0)?;
            link.SetDescription(&HSTRING::from(DESCRIPTION))?;
            link.cast::<IPersistFile>()?.Save(&HSTRING::from(params.path.as_os_str()), true)?;
        }
        Ok(())
    };

    write().is_ok()
}

#[cfg(not(windows))]
pub fn write_shortcut(_: ShortcutParams) -> bool {
    false
}

pub fn register(exe: &Path) -> bool {
    folder().is_some_and(|folder| write_shortcut(ShortcutParams { path: &shortcut_in(&folder), target: exe }))
}

pub fn unregister() -> bool {
    folder().is_none_or(|folder| {
        let path = shortcut_in(&folder);
        !path.exists() || fs::remove_file(path).is_ok()
    })
}
