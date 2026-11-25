// The one progress format of every task: the stage it is in and, when it can be counted, how far it
// went. The frontend turns the stage into words; a stage without a count shows a moving bar.
use serde::Serialize;
use tauri::{AppHandle, Emitter};

use crate::services::{
    actions::{ActionProgress, ACTION_PROGRESS_EVENT},
    history::format_size,
    tasks,
};

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Stage {
    // Bytes of what Glup needs (a model, FFmpeg), counted.
    Downloading,
    // The hash and unpacking at the end of a download.
    Verifying,
    // Loading a model into memory, before the work itself.
    Preparing,
    // The action itself, counted in files, pages or percent.
    #[default]
    Working,
    // "Escanear documento": each sheet straightened and cleaned, then read for its text (counted in pages).
    Straightening,
    Reading,
    // Writing, the safety check, the ZIP and the history, after the counted work.
    Saving,
}

impl ActionProgress {
    // A stage without a count (the bar moves on its own).
    pub fn at(task: &Option<String>, stage: Stage) -> Self {
        Self { task_id: task.clone(), current: 0, total: 0, name: String::new(), active: 1, detail: None, stage, via: None }
    }
}

// Kept in the task (for a reload) and sent to the panel.
pub fn emit(app: &AppHandle, progress: ActionProgress) {
    if let Some(task) = &progress.task_id {
        tasks::progress(app, task, &progress);
    }
    let _ = app.emit(ACTION_PROGRESS_EVENT, progress);
}

// "120 MB de 514 MB"
pub fn download_detail(done: u64, total: u64) -> String {
    format!("{} de {}", format_size(done), format_size(total))
}

// One or more downloads shown as a single one: the bytes of the earlier ones and of all of them.
#[derive(Clone, Debug)]
pub struct DownloadSpan {
    pub task   : Option<String>,
    pub before : u64,
    pub total  : u64,
}

impl DownloadSpan {
    pub fn single(task: &Option<String>, total: u64) -> Self {
        Self { task: task.clone(), before: 0, total }
    }

    // The progress line after `done` bytes of the current download.
    pub fn downloading(&self, done: u64) -> ActionProgress {
        let current = (self.before + done).min(self.total);
        ActionProgress {
            task_id : self.task.clone(),
            current : current as usize,
            total   : self.total as usize,
            name    : String::new(),
            active  : 1,
            detail  : Some(download_detail(current, self.total)),
            stage   : Stage::Downloading,
            via     : None,
        }
    }

    pub fn verifying(&self) -> ActionProgress {
        ActionProgress::at(&self.task, Stage::Verifying)
    }
}

#[cfg(test)]
mod tests {
    use super::{DownloadSpan, Stage};
    use crate::services::actions::{ActionControl, ActionProgress};
    use std::sync::atomic::Ordering;

    #[test]
    fn two_downloads_make_one_bar() {
        let task = Some("t".to_string());
        let span = DownloadSpan { task: task.clone(), before: 100, total: 400 };

        let line = span.downloading(50);
        assert_eq!((line.current, line.total, line.stage), (150, 400, Stage::Downloading));
        assert_eq!(span.downloading(900).current, 400);
        assert_eq!(span.verifying().stage, Stage::Verifying);
        assert_eq!(DownloadSpan::single(&task, 10).before, 0);
    }

    #[test]
    fn a_stage_without_count() {
        let line = ActionProgress::at(&None, Stage::Saving);
        assert_eq!((line.current, line.total, line.stage), (0, 0, Stage::Saving));
    }

    #[test]
    fn cancel_stays_with_its_task_across_calls() {
        let control = ActionControl::default();
        let first   = Some("a".to_string());
        let second  = Some("b".to_string());

        control.begin(&first);
        assert!(!control.cancelled.load(Ordering::SeqCst));

        control.cancel(first.clone());
        // The next call of the same task (the action after its download) starts cancelled…
        control.begin(&first);
        assert!(control.cancelled.load(Ordering::SeqCst));

        // …and another task starts clean.
        control.begin(&second);
        assert!(!control.cancelled.load(Ordering::SeqCst));
        control.begin(&None);
        assert!(!control.cancelled.load(Ordering::SeqCst));
    }
}
