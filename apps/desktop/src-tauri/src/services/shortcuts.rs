// Glup's keyboard shortcuts, registered with Windows so they work from any app: "Copiar texto de la
// pantalla", "Portapapeles" and opening and closing the panel (the way back to a hidden Glup). Each can be changed or turned off in Ajustes and is kept in settings.json.
use std::{collections::HashMap, str::FromStr, sync::Mutex};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Modifiers, Shortcut};

use crate::services::{
    clipboard,
    island_window,
    notify::{self, NotifyRequest},
    screen_text,
    settings::{self, Settings},
};

// Three modifiers, which neither Windows nor the usual programs use. T for "texto", H for the
// "historial" of what was copied, G for Glup itself.
pub const SCREEN_TEXT_DEFAULT: &str = "Ctrl+Alt+Shift+KeyT";
pub const CLIPBOARD_DEFAULT: &str   = "Ctrl+Alt+Shift+KeyH";
pub const ISLAND_DEFAULT: &str      = "Ctrl+Alt+Shift+KeyG";

pub const TAKEN_ERROR: &str   = "Ese atajo ya lo usa otro programa. Prueba con otro.";
pub const INVALID_ERROR: &str = "Ese atajo no me sirve. Usa Ctrl, Alt o Windows junto con otra tecla.";
// The page a click on the startup warning opens.
pub const SETTINGS_PAGE: &str = "settings";

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ShortcutTarget {
    ScreenText,
    Clipboard,
    Island,
}

pub const TARGETS: [ShortcutTarget; 3] = [ShortcutTarget::ScreenText, ShortcutTarget::Clipboard, ShortcutTarget::Island];

impl ShortcutTarget {
    pub fn default_shortcut(self) -> &'static str {
        match self {
            Self::ScreenText => SCREEN_TEXT_DEFAULT,
            Self::Clipboard  => CLIPBOARD_DEFAULT,
            Self::Island     => ISLAND_DEFAULT,
        }
    }

    // What it does, for the warnings: "el atajo para …".
    pub fn purpose(self) -> &'static str {
        match self {
            Self::ScreenText => "copiar texto de la pantalla",
            Self::Clipboard  => "abrir el portapapeles",
            Self::Island     => "abrir y cerrar Glup",
        }
    }

    // Its name, when another of Glup's shortcuts already has the keys.
    pub fn feature(self) -> &'static str {
        match self {
            Self::ScreenText => "«Copiar texto de la pantalla»",
            Self::Clipboard  => "«Portapapeles»",
            Self::Island     => "«Abrir y cerrar Glup»",
        }
    }

    fn saved(self, settings: &Settings) -> (Option<String>, bool) {
        match self {
            Self::ScreenText => (settings.screen_text_shortcut.clone(), settings.screen_text_shortcut_off),
            Self::Clipboard  => (settings.clipboard_shortcut.clone(), settings.clipboard_shortcut_off),
            Self::Island     => (settings.island_shortcut.clone(), settings.island_shortcut_off),
        }
    }

    // The settings with this shortcut changed; the one chosen is kept only when it is not the default.
    pub fn with_choice(self, settings: &Settings, shortcut: String, enabled: bool) -> Settings {
        let custom = (shortcut != self.default_shortcut()).then_some(shortcut);

        match self {
            Self::ScreenText => Settings { screen_text_shortcut: custom, screen_text_shortcut_off: !enabled, ..settings.clone() },
            Self::Clipboard  => Settings { clipboard_shortcut: custom, clipboard_shortcut_off: !enabled, ..settings.clone() },
            Self::Island     => Settings { island_shortcut: custom, island_shortcut_off: !enabled, ..settings.clone() },
        }
    }
}

// What is registered now for each shortcut, and which ones another program had at startup.
#[derive(Default)]
pub struct ShortcutStatus(Mutex<StatusInner>);

#[derive(Default)]
struct StatusInner {
    registered : HashMap<ShortcutTarget, String>,
    taken      : Vec<ShortcutTarget>,
}

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
    pub target   : ShortcutTarget,
    // None keeps the one chosen before.
    pub shortcut : Option<String>,
    pub enabled  : bool,
}

pub fn chosen(target: ShortcutTarget, settings: &Settings) -> String {
    target.saved(settings).0.unwrap_or_else(|| target.default_shortcut().to_string())
}

// The one to register: none when turned off.
pub fn active(target: ShortcutTarget, settings: &Settings) -> Option<String> {
    (!target.saved(settings).1).then(|| chosen(target, settings))
}

// A key alone or with only Shift would get in the way of typing.
pub fn is_valid(shortcut: &str) -> bool {
    Shortcut::from_str(shortcut).is_ok_and(|parsed| parsed.mods.intersects(Modifiers::CONTROL | Modifiers::ALT | Modifiers::SUPER))
}

// The same keys written another way ("Alt+Ctrl+KeyT") are the same shortcut.
pub fn same_keys(a: &str, b: &str) -> bool {
    match (Shortcut::from_str(a), Shortcut::from_str(b)) {
        (Ok(a), Ok(b)) => a.mods == b.mods && a.key == b.key,
        _              => false,
    }
}

// Another of Glup's shortcuts that would end up with the same keys.
pub fn clash(target: ShortcutTarget, shortcut: &str, settings: &Settings) -> Option<ShortcutTarget> {
    TARGETS.into_iter().filter(|other| *other != target).find(|other| active(*other, settings).is_some_and(|keys| same_keys(&keys, shortcut)))
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

pub fn taken_warning(target: ShortcutTarget, shortcut: &str) -> String {
    format!("Otro programa ya usa {}, el atajo para {}. Toca aquí para elegir otro.", shortcut_label(shortcut), target.purpose())
}

fn clash_error(other: ShortcutTarget) -> String {
    format!("Ese atajo ya lo usa {}. Elige otro.", other.feature())
}

// Swaps one shortcut for another, leaving the rest of Glup's as they are.
fn register(app: &AppHandle, target: ShortcutTarget, shortcut: Option<&str>) -> Result<(), String> {
    let status    = app.state::<ShortcutStatus>();
    let shortcuts = app.global_shortcut();
    let previous  = status.0.lock().ok().and_then(|mut inner| inner.registered.remove(&target));

    if let Some(previous) = previous {
        let _ = shortcuts.unregister(previous.as_str());
    }

    let Some(shortcut) = shortcut else { return Ok(()) };

    shortcuts.register(shortcut).map_err(|error| {
        eprintln!("[shortcuts] {shortcut} not registered: {error}");
        TAKEN_ERROR.to_string()
    })?;

    if let Ok(mut inner) = status.0.lock() {
        inner.registered.insert(target, shortcut.to_string());
    }
    Ok(())
}

fn set_taken(app: &AppHandle, target: ShortcutTarget, taken: bool) {
    if let Ok(mut inner) = app.state::<ShortcutStatus>().0.lock() {
        inner.taken.retain(|current| *current != target);
        if taken {
            inner.taken.push(target);
        }
    }
}

fn apply(app: &AppHandle, target: ShortcutTarget) -> Result<(), String> {
    let saved  = settings::read(app).settings;
    let result = register(app, target, active(target, &saved).as_deref());
    set_taken(app, target, result.is_err());
    result
}

// At startup: the saved shortcuts. One another program took gets a note in Ajustes and one Windows
// notification that opens it (even with the task notifications off: this is not a task's end).
pub fn apply_saved(app: &AppHandle) {
    for target in TARGETS {
        if apply(app, target).is_err() {
            let shortcut = chosen(target, &settings::read(app).settings);
            notify::alert(app, NotifyRequest { body: taken_warning(target, &shortcut), page: SETTINGS_PAGE.to_string() });
        }
    }
}

// A shortcut was pressed: whichever of Glup's has those keys.
pub fn dispatch(app: &AppHandle, pressed: &Shortcut) {
    let target = app.state::<ShortcutStatus>().0.lock().ok().and_then(|inner| {
        inner.registered.iter().find(|(_, keys)| Shortcut::from_str(keys).is_ok_and(|keys| keys.mods == pressed.mods && keys.key == pressed.key)).map(|(target, _)| *target)
    });

    match target {
        Some(ShortcutTarget::ScreenText) => screen_text::start(app),
        Some(ShortcutTarget::Clipboard)  => clipboard::open_screen(app),
        Some(ShortcutTarget::Island)     => island_window::request_toggle(app),
        None                             => {}
    }
}

pub fn view(app: &AppHandle, target: ShortcutTarget) -> ShortcutView {
    let saved   = settings::read(app).settings;
    let enabled = active(target, &saved).is_some();
    let taken   = app.state::<ShortcutStatus>().0.lock().map(|inner| inner.taken.contains(&target)).unwrap_or(false);

    ShortcutView { shortcut: chosen(target, &saved), enabled, taken: taken && enabled }
}

// Tries the new one first: if Windows refuses it, the one before stays and nothing is saved.
pub fn change(app: &AppHandle, request: ShortcutRequest) -> Result<ShortcutView, String> {
    let target   = request.target;
    let saved    = settings::read(app).settings;
    let shortcut = request.shortcut.unwrap_or_else(|| chosen(target, &saved));

    if !is_valid(&shortcut) {
        return Err(INVALID_ERROR.to_string());
    }

    if request.enabled {
        if let Some(other) = clash(target, &shortcut, &saved) {
            return Err(clash_error(other));
        }
    }

    let next = target.with_choice(&saved, shortcut, request.enabled);

    if let Err(error) = register(app, target, active(target, &next).as_deref()) {
        let _ = register(app, target, active(target, &saved).as_deref());
        return Err(error);
    }

    set_taken(app, target, false);
    settings::update(app, next)?;
    Ok(view(app, target))
}

// While Ajustes listens for a new combination, Glup's shortcuts must not fire.
pub fn pause(app: &AppHandle, paused: bool) {
    if paused {
        let _ = app.global_shortcut().unregister_all();
        if let Ok(mut inner) = app.state::<ShortcutStatus>().0.lock() {
            inner.registered.clear();
        }
    } else {
        for target in TARGETS {
            let _ = apply(app, target);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn settings(shortcut: Option<&str>, off: bool) -> Settings {
        Settings { screen_text_shortcut: shortcut.map(str::to_string), screen_text_shortcut_off: off, ..Default::default() }
    }

    #[test]
    fn a_first_run_has_every_default_shortcut_on() {
        assert_eq!(active(ShortcutTarget::ScreenText, &Settings::default()).as_deref(), Some(SCREEN_TEXT_DEFAULT));
        assert_eq!(active(ShortcutTarget::Clipboard, &Settings::default()).as_deref(), Some(CLIPBOARD_DEFAULT));
        assert_eq!(active(ShortcutTarget::Island, &Settings::default()).as_deref(), Some(ISLAND_DEFAULT));
    }

    #[test]
    fn the_three_defaults_never_share_keys() {
        let saved = Settings::default();
        for target in TARGETS {
            assert_eq!(clash(target, target.default_shortcut(), &saved), None);
            assert!(is_valid(target.default_shortcut()));
        }
    }

    #[test]
    fn the_chosen_shortcut_wins_and_off_registers_none() {
        let target = ShortcutTarget::ScreenText;

        assert_eq!(active(target, &settings(Some("Ctrl+Shift+Digit9"), false)).as_deref(), Some("Ctrl+Shift+Digit9"));
        assert_eq!(active(target, &settings(Some("Ctrl+Shift+Digit9"), true)), None);
        assert_eq!(chosen(target, &settings(None, true)), SCREEN_TEXT_DEFAULT);
    }

    #[test]
    fn changing_one_leaves_the_other_alone() {
        let next = ShortcutTarget::Clipboard.with_choice(&settings(Some("Alt+F9"), false), "Ctrl+Alt+Shift+KeyK".to_string(), true);

        assert_eq!(next.clipboard_shortcut.as_deref(), Some("Ctrl+Alt+Shift+KeyK"));
        assert_eq!(next.screen_text_shortcut.as_deref(), Some("Alt+F9"));
        assert_eq!(ShortcutTarget::Clipboard.with_choice(&next, CLIPBOARD_DEFAULT.to_string(), false).clipboard_shortcut, None);
    }

    #[test]
    fn two_of_glups_shortcuts_never_share_the_keys() {
        let saved = Settings::default();

        assert_eq!(clash(ShortcutTarget::Clipboard, "Alt+Ctrl+Shift+KeyT", &saved), Some(ShortcutTarget::ScreenText));
        assert_eq!(clash(ShortcutTarget::Clipboard, "Ctrl+Alt+Shift+KeyK", &saved), None);
        assert_eq!(clash(ShortcutTarget::Clipboard, SCREEN_TEXT_DEFAULT, &settings(None, true)), None);
        assert_eq!(clash_error(ShortcutTarget::ScreenText), "Ese atajo ya lo usa «Copiar texto de la pantalla». Elige otro.");
    }

    #[test]
    fn the_warning_names_the_keys_as_printed() {
        assert_eq!(shortcut_label(SCREEN_TEXT_DEFAULT), "Ctrl+Alt+Shift+T");
        assert_eq!(shortcut_label("Super+Digit4"), "Windows+4");
        assert_eq!(
            taken_warning(ShortcutTarget::ScreenText, "Alt+F9"),
            "Otro programa ya usa Alt+F9, el atajo para copiar texto de la pantalla. Toca aquí para elegir otro."
        );
        assert!(taken_warning(ShortcutTarget::Clipboard, CLIPBOARD_DEFAULT).contains("abrir el portapapeles"));
    }

    #[test]
    fn only_shortcuts_that_do_not_get_in_the_way_of_typing() {
        assert!(is_valid(SCREEN_TEXT_DEFAULT));
        assert!(is_valid(CLIPBOARD_DEFAULT));
        assert!(is_valid("Alt+F2"));
        assert!(is_valid("Super+Shift+KeyE"));
        assert!(!is_valid("Shift+KeyA"));
        assert!(!is_valid("KeyA"));
        assert!(!is_valid("Ctrl+Nada"));
    }
}
