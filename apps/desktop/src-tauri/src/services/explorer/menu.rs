// The "Glup" entry of the Explorer's right click, per user (HKEY_CURRENT_USER\Software\Classes, no
// administrator): one cascading menu per kind of file Glup takes, with the tools of tools.json that
// have a "menu" label for that kind. Each option runs `glup.exe --menu <tool> "<file>"`; Explorer starts
// one process per selected file and Glup gathers them into one task (see the inbox).
use std::path::Path;

use serde::Deserialize;

use crate::services::{
    file_info::{AUDIO_EXTENSIONS, IMAGE_EXTENSIONS, IPHONE_EXTENSIONS, PDF_EXTENSIONS, VIDEO_EXTENSIONS},
    registry::{self, Root},
};

// The same catalog the panel shows; the options of the menu are its tools with a "menu" label.
const CATALOG: &str = include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/../src/modules/tools/constants/tools.json"));

pub const CLASSES: &str    = r"Software\Classes";
pub const MENU_ARG: &str   = "--menu";
const MENU_NAME: &str      = "Glup";
// Explorer shows a verb for a selection of more than 15 files only with this model.
const MULTI_SELECT: &str   = "Player";

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CatalogTool {
    id         : String,
    kind       : String,
    file_type  : Option<String>,
    menu       : Option<String>,
    // The kinds of file of its option, when not only its file type (Recortar: audio and video).
    menu_types : Option<Vec<String>>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct MenuTool {
    pub id         : String,
    pub label      : String,
    pub file_types : Vec<String>,
}

// The tools that go in the right click, in the catalog's order.
pub fn menu_tools(catalog: &str) -> Vec<MenuTool> {
    let tools: Vec<CatalogTool> = serde_json::from_str(catalog).unwrap_or_default();
    tools
        .into_iter()
        .filter(|tool| tool.kind == "action")
        .filter_map(|tool| {
            let file_types = tool.menu_types.or_else(|| tool.file_type.map(|file_type| vec![file_type]))?;
            Some(MenuTool { label: tool.menu?, file_types, id: tool.id })
        })
        .collect()
}

pub fn catalog_tools() -> Vec<MenuTool> {
    menu_tools(CATALOG)
}

// The extensions a tool's file type takes ("image" also takes the photos of iPhone).
pub fn extensions_of(file_type: &str) -> &'static [&'static str] {
    match file_type {
        "pdf"    => &PDF_EXTENSIONS,
        "image"  => &IMAGE_EXTENSIONS,
        "iphone" => &IPHONE_EXTENSIONS,
        "video"  => &VIDEO_EXTENSIONS,
        "audio"  => &AUDIO_EXTENSIONS,
        _        => &[],
    }
}

// Every extension Glup takes: where an old entry could be.
pub fn all_extensions() -> Vec<&'static str> {
    let mut all: Vec<&str> = [&PDF_EXTENSIONS[..], &IMAGE_EXTENSIONS, &VIDEO_EXTENSIONS, &AUDIO_EXTENSIONS].concat();
    all.sort_unstable();
    all.dedup();
    all
}

// HKCU\Software\Classes\SystemFileAssociations\.pdf\shell\Glup
pub fn menu_root(base: &str, extension: &str) -> String {
    format!(r"{base}\SystemFileAssociations\.{extension}\shell\{MENU_NAME}")
}

// One key with its text values ("" is the default value).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RegKey {
    pub path   : String,
    pub values : Vec<(String, String)>,
}

pub struct MenuKeysParams<'a> {
    pub base  : &'a str,
    pub exe   : &'a Path,
    pub tools : &'a [MenuTool],
}

fn value(name: &str, text: impl Into<String>) -> (String, String) {
    (name.to_string(), text.into())
}

// The keys of the whole menu: for each extension, "Glup" (icon, cascade) and one numbered option per tool
// (the number keeps the catalog's order on screen).
pub fn menu_keys(params: MenuKeysParams) -> Vec<RegKey> {
    let exe  = params.exe.to_string_lossy();
    let mut keys = Vec::new();

    for extension in all_extensions() {
        let tools: Vec<&MenuTool> = params.tools.iter().filter(|tool| tool.file_types.iter().any(|file_type| extensions_of(file_type).contains(&extension))).collect();
        if tools.is_empty() {
            continue;
        }

        let root = menu_root(params.base, extension);
        keys.push(RegKey {
            path   : root.clone(),
            values : vec![value("MUIVerb", MENU_NAME), value("Icon", format!("\"{exe}\",0")), value("SubCommands", ""), value("MultiSelectModel", MULTI_SELECT)],
        });

        for (index, tool) in tools.iter().enumerate() {
            let option = format!(r"{root}\shell\{:02}-{}", index + 1, tool.id);
            keys.push(RegKey { path: option.clone(), values: vec![value("MUIVerb", tool.label.as_str()), value("MultiSelectModel", MULTI_SELECT)] });
            keys.push(RegKey { path: format!(r"{option}\command"), values: vec![value("", format!("\"{exe}\" {MENU_ARG} {} \"%1\"", tool.id))] });
        }
    }
    keys
}

// Whatever was there goes first (an option taken out of tools.json, an old path of Glup).
pub fn register(base: &str, exe: &Path) -> bool {
    unregister(base);
    let tools = catalog_tools();
    menu_keys(MenuKeysParams { base, exe, tools: &tools })
        .iter()
        .all(|key| key.values.iter().all(|(name, text)| registry::set_text(Root::User, &key.path, name, text)))
}

pub fn unregister(base: &str) -> bool {
    all_extensions().iter().all(|extension| registry::delete_tree(Root::User, &menu_root(base, extension)))
}
