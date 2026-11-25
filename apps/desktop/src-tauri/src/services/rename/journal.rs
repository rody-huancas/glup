// Renaming in two steps, with its record written ahead: every file first to a temporary name of its own
// (so a↔b and longer rounds work), then to its new name. The record is `<id>.json` (written before any
// file moves) plus `<id>.log`, one line after each step; Glup closed halfway leaves both, and «Deshacer»
// still knows where each file is (the temporary names are unique, so a step cut before its line is
// found on disk). Nothing is ever written over another file.
use std::{
    fs::{self, OpenOptions},
    io::{self, Write},
    path::{Path, PathBuf},
};

use serde::{Deserialize, Serialize};

use crate::services::folder_sort::mover::rename_no_replace;

pub const TEMP_EXTENSION: &str = "glup-renombrando";

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RenameItem {
    pub from : PathBuf,
    pub temp : PathBuf,
    pub to   : PathBuf,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Spot {
    From,
    Temp,
    To,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RenameJournal {
    pub id       : String,
    pub date     : String,
    pub items    : Vec<RenameItem>,
    // Where each file is (written when finished; while renaming, the log says it).
    #[serde(default)]
    pub spots    : Vec<Spot>,
    pub finished : bool,
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
enum Step {
    Temp(usize),
    To(usize),
    From(usize),
}

fn file_of(folder: &Path, id: &str) -> PathBuf {
    folder.join(format!("{id}.json"))
}

fn log_of(folder: &Path, id: &str) -> PathBuf {
    folder.join(format!("{id}.log"))
}

pub fn save(folder: &Path, journal: &RenameJournal) -> io::Result<()> {
    fs::create_dir_all(folder)?;
    let data    = serde_json::to_vec_pretty(journal).map_err(io::Error::other)?;
    let partial = folder.join(format!("{}.json.part", journal.id));
    fs::write(&partial, data)?;
    fs::rename(&partial, file_of(folder, &journal.id))
}

fn record(folder: &Path, id: &str, step: Step) -> io::Result<()> {
    let mut line = serde_json::to_string(&step).map_err(io::Error::other)?;
    line.push('\n');
    OpenOptions::new().create(true).append(true).open(log_of(folder, id))?.write_all(line.as_bytes())
}

fn exists(path: &Path) -> bool {
    fs::symlink_metadata(path).is_ok()
}

// Where each file is: what the log says, checked on disk (a rename cut before its line is found at its
// next place: the temporary name is only its own).
pub fn spots(folder: &Path, journal: &RenameJournal) -> Vec<Spot> {
    if journal.finished && journal.spots.len() == journal.items.len() {
        return journal.spots.clone();
    }
    let mut spots = vec![Spot::From; journal.items.len()];
    if let Ok(log) = fs::read_to_string(log_of(folder, &journal.id)) {
        for step in log.lines().filter_map(|line| serde_json::from_str::<Step>(line).ok()) {
            match step {
                Step::Temp(index) if index < spots.len() => spots[index] = Spot::Temp,
                Step::To(index) if index < spots.len()   => spots[index] = Spot::To,
                Step::From(index) if index < spots.len() => spots[index] = Spot::From,
                _ => {}
            }
        }
    }
    for (spot, item) in spots.iter_mut().zip(&journal.items) {
        match spot {
            Spot::From if !exists(&item.from) && exists(&item.temp) => *spot = Spot::Temp,
            Spot::Temp if !exists(&item.temp) && exists(&item.to)   => *spot = Spot::To,
            Spot::Temp if !exists(&item.temp) && exists(&item.from) => *spot = Spot::From,
            _ => {}
        }
    }
    spots
}

pub fn finish(folder: &Path, journal: &RenameJournal) -> io::Result<RenameJournal> {
    let finished = RenameJournal { spots: spots(folder, journal), finished: true, ..journal.clone() };
    save(folder, &finished)?;
    let _ = fs::remove_file(log_of(folder, &journal.id));
    Ok(finished)
}

pub fn load(folder: &Path, id: &str) -> io::Result<RenameJournal> {
    serde_json::from_slice(&fs::read(file_of(folder, id))?).map_err(io::Error::other)
}

pub fn remove(folder: &Path, id: &str) {
    let _ = fs::remove_file(log_of(folder, id));
    let _ = fs::remove_file(file_of(folder, id));
}

// The renames left halfway (Glup closed), oldest first.
pub fn unfinished(folder: &Path) -> Vec<RenameJournal> {
    let Ok(entries) = fs::read_dir(folder) else { return Vec::new() };
    let mut found: Vec<RenameJournal> = entries
        .filter_map(|entry| entry.ok().map(|entry| entry.path()))
        .filter(|path| path.extension().is_some_and(|extension| extension == "json"))
        .filter_map(|path| path.file_stem().map(|stem| stem.to_string_lossy().into_owned()))
        .filter_map(|id| load(folder, &id).ok())
        .filter(|journal| !journal.finished)
        .collect();
    found.sort_by(|a, b| a.id.cmp(&b.id));
    found
}

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct Tally {
    pub done   : usize,
    // Files that could not move (in use, or their place was taken meanwhile): left where they were.
    pub failed : Vec<String>,
}

fn name_of(path: &Path) -> String {
    path.file_name().map(|name| name.to_string_lossy().into_owned()).unwrap_or_default()
}

pub struct ApplyParams<'a> {
    pub folder  : &'a Path,
    pub journal : &'a RenameJournal,
    // After the first step: only for the tests of a closed Glup.
    pub stop_after_temp : bool,
}

// Both steps, each one written down as it happens. A file that cannot take its new name goes back to
// its old one; the others go on.
pub fn apply(params: ApplyParams) -> io::Result<Tally> {
    let (folder, journal) = (params.folder, params.journal);
    save(folder, &RenameJournal { finished: false, spots: Vec::new(), ..journal.clone() })?;
    let mut tally   = Tally::default();
    let mut at_temp = Vec::new();

    for (index, item) in journal.items.iter().enumerate() {
        match rename_no_replace(&item.from, &item.temp) {
            Ok(()) => {
                record(folder, &journal.id, Step::Temp(index))?;
                at_temp.push(index);
            }
            Err(_) => tally.failed.push(name_of(&item.from)),
        }
    }
    if params.stop_after_temp {
        return Ok(tally);
    }
    for index in at_temp {
        let item = &journal.items[index];
        match rename_no_replace(&item.temp, &item.to) {
            Ok(()) => {
                record(folder, &journal.id, Step::To(index))?;
                tally.done += 1;
            }
            Err(_) => {
                if rename_no_replace(&item.temp, &item.from).is_ok() {
                    record(folder, &journal.id, Step::From(index))?;
                }
                tally.failed.push(name_of(&item.from));
            }
        }
    }
    finish(folder, journal)?;
    Ok(tally)
}

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct UndoTally {
    pub restored : usize,
    // Not where Glup left it any more (moved or deleted afterwards).
    pub missing  : Vec<String>,
    // Its old name is taken by another file now: it keeps the new one.
    pub occupied : Vec<String>,
}

// Every file back to its old name, in two steps too (a↔b undone works the same way).
pub fn undo(folder: &Path, journal: &RenameJournal) -> io::Result<UndoTally> {
    let spots     = spots(folder, journal);
    let mut tally = UndoTally::default();
    let mut temp  = Vec::new();

    for ((item, spot), index) in journal.items.iter().zip(&spots).zip(0..) {
        match spot {
            Spot::From => {}
            Spot::Temp => temp.push(index),
            Spot::To if !exists(&item.to)                               => tally.missing.push(name_of(&item.from)),
            Spot::To if rename_no_replace(&item.to, &item.temp).is_ok() => temp.push(index),
            Spot::To                                                    => tally.missing.push(name_of(&item.from)),
        }
    }
    for index in temp {
        let item = &journal.items[index];
        if rename_no_replace(&item.temp, &item.from).is_ok() {
            tally.restored += 1;
        } else {
            // The old name was taken meanwhile: back to the new one rather than a temporary name.
            let _ = rename_no_replace(&item.temp, &item.to);
            tally.occupied.push(name_of(&item.from));
        }
    }
    remove(folder, &journal.id);
    Ok(tally)
}
