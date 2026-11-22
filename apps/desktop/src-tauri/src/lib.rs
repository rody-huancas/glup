mod commands;
mod services;

use tauri::Manager;

pub const MAIN_WINDOW_LABEL: &str = "main";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![commands::cursor::get_cursor_position])
        .setup(|app| {
            let window = app
                .get_webview_window(MAIN_WINDOW_LABEL)
                .ok_or("main window not found")?;

            services::window_position::place_bottom_right(&window)?;
            window.show()?;
            services::tray::create(app.handle())?;
            services::cursor_tracker::spawn(app.handle().clone());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Glup");
}
