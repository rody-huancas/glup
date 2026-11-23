// Fixed here, so the interface can never ask to open any other address.
pub const ISSUES_URL: &str = "https://github.com/rody-huancas/glup/issues";

// Where people tell Glup what else it could learn (the empty search in Herramientas).
#[tauri::command]
pub fn open_issues() -> Result<(), String> {
    tauri_plugin_opener::open_url(ISSUES_URL, None::<&str>).map_err(|error| error.to_string())
}
