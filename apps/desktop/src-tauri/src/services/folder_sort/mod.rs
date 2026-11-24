// "Ordenar una carpeta": the loose files of a folder (Descargas by default) into subfolders by type or
// by date. A preview first; only "Ordenar" moves, only what the preview showed and only if it is still
// the same; every move is recorded so "Deshacer" can put it back. The person's files are moved, never
// overwritten nor deleted (a copy to another disk is checked before the original goes).
pub mod classify;
pub mod filters;
pub mod journal;
pub mod mover;
pub mod plan;

use std::{
    collections::BTreeMap,
    path::{Path, PathBuf},
    sync::Mutex,
    time::{SystemTime, UNIX_EPOCH},
};

use chrono::Local;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

use crate::services::{
    actions::{ActionControl, ActionProgress},
    cleanup::folders,
    folder_sort::{
        filters::SkipReason,
        journal::{Journal, UndoParams, UndoTally},
        mover::{RunParams, RunTally},
        plan::{Plan, PlanParams, SkippedFile, SortMode},
    },
    history::{self, FilelessEntryParams, HistoryEntry},
    progress::{self, Stage},
    tasks::TaskSummary,
};

pub const SORT_ACTION_ID: &str = "folder-sort";
pub const UNDO_ACTION_ID: &str = "folder-sort-undo";

pub const READ_ERROR: &str       = "No pude leer esa carpeta";
pub const NO_PREVIEW_ERROR: &str = "Primero revisa la carpeta";
pub const NO_RECORD_ERROR: &str  = "Ya no tengo el registro de ese orden";

const HISTORY_KIND: &str   = "folder-sort";
const RECORDS_FOLDER: &str = "orden";
const DOWNLOADS_NAME: &str = "Descargas";

// The last preview: only its files can be moved, and only once.
#[derive(Default)]
pub struct FolderSortState(Mutex<Option<Plan>>);

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PreviewRequest {
    pub folder : String,
    pub mode   : SortMode,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SortRequest {
    pub task_id: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UndoRequest {
    pub id      : String,
    pub task_id : Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PreviewFile {
    pub name : String,
    pub size : u64,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PreviewGroup {
    // "Imágenes", or "2026 › 11 - Noviembre".
    pub folder : String,
    pub count  : usize,
    pub bytes  : u64,
    pub files  : Vec<PreviewFile>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SortPreview {
    pub folder  : String,
    pub name    : String,
    pub mode    : SortMode,
    pub groups  : Vec<PreviewGroup>,
    pub skipped : Vec<SkippedFile>,
    pub count   : usize,
    pub bytes   : u64,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SortReport {
    pub moved     : usize,
    pub folders   : usize,
    pub skipped   : Vec<SkippedFile>,
    pub failed    : Vec<String>,
    pub cancelled : bool,
    // The record to undo it (None when nothing moved).
    pub undo_id   : Option<String>,
    pub summary   : TaskSummary,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UndoReport {
    pub restored  : usize,
    pub missing   : Vec<String>,
    pub occupied  : Vec<String>,
    pub failed    : Vec<String>,
    pub cancelled : bool,
    // Still undoable (cancelled before the end).
    pub pending   : bool,
    pub summary   : TaskSummary,
}

fn now() -> i64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map_or(0, |since| since.as_millis() as i64)
}

fn counted(count: usize, singular: &str, plural: &str) -> String {
    format!("{count} {}", if count == 1 { singular } else { plural })
}

fn summary(tone: &str, message: String, notes: Vec<String>) -> TaskSummary {
    TaskSummary { tone: tone.to_string(), message, note: (!notes.is_empty()).then(|| notes.join(" · ")) }
}

// Descargas as the person knows it (the folder itself is "Downloads"); any other by its own name.
pub fn display_name(folder: &Path, downloads: Option<&Path>) -> String {
    if downloads.is_some_and(|downloads| downloads == folder) {
        return DOWNLOADS_NAME.to_string();
    }
    folder.file_name().map_or_else(|| folder.to_string_lossy().into_owned(), |name| name.to_string_lossy().into_owned())
}

pub fn default_folder() -> Option<String> {
    folders::user_folders().downloads.map(|path| path.to_string_lossy().into_owned())
}

fn reason_words(reason: SkipReason, count: usize) -> String {
    match reason {
        SkipReason::Downloading => format!("{count} descargándose"),
        SkipReason::InUse       => format!("{count} en uso"),
        SkipReason::Hidden      => counted(count, "oculto o del sistema", "ocultos o del sistema"),
        SkipReason::Recent      => format!("{count} recién {}", if count == 1 { "cambiado" } else { "cambiados" }),
        SkipReason::Changed     => format!("{count} que {} después de revisar", if count == 1 { "cambió" } else { "cambiaron" }),
    }
}

// "Salté 3: 2 descargándose, 1 en uso".
pub fn skipped_note(skipped: &[SkipReason]) -> Option<String> {
    if skipped.is_empty() {
        return None;
    }

    let order = [SkipReason::Downloading, SkipReason::InUse, SkipReason::Hidden, SkipReason::Recent, SkipReason::Changed];
    let parts: Vec<_> = order
        .iter()
        .map(|reason| (*reason, skipped.iter().filter(|item| *item == reason).count()))
        .filter(|(_, count)| *count > 0)
        .map(|(reason, count)| reason_words(reason, count))
        .collect();

    Some(format!("Salté {}: {}", skipped.len(), parts.join(", ")))
}

pub struct SortSummaryParams<'a> {
    pub moved     : usize,
    pub folders   : usize,
    pub skipped   : &'a [SkipReason],
    pub failed    : usize,
    pub cancelled : bool,
}

pub fn sort_summary(params: SortSummaryParams) -> TaskSummary {
    let mut notes: Vec<String> = skipped_note(params.skipped).into_iter().collect();
    if params.failed > 0 {
        notes.push(format!("No pude mover {}", counted(params.failed, "archivo", "archivos")));
    }

    if params.cancelled {
        let mut notes = notes;
        if params.moved > 0 {
            notes.insert(0, "Puedes deshacerlo".to_string());
        }
        return summary("calm", format!("Orden cancelado · moví {}", counted(params.moved, "archivo", "archivos")), notes);
    }

    if params.moved == 0 {
        let tone = if params.failed > 0 { "failed" } else { "calm" };
        return summary(tone, "No había nada que ordenar".to_string(), notes);
    }

    let tone = if params.failed > 0 { "partial" } else { "success" };
    summary(tone, format!("Ordené {} en {}", counted(params.moved, "archivo", "archivos"), counted(params.folders, "carpeta", "carpetas")), notes)
}

pub fn undo_summary(tally: &UndoTally) -> TaskSummary {
    let mut notes = Vec::new();
    if !tally.missing.is_empty() {
        notes.push(format!("{} ya no {} donde {}", tally.missing.len(), if tally.missing.len() == 1 { "estaba" } else { "estaban" }, if tally.missing.len() == 1 { "lo dejé" } else { "los dejé" }));
    }
    if !tally.occupied.is_empty() {
        notes.push(format!("{} {} su lugar ocupado", tally.occupied.len(), if tally.occupied.len() == 1 { "tenía" } else { "tenían" }));
    }
    if !tally.failed.is_empty() {
        notes.push(format!("No pude devolver {}", counted(tally.failed.len(), "archivo", "archivos")));
    }

    if tally.cancelled {
        notes.insert(0, "Puedes terminar de deshacerlo desde el Historial".to_string());
        return summary("calm", format!("Deshacer cancelado · devolví {}", counted(tally.restored, "archivo", "archivos")), notes);
    }

    let restored = counted(tally.restored, "archivo", "archivos");
    match (tally.restored, notes.is_empty()) {
        (0, _)    => summary("failed", "No pude devolver ningún archivo".to_string(), notes),
        (_, true) => summary("success", format!("Devolví {restored} a su lugar"), notes),
        _         => summary("partial", format!("Devolví {restored} a su lugar"), notes),
    }
}

fn group_label(folders: &[String]) -> String {
    folders.join(" › ")
}

// One group per destination: by type in the order of categories.json ("Otros" last), by date the most
// recent month first.
pub fn preview_groups(plan: &Plan) -> Vec<PreviewGroup> {
    let mut groups: BTreeMap<Vec<String>, PreviewGroup> = BTreeMap::new();

    for item in &plan.moves {
        let group = groups.entry(item.folders.clone()).or_insert_with(|| PreviewGroup { folder: group_label(&item.folders), count: 0, bytes: 0, files: Vec::new() });
        let name  = item.source.file_name().map(|value| value.to_string_lossy().into_owned()).unwrap_or_default();
        group.count += 1;
        group.bytes += item.size;
        group.files.push(PreviewFile { name, size: item.size });
    }

    let mut ordered: Vec<(Vec<String>, PreviewGroup)> = groups.into_iter().collect();
    match plan.mode {
        SortMode::Type => ordered.sort_by_key(|(folders, _)| classify::type_rank(classify::table(), &folders[0])),
        SortMode::Date => ordered.sort_by(|(a, _), (b, _)| b.cmp(a)),
    }
    ordered.into_iter().map(|(_, group)| group).collect()
}

pub fn preview(app: &AppHandle, request: PreviewRequest) -> Result<SortPreview, String> {
    let folder = PathBuf::from(&request.folder);
    if !folder.is_dir() {
        return Err(READ_ERROR.to_string());
    }

    let in_use = |path: &Path| filters::in_use(path);
    let plan   = plan::plan(PlanParams { folder: &folder, mode: request.mode, table: classify::table(), now: now(), in_use: &in_use }).map_err(|error| {
        eprintln!("[glup:ordenar] no pude leer {}: {error}", folder.display());
        READ_ERROR.to_string()
    })?;

    let downloads = folders::user_folders().downloads;
    let preview   = SortPreview {
        folder  : request.folder.clone(),
        name    : display_name(&folder, downloads.as_deref()),
        mode    : request.mode,
        groups  : preview_groups(&plan),
        skipped : plan.skipped.clone(),
        count   : plan.moves.len(),
        bytes   : plan.moves.iter().map(|item| item.size).sum(),
    };

    if let Ok(mut state) = app.state::<FolderSortState>().0.lock() {
        *state = Some(plan);
    }
    Ok(preview)
}

fn records_folder(app: &AppHandle) -> Option<PathBuf> {
    app.path().app_data_dir().ok().map(|folder| folder.join(RECORDS_FOLDER))
}

fn emit_progress(app: &AppHandle, task: &Option<String>, current: usize, total: usize, name: &str) {
    progress::emit(app, ActionProgress { task_id: task.clone(), current, total, name: name.to_string(), active: 1, detail: None, stage: Stage::Working, via: None });
}

// The record before anything moves: its folder, its mode and how many files the preview planned.
fn journal_of(id: &str, plan: &Plan) -> Journal {
    Journal { id: id.to_string(), folder: plan.folder.clone(), mode: plan.mode, date: Local::now().to_rfc3339(), created: Vec::new(), moves: Vec::new(), total: plan.moves.len(), finished: false }
}

// The Historial line of a sort: the same one from the start ("en curso") to the end.
fn entry_id(id: &str) -> String {
    format!("orden-{id}")
}

pub struct SortEntryParams<'a> {
    pub id     : &'a str,
    pub name   : &'a str,
    pub detail : String,
    pub undo   : bool,
}

pub fn sort_entry(params: SortEntryParams) -> HistoryEntry {
    let entry = history::fileless_entry(FilelessEntryParams { name: &format!("Ordené {}", params.name), kind: HISTORY_KIND, action: SORT_ACTION_ID, detail: params.detail });
    HistoryEntry { id: entry_id(params.id), undo: params.undo.then(|| params.id.to_string()), ..entry }
}

pub fn running_detail(total: usize) -> String {
    format!("{} · en curso", counted(total, "archivo", "archivos"))
}

// "se interrumpió (40 de 120)".
pub fn interrupted_detail(journal: &Journal) -> String {
    format!("se interrumpió ({} de {})", journal.moves.len(), journal.total)
}

pub struct RecoverParams<'a> {
    pub records   : &'a Path,
    pub downloads : Option<&'a Path>,
    pub entries   : Vec<HistoryEntry>,
}

// The sorts Glup could not end (closed or shut down halfway): each one keeps (or gets) its Historial
// line with "Deshacer" for what it moved. One that moved nothing leaves no record nor line.
pub fn recover_records(params: RecoverParams) -> Vec<HistoryEntry> {
    let mut entries = params.entries;

    for journal in journal::unfinished(params.records) {
        if journal.moves.is_empty() {
            journal::remove_empty(&journal.created);
            let _   = journal::remove(params.records, &journal.id);
            entries = history::without(entries, &[entry_id(&journal.id)]);
            continue;
        }

        let _    = journal::finish(params.records, &journal);
        let name = display_name(&journal.folder, params.downloads);
        entries  = history::upserted(entries, sort_entry(SortEntryParams { id: &journal.id, name: &name, detail: interrupted_detail(&journal), undo: true }));
    }
    entries
}

// At start-up, away from the window.
pub fn spawn_recovery(app: AppHandle) {
    std::thread::spawn(move || {
        let Some(records) = records_folder(&app) else { return };
        if journal::unfinished(&records).is_empty() {
            return;
        }

        let downloads = folders::user_folders().downloads;
        let result    = history::update(&app, |entries| recover_records(RecoverParams { records: &records, downloads: downloads.as_deref(), entries }));
        if let Err(error) = result {
            eprintln!("[glup:ordenar] no pude recuperar un orden interrumpido: {error}");
        }
    });
}

fn distinct_folders(tally: &RunTally) -> usize {
    let mut folders: Vec<&Path> = tally.moved.iter().filter_map(|record| record.to.parent()).collect();
    folders.sort();
    folders.dedup();
    folders.len()
}

// "Ordenar": the plan of the last preview. Its record and its Historial line ("en curso") are written
// before the first file moves and the record grows with each one, so a sort cut by a closed Glup can
// still be undone (`spawn_recovery`).
pub fn sort(app: &AppHandle, task: &Option<String>) -> Result<SortReport, String> {
    let control = app.state::<ActionControl>();
    control.begin(task);

    let plan         = app.state::<FolderSortState>().0.lock().ok().and_then(|mut state| state.take()).ok_or(NO_PREVIEW_ERROR)?;
    let records      = records_folder(app);
    let id           = format!("{}", Local::now().timestamp_millis());
    let total        = plan.moves.len();
    let name         = display_name(&plan.folder, folders::user_folders().downloads.as_deref());
    let header       = journal_of(&id, &plan);
    let in_use       = |path: &Path| filters::in_use(path);
    let recorder     = records.as_ref().and_then(|records| journal::Recorder::start(records, &header).ok());

    let _ = history::update(app, |entries| history::upserted(entries, sort_entry(SortEntryParams { id: &id, name: &name, detail: running_detail(total), undo: false })));

    let tally = mover::run(RunParams {
        plan       : &plan,
        now        : now(),
        cancel     : &control.cancelled,
        in_use     : &in_use,
        progress   : &mut |current, name| emit_progress(app, task, current, total, name),
        checkpoint : &mut |step| {
            if let Some(recorder) = &recorder {
                let _ = recorder.record(&step);
            }
        },
    });

    progress::emit(app, ActionProgress::at(task, Stage::Saving));

    let folders = distinct_folders(&tally);
    let undo_id = (!tally.moved.is_empty()).then(|| id.clone());

    if tally.moved.is_empty() {
        journal::remove_empty(&tally.created);
        if let Some(records) = &records {
            let _ = journal::remove(records, &id);
        }
        let _ = history::update(app, |entries| history::without(entries, &[entry_id(&id)]));
    } else {
        let done   = Journal { created: tally.created.clone(), moves: tally.moved.clone(), ..header };
        let saved  = records.as_ref().is_some_and(|records| journal::finish(records, &done).is_ok());
        let detail = format!("{} en {}", counted(tally.moved.len(), "archivo", "archivos"), counted(folders, "carpeta", "carpetas"));
        let _      = history::update(app, |entries| history::upserted(entries, sort_entry(SortEntryParams { id: &id, name: &name, detail, undo: saved })));
    }

    let mut skipped = plan.skipped.clone();
    skipped.extend(tally.changed.iter().map(|(name, reason)| SkippedFile { name: name.clone(), reason: *reason }));
    let reasons: Vec<SkipReason> = skipped.iter().map(|item| item.reason).collect();

    Ok(SortReport {
        moved     : tally.moved.len(),
        folders,
        failed    : tally.failed.clone(),
        cancelled : tally.cancelled,
        undo_id,
        summary   : sort_summary(SortSummaryParams { moved: tally.moved.len(), folders, skipped: &reasons, failed: tally.failed.len(), cancelled: tally.cancelled }),
        skipped,
    })
}

// "Deshacer" (from the result, the notice or the Historial).
pub fn undo(app: &AppHandle, request: &UndoRequest, task: &Option<String>) -> Result<UndoReport, String> {
    let control = app.state::<ActionControl>();
    control.begin(task);

    let records = records_folder(app).ok_or(NO_RECORD_ERROR)?;
    let mut record = journal::load(&records, &request.id).map_err(|_| NO_RECORD_ERROR.to_string())?;
    let total      = record.moves.len();

    let tally = journal::undo(UndoParams {
        journal  : &record,
        cancel   : &control.cancelled,
        progress : &mut |current, name| emit_progress(app, task, current, total, name),
    });

    progress::emit(app, ActionProgress::at(task, Stage::Saving));

    let pending = tally.cancelled && !tally.remaining.is_empty();
    if pending {
        record.moves = tally.remaining.clone();
        let _        = journal::save(&records, &record);
    } else {
        let _ = journal::remove(&records, &request.id);
        let _ = history::mark_undone(app, &request.id);
    }

    Ok(UndoReport {
        restored  : tally.restored,
        missing   : tally.missing.clone(),
        occupied  : tally.occupied.clone(),
        failed    : tally.failed.clone(),
        cancelled : tally.cancelled,
        pending,
        summary   : undo_summary(&tally),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_summary_says_how_many_files_in_how_many_folders() {
        let done = sort_summary(SortSummaryParams { moved: 120, folders: 7, skipped: &[], failed: 0, cancelled: false });
        assert_eq!((done.tone.as_str(), done.message.as_str(), done.note), ("success", "Ordené 120 archivos en 7 carpetas", None));

        let one = sort_summary(SortSummaryParams { moved: 1, folders: 1, skipped: &[], failed: 0, cancelled: false });
        assert_eq!(one.message, "Ordené 1 archivo en 1 carpeta");
    }

    #[test]
    fn what_was_skipped_is_counted_by_reason() {
        let skipped = [SkipReason::Downloading, SkipReason::InUse, SkipReason::Downloading, SkipReason::Recent, SkipReason::Hidden];
        assert_eq!(skipped_note(&skipped).as_deref(), Some("Salté 5: 2 descargándose, 1 en uso, 1 oculto o del sistema, 1 recién cambiado"));
        assert_eq!(skipped_note(&[]), None);
        assert_eq!(skipped_note(&[SkipReason::Changed, SkipReason::Changed]).as_deref(), Some("Salté 2: 2 que cambiaron después de revisar"));
    }

    #[test]
    fn a_cancelled_sort_keeps_what_moved_and_can_be_undone() {
        let cancelled = sort_summary(SortSummaryParams { moved: 40, folders: 3, skipped: &[], failed: 0, cancelled: true });
        assert_eq!(cancelled.message, "Orden cancelado · moví 40 archivos");
        assert_eq!(cancelled.note.as_deref(), Some("Puedes deshacerlo"));

        let nothing = sort_summary(SortSummaryParams { moved: 0, folders: 0, skipped: &[SkipReason::InUse], failed: 0, cancelled: false });
        assert_eq!((nothing.tone.as_str(), nothing.message.as_str()), ("calm", "No había nada que ordenar"));
    }

    #[test]
    fn the_undo_says_what_it_could_not_put_back() {
        let all = undo_summary(&UndoTally { restored: 12, ..UndoTally::default() });
        assert_eq!((all.tone.as_str(), all.message.as_str()), ("success", "Devolví 12 archivos a su lugar"));

        let some = undo_summary(&UndoTally { restored: 10, missing: vec!["a".into(), "b".into()], occupied: vec!["c".into()], ..UndoTally::default() });
        assert_eq!(some.tone, "partial");
        assert_eq!(some.note.as_deref(), Some("2 ya no estaban donde los dejé · 1 tenía su lugar ocupado"));
    }

    #[test]
    fn descargas_is_called_by_its_name_and_groups_keep_their_order() {
        let downloads = PathBuf::from("C:/Users/ana/Downloads");
        assert_eq!(display_name(&downloads, Some(&downloads)), "Descargas");
        assert_eq!(display_name(Path::new("D:/Trabajo/Facturas"), Some(&downloads)), "Facturas");

        let plan = Plan {
            folder  : PathBuf::from("C:/d"),
            mode    : SortMode::Type,
            skipped : Vec::new(),
            moves   : [("x.dwg", "Otros"), ("a.pdf", "PDFs"), ("b.jpg", "Imágenes"), ("c.pdf", "PDFs")]
                .iter()
                .map(|(name, folder)| plan::PlannedMove { source: PathBuf::from("C:/d").join(name), size: 10, modified: 0, folders: vec![folder.to_string()] })
                .collect(),
        };
        let groups: Vec<_> = preview_groups(&plan).into_iter().map(|group| (group.folder, group.count, group.bytes)).collect();
        assert_eq!(groups, [("Imágenes".to_string(), 1, 10), ("PDFs".to_string(), 2, 20), ("Otros".to_string(), 1, 10)]);
    }

    #[test]
    fn by_date_the_most_recent_month_comes_first() {
        let moves = [["2025", "12 - Diciembre"], ["2026", "01 - Enero"], ["2026", "11 - Noviembre"]]
            .iter()
            .map(|folders| plan::PlannedMove { source: PathBuf::from("C:/d/a"), size: 1, modified: 0, folders: folders.iter().map(|part| part.to_string()).collect() })
            .collect();
        let plan   = Plan { folder: PathBuf::from("C:/d"), mode: SortMode::Date, skipped: Vec::new(), moves };
        let labels: Vec<_> = preview_groups(&plan).into_iter().map(|group| group.folder).collect();

        assert_eq!(labels, ["2026 › 11 - Noviembre", "2026 › 01 - Enero", "2025 › 12 - Diciembre"]);
    }

    fn old_file(path: &Path, contents: &[u8]) {
        std::fs::write(path, contents).unwrap();
        std::fs::File::options().write(true).open(path).unwrap().set_modified(SystemTime::now() - std::time::Duration::from_secs(3600)).unwrap();
    }

    fn free(_: &Path) -> bool {
        false
    }

    #[test]
    fn a_sort_cut_by_a_closed_glup_shows_up_at_start_and_can_be_undone() {
        use std::{fs, sync::atomic::{AtomicBool, Ordering}};

        let base      = std::env::temp_dir().join(format!("glup-sort-recover-{}", std::process::id()));
        let downloads = base.join("Downloads");
        let records   = base.join("datos").join(RECORDS_FOLDER);
        let _         = fs::remove_dir_all(&base);
        fs::create_dir_all(&downloads).unwrap();
        for name in ["a.pdf", "b.jpg", "c.zip"] {
            old_file(&downloads.join(name), name.as_bytes());
        }

        // The same steps as "Ordenar", until Glup closes after the second file.
        let plan         = plan::plan(PlanParams { folder: &downloads, mode: SortMode::Type, table: classify::table(), now: now(), in_use: &free }).unwrap();
        let recorder     = journal::Recorder::start(&records, &journal_of("7", &plan)).unwrap();
        let running      = sort_entry(SortEntryParams { id: "7", name: "Descargas", detail: running_detail(3), undo: false });
        let closed       = AtomicBool::new(false);
        mover::run(RunParams {
            plan       : &plan,
            now        : now(),
            cancel     : &closed,
            in_use     : &free,
            progress   : &mut |index, _| if index == 1 { closed.store(true, Ordering::SeqCst) },
            checkpoint : &mut |step| recorder.record(&step).unwrap(),
        });
        assert_eq!(running.detail, "3 archivos · en curso");
        assert_eq!(running.undo, None);

        // Next start: the line it had is now the interrupted one, with "Deshacer".
        let entries = recover_records(RecoverParams { records: &records, downloads: Some(&downloads), entries: vec![running] });
        assert_eq!(entries.len(), 1);
        assert_eq!((entries[0].name.as_str(), entries[0].detail.as_str()), ("Ordené Descargas", "se interrumpió (2 de 3)"));
        assert_eq!(entries[0].undo.as_deref(), Some("7"));

        // Its record is finished now: a second start finds nothing to recover.
        let journal = journal::load(&records, "7").unwrap();
        assert!(journal.finished);
        assert!(recover_records(RecoverParams { records: &records, downloads: Some(&downloads), entries: Vec::new() }).is_empty());

        let tally = journal::undo(UndoParams { journal: &journal, cancel: &AtomicBool::new(false), progress: &mut |_, _| {} });
        assert_eq!(tally.restored, 2);
        let mut left: Vec<_> = fs::read_dir(&downloads).unwrap().map(|entry| entry.unwrap().file_name().to_string_lossy().into_owned()).collect();
        left.sort();
        assert_eq!(left, ["a.pdf", "b.jpg", "c.zip"]);

        fs::remove_dir_all(&base).unwrap();
    }

    #[test]
    fn an_interrupted_sort_with_no_line_gets_one_and_one_that_moved_nothing_leaves_none() {
        use std::fs;

        let base    = std::env::temp_dir().join(format!("glup-sort-recover-new-{}", std::process::id()));
        let records = base.join(RECORDS_FOLDER);
        let _       = fs::remove_dir_all(&base);
        let header  = |id: &str| Journal { id: id.to_string(), folder: base.join("Trabajo"), mode: SortMode::Date, date: String::new(), created: Vec::new(), moves: Vec::new(), total: 120, finished: false };

        let moved     = journal::Recorder::start(&records, &header("1")).unwrap();
        let record    = |name: &str| mover::MoveRecord { from: base.join("Trabajo").join(name), to: base.join("Trabajo").join("2026").join(name), size: 1 };
        for index in 0..40 {
            moved.record(&mover::Step::Moved(record(&format!("{index}.txt")))).unwrap();
        }
        journal::Recorder::start(&records, &header("2")).unwrap();
        let empty = sort_entry(SortEntryParams { id: "2", name: "Trabajo", detail: running_detail(120), undo: false });

        let entries = recover_records(RecoverParams { records: &records, downloads: None, entries: vec![empty] });

        assert_eq!(entries.len(), 1);
        assert_eq!((entries[0].id.as_str(), entries[0].name.as_str(), entries[0].detail.as_str()), ("orden-1", "Ordené Trabajo", "se interrumpió (40 de 120)"));
        assert!(journal::load(&records, "2").is_err());

        fs::remove_dir_all(&base).unwrap();
    }
}
