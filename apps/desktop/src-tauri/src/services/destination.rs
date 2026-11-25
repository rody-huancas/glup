use std::{
    fs,
    path::{Path, PathBuf},
};

use serde::{Deserialize, Serialize};

use crate::services::settings::SaveMode;

pub const GLUP_FOLDER: &str          = "Glup";
pub const MISSING_FOLDER_ERROR: &str = "La carpeta elegida ya no está";
pub const FOLDER_ERROR: &str         = "No pude crear la carpeta";

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Destination {
    pub mode: SaveMode,
    pub folder: Option<String>,
}

// Where the output of `source` goes: its folder, a "Glup" subfolder next to it, or the chosen folder.
pub fn target_folder(source: &Path, destination: &Destination) -> Option<PathBuf> {
    match destination.mode {
        SaveMode::Same   => source.parent().map(Path::to_path_buf),
        SaveMode::Glup   => source.parent().map(|folder| folder.join(GLUP_FOLDER)),
        SaveMode::Custom => destination.folder.as_ref().map(PathBuf::from),
    }
}

// Creates (or reuses) the Glup subfolder; a chosen folder that disappeared is reported, never recreated.
pub fn prepare(source: &Path, destination: &Destination) -> Result<PathBuf, String> {
    let folder = target_folder(source, destination).ok_or(FOLDER_ERROR)?;

    match destination.mode {
        SaveMode::Glup   => fs::create_dir_all(&folder).map_err(|_| FOLDER_ERROR.to_string())?,
        SaveMode::Custom => {
            if !folder.is_dir() {
                return Err(MISSING_FOLDER_ERROR.to_string());
            }
        }
        SaveMode::Same => {}
    }

    Ok(folder)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn destination(mode: SaveMode, folder: Option<&str>) -> Destination {
        Destination { mode, folder: folder.map(str::to_string) }
    }

    #[test]
    fn same_folder_is_the_source_folder() {
        let folder = target_folder(Path::new("C:/fotos/a.png"), &destination(SaveMode::Same, None));
        assert_eq!(folder, Some(PathBuf::from("C:/fotos")));
    }

    #[test]
    fn glup_folder_sits_next_to_the_source() {
        let folder = target_folder(Path::new("C:/fotos/a.png"), &destination(SaveMode::Glup, None));
        assert_eq!(folder, Some(PathBuf::from("C:/fotos/Glup")));
    }

    #[test]
    fn custom_folder_is_used_as_is() {
        let folder = target_folder(Path::new("C:/fotos/a.png"), &destination(SaveMode::Custom, Some("D:/salida")));
        assert_eq!(folder, Some(PathBuf::from("D:/salida")));
    }

    #[test]
    fn missing_custom_folder_is_an_error() {
        let missing = std::env::temp_dir().join("glup-no-such-folder-for-tests");
        let result  = prepare(Path::new("C:/fotos/a.png"), &destination(SaveMode::Custom, missing.to_str()));
        assert_eq!(result, Err(MISSING_FOLDER_ERROR.to_string()));
    }
}
