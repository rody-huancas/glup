// On disk, in the app data folder (clipboard/): the list as one encrypted file and each image (and its
// thumbnail) in its own encrypted file. Nothing is written in the clear and nothing leaves the PC.
use std::{
    fs,
    path::{Path, PathBuf},
};

use crate::services::clipboard::{crypt, store::ClipItem};

pub const FOLDER: &str     = "clipboard";
const ITEMS_FILE: &str     = "items.bin";
const IMAGE_SUFFIX: &str   = "img";
const THUMB_SUFFIX: &str   = "thumb";
const PARTIAL_SUFFIX: &str = "part";

pub fn image_path(folder: &Path, id: &str, thumb: bool) -> PathBuf {
    folder.join(format!("{id}.{}", if thumb { THUMB_SUFFIX } else { IMAGE_SUFFIX }))
}

// Written next to it first and then moved in, so a cut never leaves half a file.
fn write_protected(path: &Path, data: &[u8]) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }

    let partial = path.with_extension(PARTIAL_SUFFIX);
    fs::write(&partial, crypt::protect(data)?).map_err(|error| error.to_string())?;
    fs::rename(&partial, path).map_err(|error| error.to_string())
}

fn read_protected(path: &Path) -> Option<Vec<u8>> {
    crypt::unprotect(&fs::read(path).ok()?).ok()
}

pub fn save_items(folder: &Path, items: &[ClipItem]) -> Result<(), String> {
    let data = serde_json::to_vec(items).map_err(|error| error.to_string())?;
    write_protected(&folder.join(ITEMS_FILE), &data)
}

// A list that is missing or that cannot be opened (another Windows account, a damaged file) is empty.
pub fn load_items(folder: &Path) -> Vec<ClipItem> {
    read_protected(&folder.join(ITEMS_FILE)).and_then(|data| serde_json::from_slice(&data).ok()).unwrap_or_default()
}

pub fn save_image(folder: &Path, id: &str, png: &[u8], thumb: &[u8]) -> Result<(), String> {
    write_protected(&image_path(folder, id, false), png)?;
    write_protected(&image_path(folder, id, true), thumb)
}

pub fn load_image(folder: &Path, id: &str, thumb: bool) -> Option<Vec<u8>> {
    read_protected(&image_path(folder, id, thumb))
}

pub fn delete_images(folder: &Path, ids: &[String]) {
    for id in ids {
        let _ = fs::remove_file(image_path(folder, id, false));
        let _ = fs::remove_file(image_path(folder, id, true));
    }
}

#[cfg(all(test, windows))]
mod tests {
    use super::*;
    use crate::services::clipboard::store::ClipKind;

    fn folder(name: &str) -> PathBuf {
        std::env::temp_dir().join(format!("glup-clipboard-{name}-{}", std::process::id()))
    }

    #[test]
    fn the_list_is_kept_encrypted_and_reads_back() {
        let folder = folder("items");
        let item   = ClipItem { id: "a".to_string(), kind: ClipKind::Text, text: Some("clave del wifi: Glup2026".to_string()), width: 0, height: 0, source: None, date: String::new(), pinned: true };

        save_items(&folder, &[item.clone()]).unwrap();

        let raw = fs::read(folder.join(ITEMS_FILE)).unwrap();
        assert!(!String::from_utf8_lossy(&raw).contains("Glup2026"));
        assert_eq!(load_items(&folder), vec![item]);

        fs::remove_dir_all(&folder).unwrap();
    }

    #[test]
    fn images_are_kept_encrypted_and_go_away_together() {
        let folder = folder("images");

        save_image(&folder, "b", b"\x89PNG imagen", b"\x89PNG miniatura").unwrap();
        assert!(!fs::read(image_path(&folder, "b", false)).unwrap().starts_with(b"\x89PNG"));
        assert_eq!(load_image(&folder, "b", true).unwrap(), b"\x89PNG miniatura");

        delete_images(&folder, &["b".to_string()]);
        assert!(load_image(&folder, "b", false).is_none());
        assert!(!image_path(&folder, "b", true).exists());

        fs::remove_dir_all(&folder).unwrap();
    }

    #[test]
    fn a_damaged_list_is_empty_instead_of_failing() {
        let folder = folder("damaged");
        fs::create_dir_all(&folder).unwrap();
        fs::write(folder.join(ITEMS_FILE), b"basura").unwrap();

        assert!(load_items(&folder).is_empty());
        fs::remove_dir_all(&folder).unwrap();
    }
}
