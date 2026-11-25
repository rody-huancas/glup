use std::{collections::HashMap, sync::Mutex};

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};

use crate::services::actions::{ActionProgress, ActionReport};

pub const TASK_FINISHED_EVENT: &str = "task-finished";

// A task lives here from start to finish and its result stays until the frontend dismisses it,
// so nothing is lost if the panel is unmounted or the webview reloads meanwhile.
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskRecord {
    pub id: String,
    pub action_id: String,
    pub progress: Option<ActionProgress>,
    pub report: Option<ActionReport>,
    pub error: Option<String>,
    pub finished: bool,
    // Tasks whose result is not a file report (Limpieza) describe it themselves.
    pub summary: Option<TaskSummary>,
}

// tone: success, partial, calm or failed (as ResultTone in the frontend).
#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskSummary {
    pub tone: String,
    pub message: String,
    pub note: Option<String>,
}

impl TaskSummary {
    pub fn success(message: String) -> Self {
        Self { tone: "success".to_string(), message, note: None }
    }

    pub fn calm(message: String) -> Self {
        Self { tone: "calm".to_string(), message, note: None }
    }
}

#[derive(Default)]
pub struct TaskRegistry(Mutex<HashMap<String, TaskRecord>>);

fn with_tasks<T>(app: &AppHandle, change: impl FnOnce(&mut HashMap<String, TaskRecord>) -> T) -> Option<T> {
    let registry = app.state::<TaskRegistry>();
    let mut tasks = registry.0.lock().ok()?;
    Some(change(&mut tasks))
}

pub fn start(app: &AppHandle, id: &str, action_id: &str) {
    let record = TaskRecord { id: id.to_string(), action_id: action_id.to_string(), progress: None, report: None, error: None, finished: false, summary: None };
    with_tasks(app, |tasks| tasks.insert(id.to_string(), record));
}

pub fn progress(app: &AppHandle, id: &str, progress: &ActionProgress) {
    with_tasks(app, |tasks| {
        if let Some(task) = tasks.get_mut(id) {
            task.progress = Some(progress.clone());
        }
    });
}

// Stores the result and tells whoever listens; the frontend can also ask later with get_active_tasks.
pub fn finish(app: &AppHandle, id: &str, result: &Result<ActionReport, String>) {
    let record = with_tasks(app, |tasks| {
        let task = tasks.get_mut(id)?;

        task.finished = true;
        match result {
            Ok(report) => task.report = Some(report.clone()),
            Err(error) => task.error = Some(error.clone()),
        }

        Some(task.clone())
    })
    .flatten();

    if let Some(record) = record {
        let _ = app.emit(TASK_FINISHED_EVENT, record);
    }
}

// Same as finish, for tasks that end with a summary instead of a file report.
pub fn finish_summary(app: &AppHandle, id: &str, result: &Result<TaskSummary, String>) {
    let record = with_tasks(app, |tasks| {
        let task = tasks.get_mut(id)?;

        task.finished = true;
        match result {
            Ok(summary) => task.summary = Some(summary.clone()),
            Err(error)  => task.error = Some(error.clone()),
        }

        Some(task.clone())
    })
    .flatten();

    if let Some(record) = record {
        let _ = app.emit(TASK_FINISHED_EVENT, record);
    }
}

// A task of the person is running: Carpetas automáticas waits for it to end.
pub fn busy(app: &AppHandle) -> bool {
    with_tasks(app, |tasks| tasks.values().any(|task| !task.finished)).unwrap_or(false)
}

pub fn list(app: &AppHandle) -> Vec<TaskRecord> {
    with_tasks(app, |tasks| tasks.values().cloned().collect()).unwrap_or_default()
}

pub fn dismiss(app: &AppHandle, id: &str) {
    with_tasks(app, |tasks| tasks.remove(id));
}
