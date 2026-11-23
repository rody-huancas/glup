mod commands;
mod services;

use tauri::Manager;
use tauri_plugin_autostart::MacosLauncher;

use services::{
    actions::ActionControl, background::session::BackgroundSession, cleanup::CleanupState, history::HistoryStore, island_window::{IslandArea, IslandFrame}, pdf::save_images::PageImageSessions,
    clipboard::ClipboardState, screen_text::ScreenTextState, settings::SettingsStore, shortcuts::ShortcutStatus, startup::{LaunchOpen, TrayAutostart, AUTOSTART_ARG}, tasks::TaskRegistry, updates::UpdateState,
    visibility::Visibility,
};

pub const ISLAND_WINDOW_LABEL: &str = "island";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // First: a second Glup never opens; the one running shows its island, as "Abrir Glup".
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| services::startup::second_launch(app, args)))
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, Some(vec![AUTOSTART_ARG])))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        // Glup's shortcuts ("Copiar texto de la pantalla", "Portapapeles"): shortcuts.rs knows which is which.
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                        services::shortcuts::dispatch(app, shortcut);
                    }
                })
                .build(),
        )
        .manage(Visibility::default())
        .manage(IslandArea::default())
        .manage(IslandFrame::default())
        .manage(HistoryStore::default())
        .manage(SettingsStore::default())
        .manage(ActionControl::default())
        .manage(PageImageSessions::default())
        .manage(TaskRegistry::default())
        .manage(CleanupState::default())
        .manage(TrayAutostart::default())
        .manage(BackgroundSession::default())
        .manage(UpdateState::default())
        .manage(ScreenTextState::default())
        .manage(ShortcutStatus::default())
        .manage(ClipboardState::default())
        .manage(services::id_photo::IdPhotoSessions::default())
        .manage(std::sync::Arc::new(services::transcribe::engine::TranscribeSession::default()))
        .manage(LaunchOpen::new(services::startup::launch_open_pending()))
        .invoke_handler(tauri::generate_handler![
            commands::cursor::get_cursor_position,
            commands::files::get_files_info,
            commands::files::open_file,
            commands::files::reveal_file,
            commands::links::open_issues,
            commands::actions::run_action,
            commands::actions::cancel_action,
            commands::actions::begin_page_images,
            commands::actions::save_page_image,
            commands::actions::finish_page_images,
            commands::actions::get_active_tasks,
            commands::actions::dismiss_task,
            commands::actions::sign_pdf,
            commands::actions::organize_pdf,
            commands::actions::check_pdf_password,
            commands::cleanup::get_disk_space,
            commands::cleanup::scan_cleanup,
            commands::cleanup::clean_up,
            commands::signatures::list_signatures,
            commands::signatures::save_signature,
            commands::signatures::delete_signature,
            commands::files::read_file_bytes,
            commands::settings::get_settings,
            commands::settings::update_settings,
            commands::background::get_background_model,
            commands::background::download_background_model,
            commands::background::delete_background_model,
            commands::video::get_video_tool,
            commands::video::download_video_tool,
            commands::video::delete_video_tool,
            commands::video::plan_videos,
            commands::text::get_text_support,
            commands::text::read_image_text,
            commands::text::read_page_text,
            commands::text::finish_text,
            commands::text::save_text,
            commands::notify::notify_task,
            commands::notify::is_glup_in_front,
            commands::screen_text::start_screen_text,
            commands::screen_text::get_capture_image,
            commands::screen_text::capture_ready,
            commands::screen_text::read_screen_text,
            commands::screen_text::cancel_screen_text,
            commands::screen_text::copy_screen_text,
            commands::shortcuts::get_shortcut,
            commands::shortcuts::set_shortcut,
            commands::shortcuts::pause_shortcuts,
            commands::clipboard::get_clipboard_status,
            commands::clipboard::set_clipboard_enabled,
            commands::clipboard::set_clipboard_limit,
            commands::clipboard::set_clipboard_excluded,
            commands::clipboard::pause_clipboard,
            commands::clipboard::list_clips,
            commands::clipboard::get_clip_image,
            commands::clipboard::copy_clip,
            commands::clipboard::remove_clips,
            commands::clipboard::set_clip_pinned,
            commands::id_photo::prepare_id_photo,
            commands::id_photo::id_photo_preview,
            commands::id_photo::save_id_photo,
            commands::transcribe::get_transcribe_model,
            commands::transcribe::download_transcribe_model,
            commands::transcribe::delete_transcribe_model,
            commands::transcribe::transcribe_audio,
            commands::transcribe::estimate_transcription,
            commands::transcribe::save_subtitles,
            commands::startup::get_launch_info,
            commands::startup::take_launch_open,
            commands::startup::get_autostart,
            commands::startup::set_autostart,
            commands::history::get_history,
            commands::history::clear_history,
            commands::history::remove_history_entries,
            commands::updates::get_update,
            commands::updates::check_update,
            commands::updates::install_update,
            commands::island::set_island_area,
            commands::island::set_island_focus,
            commands::island::get_island_status,
            commands::island::log_island
        ])
        .setup(|app| {
            let window = app
                .get_webview_window(ISLAND_WINDOW_LABEL)
                .ok_or("island window not found")?;

            services::island_window::center_top(&window)?;
            services::island_window::remember_frame(&window);
            services::island_window::set_area(&window, services::island_window::INITIAL_AREA)?;
            services::visibility::apply(app.handle());
            services::tray::create(app.handle())?;
            services::cursor_tracker::spawn(app.handle().clone());
            services::fullscreen_watcher::spawn(app.handle().clone());
            services::island_watchdog::spawn(app.handle().clone());
            services::updates::spawn(app.handle().clone());
            services::shortcuts::apply_saved(app.handle());
            services::clipboard::spawn(app.handle().clone());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Glup");
}
