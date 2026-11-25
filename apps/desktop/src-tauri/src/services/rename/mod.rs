// "Renombrar en lote": rules in order on the names (never on the extension), a preview that says each
// problem, and the change made in two steps with its record written ahead, so it can always be undone
// (from the notice or the Historial), even after Glup closed halfway.
pub mod check;
pub mod journal;
pub mod rules;

#[cfg(test)]
mod tests;

use std::{
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
    sync::Mutex,
    time::UNIX_EPOCH,
};

use chrono::{DateTime, Datelike, Local, Timelike};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

use self::{
    check::{problems, CheckParams, Problem},
    journal::{apply as apply_journal, unfinished, ApplyParams, RenameItem, RenameJournal, TEMP_EXTENSION},
    rules::{new_name, parse_exif_date, Moment, NameParams, Rule},
};
use crate::services::{
    history::{self, FilelessEntryParams, HistoryEntry},
    media::serve::new_token,
    tasks::TaskSummary,
};

pub const RENAME_ACTION: &str = "batch-rename";
pub const RECORDS_FOLDER: &str = "renombrados";
pub const BLOCKED_ERROR: &str = "Hay nombres con problemas: corrígelos antes de aplicar";
pub const NOTHING_ERROR: &str = "Ningún nombre cambia";
pub const NO_RECORD_ERROR: &str = "Ya no tengo el registro de ese cambio de nombres";
pub const RECORD_ERROR: &str = "No pude guardar el registro para deshacerlo, así que no cambié nada";

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Order {
    #[default]
    Name,
    Date,
    // As the person dragged them.
    Given,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RenameRequest {
    pub paths           : Vec<String>,
    pub rules           : Vec<Rule>,
    #[serde(default)]
    pub order           : Order,
    #[serde(default)]
    pub lower_extension : bool,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Row {
    pub path    : String,
    pub old     : String,
    pub new     : String,
    pub changed : bool,
    pub problem : Option<Problem>,
    pub reason  : Option<String>,
}

// The dates read once (EXIF of a photo, or the file's own).
#[derive(Default)]
pub struct RenameState(Mutex<HashMap<PathBuf, Moment>>);

fn moment_of(path: &Path) -> Moment {
    let taken = crate::services::image::metadata::read(path).and_then(|metadata| metadata.date_taken()).and_then(|text| parse_exif_date(&text));
    taken.unwrap_or_else(|| {
        let modified = fs::metadata(path).and_then(|metadata| metadata.modified()).ok().and_then(|time| time.duration_since(UNIX_EPOCH).ok()).map(|elapsed| elapsed.as_secs() as i64).unwrap_or(0);
        let local: DateTime<Local> = DateTime::from_timestamp(modified, 0).unwrap_or_default().with_timezone(&Local);
        Moment { year: local.year(), month: local.month(), day: local.day(), hour: local.hour(), minute: local.minute() }
    })
}

fn moments(state: &RenameState, paths: &[PathBuf]) -> Vec<Moment> {
    let mut known = state.0.lock().map(|known| known.clone()).unwrap_or_default();
    let found     = paths.iter().map(|path| *known.entry(path.clone()).or_insert_with(|| moment_of(path))).collect();
    if let Ok(mut shared) = state.0.lock() {
        *shared = known;
    }
    found
}

fn name_of(path: &Path) -> String {
    path.file_name().map(|name| name.to_string_lossy().into_owned()).unwrap_or_default()
}

pub struct PlanParams<'a> {
    pub request : &'a RenameRequest,
    pub moments : &'a [Moment],
    pub exists  : &'a dyn Fn(&Path) -> bool,
}

// Each file (in the order chosen) with its new name and its problem.
pub fn plan(params: PlanParams) -> Vec<Row> {
    let request = params.request;
    let mut order: Vec<usize> = (0..request.paths.len()).collect();
    match request.order {
        Order::Name  => order.sort_by(|a, b| natural_key(&name_of(Path::new(&request.paths[*a]))).cmp(&natural_key(&name_of(Path::new(&request.paths[*b]))))),
        Order::Date  => order.sort_by_key(|index| { let moment = params.moments[*index]; (moment.year, moment.month, moment.day, moment.hour, moment.minute) }),
        Order::Given => {}
    }

    let named: Vec<(PathBuf, String)> = order
        .iter()
        .enumerate()
        .map(|(position, index)| {
            let path = PathBuf::from(&request.paths[*index]);
            let file = name_of(&path);
            let name = new_name(NameParams { file: &file, rules: &request.rules, index: position, moment: params.moments[*index], lower_ext: request.lower_extension });
            (path, name)
        })
        .collect();
    let found = problems(CheckParams { items: &named, exists: params.exists });

    named
        .into_iter()
        .zip(found)
        .map(|((path, name), problem)| {
            let old = name_of(&path);
            Row { changed: old != name, path: path.to_string_lossy().into_owned(), old, new: name, reason: problem.map(|problem| problem.words().to_string()), problem }
        })
        .collect()
}

// "foto2" before "foto10": the numbers in a name compared as numbers.
pub fn natural_key(name: &str) -> Vec<(u8, String, u64)> {
    let mut parts = Vec::new();
    let mut text  = String::new();
    let mut digits = String::new();
    for character in name.to_lowercase().chars() {
        if character.is_ascii_digit() {
            if !text.is_empty() {
                parts.push((0, std::mem::take(&mut text), 0));
            }
            digits.push(character);
        } else {
            if !digits.is_empty() {
                parts.push((1, String::new(), digits.parse().unwrap_or(u64::MAX)));
                digits.clear();
            }
            text.push(character);
        }
    }
    if !text.is_empty() {
        parts.push((0, text, 0));
    }
    if !digits.is_empty() {
        parts.push((1, String::new(), digits.parse().unwrap_or(u64::MAX)));
    }
    parts
}

pub fn preview(app: &AppHandle, request: &RenameRequest) -> Vec<Row> {
    let paths: Vec<PathBuf> = request.paths.iter().map(PathBuf::from).collect();
    let found = moments(&app.state::<RenameState>(), &paths);
    plan(PlanParams { request, moments: &found, exists: &|path| fs::symlink_metadata(path).is_ok() })
}

// The loose files of a folder (its folders are left as they are).
pub fn folder_files(folder: &str) -> Vec<String> {
    let mut files: Vec<String> = fs::read_dir(folder)
        .map(|entries| entries.flatten().filter(|entry| entry.file_type().is_ok_and(|kind| kind.is_file())).map(|entry| entry.path().to_string_lossy().into_owned()).collect())
        .unwrap_or_default();
    files.sort_by_key(|path| natural_key(&name_of(Path::new(path))));
    files
}

fn records_folder(app: &AppHandle) -> Option<PathBuf> {
    app.path().app_data_dir().ok().map(|folder| folder.join(RECORDS_FOLDER))
}

fn entry_id(id: &str) -> String {
    format!("renombre-{id}")
}

pub fn detail(count: usize) -> String {
    if count == 1 { "Renombré 1 archivo".to_string() } else { format!("Renombré {count} archivos") }
}

fn rename_entry(id: &str, name: &str, detail: String) -> HistoryEntry {
    let entry = history::fileless_entry(FilelessEntryParams { name, kind: RENAME_ACTION, action: RENAME_ACTION, detail });
    HistoryEntry { id: entry_id(id), undo: Some(id.to_string()), ..entry }
}

// Where the files were: one folder by its name, several as «N carpetas».
fn place_name(items: &[RenameItem]) -> String {
    let mut folders: Vec<&Path> = items.iter().filter_map(|item| item.from.parent()).collect();
    folders.sort();
    folders.dedup();
    match folders.as_slice() {
        [one] => one.file_name().map(|name| name.to_string_lossy().into_owned()).unwrap_or_else(|| one.to_string_lossy().into_owned()),
        many  => format!("{} carpetas", many.len()),
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApplyReport {
    pub renamed : usize,
    pub failed  : Vec<String>,
    // To undo it (from the notice).
    pub undo    : Option<String>,
    pub message : String,
}

// «Aplicar»: only when no name has a problem; the record is written before the first file moves.
pub fn apply(app: &AppHandle, request: &RenameRequest) -> Result<ApplyReport, String> {
    let rows = preview(app, request);
    if rows.iter().any(|row| row.problem.is_some()) {
        return Err(BLOCKED_ERROR.to_string());
    }
    let id    = format!("{}-{}", Local::now().format("%Y%m%d%H%M%S"), &new_token()[..6]);
    let items: Vec<RenameItem> = rows
        .iter()
        .filter(|row| row.changed)
        .enumerate()
        .map(|(index, row)| {
            let from   = PathBuf::from(&row.path);
            let folder = from.parent().map(Path::to_path_buf).unwrap_or_default();
            RenameItem { temp: folder.join(format!("{id}-{index}.{TEMP_EXTENSION}")), to: folder.join(&row.new), from }
        })
        .collect();
    if items.is_empty() {
        return Err(NOTHING_ERROR.to_string());
    }

    let folder  = records_folder(app).ok_or(RECORD_ERROR)?;
    let journal = RenameJournal { id: id.clone(), date: Local::now().format("%Y-%m-%d %H:%M").to_string(), items, spots: Vec::new(), finished: false };
    let name    = place_name(&journal.items);
    let _       = history::update(app, |entries| history::upserted(entries, rename_entry(&id, &name, "Renombrando…".to_string())));
    let tally   = apply_journal(ApplyParams { folder: &folder, journal: &journal, stop_after_temp: false }).map_err(|_| RECORD_ERROR.to_string())?;
    let _       = history::update(app, |entries| history::upserted(entries, rename_entry(&id, &name, detail(tally.done))));
    if let Ok(mut known) = app.state::<RenameState>().0.lock() {
        known.clear();
    }

    let message = if tally.failed.is_empty() { detail(tally.done) } else { format!("{} · {} no se pudieron (en uso)", detail(tally.done), tally.failed.len()) };
    Ok(ApplyReport { renamed: tally.done, failed: tally.failed, undo: Some(id), message })
}

// «Deshacer»: every name back; the Historial line goes with its record.
pub fn undo(app: &AppHandle, id: &str) -> Result<TaskSummary, String> {
    let folder  = records_folder(app).ok_or(NO_RECORD_ERROR)?;
    let journal = journal::load(&folder, id).map_err(|_| NO_RECORD_ERROR.to_string())?;
    let tally   = journal::undo(&folder, &journal).map_err(|_| NO_RECORD_ERROR.to_string())?;
    let _       = history::update(app, |entries| history::without(entries, &[entry_id(id)]));
    let mut message = if tally.restored == 1 { "Volví 1 nombre a como estaba".to_string() } else { format!("Volví {} nombres a como estaban", tally.restored) };
    if !tally.occupied.is_empty() {
        message.push_str(&format!(" · {} conservan el nombre nuevo (el viejo ya lo usa otro archivo)", tally.occupied.len()));
    }
    if !tally.missing.is_empty() {
        message.push_str(&format!(" · {} ya no estaban", tally.missing.len()));
    }
    Ok(if tally.occupied.is_empty() && tally.missing.is_empty() { TaskSummary::success(message) } else { TaskSummary::calm(message) })
}

// At start-up: a rename Glup could not end keeps (or gets) its Historial line with «Deshacer».
pub fn spawn_recovery(app: AppHandle) {
    std::thread::spawn(move || {
        let Some(folder) = records_folder(&app) else { return };
        for journal in unfinished(&folder) {
            let Ok(finished) = journal::finish(&folder, &journal) else { continue };
            let moved = finished.spots.iter().filter(|spot| **spot != journal::Spot::From).count();
            if moved == 0 {
                journal::remove(&folder, &journal.id);
                let _ = history::update(&app, |entries| history::without(entries, &[entry_id(&journal.id)]));
                continue;
            }
            let name = place_name(&finished.items);
            let _    = history::update(&app, |entries| history::upserted(entries, rename_entry(&journal.id, &name, format!("Se interrumpió ({moved} de {})", finished.items.len()))));
        }
    });
}
