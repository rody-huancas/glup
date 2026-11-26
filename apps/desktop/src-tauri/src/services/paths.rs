// Windows paths compared as Windows sees them: the same folder can come written in many ways (a short
// 8.3 name as C:\Users\RUNNER~1, other capitals, / or \, a final \, the \\?\ prefix). Every comparison
// against a protected or special folder goes through here.
use std::path::{Path, PathBuf};

// Short names always carry a ~ (RUNNER~1): only then is Windows asked, so walking thousands of files
// costs nothing more.
fn may_be_short(text: &str) -> bool {
    text.contains('~')
}

// The \\?\ (or \\?\UNC\) prefix off: the same path without it.
fn without_prefix(text: &str) -> String {
    if let Some(rest) = text.strip_prefix(r"\\?\UNC\") {
        format!(r"\\{rest}")
    } else {
        text.strip_prefix(r"\\?\").unwrap_or(text).to_string()
    }
}

#[cfg(windows)]
fn long_name(path: &Path) -> Option<PathBuf> {
    use std::os::windows::ffi::{OsStrExt, OsStringExt};

    use windows_sys::Win32::Storage::FileSystem::GetLongPathNameW;

    let wide: Vec<u16> = path.as_os_str().encode_wide().chain(Some(0)).collect();
    let size = unsafe { GetLongPathNameW(wide.as_ptr(), std::ptr::null_mut(), 0) };
    if size == 0 {
        return None;
    }
    let mut buffer = vec![0u16; size as usize];
    let written    = unsafe { GetLongPathNameW(wide.as_ptr(), buffer.as_mut_ptr(), size) };
    (written > 0 && written < size).then(|| PathBuf::from(std::ffi::OsString::from_wide(&buffer[..written as usize])))
}

#[cfg(not(windows))]
fn long_name(_path: &Path) -> Option<PathBuf> {
    None
}

// The long form of a path. One that does not exist (yet, or any more) gets its deepest existing folder
// expanded and the rest kept as written.
pub fn long_form(path: &Path) -> PathBuf {
    let text = without_prefix(&path.to_string_lossy());
    let path = PathBuf::from(&text);
    if !may_be_short(&text) {
        return path;
    }
    let mut rest = Vec::new();
    let mut at   = path.as_path();
    loop {
        if let Some(long) = long_name(at) {
            return rest.iter().rev().fold(long, |whole: PathBuf, part| whole.join(part));
        }
        match (at.parent(), at.file_name()) {
            (Some(parent), Some(name)) => {
                rest.push(name.to_os_string());
                at = parent;
            }
            _ => return path,
        }
    }
}

// One way of writing it: long, without prefix, with \, without a final \ and in small letters.
pub fn normalized(path: &Path) -> String {
    let long = long_form(path).to_string_lossy().replace('/', "\\");
    let mut text = String::with_capacity(long.len());
    for (index, char) in long.chars().enumerate() {
        // Doubled separators are one (but a network path keeps its leading \\).
        if char == '\\' && index > 1 && text.ends_with('\\') {
            continue;
        }
        text.push(char);
    }
    text.trim_end_matches('\\').to_lowercase()
}

pub fn same_path(a: &Path, b: &Path) -> bool {
    normalized(a) == normalized(b)
}

// The folder itself or something inside it (never a neighbour that only starts the same: «Ana2» is not
// inside «Ana»).
pub fn is_inside(path: &Path, folder: &Path) -> bool {
    let (path, folder) = (normalized(path), normalized(folder));
    !folder.is_empty() && (path == folder || path.starts_with(&format!("{folder}\\")))
}

#[cfg(test)]
mod tests {
    use std::fs;

    use super::*;

    #[test]
    fn the_same_folder_written_in_other_ways_is_the_same() {
        let folder = Path::new(r"C:\Users\Ana\AppData\Local");
        assert!(same_path(folder, Path::new(r"c:\users\ana\appdata\local\")));
        assert!(same_path(folder, Path::new("C:/Users/Ana/AppData/Local/")));
        assert!(same_path(folder, Path::new(r"\\?\C:\Users\Ana\AppData\Local")));
        assert!(same_path(folder, Path::new(r"C:\Users\\Ana\AppData\\Local")));
        assert!(same_path(Path::new(r"\\?\UNC\servidor\fotos"), Path::new(r"\\servidor\Fotos\")));

        assert!(is_inside(Path::new(r"C:\USERS\ANA\APPDATA\LOCAL\Temp\x.tmp"), folder));
        assert!(is_inside(folder, Path::new(r"C:\Users\Ana\AppData\Local\")));
        assert!(!is_inside(Path::new(r"C:\Users\Ana2\AppData\Local"), Path::new(r"C:\Users\Ana")));
        assert!(!is_inside(Path::new(r"C:\Users\Ana"), Path::new(r"C:\Users\Ana\AppData")));
        assert!(is_inside(Path::new(r"D:\Fotos"), Path::new(r"D:\")));
    }

    // A real folder with a long name and its short 8.3 name (where the disk keeps them).
    #[cfg(windows)]
    #[test]
    fn a_short_8_3_name_is_the_same_as_the_long_one() {
        use std::os::windows::ffi::{OsStrExt, OsStringExt};

        use windows_sys::Win32::Storage::FileSystem::GetShortPathNameW;

        let long = std::env::temp_dir().join(format!("glup carpeta con nombre largo {}", std::process::id()));
        fs::create_dir_all(long.join("adentro")).unwrap();
        let wide: Vec<u16> = long.as_os_str().encode_wide().chain(Some(0)).collect();
        let mut buffer     = vec![0u16; 1024];
        let written        = unsafe { GetShortPathNameW(wide.as_ptr(), buffer.as_mut_ptr(), buffer.len() as u32) } as usize;
        let short          = PathBuf::from(std::ffi::OsString::from_wide(&buffer[..written]));

        if written == 0 || !short.to_string_lossy().contains('~') {
            eprintln!("este disco no guarda nombres cortos: solo se prueba la forma larga");
        } else {
            assert!(same_path(&short, &long), "{} / {}", short.display(), long.display());
            assert!(is_inside(&short.join("adentro"), &long));
            assert!(is_inside(&long.join("adentro"), &short));
            // Not there yet: its folder is expanded, the rest kept.
            assert!(same_path(&short.join("nuevo.txt"), &long.join("nuevo.txt")));
            assert!(same_path(Path::new(&format!(r"\\?\{}", short.display())), &long));
        }
        assert!(same_path(&long, Path::new(&long.to_string_lossy().to_uppercase())));

        let _ = fs::remove_dir_all(&long);
    }
}
