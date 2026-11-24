use tauri::{
    menu::{CheckMenuItem, Menu, MenuEvent, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Manager, Result,
};

use crate::services::{clipboard, island_window, screen_text, settings, startup, visibility};

const TRAY_ID: &str        = "glup-tray";
const OPEN_ID: &str        = "open";
const SCREEN_TEXT_ID: &str = "screen-text";
const CLIPBOARD_ID: &str   = "clipboard-pause";
const TOGGLE_ID: &str      = "toggle";
const AUTOSTART_ID: &str   = "autostart";
const QUIT_ID: &str        = "quit";

pub fn create(app: &AppHandle) -> Result<()> {
    let open   = MenuItem::with_id(app, OPEN_ID, "Abrir Glup", true, None::<&str>)?;
    let text   = MenuItem::with_id(app, SCREEN_TEXT_ID, "Copiar texto de la pantalla", true, None::<&str>)?;
    let pause  = MenuItem::with_id(app, CLIPBOARD_ID, clipboard::PAUSE_LABEL, true, None::<&str>)?;
    let toggle = MenuItem::with_id(app, TOGGLE_ID, "Mostrar/Ocultar Glup", true, None::<&str>)?;
    let start  = CheckMenuItem::with_id(app, AUTOSTART_ID, "Abrir al encender la computadora", true, startup::is_enabled(app), None::<&str>)?;
    let quit   = MenuItem::with_id(app, QUIT_ID, "Salir", true, None::<&str>)?;
    let menu   = Menu::with_items(app, &[&open, &text, &pause, &toggle, &start, &quit])?;

    if let Ok(mut item) = app.state::<startup::TrayAutostart>().0.lock() {
        *item = Some(start);
    }

    // Its text says "Reanudar…" while paused.
    if let Ok(mut item) = app.state::<clipboard::ClipboardState>().tray.lock() {
        *item = Some(pause);
    }

    let mut builder = TrayIconBuilder::with_id(TRAY_ID)
        .tooltip("Glup")
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(handle_menu_event);

    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }

    builder.build(app)?;
    Ok(())
}

fn handle_menu_event(app: &AppHandle, event: MenuEvent) {
    match event.id().as_ref() {
        OPEN_ID        => {
            #[cfg(debug_assertions)]
            eprintln!("[glup:isla] abrir fijada: «Abrir Glup» de la bandeja");
            island_window::request_open(app);
        }
        SCREEN_TEXT_ID => screen_text::start(app),
        CLIPBOARD_ID   => clipboard::toggle_pause(app),
        TOGGLE_ID      => show_or_hide(app),
        // The checkbox flips itself on click; set_enabled puts it back to Windows' real state.
        AUTOSTART_ID   => {
            let _ = startup::set_enabled(app, !startup::is_enabled(app));
        }
        QUIT_ID        => app.exit(0),
        _              => {}
    }
}

// "Mostrar/Ocultar Glup". Hidden at rest (modo oculto) showing it alone would leave nothing on screen,
// so it comes out with the panel open.
fn show_or_hide(app: &AppHandle) {
    let was_hidden = visibility::snapshot(app).user_hidden;
    visibility::toggle_user_hidden(app);

    if was_hidden && settings::read(app).settings.island_hidden {
        island_window::request_open(app);
    }
}
