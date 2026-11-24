// "Rendimiento": what the PC is using, told plainly, and only real and reversible things to do about it:
// close an app (asking it first, by force only if it does not answer) and turn programs on or off at
// start-up as the Task Manager does. No "liberar RAM", no registry cleaning, no "acelerar".
//
// Everything is read here with Windows' own calls. The screen asks every 2 seconds while it is in view;
// one reading takes a few milliseconds (see the test at the end).
pub mod apps;
pub mod processes;
pub mod startup;
pub mod system;

use std::{
    collections::HashMap,
    path::Path,
    sync::Mutex,
    time::Instant,
};

use serde::Serialize;

use apps::{AppGroup, Context, GroupParams};
use processes::{CloseOutcome, PathCache};
use system::{BatteryInfo, CpuTimes, DiskCounter, DiskSpace};

pub const TOP_APPS: usize = 5;

pub const PROTECTED_ERROR: &str = "Esto es parte de Windows (o de Glup): no lo cierro";
pub const GONE_ERROR: &str      = "Ya se había cerrado";
pub const FORCE_ERROR: &str     = "No pude cerrarlo ni a la fuerza";

// What a reading keeps for the next one (processor times, to tell the share between the two).
#[derive(Default)]
pub struct Sampler {
    cpu       : Option<CpuTimes>,
    previous  : HashMap<u32, (u64, u64)>,
    at        : Option<Instant>,
    disk      : Option<DiskCounter>,
    disk_open : bool,
    paths     : PathCache,
    names     : HashMap<String, String>,
}

#[derive(Default)]
pub struct PerformanceState(Mutex<Sampler>);

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Overview {
    // 0 to 100.
    pub cpu          : f32,
    pub memory_used  : u64,
    pub memory_total : u64,
    // How busy the disks are (0 to 100), when Windows counts it.
    pub disk_busy    : Option<f32>,
    pub disks        : Vec<DiskSpace>,
    pub battery      : Option<BatteryInfo>,
    pub uptime       : u64,
    pub apps         : Vec<AppGroup>,
}

fn windows_dir() -> String {
    std::env::var("SystemRoot").or_else(|_| std::env::var("windir")).unwrap_or_else(|_| r"C:\Windows".to_string()).to_lowercase()
}

fn cpus() -> u32 {
    std::thread::available_parallelism().map_or(1, |count| count.get() as u32)
}

// "notepad.exe" → "Notepad", when the program has no name of its own.
pub fn plain_name(file: &str) -> String {
    let stem      = Path::new(file).file_stem().map_or_else(|| file.to_string(), |stem| stem.to_string_lossy().into_owned());
    let mut chars = stem.chars();
    chars.next().map(|first| first.to_uppercase().chain(chars).collect()).unwrap_or(stem)
}

fn name_of(names: &mut HashMap<String, String>, group: &AppGroup) -> String {
    let Some(exe) = &group.exe else { return apps::system_title(&group.name).map_or_else(|| plain_name(&group.name), str::to_string) };
    names.entry(exe.to_lowercase()).or_insert_with(|| processes::program_name(exe).unwrap_or_else(|| plain_name(&group.name))).clone()
}

fn groups_now(sampler: &mut Sampler, previous: &HashMap<u32, (u64, u64)>, elapsed: u64) -> (Vec<AppGroup>, HashMap<u32, (u64, u64)>) {
    let list    = processes::snapshot(&mut sampler.paths);
    let windows = windows_dir();
    let context = Context { own_pid: std::process::id(), own_session: processes::own_session(&sampler.paths), windows_dir: &windows };
    let groups  = apps::group(&GroupParams { processes: &list, previous, elapsed, cpus: cpus(), context: &context });
    let times   = list.iter().map(|process| (process.pid, (process.created, process.cpu_time))).collect();
    (groups, times)
}

pub fn read(state: &PerformanceState) -> Overview {
    let mut sampler = state.0.lock().unwrap_or_else(|poisoned| poisoned.into_inner());

    let times   = system::cpu_times();
    let cpu     = sampler.cpu.map_or(0.0, |before| system::busy_between(before, times));
    let elapsed = sampler.at.map_or(0, |at| (at.elapsed().as_nanos() / 100) as u64);
    let before  = std::mem::take(&mut sampler.previous);

    let (groups, now) = groups_now(&mut sampler, &before, elapsed);
    sampler.cpu       = Some(times);
    sampler.previous  = now;
    sampler.at        = Some(Instant::now());

    if !sampler.disk_open {
        sampler.disk      = DiskCounter::open();
        sampler.disk_open = true;
    }
    let disk_busy = sampler.disk.as_mut().and_then(DiskCounter::busy);

    let (memory_used, memory_total) = system::memory();
    let mut top = apps::top(groups, memory_total, TOP_APPS);
    for group in &mut top {
        group.name = name_of(&mut sampler.names, group);
    }

    Overview { cpu, memory_used, memory_total, disk_busy, disks: system::disks(), battery: system::battery(), uptime: system::uptime_seconds(), apps: top }
}

// The processes of that app now (and whether it may be closed), read again: never from an old list.
fn members_of(state: &PerformanceState, id: &str) -> Result<Vec<(u32, u64)>, String> {
    let mut sampler = state.0.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
    let (groups, _) = groups_now(&mut sampler, &HashMap::new(), 0);
    let group       = groups.into_iter().find(|group| group.id == id).ok_or(GONE_ERROR)?;
    if group.protected {
        return Err(PROTECTED_ERROR.to_string());
    }
    Ok(group.members)
}

// "Cerrar": as its windows' "X". The lock is not held while it waits.
pub fn close_app(state: &PerformanceState, id: &str) -> Result<CloseOutcome, String> {
    let members = members_of(state, id)?;
    Ok(processes::close(&members))
}

// "Forzar": only after "Cerrar" did not work, and only those processes.
pub fn force_app(state: &PerformanceState, id: &str) -> Result<(), String> {
    let members = members_of(state, id)?;
    processes::force(&members).then_some(()).ok_or_else(|| FORCE_ERROR.to_string())
}

pub fn startup_apps() -> Vec<startup::StartupEntry> {
    let mut entries = startup::list(&startup::sources());
    for entry in &mut entries {
        if let Some(name) = entry.path.as_deref().filter(|path| path.to_lowercase().ends_with(".exe")).and_then(processes::program_name) {
            entry.name = name;
        }
    }
    entries
}

pub fn set_startup_app(id: &str, enabled: bool) -> Result<(), String> {
    startup::set_enabled(&startup::sources(), id, enabled)
}

pub fn icon(path: &str) -> Option<Vec<u8>> {
    processes::icon_png(path)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_program_without_a_name_gets_its_file_name() {
        assert_eq!(plain_name("notepad.exe"), "Notepad");
        assert_eq!(plain_name("Code.exe"), "Code");
        assert_eq!(plain_name(""), "");
    }

    // The cost of the screen: one reading every 2 seconds. Measured on the whole reading (every process,
    // the disks, the battery), in a debug build; a release build is faster.
    #[cfg(windows)]
    #[test]
    fn a_reading_costs_little_processor() {
        let state = PerformanceState::default();
        let first = read(&state);
        assert!(first.memory_total > 0);

        // This thread only (other tests run at the same time in this process).
        let process_time = || {
            use windows_sys::Win32::{Foundation::FILETIME, System::Threading::{GetCurrentThread, GetThreadTimes}};
            let (mut a, mut b, mut kernel, mut user) = (FILETIME::default(), FILETIME::default(), FILETIME::default(), FILETIME::default());
            unsafe { GetThreadTimes(GetCurrentThread(), &mut a, &mut b, &mut kernel, &mut user) };
            let ticks = |time: FILETIME| (u64::from(time.dwHighDateTime) << 32) | u64::from(time.dwLowDateTime);
            ticks(kernel) + ticks(user)
        };

        let rounds  = 10;
        let started = process_time();
        let clock   = Instant::now();
        let mut last = first;
        for _ in 0..rounds {
            last = read(&state);
        }
        let used = (process_time() - started) as f64 / 10_000.0 / f64::from(rounds);
        let wall = clock.elapsed().as_secs_f64() * 1000.0 / f64::from(rounds);
        // Every 2 s: the share of one processor, and of the whole PC.
        let one  = used / 2000.0 * 100.0;
        eprintln!("[glup:rendimiento] una lectura: {used:.1} ms de procesador ({wall:.1} ms de reloj) · {one:.2} % de un núcleo · {:.2} % de la PC ({} núcleos) · {} apps arriba", one / f64::from(cpus()), cpus(), last.apps.len());

        assert!(!last.apps.is_empty());
        // 1 % of one processor every 2 s is 20 ms.
        assert!(used < 20.0, "{used} ms");
    }
}


