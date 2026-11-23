// The keyboard shortcut of "Copiar texto de la pantalla", registered with Windows so it works from any
// app. It can be changed or turned off in Ajustes; it is kept in settings.json.
use std::{str::FromStr, sync::Mutex};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Modifiers, Shortcut};

use crate::services::{
    notify::{self, NotifyRequest},
    settings::{self, Settings},
};

// Ctrl+Alt+Shift+T: three modifiers, which neither Windows nor the usual programs use, and T for "texto".
pub const DEFAULT_SHORTCUT: &str = "Ctrl+Alt+Shift+KeyT";

pub const TAKEN_ERROR: &str   = "Ese atajo ya lo usa otro programa. Prueba con otro.";
pub const INVALID_ERROR: &str = "Ese atajo no me sirve. Usa Ctrl, Alt o Windows junto con otra tecla.";
// The page a click on the startup warning opens.
pub const SETTINGS_PAGE: &str = "settings";

// Whether the shortcut in use could not be registered (another program had it when Glup started).
#[derive(Default)]
pub struct ShortcutStatus(Mutex<bool>);

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ShortcutView {
    pub shortcut : String,
    pub enabled  : bool,
    pub taken    : bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShortcutRequest {
    // None keeps the one chosen before.
    pub shortcut : Option<String>,
    pub enabled  : bool,
}

pub fn chosen(settings: &Settings) -> String {
    settings.screen_text_shortcut.clone().unwrap_or_else(|| DEFAULT_SHORTCUT.to_string())
}

// The one to register: none when turned off.
pub fn active(settings: &Settings) -> Option<String> {
    (!settings.screen_text_shortcut_off).then(|| chosen(settings))
}

// A key alone or with only Shift would get in the way of typing.
pub fn is_valid(shortcut: &str) -> bool {
    Shortcut::from_str(shortcut).is_ok_and(|parsed| parsed.mods.intersects(Modifiers::CONTROL | Modifiers::ALT | Modifiers::SUPER))
}

fn register(app: &AppHandle, shortcut: Option<&str>) -> Result<(), String> {
    let shortcuts = app.global_shortcut();
    let _         = shortcuts.unregister_all();

    match shortcut {
        Some(shortcut) => shortcuts.register(shortcut).map_err(|error| {
            eprintln!("[screen-text] shortcut {shortcut} not registered: {error}");
            TAKEN_ERROR.to_string()
        }),
        None => Ok(()),
    }
}

fn set_taken(app: &AppHandle, taken: bool) {
    if let Ok(mut status) = app.state::<ShortcutStatus>().0.lock() {
        *status = taken;
    }
}

// "Ctrl+Alt+Shift+KeyT" as printed on the keyboard: "Ctrl+Alt+Shift+T".
pub fn shortcut_label(shortcut: &str) -> String {
    shortcut
        .split('+')
        .map(|part| match part {
            "Super" => "Windows",
            "Space" => "Espacio",
            other   => other.strip_prefix("Key").or_else(|| other.strip_prefix("Digit")).unwrap_or(other),
        })
        .collect::<Vec<_>>()
        .join("+")
}

pub fn taken_warning(shortcut: &str) -> String {
    format!("Otro programa ya usa {}, el atajo para copiar texto de la pantalla. Toca aquí para elegir otro.", shortcut_label(shortcut))
}

fn apply(app: &AppHandle) -> Result<(), String> {
    let saved  = settings::read(app).settings;
    let result = register(app, active(&saved).as_deref());
    set_taken(app, result.is_err());
    result
}

// At startup: the saved shortcut. If another program took it, a note in Ajustes and one Windows
// notification that opens it (even with the task notifications off: this is not a task's end).
pub fn apply_saved(app: &AppHandle) {
    if apply(app).is_err() {
        let shortcut = chosen(&settings::read(app).settings);
        notify::alert(app, NotifyRequest { body: taken_warning(&shortcut), page: SETTINGS_PAGE.to_string() });
    }
}

pub fn view(app: &AppHandle) -> ShortcutView {
    let saved = settings::read(app).settings;
    let taken = app.state::<ShortcutStatus>().0.lock().map(|taken| *taken).unwrap_or(false);

    ShortcutView { shortcut: chosen(&saved), enabled: !saved.screen_text_shortcut_off, taken: taken && !saved.screen_text_shortcut_off }
}

// Tries the new one first: if Windows refuses it, the one before stays and nothing is saved.
pub fn change(app: &AppHandle, request: ShortcutRequest) -> Result<ShortcutView, String> {
    let saved    = settings::read(app).settings;
    let shortcut = request.shortcut.unwrap_or_else(|| chosen(&saved));

    if !is_valid(&shortcut) {
        return Err(INVALID_ERROR.to_string());
    }

    let next = Settings {
        screen_text_shortcut     : (shortcut != DEFAULT_SHORTCUT).then_some(shortcut),
        screen_text_shortcut_off : !request.enabled,
        ..saved.clone()
    };

    if let Err(error) = register(app, active(&next).as_deref()) {
        let _ = register(app, active(&saved).as_deref());
        return Err(error);
    }

    set_taken(app, false);
    settings::update(app, next)?;
    Ok(view(app))
}

// While Ajustes listens for a new combination, the current one must not open the capture.
pub fn pause(app: &AppHandle, paused: bool) {
    if paused {
        let _ = app.global_shortcut().unregister_all();
    } else {
        let _ = apply(app);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn settings(shortcut: Option<&str>, off: bool) -> Settings {
        Settings { screen_text_shortcut: shortcut.map(str::to_string), screen_text_shortcut_off: off, ..Default::default() }
    }

    #[test]
    fn a_first_run_has_the_default_shortcut_on() {
        assert_eq!(active(&Settings::default()).as_deref(), Some(DEFAULT_SHORTCUT));
    }

    #[test]
    fn the_chosen_shortcut_wins_and_off_registers_none() {
        assert_eq!(active(&settings(Some("Ctrl+Shift+Digit9"), false)).as_deref(), Some("Ctrl+Shift+Digit9"));
        assert_eq!(active(&settings(Some("Ctrl+Shift+Digit9"), true)), None);
        assert_eq!(chosen(&settings(None, true)), DEFAULT_SHORTCUT);
    }

    #[test]
    fn the_warning_names_the_keys_as_printed() {
        assert_eq!(shortcut_label(DEFAULT_SHORTCUT), "Ctrl+Alt+Shift+T");
        assert_eq!(shortcut_label("Super+Digit4"), "Windows+4");
        assert_eq!(taken_warning("Alt+F9"), "Otro programa ya usa Alt+F9, el atajo para copiar texto de la pantalla. Toca aquí para elegir otro.");
    }

    #[test]
    fn only_shortcuts_that_do_not_get_in_the_way_of_typing() {
        assert!(is_valid(DEFAULT_SHORTCUT));
        assert!(is_valid("Alt+F2"));
        assert!(is_valid("Super+Shift+KeyE"));
        assert!(!is_valid("Shift+KeyA"));
        assert!(!is_valid("KeyA"));
        assert!(!is_valid("Ctrl+Nada"));
    }
}
