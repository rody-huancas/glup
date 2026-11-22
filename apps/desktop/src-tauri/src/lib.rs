mod commands;
mod services;

use tauri::Manager;

use services::visibility::Visibility;

pub const MAIN_WINDOW_LABEL: &str = "main";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(Visibility::default())
        .invoke_handler(tauri::generate_handler![
            commands::cursor::get_cursor_position,
            commands::files::get_files_info,
            commands::island::resize_island,
            commands::island::set_island_focus
        ])
        .setup(|app| {
            let window = app
                .get_webview_window(MAIN_WINDOW_LABEL)
                .ok_or("main window not found")?;

            // services::window_position::place_bottom_right(&window)?;
            services::island_window::center_top(&window)?;
            services::visibility::apply(app.handle());
            services::tray::create(app.handle())?;
            services::cursor_tracker::spawn(app.handle().clone());
            services::fullscreen_watcher::spawn(app.handle().clone());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Glup");
}
