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
    // "Quitar ubicación" turned off: photos keep where they were taken. Kept in the negative so a
    // missing value (and a first run) takes the place out.
    pub keep_location: bool,
    // Last "Reducir peso" level chosen for PDFs.
    pub reduce_level: ReduceLevel,
    // The welcome was answered. A settings.json from before it existed counts as seen: only a first
    // run (no file) shows it.
    #[serde(default = "already_seen")]
    pub welcome_seen: bool,
    // "Avisarme con notificaciones de Windows" turned off. Kept in the negative so a missing value
    // (and a first run) means they are on.
    pub notifications_off: bool,
    // "Pasar audio a texto": the last level chosen (Rápido or Más preciso).
    pub transcribe_level: crate::services::transcribe::model::Level,
    // "Usar la tarjeta de video": Automático (the card when there is one that works) or Nunca.
    pub transcribe_gpu: crate::services::transcribe::device::GpuMode,
    // Cards that failed, with the driver they had ("name|version"): the processor until it changes.
    pub gpu_blocked: Vec<String>,
    // "Copiar texto de la pantalla": the shortcut chosen (None: Glup's own) and whether it was turned
    // off. Kept in the negative so a first run has it on.
    pub screen_text_shortcut: Option<String>,
    pub screen_text_shortcut_off: bool,
    // "Guardar en el historial lo que copio de la pantalla" turned off (on by default).
    pub screen_text_history_off: bool,
    // "Portapapeles": off until the person turns it on, after reading what it keeps.
    pub clipboard_on: bool,
    // How many it keeps (None: CLIPBOARD_LIMIT). Pinned ones never go away on their own.
    pub clipboard_limit: Option<u32>,
    // Programs whose copies are never kept, by file name ("banco.exe").
    pub clipboard_excluded: Vec<String>,
    // Its shortcut, as the one of "Copiar texto de la pantalla".
    pub clipboard_shortcut: Option<String>,
    pub clipboard_shortcut_off: bool,
    // Where the island lives (None: on top in the middle of the main screen). The webview reads and
    // checks it: a screen that is gone gives way to the main one.
    pub island_dock: Option<IslandDock>,
    // "Cómo se muestra": the island as always, hidden (modo oculto: nothing on screen until the cursor
    // rests against its edge, its shortcut or the tray) or a floating bubble.
    pub island_rest: IslandRest,
    // Where the bubble floats (None: in the middle of the main screen); checked by the webview as the dock.
    pub island_bubble: Option<BubbleSpot>,
    // How long the cursor rests against the edge before a hidden Glup comes out (ms; None: the default).
    pub reveal_delay: Option<u32>,
    // The short notice of how to bring a hidden Glup back was seen.
    pub hidden_intro_seen: bool,
    // The shortcut that opens and closes the panel, as the other ones.
    pub island_shortcut: Option<String>,
    pub island_shortcut_off: bool,
}

// The edge ("top", "left", "bottom-right"…), how far along it (0 to 1) and the screen.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct IslandDock {
    pub edge   : String,
    pub offset : f64,
    pub screen : Option<String>,
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum IslandRest {
    #[default]
    Pill,
    Hidden,
    Bubble,
}

// The bubble's middle as shares (0 to 1) of its screen's work area, and the screen: the same spot on
// another resolution.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct BubbleSpot {
    pub x      : f64,
    pub y      : f64,
    pub screen : Option<String>,
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
        Settings { save_mode: mode, custom_folder: folder.map(str::to_string), bundle_zip: false, reduce_level: ReduceLevel::Normal, welcome_seen: true, notifications_off: false, transcribe_level: Default::default(), screen_text_shortcut: None, screen_text_shortcut_off: false, screen_text_history_off: false, ..Default::default() }
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

    #[test]
    fn the_bubble_and_its_spot_are_read_back_and_the_island_is_the_default() {
        let saved: Settings = serde_json::from_str(r#"{"islandRest":"bubble","islandBubble":{"x":0.2,"y":0.75,"screen":"DISPLAY2"}}"#).unwrap();
        assert_eq!(saved.island_rest, IslandRest::Bubble);
        assert_eq!(saved.island_bubble, Some(BubbleSpot { x: 0.2, y: 0.75, screen: Some("DISPLAY2".to_string()) }));

        let first: Settings = serde_json::from_str("{}").unwrap();
        assert_eq!(first.island_rest, IslandRest::Pill);
        assert_eq!(first.island_bubble, None);
    }
}
