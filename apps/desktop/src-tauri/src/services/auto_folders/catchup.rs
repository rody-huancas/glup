// What arrived while Glup was closed (by its dates) and Glup's own results, which are never taken
// again. Pure.
use std::{
    collections::{HashSet, VecDeque},
    path::{Path, PathBuf},
};

use crate::services::auto_folders::rules::{takes, tool_takes, AutoTool, Filter};

// More than this waiting at start-up: asked first.
pub const ASK_ABOVE: usize = 10;
// The results remembered (the newest ones).
pub const PRODUCED_LIMIT: usize = 2000;

// A loose file of a watched folder.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Loose {
    pub path    : PathBuf,
    pub name    : String,
    pub size    : u64,
    // When it got here: its creation (ms).
    pub arrived : i64,
}

pub struct MissedParams<'a> {
    pub files    : &'a [Loose],
    pub filter   : &'a Filter,
    pub tool     : &'a AutoTool,
    pub since    : i64,
    pub produced : &'a Produced,
}

// The files the rule takes that arrived after it last looked, oldest first.
pub fn missed(params: MissedParams) -> Vec<PathBuf> {
    let mut found: Vec<&Loose> = params
        .files
        .iter()
        .filter(|file| file.arrived > params.since && takes(params.filter, &file.name, file.size) && tool_takes(params.tool, &file.name) && !params.produced.contains(&file.path))
        .collect();
    found.sort_by_key(|file| file.arrived);
    found.into_iter().map(|file| file.path.clone()).collect()
}

#[derive(Debug, PartialEq, Eq)]
pub enum CatchUp {
    Nothing,
    Run,
    // «Llegaron 34 archivos a Descargas mientras estaba cerrado. ¿Los hago?».
    Ask,
}

pub fn catch_up(count: usize) -> CatchUp {
    match count {
        0                           => CatchUp::Nothing,
        count if count <= ASK_ABOVE => CatchUp::Run,
        _                           => CatchUp::Ask,
    }
}

fn key(path: &Path) -> String {
    path.to_string_lossy().to_lowercase()
}

// What Glup made (results in the watched folders), so a rule never takes its own work and loops.
#[derive(Default)]
pub struct Produced {
    order : VecDeque<String>,
    keys  : HashSet<String>,
}

impl Produced {
    pub fn from_list(list: &[String]) -> Self {
        let mut produced = Self::default();
        for path in list {
            produced.add(Path::new(path));
        }
        produced
    }

    pub fn add(&mut self, path: &Path) {
        let key = key(path);
        if !self.keys.insert(key.clone()) {
            return;
        }
        self.order.push_back(key);
        while self.order.len() > PRODUCED_LIMIT {
            if let Some(old) = self.order.pop_front() {
                self.keys.remove(&old);
            }
        }
    }

    pub fn contains(&self, path: &Path) -> bool {
        self.keys.contains(&key(path))
    }

    pub fn list(&self) -> Vec<String> {
        self.order.iter().cloned().collect()
    }
}
