// What makes a new name impossible on Windows, said per file, so nothing is applied until it is fixed:
// two files with the same name, a name another file already has, characters Windows does not allow,
// the names it keeps for itself (CON, NUL, COM1…) and paths too long. Pure (what exists comes in).
use std::{
    collections::HashMap,
    path::{Path, PathBuf},
};

use serde::Serialize;

// Windows' classic limit (MAX_PATH without the final null).
pub const MAX_PATH: usize = 259;
const FORBIDDEN: [char; 9] = ['<', '>', ':', '"', '/', '\\', '|', '?', '*'];
const RESERVED: [&str; 22] = ["CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9"];

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum Problem {
    Empty,
    Duplicate,
    Exists,
    Forbidden,
    Reserved,
    TooLong,
}

impl Problem {
    pub fn words(self) -> &'static str {
        match self {
            Self::Empty     => "Quedaría sin nombre",
            Self::Duplicate => "Dos archivos quedarían con el mismo nombre",
            Self::Exists    => "Ya hay otro archivo con ese nombre",
            Self::Forbidden => "Tiene caracteres que Windows no permite (< > : \" / \\ | ? *) o termina en punto o espacio",
            Self::Reserved  => "Windows se guarda ese nombre para sí (CON, NUL, COM1…)",
            Self::TooLong   => "La ruta quedaría demasiado larga para Windows",
        }
    }
}

// The problem of a name by itself (without looking at the others).
pub fn name_problem(name: &str, folder: &Path) -> Option<Problem> {
    let trimmed = name.trim();
    if trimmed.is_empty() || trimmed == "." || trimmed == ".." {
        return Some(Problem::Empty);
    }
    if name.chars().any(|character| FORBIDDEN.contains(&character) || (character as u32) < 32) || name.ends_with('.') || name.ends_with(' ') {
        return Some(Problem::Forbidden);
    }
    let stem = name.split('.').next().unwrap_or_default().trim_end().to_uppercase();
    if RESERVED.contains(&stem.as_str()) {
        return Some(Problem::Reserved);
    }
    if folder.join(name).as_os_str().len() > MAX_PATH {
        return Some(Problem::TooLong);
    }
    None
}

pub struct CheckParams<'a> {
    // Each file and its new name.
    pub items  : &'a [(PathBuf, String)],
    // Whether a path is taken by a file that is not one of these.
    pub exists : &'a dyn Fn(&Path) -> bool,
}

// One problem (or none) per file. Windows does not tell capitals apart, so neither does this.
pub fn problems(params: CheckParams) -> Vec<Option<Problem>> {
    let key    = |path: &Path| path.to_string_lossy().to_lowercase();
    let sources: Vec<String> = params.items.iter().map(|(path, _)| key(path)).collect();
    let targets: Vec<PathBuf> = params.items.iter().map(|(path, name)| path.parent().unwrap_or(Path::new("")).join(name)).collect();
    let mut count: HashMap<String, usize> = HashMap::new();
    for target in &targets {
        *count.entry(key(target)).or_default() += 1;
    }

    params
        .items
        .iter()
        .zip(&targets)
        .map(|((source, name), target)| {
            let folder = source.parent().unwrap_or(Path::new(""));
            if let Some(problem) = name_problem(name, folder) {
                return Some(problem);
            }
            let target_key = key(target);
            if count.get(&target_key).copied().unwrap_or(0) > 1 {
                return Some(Problem::Duplicate);
            }
            // Taken by a file that stays (one of the batch moves away: a swap a↔b is fine).
            let own   = target_key == key(source);
            let freed = sources.contains(&target_key);
            (!own && !freed && (params.exists)(target)).then_some(Problem::Exists)
        })
        .collect()
}
