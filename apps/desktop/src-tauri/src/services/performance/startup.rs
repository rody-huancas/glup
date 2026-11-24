// "Al encender la PC": what starts with Windows, turned on or off the same way the Task Manager does
// (StartupApproved), so either one can undo what the other did. Nothing is deleted: the entry in Run or
// the shortcut in the Startup folder stays where it was; only its "approved" mark changes.
use std::{
    fs,
    path::Path,
    time::{SystemTime, UNIX_EPOCH},
};

use serde::Serialize;

use crate::services::registry::{self, Root};

pub const CHANGE_ERROR: &str  = "No pude cambiarlo";
pub const ADMIN_ERROR: &str   = "Esto es de todos los usuarios de la PC: solo un administrador puede cambiarlo";
pub const MISSING_ERROR: &str = "Ya no está en la lista de inicio";

const RUN: &str      = r"Software\Microsoft\Windows\CurrentVersion\Run";
const RUN_32: &str   = r"Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Run";
const APPROVED: &str = r"Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved";

// FILETIME of 1970-01-01 (the disabled mark keeps when it was turned off, like the Task Manager).
const UNIX_EPOCH_FILETIME: u64 = 116_444_736_000_000_000;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Place {
    // A value in a Run key: its name and its command.
    Registry,
    // A shortcut (or program) in a Startup folder.
    Folder,
}

// Where entries come from and where their mark lives.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Source {
    pub id       : &'static str,
    pub place    : Place,
    pub root     : Root,
    // The Run key, or the folder.
    pub list     : String,
    // Its StartupApproved key.
    pub approved : String,
}

fn approved(kind: &str) -> String {
    format!(r"{APPROVED}\{kind}")
}

fn startup_folder(base: Option<std::ffi::OsString>, below: &str) -> Option<String> {
    base.map(|base| Path::new(&base).join(below).to_string_lossy().into_owned())
}

// The five places Windows starts programs from, in the order of the Task Manager's sources.
pub fn sources() -> Vec<Source> {
    let mut list = vec![
        Source { id: "user-run", place: Place::Registry, root: Root::User, list: RUN.to_string(), approved: approved("Run") },
        Source { id: "machine-run", place: Place::Registry, root: Root::Machine, list: RUN.to_string(), approved: approved("Run") },
        Source { id: "machine-run32", place: Place::Registry, root: Root::Machine, list: RUN_32.to_string(), approved: approved("Run32") },
    ];
    if let Some(folder) = startup_folder(std::env::var_os("APPDATA"), r"Microsoft\Windows\Start Menu\Programs\Startup") {
        list.push(Source { id: "user-folder", place: Place::Folder, root: Root::User, list: folder, approved: approved("StartupFolder") });
    }
    if let Some(folder) = startup_folder(std::env::var_os("ProgramData"), r"Microsoft\Windows\Start Menu\Programs\StartUp") {
        list.push(Source { id: "machine-folder", place: Place::Folder, root: Root::Machine, list: folder, approved: approved("StartupFolder") });
    }
    list
}

// The mark: missing means on; its first byte is even when on (02, 06) and odd when off (03, 07).
pub fn is_enabled(mark: Option<&[u8]>) -> bool {
    mark.and_then(|bytes| bytes.first()).is_none_or(|first| first & 1 == 0)
}

// The 12 bytes the Task Manager writes: 02 and zeros when on; 03 and the moment it was turned off.
pub fn mark(enabled: bool, filetime: u64) -> [u8; 12] {
    let mut bytes = [0_u8; 12];
    if enabled {
        bytes[0] = 0x02;
    } else {
        bytes[0] = 0x03;
        bytes[4..].copy_from_slice(&filetime.to_le_bytes());
    }
    bytes
}

pub fn now_filetime() -> u64 {
    let since = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default();
    UNIX_EPOCH_FILETIME + since.as_nanos() as u64 / 100
}

// The program a Run command starts: the quoted path, or everything up to ".exe".
pub fn program_of(command: &str) -> Option<String> {
    let command = command.trim();
    if let Some(rest) = command.strip_prefix('"') {
        return rest.split('"').next().filter(|path| !path.is_empty()).map(str::to_string);
    }
    let lower = command.to_lowercase();
    match lower.find(".exe") {
        Some(end) => Some(command[..end + 4].to_string()),
        None      => command.split_whitespace().next().map(str::to_string),
    }
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StartupEntry {
    // "<source>|<name>": how it is changed later.
    pub id         : String,
    // The value name or the shortcut's name, without ".lnk".
    pub name       : String,
    // Where it points (the program or the shortcut), for its icon and its real name.
    pub path       : Option<String>,
    pub command    : String,
    pub enabled    : bool,
    // False for everyone's entries when Glup is not an administrator.
    pub can_change : bool,
    // For every user of the PC (not only this one).
    pub everyone   : bool,
}

fn folder_entries(folder: &str) -> Vec<(String, String, Option<String>)> {
    let Ok(entries) = fs::read_dir(folder) else { return Vec::new() };
    let mut found: Vec<_> = entries
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .filter(|path| path.is_file() && path.file_name().is_some_and(|name| !name.eq_ignore_ascii_case("desktop.ini")))
        .filter_map(|path| {
            let file = path.file_name()?.to_string_lossy().into_owned();
            Some((file, path.to_string_lossy().into_owned(), Some(path.to_string_lossy().into_owned())))
        })
        .collect();
    found.sort();
    found
}

fn display_name(name: &str, place: Place) -> String {
    match place {
        Place::Folder   => Path::new(name).file_stem().map_or_else(|| name.to_string(), |stem| stem.to_string_lossy().into_owned()),
        Place::Registry => name.to_string(),
    }
}

pub fn list(sources: &[Source]) -> Vec<StartupEntry> {
    let mut found = Vec::new();

    for source in sources {
        // (name in its mark, command, where it points)
        let entries: Vec<(String, String, Option<String>)> = match source.place {
            Place::Registry => registry::values(source.root, &source.list)
                .into_iter()
                .filter_map(|value| value.text.map(|command| (value.name, command.clone(), program_of(&expand(&command)))))
                .filter(|(name, _, _)| !name.is_empty())
                .collect(),
            Place::Folder => folder_entries(&source.list),
        };
        if entries.is_empty() {
            continue;
        }

        let marks      = registry::values(source.root, &source.approved);
        let can_change = source.root == Root::User || registry::can_write(source.root, &source.approved);
        for (name, command, path) in entries {
            let mark = marks.iter().find(|value| value.name.eq_ignore_ascii_case(&name)).map(|value| value.data.as_slice());
            found.push(StartupEntry {
                id         : format!("{}|{name}", source.id),
                name       : display_name(&name, source.place),
                path,
                command,
                enabled    : is_enabled(mark),
                can_change,
                everyone   : source.root == Root::Machine,
            });
        }
    }
    found
}

// On or off: only its mark in StartupApproved, never the entry.
pub fn set_enabled(sources: &[Source], id: &str, enabled: bool) -> Result<(), String> {
    let (source_id, name) = id.split_once('|').ok_or(MISSING_ERROR)?;
    let source            = sources.iter().find(|source| source.id == source_id).ok_or(MISSING_ERROR)?;
    if !list(std::slice::from_ref(source)).iter().any(|entry| entry.id == id) {
        return Err(MISSING_ERROR.to_string());
    }
    if source.root == Root::Machine && !registry::can_write(source.root, &source.approved) {
        return Err(ADMIN_ERROR.to_string());
    }

    registry::set_binary(source.root, &source.approved, name, &mark(enabled, now_filetime())).then_some(()).ok_or_else(|| CHANGE_ERROR.to_string())
}

// "%ProgramFiles%\…" as Windows reads it.
#[cfg(windows)]
pub fn expand(text: &str) -> String {
    use windows_sys::Win32::System::Environment::ExpandEnvironmentStringsW;

    let source: Vec<u16> = text.encode_utf16().chain(Some(0)).collect();
    let mut out          = vec![0_u16; 4096];
    let length           = unsafe { ExpandEnvironmentStringsW(source.as_ptr(), out.as_mut_ptr(), out.len() as u32) } as usize;
    if length == 0 || length > out.len() {
        return text.to_string();
    }
    String::from_utf16_lossy(&out[..length.saturating_sub(1)])
}

#[cfg(not(windows))]
pub fn expand(text: &str) -> String {
    text.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_mark_says_on_or_off_like_the_task_manager() {
        assert!(is_enabled(None));
        assert!(is_enabled(Some(&[0x02, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])));
        assert!(is_enabled(Some(&[0x06, 0, 0, 0])));
        assert!(!is_enabled(Some(&[0x03, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8])));
        assert!(!is_enabled(Some(&[0x07])));

        assert_eq!(mark(true, 99), [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
        let off = mark(false, 0x0102_0304_0506_0708);
        assert_eq!(off[..4], [3, 0, 0, 0]);
        assert_eq!(u64::from_le_bytes(off[4..].try_into().unwrap()), 0x0102_0304_0506_0708);
        // Now, in FILETIME: after 2024.
        assert!(now_filetime() > 133_485_408_000_000_000);
    }

    #[test]
    fn the_program_of_a_command() {
        assert_eq!(program_of(r#""C:\Program Files\Spotify\Spotify.exe" --autostart"#).as_deref(), Some(r"C:\Program Files\Spotify\Spotify.exe"));
        assert_eq!(program_of(r"C:\Program Files\App\app.EXE /min").as_deref(), Some(r"C:\Program Files\App\app.EXE"));
        assert_eq!(program_of(r"rundll32.dll,Run").as_deref(), Some("rundll32.dll,Run"));
        assert_eq!(program_of("  ").as_deref(), None);
    }

    // On a key of its own under HKEY_CURRENT_USER\Software, removed whole at the end.
    #[cfg(windows)]
    #[test]
    fn startup_approved_is_read_and_changed_in_a_test_key() {
        let base    = format!(r"Software\Glup-pruebas-inicio-{}", std::process::id());
        let folder  = std::env::temp_dir().join(format!("glup-startup-{}", std::process::id()));
        let _       = fs::remove_dir_all(&folder);
        fs::create_dir_all(&folder).unwrap();
        fs::write(folder.join("Notas.lnk"), b"lnk").unwrap();
        fs::write(folder.join("desktop.ini"), b"ini").unwrap();

        let sources = vec![
            Source { id: "run", place: Place::Registry, root: Root::User, list: format!(r"{base}\Run"), approved: format!(r"{base}\Approved\Run") },
            Source { id: "folder", place: Place::Folder, root: Root::User, list: folder.to_string_lossy().into_owned(), approved: format!(r"{base}\Approved\StartupFolder") },
        ];
        registry::set_text(Root::User, &format!(r"{base}\Run"), "Spotify", r#""C:\Program Files\Spotify\Spotify.exe" --autostart"#);
        registry::set_text(Root::User, &format!(r"{base}\Run"), "Chat", r"C:\Chat\chat.exe");
        // The Task Manager had turned Chat off.
        registry::set_binary(Root::User, &format!(r"{base}\Approved\Run"), "Chat", &mark(false, 5));

        let names = |entries: &[StartupEntry]| entries.iter().map(|entry| (entry.id.clone(), entry.enabled)).collect::<Vec<_>>();
        let found = list(&sources);
        let mut seen = names(&found);
        seen.sort();
        assert_eq!(seen, [("folder|Notas.lnk".to_string(), true), ("run|Chat".to_string(), false), ("run|Spotify".to_string(), true)]);
        assert_eq!(found.iter().find(|entry| entry.id == "run|Spotify").and_then(|entry| entry.path.clone()).as_deref(), Some(r"C:\Program Files\Spotify\Spotify.exe"));
        assert_eq!(found.iter().find(|entry| entry.id == "folder|Notas.lnk").map(|entry| entry.name.as_str()), Some("Notas"));

        set_enabled(&sources, "run|Spotify", false).unwrap();
        set_enabled(&sources, "run|Chat", true).unwrap();
        set_enabled(&sources, "folder|Notas.lnk", false).unwrap();
        let mut after = names(&list(&sources));
        after.sort();
        assert_eq!(after, [("folder|Notas.lnk".to_string(), false), ("run|Chat".to_string(), true), ("run|Spotify".to_string(), false)]);

        // The entries themselves are still there.
        assert_eq!(registry::values(Root::User, &format!(r"{base}\Run")).len(), 2);
        assert!(folder.join("Notas.lnk").exists());
        assert_eq!(set_enabled(&sources, "run|Otro", false), Err(MISSING_ERROR.to_string()));

        registry::delete_tree(Root::User, &base);
        let _ = fs::remove_dir_all(&folder);
    }
}
