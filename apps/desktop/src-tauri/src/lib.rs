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
    let args = std::env::args().collect::<Vec<_>>();

    // The installer writes or removes the Explorer's entries with Glup itself, without starting it.
    if services::explorer::installer_mode(&args) {
        return;
    }
    // Files from the Explorer for the Glup already open: it may come to the front.
    if services::explorer::parse_args(&args).is_some() {
        services::dev_build::let_glup_come_forward();
    }
    services::dev_build::attach_console();

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
        .manage(services::island_drag::IslandDrag::default())
        .manage(HistoryStore::default())
        .manage(SettingsStore::default())
        .manage(ActionControl::default())
        .manage(PageImageSessions::default())
        .manage(TaskRegistry::default())
        .manage(CleanupState::default())
        .manage(services::folder_sort::FolderSortState::default())
        .manage(services::scan::ScanState::default())
        .manage(services::explorer::ExplorerInbox::default())
        .manage(services::duplicates::DuplicatesState::default())
        .manage(services::media::serve::MediaFiles::default())
        .manage(services::media::MediaSession::default())
        .manage(services::space::SpaceState::default())
        .manage(services::rename::RenameState::default())
        .manage(services::auto_folders::AutoFolders::default())
        // The file of the trimming screen, to its player, in pieces (services/media/serve.rs).
        .register_asynchronous_uri_scheme_protocol(services::media::serve::SCHEME, |context, request, responder| {
            let app = context.app_handle().clone();
            std::thread::spawn(move || {
                let files = app.state::<services::media::serve::MediaFiles>();
                responder.respond(services::media::serve::respond(&files, &request));
            });
        })
        .manage(services::performance::PerformanceState::default())
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
            commands::media::open_media,
            commands::media::make_media_preview,
            commands::media::get_media_keyframes,
            commands::media::get_media_strip,
            commands::media::get_media_wave,
            commands::media::close_media,
            commands::media::trim_media,
            commands::space::get_space_places,
            commands::space::analyze_space,
            commands::space::get_space_view,
            commands::space::trash_space_item,
            commands::space::rename_preview,
            commands::space::rename_folder_files,
            commands::space::apply_rename,
            commands::space::undo_rename,
            commands::auto_folders::get_auto_folders,
            commands::auto_folders::save_auto_rule,
            commands::auto_folders::delete_auto_rule,
            commands::auto_folders::duplicate_auto_rule,
            commands::auto_folders::set_auto_rule_enabled,
            commands::auto_folders::set_auto_folders_paused,
            commands::auto_folders::preview_auto_rule,
            commands::auto_folders::answer_auto_catch_up,
            commands::auto_folders::resume_auto_rule,
            commands::auto_folders::undo_auto_trash,
            commands::qr::qr_preview,
            commands::qr::save_qr,
            commands::qr::copy_qr,
            commands::qr::read_qr_files,
            commands::qr::read_qr_bytes,
            commands::qr::read_qr_clipboard,
            commands::qr::start_screen_qr,
            commands::qr::save_qr_contact,
            commands::qr::connect_qr_wifi,
            commands::qr::open_qr_link,
            commands::qr::is_capturing_codes,
            commands::photo_tools::get_photo_preview,
            commands::photo_tools::find_photo_face,
            commands::photo_tools::get_photo_sizes,
            commands::photo_tools::get_mark_config,
            commands::photo_tools::save_mark_config,
            commands::photo_tools::get_upscale_model,
            commands::photo_tools::download_upscale_model,
            commands::photo_tools::delete_upscale_model,
            commands::photo_tools::get_upscale_preview,
            commands::subtitles::listen_subtitles,
            commands::subtitles::save_video_subtitles,
            commands::subtitles::preview_animation,
            commands::subtitles::save_animation,
            commands::duplicates::get_duplicate_defaults,
            commands::duplicates::check_duplicate_folder,
            commands::duplicates::scan_duplicates,
            commands::duplicates::remove_duplicates,
            commands::explorer::take_explorer_requests,
            commands::explorer::set_explorer_menu,
            commands::explorer::set_send_to,
            commands::explorer::open_island,
            commands::scan::open_scan_photo,
            commands::scan::get_scan_photo,
            commands::scan::get_scan_preview,
            commands::scan::close_scan,
            commands::scan::scan_document,
            commands::folder_sort::get_sort_folder,
            commands::folder_sort::get_downloads_to_sort,
            commands::folder_sort::preview_folder_sort,
            commands::folder_sort::sort_folder,
            commands::folder_sort::undo_folder_sort,
            commands::cleanup::get_disk_space,
            commands::cleanup::scan_cleanup,
            commands::cleanup::clean_up,
            commands::signatures::list_signatures,
            commands::signatures::save_signature,
            commands::signatures::delete_signature,
            commands::files::read_file_bytes,
            commands::photos::get_heif_support,
            commands::performance::get_performance,
            commands::performance::close_app,
            commands::performance::force_close_app,
            commands::performance::get_startup_apps,
            commands::performance::set_startup_app,
            commands::performance::get_app_icon,
            commands::photos::get_image_preview,
            commands::settings::get_settings,
            commands::settings::get_account_name,
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
            commands::transcribe::get_transcribe_engine,
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
            commands::island::get_island_screens,
            commands::island::set_island_frame,
            commands::island::begin_island_drag,
            commands::island::set_island_dock,
            commands::island::set_island_mode,
            commands::island::set_island_bubble,
            commands::island::get_taskbar_state,
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
            services::island_window::set_area(&window, services::island_window::INITIAL_AREA, services::island_window::PLAIN_AREA)?;
            services::visibility::apply(app.handle());
            services::tray::create(app.handle())?;
            services::cursor_tracker::spawn(app.handle().clone());
            services::fullscreen_watcher::spawn(app.handle().clone());
            services::island_watchdog::spawn(app.handle().clone());
            services::updates::spawn(app.handle().clone());
            services::shortcuts::apply_saved(app.handle());
            services::clipboard::spawn(app.handle().clone());
            services::folder_sort::spawn_recovery(app.handle().clone());
            services::rename::spawn_recovery(app.handle().clone());
            services::auto_folders::start(app.handle());
            // The right click and "Enviar a" point at this Glup; the files this launch brings, gathered.
            services::explorer::sync(app.handle());
            services::explorer::receive(app.handle(), &std::env::args().collect::<Vec<_>>());
            if let Ok(folder) = services::video::tool::tools_folder(app.handle()) {
                services::image::heif::remember_tools(folder);
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Glup");
}
