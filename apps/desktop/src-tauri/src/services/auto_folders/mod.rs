// «Carpetas automáticas»: rules like «cuando llegue algo a esta carpeta, haz esto» that Glup keeps on its
// own while it is open (in the tray). Windows wakes it when a watched folder changes (watcher.rs); a file
// is taken once it finished arriving (settle.rs); the work waits in a queue with a limit (queue.rs) and
// is done a few files at a time on a background thread that gives way to the tasks of the person
// (runner.rs). At start-up, what arrived with Glup closed is caught up (catchup.rs). Glup's own results
// are remembered and never taken again. The rules live in auto-folders.json in the app data folder.
pub mod catchup;
pub mod queue;
pub mod rules;
pub mod runner;
pub mod settle;
pub mod watcher;

#[cfg(test)]
mod tests;

use std::{
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicBool, Ordering},
        mpsc::{self, RecvTimeoutError, Sender},
        Condvar, Mutex, MutexGuard,
    },
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};

use crate::services::{
    auto_folders::{
        catchup::{catch_up, missed, CatchUp, Loose, MissedParams, Produced},
        queue::{Job, JobQueue, BATCH},
        rules::{summary_line, takes, tool, tool_takes, Filter, Original, Rule, RuleAction, SORT_TOOL},
        runner::{Ran, RunParams, TrashDoneParams, TrashParams},
        settle::{is_partial, Facts, Known, Settler},
        watcher::{Signal, Watcher},
    },
    cleanup::folders,
    destination::Destination,
    folder_sort::{
        self, classify,
        filters::{in_use, is_hidden},
        plan::{self as sort_plan, SortMode},
    },
    tasks,
};

pub const AUTO_FOLDERS_CHANGED_EVENT: &str = "auto-folders-changed";
pub const AUTO_FOLDERS_DONE_EVENT: &str    = "auto-folders-done";

pub const NO_RULE_ERROR: &str   = "Esa regla ya no está";
pub const NO_FOLDER_ERROR: &str = "Esa carpeta ya no está";
pub const SAVE_ERROR: &str      = "No pude guardar la regla";

const STORE_FILE: &str = "auto-folders.json";
// While a file is waiting to finish arriving, it is looked at again this often (only that file).
const TICK: Duration = Duration::from_millis(700);
// A task of the person is running: the work waits and asks again after this.
const YIELD: Duration = Duration::from_secs(2);
// The preview shows this many files.
const PREVIEW_FILES: usize = 60;

#[derive(Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct Saved {
    paused_all : bool,
    rules      : Vec<Rule>,
    produced   : Vec<String>,
}

#[derive(Default)]
struct Rules {
    paused_all : bool,
    rules      : Vec<Rule>,
    produced   : Produced,
    // Too many arrived with Glup closed: asked before doing them.
    asks       : HashMap<String, Vec<PathBuf>>,
    file       : Option<PathBuf>,
}

// What a rule did since the last notice, to tell it all at once.
struct Done {
    rule   : String,
    done   : usize,
    failed : usize,
}

#[derive(Default)]
pub struct AutoFolders {
    rules   : Mutex<Rules>,
    queue   : Mutex<JobQueue>,
    wake    : Condvar,
    signals : Mutex<Option<Sender<Signal>>>,
    // Its own Cancelar, never the one of the person's tasks.
    cancel  : AtomicBool,
    // «Pausar todas», also here so the work never takes the rules' lock while it holds the queue's.
    paused  : AtomicBool,
    // A few files are being done: what finishes arriving now waits until their results are written
    // down as Glup's own (so a slow batch never takes its first result as a new file).
    working  : AtomicBool,
    deferred : Mutex<Vec<PathBuf>>,
    done    : Mutex<Vec<Done>>,
}

pub fn now_ms() -> i64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map_or(0, |since| since.as_millis() as i64)
}

fn millis(time: std::io::Result<SystemTime>) -> i64 {
    time.ok().and_then(|time| time.duration_since(UNIX_EPOCH).ok()).map_or(0, |since| since.as_millis() as i64)
}

// When a file got to the folder: its creation (a download or a copy is created here, and keeps the date
// of its content as its change). A file edited with Glup closed did not arrive.
pub fn arrival(metadata: &fs::Metadata) -> i64 {
    let created = millis(metadata.created());
    if created > 0 { created } else { millis(metadata.modified()) }
}

pub fn key(path: &Path) -> String {
    path.to_string_lossy().trim_end_matches(['\\', '/']).to_lowercase()
}

fn lock<T>(mutex: &Mutex<T>) -> MutexGuard<'_, T> {
    mutex.lock().unwrap_or_else(|poisoned| poisoned.into_inner())
}

fn state(app: &AppHandle) -> tauri::State<'_, AutoFolders> {
    app.state::<AutoFolders>()
}

fn write(rules: &Rules) {
    let Some(file) = &rules.file else { return };
    let saved = Saved { paused_all: rules.paused_all, rules: rules.rules.clone(), produced: rules.produced.list() };
    let Ok(data) = serde_json::to_vec_pretty(&saved) else { return };
    let temporary = file.with_extension("json.tmp");
    if let Some(folder) = file.parent() {
        let _ = fs::create_dir_all(folder);
    }
    if fs::write(&temporary, data).is_ok() {
        let _ = fs::rename(&temporary, file);
    }
}

fn changed(app: &AppHandle) {
    let _ = app.emit(AUTO_FOLDERS_CHANGED_EVENT, ());
}

fn reload(app: &AppHandle) {
    if let Some(signals) = lock(&state(app).signals).as_ref() {
        let _ = signals.send(Signal::Reload);
    }
}

fn facts_of(path: &Path) -> Option<Facts> {
    let metadata = fs::symlink_metadata(path).ok().filter(fs::Metadata::is_file)?;
    Some(Facts { size: metadata.len(), modified: millis(metadata.modified()) })
}

// The loose files of a folder (never its subfolders), without downloads in progress or hidden ones.
pub fn loose_files(folder: &Path) -> Vec<Loose> {
    let Ok(entries) = fs::read_dir(folder) else { return Vec::new() };
    entries
        .flatten()
        .filter_map(|entry| {
            let metadata = entry.metadata().ok().filter(fs::Metadata::is_file)?;
            let name     = entry.file_name().to_string_lossy().into_owned();
            if is_partial(&name) || is_hidden(&metadata, &name) {
                return None;
            }
            Some(Loose { path: entry.path(), size: metadata.len(), arrived: arrival(&metadata), name })
        })
        .collect()
}

// ------------------------------------------------------------------ start

pub fn start(app: &AppHandle) {
    let file  = app.path().app_data_dir().ok().map(|folder| folder.join(STORE_FILE));
    let saved = file.as_ref().and_then(|file| fs::read(file).ok()).and_then(|data| serde_json::from_slice::<Saved>(&data).ok()).unwrap_or_default();
    {
        let state     = state(app);
        let mut rules = lock(&state.rules);
        state.paused.store(saved.paused_all, Ordering::SeqCst);
        *rules = Rules { paused_all: saved.paused_all, produced: Produced::from_list(&saved.produced), rules: saved.rules, asks: HashMap::new(), file };
    }

    let (sender, receiver) = mpsc::channel();
    *lock(&state(app).signals) = Some(sender.clone());

    // What arrived with Glup closed is looked at on its thread, so the start is never slower.
    let watching = app.clone();
    std::thread::spawn(move || {
        catch_up_all(&watching);
        coordinate(&watching, receiver, sender);
    });
    let working = app.clone();
    std::thread::spawn(move || work(&working));
}

// What arrived with Glup closed: a few are done; many are asked first.
fn catch_up_all(app: &AppHandle) {
    let state    = state(app);
    let mut jobs = Vec::new();
    {
        let mut rules = lock(&state.rules);
        if rules.paused_all {
            return;
        }
        let Rules { rules: list, produced, asks, .. } = &mut *rules;
        let now = now_ms();
        for rule in list.iter_mut().filter(|rule| rule.enabled && rule.needs.is_none()) {
            let Some(tool) = tool(&rule.action.tool) else { continue };
            let files = loose_files(Path::new(&rule.folder));
            let found = missed(MissedParams { files: &files, filter: &rule.filter, tool, since: rule.seen_until, produced });
            match catch_up(found.len()) {
                CatchUp::Nothing => rule.seen_until = now,
                CatchUp::Run     => {
                    rule.seen_until = now;
                    jobs.extend(found.into_iter().map(|path| Job { rule: rule.id.clone(), path }));
                }
                CatchUp::Ask     => {
                    asks.insert(rule.id.clone(), found);
                }
            }
        }
        write(&rules);
    }
    enqueue(app, jobs);
    changed(app);
}

fn enqueue(app: &AppHandle, jobs: Vec<Job>) {
    if jobs.is_empty() {
        return;
    }
    let state = state(app);
    let mut queue = lock(&state.queue);
    for job in jobs {
        queue.push(job);
    }
    state.wake.notify_one();
}

// ------------------------------------------------------------------ watching

fn coordinate(app: &AppHandle, receiver: mpsc::Receiver<Signal>, sender: Sender<Signal>) {
    let mut watchers: HashMap<String, (PathBuf, Watcher)> = HashMap::new();
    let mut settler = Settler::default();
    let mut known   = Known::default();
    watch_folders(WatchParams { app, watchers: &mut watchers, known: &mut known, sender: &sender });

    loop {
        let signal = if settler.is_empty() {
            match receiver.recv() {
                Ok(signal) => Some(signal),
                Err(_)     => break,
            }
        } else {
            match receiver.recv_timeout(TICK) {
                Ok(signal)                         => Some(signal),
                Err(RecvTimeoutError::Timeout)      => None,
                Err(RecvTimeoutError::Disconnected) => break,
            }
        };
        let now = now_ms();

        match signal {
            Some(Signal::Changed(path)) => {
                let exists = path.is_file();
                if !exists {
                    settler.observe(path.clone(), None, now);
                }
                if known.is_arrival(&path, exists) {
                    notice(&mut settler, path, now);
                }
            }
            Some(Signal::Rescan(folder)) => {
                for file in loose_files(&folder) {
                    if known.is_arrival(&file.path, true) {
                        notice(&mut settler, file.path, now);
                    }
                }
            }
            Some(Signal::Reload) => watch_folders(WatchParams { app, watchers: &mut watchers, known: &mut known, sender: &sender }),
            None                 => {}
        }

        for path in settler.paths() {
            settler.observe(path.clone(), facts_of(&path), now);
        }
        for path in settler.ready(now, &in_use) {
            if consider(app, &path) {
                known.remember(&path);
            }
        }
    }
}

fn notice(settler: &mut Settler, path: PathBuf, now: i64) {
    let name = path.file_name().map(|name| name.to_string_lossy().into_owned()).unwrap_or_default();
    if is_partial(&name) {
        return;
    }
    settler.observe(path.clone(), facts_of(&path), now);
}

struct WatchParams<'a> {
    app      : &'a AppHandle,
    watchers : &'a mut HashMap<String, (PathBuf, Watcher)>,
    known    : &'a mut Known,
    sender   : &'a Sender<Signal>,
}

// The folders of the rules that are on (none while «Pausar todas»); what each one already has is known,
// so only what arrives later counts.
fn watch_folders(params: WatchParams) {
    let WatchParams { app, watchers, known, sender } = params;
    let state = state(app);
    let wanted: HashMap<String, PathBuf> = {
        let rules = lock(&state.rules);
        if rules.paused_all { HashMap::new() } else { rules.rules.iter().filter(|rule| rule.enabled).map(|rule| (key(Path::new(&rule.folder)), PathBuf::from(&rule.folder))).collect() }
    };
    watchers.retain(|folder, (path, _)| {
        let keep = wanted.contains_key(folder);
        if !keep {
            known.forget_folder(path);
        }
        keep
    });
    for (folder, path) in wanted {
        if watchers.contains_key(&folder) {
            continue;
        }
        if let Ok(entries) = fs::read_dir(&path) {
            for entry in entries.flatten() {
                known.remember(&entry.path());
            }
        }
        if let Some(watcher) = watcher::watch(path.clone(), sender.clone()) {
            watchers.insert(folder, (path, watcher));
        }
    }
}

pub struct ConsiderParams<'a> {
    pub rules    : &'a mut [Rule],
    pub produced : &'a Produced,
    pub asking   : &'a dyn Fn(&str) -> bool,
    pub path     : &'a Path,
    pub size     : u64,
    pub arrived  : i64,
}

// A file that finished arriving: the rules of its folder that take it (a rule waiting for a download
// keeps it for later). Glup's own results are never taken. Returns the jobs.
pub fn jobs_for(params: ConsiderParams) -> Vec<Job> {
    let ConsiderParams { rules, produced, asking, path, size, arrived } = params;
    let (Some(folder), Some(name)) = (path.parent(), path.file_name()) else { return Vec::new() };
    let name = name.to_string_lossy();
    if produced.contains(path) {
        return Vec::new();
    }

    let mut jobs = Vec::new();
    for rule in rules.iter_mut().filter(|rule| rule.enabled && key(Path::new(&rule.folder)) == key(folder)) {
        if !asking(&rule.id) {
            rule.seen_until = rule.seen_until.max(arrived);
        }
        let Some(tool) = tool(&rule.action.tool) else { continue };
        if !takes(&rule.filter, &name, size) || !tool_takes(tool, &name) {
            continue;
        }
        if rule.needs.is_some() {
            let held = path.to_string_lossy().into_owned();
            if !rule.held.contains(&held) {
                rule.held.push(held);
            }
            continue;
        }
        jobs.push(Job { rule: rule.id.clone(), path: path.to_path_buf() });
    }
    jobs
}

// False when it has to wait for the batch being done (it is looked at again after it).
fn consider(app: &AppHandle, path: &Path) -> bool {
    let state = state(app);
    if state.working.load(Ordering::SeqCst) {
        lock(&state.deferred).push(path.to_path_buf());
        return false;
    }
    let Ok(metadata) = fs::symlink_metadata(path) else { return true };
    let name = path.file_name().map(|name| name.to_string_lossy().into_owned()).unwrap_or_default();
    if !metadata.is_file() || is_hidden(&metadata, &name) {
        return true;
    }

    let jobs = {
        let mut rules = lock(&state.rules);
        if rules.paused_all {
            return true;
        }
        let Rules { rules: list, produced, asks, .. } = &mut *rules;
        let asking = |id: &str| asks.contains_key(id);
        let jobs   = jobs_for(ConsiderParams { rules: list, produced, asking: &asking, path, size: metadata.len(), arrived: arrival(&metadata) });
        write(&rules);
        jobs
    };
    enqueue(app, jobs);
    changed(app);
    true
}

// ------------------------------------------------------------------ working

#[cfg(windows)]
fn lower_priority() {
    use windows_sys::Win32::System::Threading::{GetCurrentThread, SetThreadPriority, THREAD_MODE_BACKGROUND_BEGIN};
    unsafe { SetThreadPriority(GetCurrentThread(), THREAD_MODE_BACKGROUND_BEGIN) };
}

#[cfg(not(windows))]
fn lower_priority() {}

// One rule's files at a time, in the background; it waits while a task of the person runs, and tells
// what it did once the queue is empty.
fn work(app: &AppHandle) {
    lower_priority();
    let state = state(app);

    loop {
        let (rule, paths) = {
            let mut queue = lock(&state.queue);
            loop {
                let paused = state.paused.load(Ordering::SeqCst);
                if !queue.is_empty() && !paused && !tasks::busy(app) {
                    if let Some(batch) = queue.next_batch(BATCH) {
                        break batch;
                    }
                }
                queue = if queue.is_empty() || paused {
                    state.wake.wait(queue).unwrap_or_else(|poisoned| poisoned.into_inner())
                } else {
                    state.wake.wait_timeout(queue, YIELD).map(|(queue, _)| queue).unwrap_or_else(|poisoned| poisoned.into_inner().0)
                };
            }
        };

        state.working.store(true, Ordering::SeqCst);
        do_batch(app, &rule, paths);
        state.working.store(false, Ordering::SeqCst);
        look_again(app);
        changed(app);

        if lock(&state.queue).is_empty() {
            tell(app);
        }
    }
}

// What finished arriving during the batch, now that its results are known as Glup's own.
fn look_again(app: &AppHandle) {
    let state    = state(app);
    let deferred = std::mem::take(&mut *lock(&state.deferred));
    let signals  = lock(&state.signals).clone();
    if let Some(signals) = signals {
        for path in deferred {
            let _ = signals.send(Signal::Changed(path));
        }
    }
}

fn rule_of(app: &AppHandle, id: &str) -> Option<Rule> {
    lock(&state(app).rules).rules.iter().find(|rule| rule.id == id).cloned()
}

fn do_batch(app: &AppHandle, id: &str, paths: Vec<PathBuf>) {
    let state = state(app);
    let Some(rule) = rule_of(app, id).filter(|rule| rule.enabled) else { return };
    let paths: Vec<PathBuf> = paths.into_iter().filter(|path| path.is_file()).collect();
    if paths.is_empty() {
        return;
    }

    if let Some(needs) = runner::missing(app, &rule, &paths) {
        pause_for(app, &rule, needs, &paths);
        return;
    }

    state.cancel.store(false, Ordering::SeqCst);
    let ran     = runner::run(RunParams { app, rule: &rule, paths: &paths, cancel: &state.cancel });
    let trashed = if rule.original == Original::Trash && rule.action.tool != SORT_TOOL {
        let at = now_ms();
        runner::trash_done(TrashDoneParams { done: &ran.done, trash: &mut |source| runner::trash_original(TrashParams { app, path: source, rule: &rule.name, at }) })
    } else {
        0
    };
    if trashed > 0 {
        eprintln!("[glup:carpetas] {trashed} originales a la papelera ({})", rule.name);
    }
    record(app, &rule, &ran);
}

fn record(app: &AppHandle, rule: &Rule, ran: &Ran) {
    let state = state(app);
    {
        let mut rules = lock(&state.rules);
        for (_, outputs) in &ran.done {
            for output in outputs {
                rules.produced.add(output);
            }
        }
        if let Some(saved) = rules.rules.iter_mut().find(|saved| saved.id == rule.id) {
            saved.processed += ran.done.len() as u64;
            saved.last_run   = Some(now_ms());
        }
        write(&rules);
    }
    if !ran.retry.is_empty() {
        enqueue(app, ran.retry.iter().map(|path| Job { rule: rule.id.clone(), path: path.clone() }).collect());
    }
    if !ran.done.is_empty() || ran.failed > 0 {
        let mut done = lock(&state.done);
        match done.iter_mut().find(|item| item.rule == rule.id) {
            Some(item) => {
                item.done   += ran.done.len();
                item.failed += ran.failed;
            }
            None => done.push(Done { rule: rule.id.clone(), done: ran.done.len(), failed: ran.failed }),
        }
    }
}

// A download is missing: the rule stops, keeps its files and the panel asks for permission.
fn pause_for(app: &AppHandle, rule: &Rule, needs: String, paths: &[PathBuf]) {
    let state = state(app);
    {
        let mut rules = lock(&state.rules);
        if let Some(saved) = rules.rules.iter_mut().find(|saved| saved.id == rule.id) {
            saved.needs = Some(needs);
            for path in paths {
                let held = path.to_string_lossy().into_owned();
                if !saved.held.contains(&held) {
                    saved.held.push(held);
                }
            }
        }
        write(&rules);
    }
    lock(&state.queue).forget(&rule.id);
    let message = format!("«{}» necesita que aprenda algo antes de seguir: la pausé hasta que me des permiso", rule.name);
    let _ = app.emit(AUTO_FOLDERS_DONE_EVENT, Notice { message, tone: "calm".to_string() });
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct Notice {
    message : String,
    tone    : String,
}

fn folder_label(folder: &str) -> String {
    folder_sort::display_name(Path::new(folder), folders::user_folders().downloads.as_deref())
}

// One notice for everything since the last one: «Pasé 12 fotos de iPhone a JPG en Descargas».
fn tell(app: &AppHandle) {
    let state = state(app);
    let done: Vec<Done> = std::mem::take(&mut *lock(&state.done));
    if done.is_empty() {
        return;
    }
    let rules = lock(&state.rules).rules.clone();
    let lines: Vec<String> = done
        .iter()
        .filter_map(|item| {
            let rule = rules.iter().find(|rule| rule.id == item.rule)?;
            let tool = tool(&rule.action.tool)?;
            Some(summary_line(tool, item.done, item.failed, &folder_label(&rule.folder)))
        })
        .filter(|line| !line.is_empty())
        .collect();
    if lines.is_empty() {
        return;
    }
    let failed = done.iter().any(|item| item.failed > 0);
    let tone   = if failed { "partial" } else { "success" };
    let _      = app.emit(AUTO_FOLDERS_DONE_EVENT, Notice { message: lines.join(". "), tone: tone.to_string() });
}

// ------------------------------------------------------------------ the screen

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuleView {
    #[serde(flatten)]
    pub rule        : Rule,
    // «Descargas», «Documentos»…
    pub folder_name : String,
    // Files waiting in the queue now.
    pub waiting     : usize,
    // Arrived with Glup closed, waiting for «¿Los hago?».
    pub asking      : Option<usize>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AutoFoldersView {
    pub paused_all : bool,
    pub rules      : Vec<RuleView>,
    // Something waits for the person (a question or a download): the dot on Tu PC.
    pub attention  : bool,
}

// Never two locks at once: the rules first, then the queue.
pub fn view(app: &AppHandle) -> AutoFoldersView {
    let state = state(app);
    let (paused_all, list, asks) = {
        let rules = lock(&state.rules);
        let asks: HashMap<String, usize> = rules.asks.iter().map(|(id, files)| (id.clone(), files.len())).collect();
        (rules.paused_all, rules.rules.clone(), asks)
    };
    let waiting: Vec<usize> = {
        let queue = lock(&state.queue);
        list.iter().map(|rule| queue.waiting_for(&rule.id)).collect()
    };
    let views: Vec<RuleView> = list
        .into_iter()
        .zip(waiting)
        .map(|(rule, waiting)| RuleView { folder_name: folder_label(&rule.folder), waiting, asking: asks.get(&rule.id).copied(), rule })
        .collect();
    let attention = views.iter().any(|view| view.rule.enabled && (view.asking.is_some() || view.rule.needs.is_some()));
    AutoFoldersView { paused_all, rules: views, attention }
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuleInput {
    pub id          : Option<String>,
    pub name        : String,
    pub folder      : String,
    pub filter      : Filter,
    pub action      : RuleAction,
    #[serde(default)]
    pub original    : Original,
    #[serde(default)]
    pub destination : Destination,
    #[serde(default = "on")]
    pub enabled     : bool,
}

fn on() -> bool {
    true
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveRuleRequest {
    pub rule           : RuleInput,
    // Also what is already in the folder (true), or only what arrives from now on.
    pub apply_existing : bool,
}

fn new_id() -> String {
    static NEXT: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);
    format!("{}-{}", now_ms(), NEXT.fetch_add(1, std::sync::atomic::Ordering::Relaxed))
}

fn matching_now(rule: &Rule, produced: &Produced) -> Vec<PathBuf> {
    let Some(tool) = tool(&rule.action.tool) else { return Vec::new() };
    let files = loose_files(Path::new(&rule.folder));
    missed(MissedParams { files: &files, filter: &rule.filter, tool, since: i64::MIN, produced })
}

pub fn save_rule(app: &AppHandle, request: SaveRuleRequest) -> Result<AutoFoldersView, String> {
    let input = request.rule;
    if !Path::new(&input.folder).is_dir() {
        return Err(NO_FOLDER_ERROR.to_string());
    }
    tool(&input.action.tool).ok_or_else(|| SAVE_ERROR.to_string())?;

    let state = state(app);
    let jobs = {
        let mut rules = lock(&state.rules);
        let now       = now_ms();
        let id        = input.id.clone().unwrap_or_else(new_id);
        let previous  = rules.rules.iter().find(|rule| rule.id == id).cloned();
        let rule = Rule {
            id          : id.clone(),
            name        : input.name,
            folder      : input.folder,
            filter      : input.filter,
            action      : input.action,
            original    : input.original,
            destination : input.destination,
            enabled     : input.enabled,
            processed   : previous.as_ref().map_or(0, |rule| rule.processed),
            last_run    : previous.as_ref().and_then(|rule| rule.last_run),
            seen_until  : now,
            needs       : None,
            held        : Vec::new(),
        };
        let jobs = if request.apply_existing && rule.enabled { matching_now(&rule, &rules.produced) } else { Vec::new() };
        match rules.rules.iter_mut().find(|saved| saved.id == id) {
            Some(saved) => *saved = rule,
            None        => rules.rules.push(rule),
        }
        rules.asks.remove(&id);
        write(&rules);
        (id, jobs)
    };
    let (id, jobs) = jobs;
    lock(&state.queue).forget(&id);
    enqueue(app, jobs.into_iter().map(|path| Job { rule: id.clone(), path }).collect());
    reload(app);
    changed(app);
    Ok(view(app))
}

fn change_rule(app: &AppHandle, id: &str, change: impl FnOnce(&mut Rules) -> bool) -> Result<AutoFoldersView, String> {
    let state = state(app);
    {
        let mut rules = lock(&state.rules);
        if !change(&mut rules) {
            return Err(NO_RULE_ERROR.to_string());
        }
        write(&rules);
    }
    lock(&state.queue).forget(id);
    reload(app);
    changed(app);
    Ok(view(app))
}

pub fn delete_rule(app: &AppHandle, id: &str) -> Result<AutoFoldersView, String> {
    change_rule(app, id, |rules| {
        let before = rules.rules.len();
        rules.rules.retain(|rule| rule.id != id);
        rules.asks.remove(id);
        rules.rules.len() != before
    })
}

pub fn duplicate_rule(app: &AppHandle, id: &str) -> Result<AutoFoldersView, String> {
    let state = state(app);
    {
        let mut rules = lock(&state.rules);
        let Some(original) = rules.rules.iter().find(|rule| rule.id == id).cloned() else { return Err(NO_RULE_ERROR.to_string()) };
        let copy = Rule { id: new_id(), name: format!("{} (copia)", original.name), enabled: false, processed: 0, last_run: None, needs: None, held: Vec::new(), seen_until: now_ms(), ..original };
        rules.rules.push(copy);
        write(&rules);
    }
    changed(app);
    Ok(view(app))
}

// A rule paused and turned on again looks only at what arrives from now on.
pub fn set_enabled(app: &AppHandle, id: &str, enabled: bool) -> Result<AutoFoldersView, String> {
    change_rule(app, id, |rules| {
        let Some(rule) = rules.rules.iter_mut().find(|rule| rule.id == id) else { return false };
        rule.enabled = enabled;
        if enabled {
            rule.seen_until = now_ms();
        }
        rules.asks.remove(id);
        true
    })
}

pub fn set_paused_all(app: &AppHandle, paused: bool) -> AutoFoldersView {
    let state = state(app);
    {
        let mut rules = lock(&state.rules);
        rules.paused_all = paused;
        state.paused.store(paused, Ordering::SeqCst);
        if !paused {
            let now = now_ms();
            for rule in &mut rules.rules {
                rule.seen_until = now;
            }
        }
        rules.asks.clear();
        write(&rules);
    }
    state.wake.notify_one();
    reload(app);
    changed(app);
    view(app)
}

// «¿Los hago?» about what arrived with Glup closed: yes, or only what arrives from now on.
pub fn answer_catch_up(app: &AppHandle, id: &str, process: bool) -> AutoFoldersView {
    let state = state(app);
    let jobs = {
        let mut rules = lock(&state.rules);
        let asked     = rules.asks.remove(id).unwrap_or_default();
        if let Some(rule) = rules.rules.iter_mut().find(|rule| rule.id == id) {
            rule.seen_until = now_ms();
        }
        write(&rules);
        if process { asked.into_iter().map(|path| Job { rule: id.to_string(), path }).collect() } else { Vec::new() }
    };
    enqueue(app, jobs);
    changed(app);
    view(app)
}

// The download it waited for is here: it goes on, with the files that arrived meanwhile.
pub fn resume(app: &AppHandle, id: &str) -> AutoFoldersView {
    let state = state(app);
    let jobs = {
        let mut rules = lock(&state.rules);
        let held = match rules.rules.iter_mut().find(|rule| rule.id == id) {
            Some(rule) => {
                rule.needs = None;
                std::mem::take(&mut rule.held)
            }
            None => Vec::new(),
        };
        write(&rules);
        held.into_iter().map(|path| Job { rule: id.to_string(), path: PathBuf::from(path) }).collect()
    };
    enqueue(app, jobs);
    changed(app);
    view(app)
}

// ------------------------------------------------------------------ the preview

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PreviewFile {
    pub name : String,
    pub size : u64,
    // Sorting: the subfolder it would go to («PDFs», «2026 › 11 - Noviembre»).
    pub into : Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RulePreview {
    pub files       : Vec<PreviewFile>,
    pub total       : usize,
    pub bytes       : u64,
    // Downloads still on their way: they are done when they finish.
    pub downloading : usize,
    // «Descargas», «Documentos»…
    pub folder_name : String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SortPreviewOptions {
    #[serde(default)]
    mode: Option<SortMode>,
}

// What the rule would do with what is already in the folder, without doing it.
pub fn preview(app: &AppHandle, input: &RuleInput) -> Result<RulePreview, String> {
    let folder = Path::new(&input.folder);
    if !folder.is_dir() {
        return Err(NO_FOLDER_ERROR.to_string());
    }
    let tool        = tool(&input.action.tool).ok_or_else(|| SAVE_ERROR.to_string())?;
    let files       = loose_files(folder);
    let found       = missed(MissedParams { files: &files, filter: &input.filter, tool, since: i64::MIN, produced: &lock(&state(app).rules).produced });
    let downloading = fs::read_dir(folder).map(|entries| entries.flatten().filter(|entry| is_partial(&entry.file_name().to_string_lossy())).count()).unwrap_or(0);
    let mode        = (input.action.tool == SORT_TOOL).then(|| serde_json::from_value::<SortPreviewOptions>(input.action.options.clone()).ok().and_then(|options| options.mode).unwrap_or(SortMode::Type));

    let chosen: Vec<&Loose> = found.iter().filter_map(|path| files.iter().find(|file| &file.path == path)).collect();
    let bytes = chosen.iter().map(|file| file.size).sum();
    let shown = chosen
        .iter()
        .take(PREVIEW_FILES)
        .map(|file| {
            let modified = fs::metadata(&file.path).map(|metadata| sort_plan::millis(&metadata)).unwrap_or(0);
            let into     = mode.map(|mode| sort_plan::destination(classify::table(), mode, &file.name, modified).join(" › "));
            PreviewFile { name: file.name.clone(), size: file.size, into }
        })
        .collect();
    Ok(RulePreview { files: shown, total: chosen.len(), bytes, downloading, folder_name: folder_label(&input.folder) })
}
