use tauri::{
    menu::{Menu, MenuEvent, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Result,
};

use crate::services::{island_window, visibility};
// use crate::services::main_window;

const TRAY_ID: &str   = "glup-tray";
const OPEN_ID: &str   = "open";
const TOGGLE_ID: &str = "toggle";
const QUIT_ID: &str   = "quit";

pub fn create(app: &AppHandle) -> Result<()> {
    let open   = MenuItem::with_id(app, OPEN_ID, "Abrir Glup", true, None::<&str>)?;
    let toggle = MenuItem::with_id(app, TOGGLE_ID, "Mostrar/Ocultar Glup", true, None::<&str>)?;
    let quit   = MenuItem::with_id(app, QUIT_ID, "Salir", true, None::<&str>)?;
    let menu   = Menu::with_items(app, &[&open, &toggle, &quit])?;

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
        OPEN_ID   => island_window::request_open(app),
        // OPEN_ID   => {
        //     let _ = main_window::open(app);
        // }
        TOGGLE_ID => visibility::toggle_user_hidden(app),
        QUIT_ID   => app.exit(0),
        _         => {}
    }
}
