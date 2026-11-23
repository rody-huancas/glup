use std::{
    sync::{
        atomic::{AtomicBool, Ordering},
        Mutex,
    },
    thread,
    time::Duration,
};

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_updater::{Update, UpdaterExt};

pub const UPDATE_AVAILABLE_EVENT: &str = "update-available";
pub const UPDATE_PROGRESS_EVENT: &str  = "update-progress";
// Lets a debug build check on its own too (normally only the manual button checks there).
pub const UPDATE_CHECK_VAR: &str       = "GLUP_UPDATE_CHECK";

pub const CHECK_EVERY: Duration        = Duration::from_secs(6 * 60 * 60);
// Offline or GitHub down: quietly try again sooner than the regular check.
pub const RETRY_AFTER: Duration        = Duration::from_secs(30 * 60);
// The first check waits a little, so it never competes with Glup starting up.
pub const FIRST_CHECK_AFTER: Duration  = Duration::from_secs(20);

pub const INSTALL_ERROR: &str          = "No pude actualizarme. Vuelve a intentarlo más tarde.";
pub const CHECK_ERROR: &str            = "No pude revisar ahora. Lo vuelvo a intentar más tarde.";
pub const NO_UPDATE_ERROR: &str        = "Ya no hay una versión nueva para instalar.";

// The update found by the last check, kept to install it later without asking GitHub again.
#[derive(Default)]
pub struct UpdateState {
    pending    : Mutex<Option<Update>>,
    installing : AtomicBool,
}

#[derive(Serialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInfo {
    pub version : String,
    pub notes   : String,
}

#[derive(Serialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProgress {
    pub downloaded : u64,
    pub total      : Option<u64>,
}

pub struct ShouldEmitParams {
    pub last       : u64,
    pub downloaded : u64,
    pub total      : Option<u64>,
}

pub fn info_of(update: &Update) -> UpdateInfo {
    UpdateInfo { version: update.version.clone(), notes: update.body.clone().unwrap_or_default().trim().to_string() }
}

pub fn next_check_after(checked: bool) -> Duration {
    if checked { CHECK_EVERY } else { RETRY_AFTER }
}

pub fn checks_on_its_own(debug: bool, forced: bool) -> bool {
    !debug || forced
}

// One event per percent (or per 512 KB when the size is unknown), never one per network chunk.
pub fn should_emit(params: ShouldEmitParams) -> bool {
    let step = match params.total {
        Some(total) if total > 0 => (total / 100).max(1),
        _                        => 512 * 1024,
    };

    params.downloaded == params.total.unwrap_or(0) || params.downloaded >= params.last + step
}

pub fn pending(app: &AppHandle) -> Option<UpdateInfo> {
    let state = app.state::<UpdateState>();
    let found = state.pending.lock().ok()?.as_ref().map(info_of);
    found
}

// Asks the latest Release; a newer version is kept and announced. Failures only go to the log.
pub async fn check(app: &AppHandle) -> Result<Option<UpdateInfo>, String> {
    let updater = app.updater().map_err(|error| log_error("updater", error))?;
    let update  = updater.check().await.map_err(|error| log_error("check", error))?;
    let info    = update.as_ref().map(info_of);

    if let Ok(mut pending) = app.state::<UpdateState>().pending.lock() {
        *pending = update;
    }

    if let Some(info) = &info {
        let _ = app.emit(UPDATE_AVAILABLE_EVENT, info);
    }

    Ok(info)
}

// At start and then every 6 hours, in its own thread; it never shows an error.
pub fn spawn(app: AppHandle) {
    let forced = std::env::var(UPDATE_CHECK_VAR).is_ok_and(|value| value == "1");
    if !checks_on_its_own(cfg!(debug_assertions), forced) {
        return;
    }

    thread::spawn(move || {
        thread::sleep(FIRST_CHECK_AFTER);

        loop {
            let installing = app.state::<UpdateState>().installing.load(Ordering::SeqCst);
            let checked    = installing || tauri::async_runtime::block_on(check(&app)).is_ok();
            thread::sleep(next_check_after(checked));
        }
    });
}

// Downloads with progress, verifies the signature and runs the installer, which closes Glup and opens it again.
pub async fn install(app: &AppHandle) -> Result<(), String> {
    let state = app.state::<UpdateState>();
    if state.installing.swap(true, Ordering::SeqCst) {
        return Ok(());
    }

    let update = state.pending.lock().ok().and_then(|pending| pending.clone());
    let Some(update) = update else {
        state.installing.store(false, Ordering::SeqCst);
        return Err(NO_UPDATE_ERROR.to_string());
    };

    let mut downloaded = 0_u64;
    let mut last       = 0_u64;
    let emitter        = app.clone();
    let result         = update
        .download_and_install(
            |chunk, total| {
                downloaded += chunk as u64;
                if should_emit(ShouldEmitParams { last, downloaded, total }) {
                    last = downloaded;
                    let _ = emitter.emit(UPDATE_PROGRESS_EVENT, UpdateProgress { downloaded, total });
                }
            },
            || (),
        )
        .await;

    state.installing.store(false, Ordering::SeqCst);
    result.map_err(|error| log_error("install", error))?;

    // On Windows the installer already closed Glup; elsewhere this opens the new version.
    app.restart();
}

fn log_error(stage: &str, error: impl std::fmt::Display) -> String {
    eprintln!("[updates] {stage}: {error}");
    if stage == "install" { INSTALL_ERROR.to_string() } else { CHECK_ERROR.to_string() }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn checks_again_in_six_hours_or_sooner_after_a_failure() {
        assert_eq!(next_check_after(true), Duration::from_secs(21_600));
        assert_eq!(next_check_after(false), Duration::from_secs(1_800));
        assert!(RETRY_AFTER < CHECK_EVERY);
    }

    #[test]
    fn debug_builds_only_check_on_their_own_when_asked() {
        assert!(checks_on_its_own(false, false));
        assert!(!checks_on_its_own(true, false));
        assert!(checks_on_its_own(true, true));
    }

    #[test]
    fn emits_once_per_percent() {
        let total = Some(10_000);
        assert!(!should_emit(ShouldEmitParams { last: 0, downloaded: 50, total }));
        assert!(should_emit(ShouldEmitParams { last: 0, downloaded: 100, total }));
        assert!(!should_emit(ShouldEmitParams { last: 100, downloaded: 150, total }));
        assert!(should_emit(ShouldEmitParams { last: 9_950, downloaded: 10_000, total }));
    }

    #[test]
    fn emits_every_half_megabyte_without_a_size() {
        assert!(!should_emit(ShouldEmitParams { last: 0, downloaded: 1_000, total: None }));
        assert!(should_emit(ShouldEmitParams { last: 0, downloaded: 512 * 1024, total: None }));
        assert!(!should_emit(ShouldEmitParams { last: 0, downloaded: 1, total: Some(0) }));
    }
}
