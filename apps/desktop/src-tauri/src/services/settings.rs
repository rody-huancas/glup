use std::{
    fs,
    path::{Path, PathBuf},
    sync::Mutex,
};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};

use crate::services::pdf::reduce::ReduceLevel;

pub const SETTINGS_CHANGED_EVENT: &str = "settings-changed";

const SETTINGS_FILE: &str = "settings.json";

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SaveMode {
    #[default]
    Same,
    Glup,
    Custom,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Settings {
    pub save_mode: SaveMode,
    // The last folder chosen with "Elegir carpeta…".
    pub custom_folder: Option<String>,
    // "Entregar todo en un ZIP".
    pub bundle_zip: bool,
    // Last "Reducir peso" level chosen for PDFs.
    pub reduce_level: ReduceLevel,
    // The welcome was answered. A settings.json from before it existed counts as seen: only a first
    // run (no file) shows it.
    #[serde(default = "already_seen")]
    pub welcome_seen: bool,
    // "Avisarme con notificaciones de Windows" turned off. Kept in the negative so a missing value
    // (and a first run) means they are on.
    pub notifications_off: bool,
}

fn already_seen() -> bool {
    true
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingsView {
    #[serde(flatten)]
    pub settings: Settings,
    // The remembered folder no longer exists, so saving went back to the same folder.
    pub folder_missing: bool,
}

// Serializes reads and writes of settings.json.
#[derive(Default)]
pub struct SettingsStore(Mutex<()>);

// A remembered folder that disappeared falls back to "Misma carpeta".
pub fn with_fallback(settings: Settings, exists: impl Fn(&Path) -> bool) -> (Settings, bool) {
    let missing = settings.custom_folder.as_deref().is_some_and(|folder| !exists(Path::new(folder)));

    if !missing {
        return (settings, false);
    }

    let fallback_mode = if settings.save_mode == SaveMode::Custom { SaveMode::Same } else { settings.save_mode };
    (Settings { save_mode: fallback_mode, custom_folder: None, ..settings.clone() }, settings.save_mode == SaveMode::Custom)
}

fn file_path(app: &AppHandle) -> Option<PathBuf> {
    app.path().app_data_dir().ok().map(|folder| folder.join(SETTINGS_FILE))
}

fn read_file(path: &Path) -> Settings {
    fs::read(path).ok().and_then(|data| serde_json::from_slice(&data).ok()).unwrap_or_default()
}

fn write_file(path: &Path, settings: &Settings) -> Result<(), String> {
    if let Some(folder) = path.parent() {
        fs::create_dir_all(folder).map_err(|error| error.to_string())?;
    }

    let data = serde_json::to_vec_pretty(settings).map_err(|error| error.to_string())?;
    fs::write(path, data).map_err(|error| error.to_string())
}

pub fn read(app: &AppHandle) -> SettingsView {
    let store = app.state::<SettingsStore>();
    let _lock = store.0.lock();

    let Some(path) = file_path(app) else {
        return SettingsView { settings: Settings::default(), folder_missing: false };
    };

    let stored                     = read_file(&path);
    let (settings, folder_missing) = with_fallback(stored.clone(), |folder| folder.is_dir());

    if settings != stored {
        let _ = write_file(&path, &settings);
    }

    SettingsView { settings, folder_missing }
}

pub fn update(app: &AppHandle, settings: Settings) -> Result<SettingsView, String> {
    {
        let store = app.state::<SettingsStore>();
        let _lock = store.0.lock();
        let path  = file_path(app).ok_or("no app data folder")?;

        write_file(&path, &settings)?;
    }

    let _ = app.emit(SETTINGS_CHANGED_EVENT, ());
    Ok(read(app))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn settings(mode: SaveMode, folder: Option<&str>) -> Settings {
        Settings { save_mode: mode, custom_folder: folder.map(str::to_string), bundle_zip: false, reduce_level: ReduceLevel::Normal, welcome_seen: true, notifications_off: false }
    }

    #[test]
    fn shows_the_welcome_only_without_a_settings_file() {
        assert!(!Settings::default().welcome_seen);

        let old: Settings = serde_json::from_str(r#"{ "saveMode": "glup" }"#).unwrap();
        assert!(old.welcome_seen);

        let answered: Settings = serde_json::from_str(r#"{ "welcomeSeen": false }"#).unwrap();
        assert!(!answered.welcome_seen);
    }

    #[test]
    fn existing_folder_is_kept() {
        let (result, missing) = with_fallback(settings(SaveMode::Custom, Some("D:/salida")), |_| true);
        assert_eq!(result, settings(SaveMode::Custom, Some("D:/salida")));
        assert!(!missing);
    }

    #[test]
    fn missing_chosen_folder_falls_back_to_same() {
        let (result, missing) = with_fallback(settings(SaveMode::Custom, Some("D:/borrada")), |_| false);
        assert_eq!(result, settings(SaveMode::Same, None));
        assert!(missing);
    }

    #[test]
    fn missing_remembered_folder_is_forgotten_quietly_in_other_modes() {
        let (result, missing) = with_fallback(settings(SaveMode::Glup, Some("D:/borrada")), |_| false);
        assert_eq!(result, settings(SaveMode::Glup, None));
        assert!(!missing);
    }
}
