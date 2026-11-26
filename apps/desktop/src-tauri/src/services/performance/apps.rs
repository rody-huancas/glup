// What is using the PC, by app and not by loose process: each process joins the app that started it
// (Chrome's dozens of helpers are one Chrome), as the "Aplicaciones" of the Task Manager. And what can
// never be closed from Glup: Windows itself, the services of other sessions and Glup.
use std::{collections::HashMap, path::Path};

use serde::Serialize;

use crate::services::paths;

// One process, as read now.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct ProcessFacts {
    pub pid      : u32,
    pub parent   : u32,
    // When it started (FILETIME), to tell a parent from a later process that got its number.
    pub created  : u64,
    // Processor time used so far (kernel + user, 100 ns units).
    pub cpu_time : u64,
    // Private working set: what the Task Manager shows as its memory.
    pub memory   : u64,
    // Full path of its program, when Windows lets it be read.
    pub exe      : Option<String>,
    // File name of its program ("chrome.exe").
    pub name     : String,
    pub session  : u32,
}

pub struct Context<'a> {
    pub own_pid     : u32,
    pub own_session : u32,
    // "C:\Windows", lowercase.
    pub windows_dir : &'a str,
}

// Parts of Windows that may live elsewhere or have no readable path.
const SYSTEM_NAMES: [&str; 26] = [
    "system", "registry", "memory compression", "secure system", "idle", "smss.exe", "csrss.exe", "wininit.exe", "winlogon.exe", "services.exe",
    "lsass.exe", "lsaiso.exe", "svchost.exe", "dwm.exe", "explorer.exe", "fontdrvhost.exe", "sihost.exe", "ctfmon.exe", "taskhostw.exe",
    "runtimebroker.exe", "searchhost.exe", "startmenuexperiencehost.exe", "shellexperiencehost.exe", "textinputhost.exe", "audiodg.exe",
    "msmpeng.exe",
];

// Not apps nor processes: the processor with nothing to do ("System Idle Process", number 0) and the
// time spent on interrupts, which the Task Manager shows as rows. Never in the list, whatever they use.
const NOT_APPS: [&str; 4] = ["idle", "system idle process", "interrupts", "system interrupts"];

pub fn is_pseudo(process: &ProcessFacts) -> bool {
    process.pid == 0 || NOT_APPS.contains(&process.name.to_lowercase().as_str())
}

// Parts of Windows whose program Glup cannot read (its kernel, services), by a name people can read.
const SYSTEM_TITLES: [(&str, &str); 9] = [
    ("system", "Windows"),
    ("memory compression", "Compresión de memoria de Windows"),
    ("registry", "Registro de Windows"),
    ("secure system", "Sistema seguro de Windows"),
    ("vmmem", "Máquina virtual de Windows"),
    ("vmmemwsl", "Linux en Windows (WSL)"),
    ("svchost.exe", "Servicios de Windows"),
    ("msmpeng.exe", "Antivirus de Microsoft Defender"),
    ("searchindexer.exe", "Indexador de búsqueda de Windows"),
];

pub fn system_title(name: &str) -> Option<&'static str> {
    let name = name.to_lowercase();
    SYSTEM_TITLES.iter().find(|(known, _)| *known == name).map(|(_, title)| *title)
}

fn lower(text: &str) -> String {
    text.to_lowercase().replace('/', "\\")
}

// Part of Windows: its kernel (no path), its own folder, a name of the list, or another session (services).
pub fn is_system(process: &ProcessFacts, context: &Context) -> bool {
    let Some(exe) = &process.exe else { return true };
    let windows   = Path::new(context.windows_dir);

    process.pid <= 4 || process.session != context.own_session || paths::is_inside(Path::new(exe), windows) || SYSTEM_NAMES.contains(&process.name.to_lowercase().as_str())
}

// Never closed from Glup: Windows, and Glup itself.
pub fn is_protected(process: &ProcessFacts, context: &Context) -> bool {
    process.pid == context.own_pid || is_system(process, context)
}

// The process each one belongs to: up its parents while they are apps (not Windows, which starts
// everything) and really are its parents (started before it).
pub fn roots(processes: &[ProcessFacts], context: &Context) -> HashMap<u32, u32> {
    let by_pid: HashMap<u32, &ProcessFacts> = processes.iter().map(|process| (process.pid, process)).collect();

    processes
        .iter()
        .map(|process| {
            let mut root  = process;
            let mut steps = 0;
            while let Some(parent) = by_pid.get(&root.parent).copied() {
                let started_before = parent.created <= root.created;
                if parent.pid == root.pid || !started_before || parent.session != root.session || is_system(parent, context) || steps > 64 {
                    break;
                }
                root   = parent;
                steps += 1;
                // Glup's own helpers (its webview) stop at Glup.
                if root.pid == context.own_pid {
                    break;
                }
            }
            (process.pid, root.pid)
        })
        .collect()
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppGroup {
    // The program of the app (lowercase path, or its name when there is none): how it is found again.
    pub id        : String,
    pub exe       : Option<String>,
    pub name      : String,
    // Share of the whole processor (0 to 100), as the Task Manager.
    pub cpu       : f32,
    pub memory    : u64,
    pub processes : usize,
    pub protected : bool,
    // Its processes and when each one started, to close exactly those.
    #[serde(skip)]
    pub members   : Vec<(u32, u64)>,
}

pub struct GroupParams<'a> {
    pub processes : &'a [ProcessFacts],
    // Processor time of each process at the last reading: pid → (started, time).
    pub previous  : &'a HashMap<u32, (u64, u64)>,
    // Time between the two readings (100 ns) and how many logical processors there are.
    pub elapsed   : u64,
    pub cpus      : u32,
    pub context   : &'a Context<'a>,
}

fn key_of(process: &ProcessFacts) -> String {
    process.exe.as_deref().map(lower).unwrap_or_else(|| process.name.to_lowercase())
}

// Processor share since the last reading; a process new since then counts from its start.
fn cpu_share(process: &ProcessFacts, params: &GroupParams) -> f32 {
    if params.elapsed == 0 || params.cpus == 0 {
        return 0.0;
    }
    let before = match params.previous.get(&process.pid) {
        Some((created, time)) if *created == process.created => *time,
        _                                                    => return 0.0,
    };
    let used = process.cpu_time.saturating_sub(before) as f64;
    (used / (params.elapsed as f64 * f64::from(params.cpus)) * 100.0).clamp(0.0, 100.0) as f32
}

pub fn group(params: &GroupParams) -> Vec<AppGroup> {
    let roots                              = roots(params.processes, params.context);
    let by_pid: HashMap<u32, &ProcessFacts> = params.processes.iter().map(|process| (process.pid, process)).collect();
    let mut groups: HashMap<String, AppGroup> = HashMap::new();

    for process in params.processes.iter().filter(|process| !is_pseudo(process)) {
        let root  = roots.get(&process.pid).and_then(|pid| by_pid.get(pid)).copied().unwrap_or(process);
        let group = groups.entry(key_of(root)).or_insert_with(|| AppGroup {
            id        : key_of(root),
            exe       : root.exe.clone(),
            name      : root.name.clone(),
            cpu       : 0.0,
            memory    : 0,
            processes : 0,
            protected : false,
            members   : Vec::new(),
        });
        group.cpu       += cpu_share(process, params);
        group.memory    += process.memory;
        group.processes += 1;
        group.protected |= is_protected(root, params.context);
        group.members.push((process.pid, process.created));
    }

    groups.into_values().map(|group| AppGroup { cpu: group.cpu.min(100.0), ..group }).collect()
}

// The ones using the most: processor and memory weigh the same (each as a share of the whole PC).
pub fn top(mut groups: Vec<AppGroup>, total_memory: u64, count: usize) -> Vec<AppGroup> {
    let score = |group: &AppGroup| f64::from(group.cpu) + if total_memory == 0 { 0.0 } else { group.memory as f64 / total_memory as f64 * 100.0 };
    groups.retain(|group| group.memory > 0 || group.cpu > 0.0);
    groups.sort_by(|a, b| score(b).total_cmp(&score(a)).then_with(|| a.id.cmp(&b.id)));
    groups.truncate(count);
    groups
}

#[cfg(test)]
mod tests {
    use super::*;

    const CONTEXT: Context = Context { own_pid: 900, own_session: 1, windows_dir: "c:\\windows" };

    fn process(pid: u32, parent: u32, exe: &str) -> ProcessFacts {
        let name = exe.rsplit('\\').next().unwrap_or(exe).to_string();
        ProcessFacts { pid, parent, created: u64::from(pid), cpu_time: 0, memory: 100, exe: Some(exe.to_string()), name, session: 1 }
    }

    fn sample() -> Vec<ProcessFacts> {
        vec![
            ProcessFacts { exe: None, name: "System".to_string(), session: 0, ..process(4, 0, "") },
            process(500, 4, "C:\\Windows\\explorer.exe"),
            process(600, 500, "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"),
            process(601, 600, "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"),
            process(602, 600, "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"),
            // A helper of Chrome with its own program.
            process(603, 600, "C:\\Program Files\\Google\\Chrome\\Application\\128.0\\elevation_service.exe"),
            process(700, 500, "C:\\Windows\\System32\\notepad.exe"),
            process(710, 500, "C:\\Users\\ana\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe"),
            process(711, 710, "C:\\Users\\ana\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe"),
            process(900, 500, "C:\\Program Files\\Glup\\glup.exe"),
            process(901, 900, "C:\\Program Files (x86)\\Microsoft\\EdgeWebView\\Application\\msedgewebview2.exe"),
            // Another app's webview: it stays with that app, not with Glup.
            process(950, 500, "C:\\Program Files\\Teams\\ms-teams.exe"),
            process(951, 950, "C:\\Program Files (x86)\\Microsoft\\EdgeWebView\\Application\\msedgewebview2.exe"),
            ProcessFacts { session: 0, ..process(1000, 4, "C:\\Program Files\\Antivirus\\scanner.exe") },
        ]
    }

    fn grouped() -> HashMap<String, AppGroup> {
        let processes = sample();
        let groups    = group(&GroupParams { processes: &processes, previous: &HashMap::new(), elapsed: 0, cpus: 8, context: &CONTEXT });
        groups.into_iter().map(|group| (group.name.clone(), group)).collect()
    }

    #[test]
    fn processes_are_grouped_by_the_app_that_started_them() {
        let groups = grouped();

        assert_eq!(groups["chrome.exe"].processes, 4);
        assert_eq!(groups["chrome.exe"].memory, 400);
        assert_eq!(groups["Code.exe"].processes, 2);
        assert_eq!(groups["glup.exe"].processes, 2);
        assert_eq!(groups["ms-teams.exe"].processes, 2);
        // Started by Explorer, but each app is its own.
        assert_eq!(groups["notepad.exe"].processes, 1);
        assert!(!groups.contains_key("msedgewebview2.exe"));
        assert!(!groups.contains_key("elevation_service.exe"));
    }

    #[test]
    fn windows_other_sessions_and_glup_are_protected() {
        let groups = grouped();

        for name in ["System", "explorer.exe", "notepad.exe", "glup.exe", "scanner.exe"] {
            assert!(groups[name].protected, "{name}");
        }
        for name in ["chrome.exe", "Code.exe", "ms-teams.exe"] {
            assert!(!groups[name].protected, "{name}");
        }

        let svchost = ProcessFacts { session: 1, ..process(1200, 4, "D:\\Raro\\svchost.exe") };
        assert!(is_protected(&svchost, &CONTEXT));
        let unreadable = ProcessFacts { exe: None, ..process(1300, 500, "") };
        assert!(is_protected(&unreadable, &CONTEXT));
    }

    #[test]
    fn a_reused_number_is_not_a_parent() {
        // 600 died and its number went to a later process: 601 (older) is not its child.
        let mut processes = sample();
        processes[2].created = 10_000;
        let roots = roots(&processes, &CONTEXT);
        assert_eq!(roots[&601], 601);
        assert_eq!(roots[&711], 710);
    }

    #[test]
    fn processor_share_is_of_the_whole_pc_and_counts_only_since_the_last_reading() {
        let mut processes = sample();
        processes[2].cpu_time = 21_000_000;
        processes[3].cpu_time = 10_000_000;
        // 1 s between readings on 8 processors: 4 s of processor time would be 50 %.
        let previous: HashMap<u32, (u64, u64)> = [(600, (600, 1_000_000)), (601, (601, 0)), (602, (1, 0))].into_iter().collect();
        let groups = group(&GroupParams { processes: &processes, previous: &previous, elapsed: 10_000_000, cpus: 8, context: &CONTEXT });
        let chrome = groups.iter().find(|group| group.name == "chrome.exe").unwrap();

        // 2 s (600) + 1 s (601) of 8 s; 602 is another process with that number: it does not count yet.
        assert!((chrome.cpu - 37.5).abs() < 0.01, "{}", chrome.cpu);
    }

    #[test]
    fn idle_never_shows_even_at_99_percent() {
        let mut processes = sample();
        processes.push(ProcessFacts { pid: 0, parent: 0, created: 0, cpu_time: 99_000_000, memory: 0, exe: None, name: "Idle".to_string(), session: 0 });
        processes.push(ProcessFacts { pid: 7, parent: 0, created: 7, cpu_time: 5_000_000, memory: 0, exe: None, name: "System Interrupts".to_string(), session: 0 });
        processes[0].cpu_time  = 1_000_000;
        processes[0].memory    = 50;
        let previous: HashMap<u32, (u64, u64)> = [(0, (0, 0)), (7, (7, 0)), (4, (4, 0))].into_iter().collect();

        // 1 s on 1 processor: Idle used 9,9 s of it (as much as it could), System 0,1 s.
        let groups = group(&GroupParams { processes: &processes, previous: &previous, elapsed: 10_000_000, cpus: 1, context: &CONTEXT });
        assert!(groups.iter().all(|group| group.name != "Idle" && group.name != "System Interrupts"));
        let names: Vec<_> = top(groups, 10_000, 3).into_iter().map(|group| group.name).collect();
        assert!(!names.contains(&"Idle".to_string()), "{names:?}");
        assert_eq!(names[0], "System");
    }

    #[test]
    fn parts_of_windows_get_a_readable_name() {
        assert_eq!(system_title("System"), Some("Windows"));
        assert_eq!(system_title("Memory Compression"), Some("Compresión de memoria de Windows"));
        assert_eq!(system_title("svchost.exe"), Some("Servicios de Windows"));
        assert_eq!(system_title("chrome.exe"), None);
        let compression = ProcessFacts { pid: 2000, parent: 4, exe: None, name: "Memory Compression".to_string(), ..ProcessFacts::default() };
        assert!(!is_pseudo(&compression));
        assert!(is_protected(&compression, &CONTEXT));
    }

    #[test]
    fn the_top_mixes_processor_and_memory() {
        let make = |id: &str, cpu: f32, memory: u64| AppGroup { id: id.to_string(), exe: None, name: id.to_string(), cpu, memory, processes: 1, protected: false, members: Vec::new() };
        let groups = vec![make("idle", 0.0, 0), make("ram", 0.0, 4_000), make("busy", 30.0, 100), make("small", 1.0, 100)];
        let names: Vec<_> = top(groups, 10_000, 2).into_iter().map(|group| group.id).collect();
        // ram: 40 % of the memory; busy: 30 % + 1 %.
        assert_eq!(names, ["ram", "busy"]);
    }
}
