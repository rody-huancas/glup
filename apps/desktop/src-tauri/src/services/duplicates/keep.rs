// Which copies of a group come marked to quit. Only the clear ones: a copy in Descargas or with the name
// of a copy («foto (1).jpg», «foto - copia.jpg», «foto copy.jpg»). Copies in different folders of their
// own with plain names are not touched: the group is left to «Revisar» and the person decides.
use std::path::Path;

use crate::services::cleanup::walk::FileEntry;

// What Windows, macOS and the browsers add to a copied or downloaded-again name.
const COPY_WORDS: [&str; 4] = ["copia", "copy", "kopie", "copie"];

pub fn looks_like_a_copy(path: &Path) -> bool {
    let stem = path.file_stem().map(|stem| stem.to_string_lossy().to_lowercase()).unwrap_or_default();
    let stem = stem.trim_end();

    // «foto (1)», «foto(2)».
    let numbered = stem.strip_suffix(')').and_then(|rest| rest.rsplit_once('(')).is_some_and(|(_, number)| !number.is_empty() && number.chars().all(|digit| digit.is_ascii_digit()));
    // «foto - copia», «foto copy», «foto_copy», «Copia de foto», «foto - copia (2)».
    let worded = stem.split(|character: char| !character.is_alphanumeric()).any(|word| COPY_WORDS.contains(&word));
    numbered || worded
}

fn in_folder(path: &Path, folder: Option<&Path>) -> bool {
    folder.is_some_and(|folder| path.starts_with(folder))
}

// The position of the copy that would stay: the one whose name is not a copy; on a tie, the one outside
// Descargas, then the oldest, then the shortest path.
pub fn keeper(files: &[FileEntry], downloads: Option<&Path>) -> usize {
    files
        .iter()
        .enumerate()
        .min_by_key(|(_, file)| (looks_like_a_copy(&file.path), in_folder(&file.path, downloads), file.modified, file.path.as_os_str().len(), file.path.clone()))
        .map_or(0, |(index, _)| index)
}

// Plainly an extra copy: in Descargas, or with the name of a copy.
pub fn evident_copy(file: &FileEntry, downloads: Option<&Path>) -> bool {
    looks_like_a_copy(&file.path) || in_folder(&file.path, downloads)
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Preselection {
    pub keep : usize,
    // Positions marked to quit (empty: «Revisar»).
    pub quit : Vec<usize>,
}

// The copies that are plainly extra are marked (all but one if every copy is); the others stay.
pub fn preselect(files: &[FileEntry], downloads: Option<&Path>) -> Preselection {
    let keep = keeper(files, downloads);
    let quit = (0..files.len()).filter(|index| *index != keep && evident_copy(&files[*index], downloads)).collect();
    Preselection { keep, quit }
}
