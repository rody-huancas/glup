// Glup from the Explorer: the right click ("Glup" › an option) and "Enviar a › Glup". The files arrive
// as arguments, to this process or (Glup already open) to the first one through the single instance.
// Explorer starts one process per selected file, so what arrives within a short window for the same
// option is gathered into one request: one task for all of them.
pub mod menu;
pub mod send_to;

#[cfg(test)]
mod tests;

use std::{
    path::{Path, PathBuf},
    sync::Mutex,
    thread,
    time::{Duration, Instant},
};

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};

use crate::services::settings::{self, Settings};

pub const REQUEST_EVENT: &str = "explorer-request";
// Asked by the installer: write the entries (with the settings there are) or take them out, and quit.
pub const INSTALL_ARG: &str   = "--install-shell";
pub const UNINSTALL_ARG: &str = "--uninstall-shell";
// Explorer starts the processes of a selection one after the other: those within this time go together.
pub const GATHER_WINDOW: Duration = Duration::from_millis(500);

// Files to work on: with the option chosen in the menu (a tool of tools.json), or none ("Enviar a":
// they load in Inicio to choose).
#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExplorerRequest {
    pub tool  : Option<String>,
    pub paths : Vec<String>,
}

// Reads `--menu <tool> <file>…` or `--send-to <file>…` from a command line (the first item is the
// program). None when it is neither, or brings no file.
pub fn parse_args(args: &[String]) -> Option<ExplorerRequest> {
    let files = |from: usize| -> Vec<String> { args.iter().skip(from).filter(|arg| !arg.is_empty() && !arg.starts_with("--")).cloned().collect() };

    let request = if let Some(at) = args.iter().position(|arg| arg == menu::MENU_ARG) {
        let tool = args.get(at + 1).filter(|tool| !tool.starts_with("--"))?.clone();
        ExplorerRequest { tool: Some(tool), paths: files(at + 2) }
    } else {
        let at = args.iter().position(|arg| arg == send_to::SEND_TO_ARG)?;
        ExplorerRequest { tool: None, paths: files(at + 1) }
    };

    (!request.paths.is_empty()).then_some(request)
}

// What came from the Explorer, gathered: a request keeps growing while files of the same option keep
// arriving; once the window passes with nothing new, it is ready to be taken by the panel.
#[derive(Debug, Default)]
pub struct Inbox {
    gathering : Vec<ExplorerRequest>,
    last      : Option<Instant>,
    ready     : Vec<ExplorerRequest>,
}

impl Inbox {
    pub fn add(&mut self, request: ExplorerRequest, now: Instant) {
        let recent = self.last.is_some_and(|last| now.duration_since(last) < GATHER_WINDOW);
        match self.gathering.last_mut() {
            Some(open) if recent && open.tool == request.tool => {
                for path in request.paths {
                    if !open.paths.contains(&path) {
                        open.paths.push(path);
                    }
                }
            }
            _ => self.gathering.push(request),
        }
        self.last = Some(now);
    }

    // True when what was gathering is ready (the window passed with nothing new).
    pub fn settle(&mut self, now: Instant) -> bool {
        let quiet = self.last.is_none_or(|last| now.duration_since(last) >= GATHER_WINDOW);
        if !quiet || self.gathering.is_empty() {
            return false;
        }
        self.ready.append(&mut self.gathering);
        true
    }

    pub fn take(&mut self) -> Vec<ExplorerRequest> {
        std::mem::take(&mut self.ready)
    }
}

#[derive(Default)]
pub struct ExplorerInbox(pub Mutex<Inbox>);

// Files from the Explorer on this command line: gathered, and the panel told once they settle. False
// when the command line brings none (a normal launch).
pub fn receive(app: &AppHandle, args: &[String]) -> bool {
    let Some(request) = parse_args(args) else { return false };

    if let Ok(mut inbox) = app.state::<ExplorerInbox>().0.lock() {
        inbox.add(request, Instant::now());
    }

    let app = app.clone();
    thread::spawn(move || {
        thread::sleep(GATHER_WINDOW + Duration::from_millis(20));
        let settled = app.state::<ExplorerInbox>().0.lock().map(|mut inbox| inbox.settle(Instant::now())).unwrap_or(false);
        if settled {
            let _ = app.emit(REQUEST_EVENT, ());
        }
    });
    true
}

pub fn take(app: &AppHandle) -> Vec<ExplorerRequest> {
    app.state::<ExplorerInbox>().0.lock().map(|mut inbox| inbox.take()).unwrap_or_default()
}

// The entries as the settings say: written (again, with this Glup's path) or taken out.
pub fn apply(settings: &Settings, exe: &Path) {
    let menu = if settings.explorer_menu_off { menu::unregister(menu::CLASSES) } else { menu::register(menu::CLASSES, exe) };
    let send = if settings.send_to_off { send_to::unregister() } else { send_to::register(exe) };

    #[cfg(debug_assertions)]
    eprintln!("[glup:explorador] clic derecho {} ({menu}), Enviar a {} ({send})", if settings.explorer_menu_off { "quitado" } else { "escrito" }, if settings.send_to_off { "quitado" } else { "escrito" });
    #[cfg(not(debug_assertions))]
    let _ = (menu, send);
}

fn current_exe() -> Option<PathBuf> {
    std::env::current_exe().ok()
}

// At every start: an update may have moved Glup, so the entries point at this one.
pub fn sync(app: &AppHandle) {
    let settings = settings::read(app).settings;
    thread::spawn(move || {
        if let Some(exe) = current_exe() {
            apply(&settings, &exe);
        }
    });
}

// Ajustes › General: "Mostrar Glup en el clic derecho" and "En Enviar a".
pub struct ExplorerChange {
    pub menu    : Option<bool>,
    pub send_to : Option<bool>,
}

pub fn change(app: &AppHandle, change: ExplorerChange) -> Result<(), String> {
    let saved = settings::read(app).settings;
    let next  = Settings {
        explorer_menu_off : change.menu.map_or(saved.explorer_menu_off, |on| !on),
        send_to_off       : change.send_to.map_or(saved.send_to_off, |on| !on),
        ..saved
    };
    settings::update(app, next.clone())?;
    if let Some(exe) = current_exe() {
        apply(&next, &exe);
    }
    Ok(())
}

// The identifier of the app (its data folder in %APPDATA%), from its own configuration.
fn identifier() -> Option<String> {
    let config: serde_json::Value = serde_json::from_str(include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/tauri.conf.json"))).ok()?;
    config.get("identifier")?.as_str().map(str::to_string)
}

fn saved_settings() -> Settings {
    let path = std::env::var_os("APPDATA").zip(identifier()).map(|(data, id)| PathBuf::from(data).join(id).join("settings.json"));
    path.map(|path| settings::read_file(&path)).unwrap_or_default()
}

// The installer runs Glup with --install-shell after installing (the entries, as the settings say: a
// new install has none, so both go in) and with --uninstall-shell before removing it. True when this
// launch was one of those: it does its part and Glup does not start.
pub fn installer_mode(args: &[String]) -> bool {
    if args.iter().any(|arg| arg == UNINSTALL_ARG) {
        menu::unregister(menu::CLASSES);
        send_to::unregister();
        return true;
    }
    if args.iter().any(|arg| arg == INSTALL_ARG) {
        if let Some(exe) = current_exe() {
            apply(&saved_settings(), &exe);
        }
        return true;
    }
    false
}
