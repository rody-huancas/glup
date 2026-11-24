// The record of one sort (every file moved and every folder made), kept in Glup's data folder so
// "Deshacer" can put each file back in its place and name, even after closing Glup. While moving, the
// record is `<id>.json` (not finished yet) plus `<id>.log`, one line per step written as it happens; at
// the end both become one finished `<id>.json`. A record still unfinished at start-up is a sort that
// Glup could not end (closed or shut down halfway).
use std::{
    fs::{self, OpenOptions},
    io::{self, Write},
    path::{Path, PathBuf},
    sync::atomic::{AtomicBool, Ordering},
};

use serde::{Deserialize, Serialize};

use crate::services::folder_sort::{
    mover::{self, MoveRecord, Step},
    plan::SortMode,
};

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Journal {
    pub id       : String,
    pub folder   : PathBuf,
    pub mode     : SortMode,
    pub date     : String,
    pub created  : Vec<PathBuf>,
    pub moves    : Vec<MoveRecord>,
    // The files the preview planned, to tell "40 de 120" when it was interrupted.
    #[serde(default)]
    pub total    : usize,
    // False while moving: left like that, the sort was interrupted.
    #[serde(default = "finished_by_default")]
    pub finished : bool,
}

fn finished_by_default() -> bool {
    true
}

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct UndoTally {
    pub restored  : usize,
    // Not there any more (moved, renamed, deleted or replaced by another file).
    pub missing   : Vec<String>,
    // Its old place has a file with that name now.
    pub occupied  : Vec<String>,
    pub failed    : Vec<String>,
    // Left for a later "Deshacer" (cancelled before them).
    pub remaining : Vec<MoveRecord>,
    pub cancelled : bool,
}

pub struct UndoParams<'a> {
    pub journal  : &'a Journal,
    pub cancel   : &'a AtomicBool,
    pub progress : &'a mut dyn FnMut(usize, &str),
}

fn file_of(folder: &Path, id: &str) -> PathBuf {
    folder.join(format!("{id}.json"))
}

fn log_of(folder: &Path, id: &str) -> PathBuf {
    folder.join(format!("{id}.log"))
}

// Written whole each time (a temporary file and a rename), so a closed Glup never leaves half a record.
pub fn save(folder: &Path, journal: &Journal) -> io::Result<()> {
    fs::create_dir_all(folder)?;
    let data    = serde_json::to_vec_pretty(journal).map_err(io::Error::other)?;
    let partial = folder.join(format!("{}.json.part", journal.id));
    fs::write(&partial, data)?;
    fs::rename(&partial, file_of(folder, &journal.id))
}

// Writes the steps of a sort as they happen, one line each (a move is written as pending before it
// starts and as done after it).
pub struct Recorder {
    folder : PathBuf,
    id     : String,
}

impl Recorder {
    // The unfinished record goes first, before any file moves.
    pub fn start(folder: &Path, journal: &Journal) -> io::Result<Recorder> {
        save(folder, &Journal { finished: false, ..journal.clone() })?;
        Ok(Recorder { folder: folder.to_path_buf(), id: journal.id.clone() })
    }

    pub fn record(&self, step: &Step) -> io::Result<()> {
        let mut line = serde_json::to_string(step).map_err(io::Error::other)?;
        line.push('\n');
        OpenOptions::new().create(true).append(true).open(log_of(&self.folder, &self.id))?.write_all(line.as_bytes())
    }
}

// A move cut by the shutdown happened if the file is no longer at its origin and is at its destination,
// with its size. If it is still at its origin, it never moved and stays out of the record.
fn arrived(record: &MoveRecord) -> bool {
    let at_origin = fs::symlink_metadata(&record.from).is_ok();
    let there     = fs::symlink_metadata(&record.to).is_ok_and(|metadata| metadata.is_file() && metadata.len() == record.size);
    !at_origin && there
}

// The whole record, finished, in one file (the log is no longer needed).
pub fn finish(folder: &Path, journal: &Journal) -> io::Result<()> {
    save(folder, &Journal { finished: true, ..journal.clone() })?;
    let _ = fs::remove_file(log_of(folder, &journal.id));
    Ok(())
}

// An unfinished record gets the steps of its log (a line cut by the shutdown is left out). A pending
// move is replaced by a later try of the same file and closed by its done or failed line; the one left
// open is the move Glup was making when it closed, and it counts only if the file arrived.
fn with_log(mut journal: Journal, folder: &Path) -> Journal {
    let Ok(log) = fs::read_to_string(log_of(folder, &journal.id)) else { return journal };
    let mut pending: Vec<MoveRecord> = Vec::new();

    for step in log.lines().filter_map(|line| serde_json::from_str::<Step>(line).ok()) {
        match step {
            Step::Created(path) => journal.created.push(path),
            Step::Pending(record) => {
                pending.retain(|open| open.from != record.from);
                pending.push(record);
            }
            Step::Moved(record) => {
                pending.retain(|open| open.from != record.from);
                journal.moves.push(record);
            }
            Step::Failed(from) => pending.retain(|open| open.from != from),
        }
    }

    journal.moves.extend(pending.into_iter().filter(arrived));
    journal
}

pub fn load(folder: &Path, id: &str) -> io::Result<Journal> {
    let data             = fs::read(file_of(folder, id))?;
    let journal: Journal = serde_json::from_slice(&data).map_err(io::Error::other)?;
    Ok(if journal.finished { journal } else { with_log(journal, folder) })
}

pub fn remove(folder: &Path, id: &str) -> io::Result<()> {
    let _ = fs::remove_file(log_of(folder, id));
    fs::remove_file(file_of(folder, id))
}

// The sorts that were left halfway, oldest first.
pub fn unfinished(folder: &Path) -> Vec<Journal> {
    let Ok(entries) = fs::read_dir(folder) else { return Vec::new() };

    let mut found: Vec<Journal> = entries
        .filter_map(|entry| entry.ok().map(|entry| entry.path()))
        .filter(|path| path.extension().is_some_and(|extension| extension == "json"))
        .filter_map(|path| path.file_stem().map(|stem| stem.to_string_lossy().into_owned()))
        .filter_map(|id| load(folder, &id).ok())
        .filter(|journal| !journal.finished)
        .collect();

    found.sort_by(|a, b| a.id.cmp(&b.id));
    found
}

fn name_of(path: &Path) -> String {
    path.file_name().map(|value| value.to_string_lossy().into_owned()).unwrap_or_default()
}

// The last moved goes back first. A file that is no longer where Glup left it (or is another one now,
// with another size) or whose place is taken is skipped and told; nothing is ever overwritten.
pub fn undo(params: UndoParams) -> UndoTally {
    let mut tally = UndoTally::default();
    let moves     = &params.journal.moves;

    for (index, record) in moves.iter().enumerate().rev() {
        if params.cancel.load(Ordering::SeqCst) {
            tally.cancelled = true;
            tally.remaining = moves[..=index].to_vec();
            break;
        }

        let name = name_of(&record.from);
        (params.progress)(moves.len() - 1 - index, &name);

        let here = fs::symlink_metadata(&record.to).ok().filter(|metadata| metadata.is_file() && metadata.len() == record.size);
        if here.is_none() {
            tally.missing.push(name);
            continue;
        }
        if fs::symlink_metadata(&record.from).is_ok() {
            tally.occupied.push(name);
            continue;
        }

        match mover::move_file(&record.to, &record.from) {
            Ok(())                                                   => tally.restored += 1,
            Err(error) if error.kind() == io::ErrorKind::AlreadyExists => tally.occupied.push(name),
            Err(_)                                                   => tally.failed.push(name),
        }
    }

    if !tally.cancelled {
        remove_empty(&params.journal.created);
    }
    tally
}

// Deepest first, and only if empty (remove_dir refuses a folder with anything in it).
pub fn remove_empty(created: &[PathBuf]) {
    let mut folders = created.to_vec();
    folders.sort_by_key(|folder| std::cmp::Reverse(folder.components().count()));

    for folder in folders {
        let _ = fs::remove_dir(&folder);
    }
}

#[cfg(test)]
mod tests {
    use std::time::{Duration, SystemTime, UNIX_EPOCH};

    use super::*;
    use crate::services::folder_sort::{
        classify::table,
        mover::{run, RunParams},
        plan::{plan, PlanParams},
    };

    fn sandbox(name: &str) -> PathBuf {
        let folder = std::env::temp_dir().join(format!("glup-sort-undo-{name}-{}", std::process::id()));
        let _      = fs::remove_dir_all(&folder);
        fs::create_dir_all(&folder).unwrap();
        folder
    }

    fn old_file(path: &Path, contents: &[u8]) {
        fs::write(path, contents).unwrap();
        fs::File::options().write(true).open(path).unwrap().set_modified(SystemTime::now() - Duration::from_secs(3600)).unwrap();
    }

    fn now() -> i64 {
        SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis() as i64
    }

    fn free(_: &Path) -> bool {
        false
    }

    // Sorts the folder for real and returns its record.
    fn sorted(folder: &Path, mode: SortMode) -> Journal {
        let plan  = plan(PlanParams { folder, mode, table: table(), now: now(), in_use: &free }).unwrap();
        let tally = run(RunParams { plan: &plan, now: now(), cancel: &AtomicBool::new(false), in_use: &free, progress: &mut |_, _| {}, checkpoint: &mut |_| {} });
        Journal { id: "orden".to_string(), folder: folder.to_path_buf(), mode, date: String::new(), created: tally.created, moves: tally.moved, total: 0, finished: true }
    }

    fn undo_all(journal: &Journal) -> UndoTally {
        undo(UndoParams { journal, cancel: &AtomicBool::new(false), progress: &mut |_, _| {} })
    }

    fn listing(folder: &Path) -> Vec<String> {
        let mut names: Vec<_> = fs::read_dir(folder).unwrap().map(|entry| entry.unwrap().file_name().to_string_lossy().into_owned()).collect();
        names.sort();
        names
    }

    #[test]
    fn undo_puts_every_file_back_with_its_name_and_removes_the_empty_folders() {
        let folder = sandbox("all");
        old_file(&folder.join("foto.jpg"), b"jpg");
        old_file(&folder.join("contrato.pdf"), b"pdf");
        fs::create_dir_all(folder.join("PDFs")).unwrap();
        old_file(&folder.join("PDFs").join("contrato.pdf"), b"de antes");

        let journal = sorted(&folder, SortMode::Type);
        assert_eq!(listing(&folder), ["Imágenes", "PDFs"]);

        let tally = undo_all(&journal);

        assert_eq!(tally.restored, 2);
        assert!(tally.missing.is_empty() && tally.occupied.is_empty());
        assert_eq!(fs::read(folder.join("contrato.pdf")).unwrap(), b"pdf");
        assert_eq!(fs::read(folder.join("foto.jpg")).unwrap(), b"jpg");
        // "Imágenes" was Glup's and is empty again; "PDFs" was already there, with its own file.
        assert_eq!(listing(&folder), ["PDFs", "contrato.pdf", "foto.jpg"]);
        assert_eq!(fs::read(folder.join("PDFs").join("contrato.pdf")).unwrap(), b"de antes");

        fs::remove_dir_all(&folder).unwrap();
    }

    #[test]
    fn a_file_the_person_moved_afterwards_is_skipped_and_its_folder_stays_if_not_empty() {
        let folder = sandbox("moved");
        old_file(&folder.join("a.pdf"), b"a");
        old_file(&folder.join("b.pdf"), b"b");
        let journal = sorted(&folder, SortMode::Type);

        // After the sort the person took b.pdf elsewhere, and saved a new note in PDFs.
        fs::create_dir_all(folder.join("Trabajo")).unwrap();
        fs::rename(folder.join("PDFs").join("b.pdf"), folder.join("Trabajo").join("b.pdf")).unwrap();
        old_file(&folder.join("PDFs").join("nota.pdf"), b"nota");

        let tally = undo_all(&journal);

        assert_eq!(tally.restored, 1);
        assert_eq!(tally.missing, ["b.pdf"]);
        assert!(folder.join("a.pdf").exists());
        assert!(folder.join("Trabajo").join("b.pdf").exists());
        assert!(folder.join("PDFs").join("nota.pdf").exists());

        fs::remove_dir_all(&folder).unwrap();
    }

    #[test]
    fn a_place_taken_by_a_new_file_is_not_overwritten() {
        let folder = sandbox("occupied");
        old_file(&folder.join("informe.pdf"), b"ordenado");
        let journal = sorted(&folder, SortMode::Type);

        old_file(&folder.join("informe.pdf"), b"otro con el mismo nombre");
        let tally = undo_all(&journal);

        assert_eq!(tally.occupied, ["informe.pdf"]);
        assert_eq!(fs::read(folder.join("informe.pdf")).unwrap(), b"otro con el mismo nombre");
        assert_eq!(fs::read(folder.join("PDFs").join("informe.pdf")).unwrap(), b"ordenado");

        fs::remove_dir_all(&folder).unwrap();
    }

    #[test]
    fn by_date_both_levels_of_folders_go_when_empty() {
        let folder = sandbox("date");
        old_file(&folder.join("nota.txt"), b"txt");
        let journal = sorted(&folder, SortMode::Date);
        assert_eq!(journal.created.len(), 2);

        assert_eq!(undo_all(&journal).restored, 1);
        assert_eq!(listing(&folder), ["nota.txt"]);

        fs::remove_dir_all(&folder).unwrap();
    }

    #[test]
    fn the_record_is_saved_whole_and_read_back() {
        let folder  = sandbox("record");
        let journal = Journal {
            id      : "123".to_string(),
            folder  : folder.clone(),
            mode    : SortMode::Date,
            date    : "2026-11-24".to_string(),
            created  : vec![folder.join("2026")],
            moves    : vec![MoveRecord { from: folder.join("a.txt"), to: folder.join("2026").join("a.txt"), size: 3 }],
            total    : 1,
            finished : true,
        };

        save(&folder.join("registros"), &journal).unwrap();
        assert_eq!(load(&folder.join("registros"), "123").unwrap(), journal);
        assert_eq!(listing(&folder.join("registros")), ["123.json"]);

        remove(&folder.join("registros"), "123").unwrap();
        assert!(load(&folder.join("registros"), "123").is_err());

        fs::remove_dir_all(&folder).unwrap();
    }

    #[test]
    fn an_interrupted_sort_keeps_every_step_of_its_log() {
        let folder  = sandbox("log");
        let records = folder.join("registros");
        let header  = Journal { id: "9".to_string(), folder: folder.clone(), mode: SortMode::Type, date: String::new(), created: Vec::new(), moves: Vec::new(), total: 3, finished: true };
        let step    = |name: &str| MoveRecord { from: folder.join(name), to: folder.join("PDFs").join(name), size: 1 };

        let recorder = Recorder::start(&records, &header).unwrap();
        for line in [Step::Created(folder.join("PDFs")), Step::Pending(step("a.pdf")), Step::Moved(step("a.pdf")), Step::Pending(step("b.pdf")), Step::Moved(step("b.pdf")), Step::Pending(step("c.pdf")), Step::Failed(folder.join("c.pdf"))] {
            recorder.record(&line).unwrap();
        }
        // Glup closed while writing the next line.
        OpenOptions::new().append(true).open(log_of(&records, "9")).unwrap().write_all(br#"{"moved":{"fr"#).unwrap();

        let left = unfinished(&records);
        assert_eq!(left.len(), 1);
        assert_eq!(left[0].created, [folder.join("PDFs")]);
        assert_eq!(left[0].moves, [step("a.pdf"), step("b.pdf")]);
        assert_eq!(left[0].total, 3);

        finish(&records, &left[0]).unwrap();
        assert!(unfinished(&records).is_empty());
        assert_eq!(listing(&records), ["9.json"]);
        assert_eq!(load(&records, "9").unwrap().moves.len(), 2);

        fs::remove_dir_all(&folder).unwrap();
    }

    // The log of a sort cut in the middle of moving "informe.pdf" (after a first try at a taken name).
    fn cut_while_moving(folder: &Path, records: &Path) -> (MoveRecord, MoveRecord) {
        let header = Journal { id: "5".to_string(), folder: folder.to_path_buf(), mode: SortMode::Type, date: String::new(), created: Vec::new(), moves: Vec::new(), total: 1, finished: true };
        let taken  = MoveRecord { from: folder.join("informe.pdf"), to: folder.join("PDFs").join("informe.pdf"), size: 4 };
        let next   = MoveRecord { to: folder.join("PDFs").join("informe (2).pdf"), ..taken.clone() };

        fs::create_dir_all(folder.join("PDFs")).unwrap();
        old_file(&folder.join("PDFs").join("informe.pdf"), b"otro");
        old_file(&folder.join("informe.pdf"), b"este");

        let recorder = Recorder::start(records, &header).unwrap();
        recorder.record(&Step::Pending(taken.clone())).unwrap();
        recorder.record(&Step::Pending(next.clone())).unwrap();
        (taken, next)
    }

    #[test]
    fn a_pending_move_whose_file_reached_its_destination_counts_as_moved() {
        let folder        = sandbox("pending-done");
        let records       = folder.join("registros");
        let (_, next)     = cut_while_moving(&folder, &records);
        // The rename happened; Glup closed before writing it as done.
        fs::rename(&next.from, &next.to).unwrap();

        let left = unfinished(&records);
        // Only the try that went through: the taken name was another file of the same size.
        assert_eq!(left[0].moves, [next.clone()]);

        let tally = undo(UndoParams { journal: &left[0], cancel: &AtomicBool::new(false), progress: &mut |_, _| {} });
        assert_eq!(tally.restored, 1);
        assert_eq!(fs::read(folder.join("informe.pdf")).unwrap(), b"este");
        assert_eq!(fs::read(folder.join("PDFs").join("informe.pdf")).unwrap(), b"otro");

        fs::remove_dir_all(&folder).unwrap();
    }

    #[test]
    fn a_pending_move_whose_file_is_still_at_its_origin_is_left_alone() {
        let folder  = sandbox("pending-origin");
        let records = folder.join("registros");
        cut_while_moving(&folder, &records);

        let left = unfinished(&records);
        assert!(left[0].moves.is_empty());

        let tally = undo(UndoParams { journal: &left[0], cancel: &AtomicBool::new(false), progress: &mut |_, _| {} });
        assert_eq!((tally.restored, tally.missing.len(), tally.occupied.len()), (0, 0, 0));
        assert_eq!(fs::read(folder.join("informe.pdf")).unwrap(), b"este");
        assert_eq!(fs::read(folder.join("PDFs").join("informe.pdf")).unwrap(), b"otro");

        fs::remove_dir_all(&folder).unwrap();
    }
}
