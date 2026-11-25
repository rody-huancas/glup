// A development build (target\debug\glup.exe) writes nothing outside itself: not the start with
// Windows, not the right click, not "Enviar a". Otherwise Windows and the Explorer would keep launching
// that build (a console every time) long after `pnpm dev` stopped. GLUP_DEV_SHELL=1 allows it, to try
// them on purpose. Whatever an earlier development build left pointing at target\debug is removed.
use std::{fs, path::Path};

use crate::services::{
    explorer::{menu, send_to},
    registry::{self, Root},
};

pub const DEV_SHELL_VAR: &str = "GLUP_DEV_SHELL";
const RUN_KEY: &str           = r"Software\Microsoft\Windows\CurrentVersion\Run";
const APPROVED_KEY: &str      = r"Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run";
const APP_NAME: &str          = "Glup";
const DEV_FOLDER: &str        = r"\target\debug\";

// Glup may write its entries outside itself: always in a real install, in development only if asked.
pub fn shell_allowed() -> bool {
    shell_allowed_with(cfg!(debug_assertions), std::env::var(DEV_SHELL_VAR).ok().as_deref())
}

pub fn shell_allowed_with(debug: bool, variable: Option<&str>) -> bool {
    !debug || variable == Some("1")
}

// A command line, an icon or a path of a development build.
pub fn is_dev_path(text: &str) -> bool {
    text.to_lowercase().replace('/', "\\").contains(DEV_FOLDER)
}

// A shortcut (.lnk) that opens a development build: its path is in it as text, ANSI or UTF-16.
pub fn shortcut_is_dev(bytes: &[u8]) -> bool {
    let ansi: String  = bytes.iter().map(|byte| *byte as char).collect();
    let units: Vec<u16> = bytes.chunks_exact(2).map(|pair| u16::from_le_bytes([pair[0], pair[1]])).collect();
    let wide          = String::from_utf16_lossy(&units);
    // Also shifted by one byte, in case the UTF-16 text starts on an odd offset.
    let shifted: Vec<u16> = bytes.get(1..).unwrap_or_default().chunks_exact(2).map(|pair| u16::from_le_bytes([pair[0], pair[1]])).collect();
    is_dev_path(&ansi) || is_dev_path(&wide) || is_dev_path(&String::from_utf16_lossy(&shifted))
}

pub struct CleanKeys<'a> {
    pub run      : &'a str,
    pub approved : &'a str,
    pub classes  : &'a str,
    // The folder "Enviar a" (None: nothing to check).
    pub send_to  : Option<&'a Path>,
}

// What was taken out: the start with Windows, the right click, "Enviar a".
#[derive(Debug, Default, PartialEq, Eq)]
pub struct Cleaned {
    pub autostart : bool,
    pub menu      : bool,
    pub send_to   : bool,
}

// Removes only the entries that open a development build; those of an installed Glup stay.
pub fn clean_dev_entries(keys: CleanKeys) -> Cleaned {
    let mut cleaned = Cleaned::default();

    let run = registry::values(Root::User, keys.run).into_iter().find(|value| value.name == APP_NAME);
    if run.and_then(|value| value.text).is_some_and(|text| is_dev_path(&text)) {
        cleaned.autostart = registry::delete_value(Root::User, keys.run, APP_NAME);
        registry::delete_value(Root::User, keys.approved, APP_NAME);
    }

    let icon = registry::values(Root::User, &menu::menu_root(keys.classes, "pdf")).into_iter().find(|value| value.name == "Icon");
    if icon.and_then(|value| value.text).is_some_and(|text| is_dev_path(&text)) {
        cleaned.menu = menu::unregister(keys.classes);
    }

    if let Some(folder) = keys.send_to {
        let shortcut = send_to::shortcut_in(folder);
        if fs::read(&shortcut).is_ok_and(|bytes| shortcut_is_dev(&bytes)) {
            cleaned.send_to = fs::remove_file(&shortcut).is_ok();
        }
    }
    cleaned
}

// At the start of a development build that may not write them: what an earlier one left, out.
pub fn clean_on_start() {
    if shell_allowed() {
        return;
    }
    let folder  = send_to::folder();
    let cleaned = clean_dev_entries(CleanKeys { run: RUN_KEY, approved: APPROVED_KEY, classes: menu::CLASSES, send_to: folder.as_deref() });
    eprintln!("[glup:desarrollo] sin entradas fuera de la app ({DEV_SHELL_VAR}=1 para probarlas); quité: inicio con Windows {}, clic derecho {}, Enviar a {}", cleaned.autostart, cleaned.menu, cleaned.send_to);
}

// The executable is a windowed program (no console of its own, so the Explorer and the start with
// Windows never flash one). Started from a terminal in development, its logs go to that terminal: the
// handles `cargo run` gives it, or the terminal's console it attaches to when it gave none.
#[cfg(all(windows, debug_assertions))]
pub fn attach_console() {
    use windows_sys::Win32::{
        Foundation::{GENERIC_READ, GENERIC_WRITE, INVALID_HANDLE_VALUE},
        Storage::FileSystem::{CreateFileW, FILE_SHARE_READ, FILE_SHARE_WRITE, OPEN_EXISTING},
        System::Console::{AttachConsole, GetStdHandle, SetStdHandle, ATTACH_PARENT_PROCESS, STD_ERROR_HANDLE, STD_OUTPUT_HANDLE},
    };

    unsafe {
        let current = GetStdHandle(STD_ERROR_HANDLE);
        if !current.is_null() && current != INVALID_HANDLE_VALUE {
            return;
        }
        if AttachConsole(ATTACH_PARENT_PROCESS) == 0 {
            return;
        }
        let name: Vec<u16> = "CONOUT$".encode_utf16().chain(Some(0)).collect();
        let output         = CreateFileW(name.as_ptr(), GENERIC_READ | GENERIC_WRITE, FILE_SHARE_READ | FILE_SHARE_WRITE, std::ptr::null(), OPEN_EXISTING, 0, std::ptr::null_mut());
        if output != INVALID_HANDLE_VALUE {
            SetStdHandle(STD_OUTPUT_HANDLE, output);
            SetStdHandle(STD_ERROR_HANDLE, output);
        }
    }
}

#[cfg(not(all(windows, debug_assertions)))]
pub fn attach_console() {}

// A launch from the Explorer only passes its files to the Glup already open, which then has to come
// to the front: this process (started by the Explorer, in front) lets it.
#[cfg(windows)]
pub fn let_glup_come_forward() {
    use windows_sys::Win32::UI::WindowsAndMessaging::{AllowSetForegroundWindow, ASFW_ANY};
    unsafe { AllowSetForegroundWindow(ASFW_ANY) };
}

#[cfg(not(windows))]
pub fn let_glup_come_forward() {}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_a_development_build_is_held_back() {
        assert!(shell_allowed_with(false, None));
        assert!(!shell_allowed_with(true, None));
        assert!(!shell_allowed_with(true, Some("0")));
        assert!(shell_allowed_with(true, Some("1")));
    }

    #[test]
    fn knows_the_paths_of_a_development_build() {
        assert!(is_dev_path(r"C:\glup\apps\desktop\src-tauri\target\debug\glup.exe --autostart"));
        assert!(is_dev_path(r#""C:\Glup\TARGET\Debug\glup.exe",0"#));
        assert!(is_dev_path("C:/glup/src-tauri/target/debug/glup.exe"));
        assert!(!is_dev_path(r"C:\Users\Ana\AppData\Local\Glup\Glup.exe --autostart"));
        assert!(!is_dev_path(r"C:\debug\glup.exe"));
    }

    #[cfg(windows)]
    #[test]
    fn removes_only_what_opens_a_development_build() {
        use crate::services::explorer::send_to::{write_shortcut, ShortcutParams};

        let root     = format!(r"Software\GlupPruebasDesarrollo-{}", std::process::id());
        let run      = format!(r"{root}\Run");
        let approved = format!(r"{root}\Approved");
        let classes  = format!(r"{root}\Classes");
        let folder   = std::env::temp_dir().join(format!("glup-dev-sendto-{}", std::process::id()));
        struct Cleanup(String, std::path::PathBuf);
        impl Drop for Cleanup {
            fn drop(&mut self) {
                registry::delete_tree(Root::User, &self.0);
                let _ = fs::remove_dir_all(&self.1);
            }
        }
        let _cleanup = Cleanup(root.clone(), folder.clone());

        // What a development build left behind.
        let dev = Path::new(r"C:\glup\src-tauri\target\debug\glup.exe");
        registry::set_text(Root::User, &run, APP_NAME, &format!("{} --autostart", dev.display()));
        registry::set_text(Root::User, &run, "Otra", r"C:\Otra\otra.exe");
        menu::register(&classes, dev);
        assert!(write_shortcut(ShortcutParams { path: &send_to::shortcut_in(&folder), target: dev }));

        let cleaned = clean_dev_entries(CleanKeys { run: &run, approved: &approved, classes: &classes, send_to: Some(&folder) });
        assert_eq!(cleaned, Cleaned { autostart: true, menu: true, send_to: true });
        assert!(registry::values(Root::User, &run).iter().all(|value| value.name != APP_NAME));
        assert!(registry::values(Root::User, &run).iter().any(|value| value.name == "Otra"));
        assert!(registry::values(Root::User, &menu::menu_root(&classes, "pdf")).is_empty());
        assert!(!send_to::shortcut_in(&folder).exists());

        // Those of an installed Glup stay.
        let installed = Path::new(r"C:\Users\Ana\AppData\Local\Glup\Glup.exe");
        registry::set_text(Root::User, &run, APP_NAME, &format!("{} --autostart", installed.display()));
        menu::register(&classes, installed);
        assert!(write_shortcut(ShortcutParams { path: &send_to::shortcut_in(&folder), target: installed }));

        let cleaned = clean_dev_entries(CleanKeys { run: &run, approved: &approved, classes: &classes, send_to: Some(&folder) });
        assert_eq!(cleaned, Cleaned::default());
        assert!(send_to::shortcut_in(&folder).exists());

        drop(_cleanup);
        assert!(!registry::subkeys(Root::User, "Software").iter().any(|key| key.starts_with("GlupPruebasDesarrollo-")));
    }
}
