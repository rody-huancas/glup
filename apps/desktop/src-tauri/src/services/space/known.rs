// Big files and folders that many PCs have, with what they are in plain words and what to do with them
// (known.json). Those that must not be deleted from here never get «Mandar a la papelera». Pure.
use std::sync::OnceLock;

use serde::Deserialize;

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Known {
    // Files by their extension or their whole name.
    pub extensions        : Vec<String>,
    pub names             : Vec<String>,
    // Folders by their name or by what their name ends with (".avd").
    pub folder_names      : Vec<String>,
    pub folder_extensions : Vec<String>,
    // A piece of the path (lower case, with \). With a name it must be in the path too; alone it is the
    // folder whose path ends with it.
    pub path_contains     : Vec<String>,
    // Not to be deleted from here.
    pub keep              : bool,
    pub note              : String,
}

pub fn known() -> &'static [Known] {
    static KNOWN: OnceLock<Vec<Known>> = OnceLock::new();
    KNOWN.get_or_init(|| serde_json::from_str(include_str!("known.json")).unwrap_or_default())
}

fn extension_of(name: &str) -> Option<String> {
    name.rsplit_once('.').map(|(_, extension)| extension.to_lowercase())
}

// Which entry of the list a file or folder is (its number in it), from its name and path.
pub fn find(list: &[Known], name: &str, path: &str, dir: bool) -> Option<usize> {
    let name  = name.to_lowercase();
    let path  = format!("{}\\", path.to_lowercase().replace('/', "\\").trim_end_matches('\\'));
    list.iter().position(|entry| {
        let by_name = if dir {
            entry.folder_names.contains(&name) || extension_of(&name).is_some_and(|extension| entry.folder_extensions.contains(&extension))
        } else {
            entry.names.contains(&name) || extension_of(&name).is_some_and(|extension| entry.extensions.contains(&extension))
        };
        let has_name = !entry.names.is_empty() || !entry.extensions.is_empty() || !entry.folder_names.is_empty() || !entry.folder_extensions.is_empty();
        match (has_name, entry.path_contains.is_empty()) {
            (true, true)   => by_name,
            (true, false)  => by_name && entry.path_contains.iter().any(|piece| path.contains(piece.as_str())),
            (false, false) => dir && entry.path_contains.iter().any(|piece| path.ends_with(&format!("{}\\", piece.trim_end_matches('\\')))),
            (false, true)  => false,
        }
    })
}
