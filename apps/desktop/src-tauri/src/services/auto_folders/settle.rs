// A file is taken only once it finished arriving: never a download in progress (.crdownload, .part,
// .tmp…), and only when its size and date stopped changing for a few seconds and no program holds it.
// Pure: the clock and «in use» come from outside.
use std::{
    collections::{HashMap, HashSet},
    path::{Path, PathBuf},
};

use crate::services::folder_sort::classify::{is_downloading, table};

// Unchanged this long, it arrived.
pub const SETTLE_MS: i64 = 3000;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Facts {
    pub size     : u64,
    pub modified : i64,
}

struct Watch {
    facts : Facts,
    since : i64,
}

// A download still on its way, or a temporary copy that an app writes while saving ("~$informe.docx").
pub fn is_partial(name: &str) -> bool {
    is_downloading(table(), name) || name.starts_with("~$") || name.starts_with(".~")
}

fn key(path: &Path) -> String {
    path.to_string_lossy().to_lowercase()
}

// The files a watched folder already had: a change to one of them is the person editing it, not
// something arriving. A new name is an arrival (created, copied, moved in or renamed, as a browser does
// with its download).
#[derive(Default)]
pub struct Known {
    paths: HashSet<String>,
}

impl Known {
    pub fn remember(&mut self, path: &Path) {
        self.paths.insert(key(path));
    }

    // It is there and its name is new; gone, its name may arrive again.
    pub fn is_arrival(&mut self, path: &Path, exists: bool) -> bool {
        if !exists {
            self.paths.remove(&key(path));
            return false;
        }
        !self.paths.contains(&key(path))
    }

    // The folder is not watched any more.
    pub fn forget_folder(&mut self, folder: &Path) {
        let prefix = format!("{}{}", key(folder).trim_end_matches(['\\', '/']), std::path::MAIN_SEPARATOR);
        self.paths.retain(|path| !path.starts_with(&prefix));
    }
}

#[derive(Default)]
pub struct Settler {
    waiting: HashMap<PathBuf, Watch>,
}

impl Settler {
    // What is there now (None: gone); a change starts the wait again.
    pub fn observe(&mut self, path: PathBuf, facts: Option<Facts>, now: i64) {
        let Some(facts) = facts else {
            self.waiting.remove(&path);
            return;
        };
        let same = self.waiting.get(&path).is_some_and(|watch| watch.facts == facts);
        if !same {
            self.waiting.insert(path, Watch { facts, since: now });
        }
    }

    pub fn is_empty(&self) -> bool {
        self.waiting.is_empty()
    }

    pub fn paths(&self) -> Vec<PathBuf> {
        self.waiting.keys().cloned().collect()
    }

    // The ones that stayed the same long enough and are free leave the wait; one still in use waits more.
    pub fn ready(&mut self, now: i64, in_use: &dyn Fn(&Path) -> bool) -> Vec<PathBuf> {
        let done: Vec<PathBuf> = self.waiting.iter().filter(|(path, watch)| now - watch.since >= SETTLE_MS && !in_use(path)).map(|(path, _)| path.clone()).collect();
        for path in &done {
            self.waiting.remove(path);
        }
        done
    }
}
