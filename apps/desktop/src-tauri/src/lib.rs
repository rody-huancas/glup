mod commands;
mod services;

use tauri::Manager;

use services::{island_window::IslandArea, visibility::Visibility};

pub const ISLAND_WINDOW_LABEL: &str = "island";
// pub const MAIN_WINDOW_LABEL: &str   = "main";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(Visibility::default())
        .manage(IslandArea::default())
        .invoke_handler(tauri::generate_handler![
            commands::cursor::get_cursor_position,
            commands::files::get_files_info,
            // commands::island::resize_island,
            commands::island::set_island_area,
            commands::island::set_island_focus
            // commands::main_window::open_main_window
        ])
        // .on_window_event(services::main_window::handle_event)
        .setup(|app| {
            let window = app
                .get_webview_window(ISLAND_WINDOW_LABEL)
                .ok_or("island window not found")?;

            // services::window_position::place_bottom_right(&window)?;
            services::island_window::center_top(&window)?;
            services::island_window::set_area(&window, services::island_window::INITIAL_AREA)?;
            services::visibility::apply(app.handle());
            services::tray::create(app.handle())?;
            services::cursor_tracker::spawn(app.handle().clone());
            services::fullscreen_watcher::spawn(app.handle().clone());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Glup");
}
