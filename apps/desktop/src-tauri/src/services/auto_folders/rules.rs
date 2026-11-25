// A rule of «Carpetas automáticas»: «Cuando llegue [tipo] a [carpeta], [acción] y [el original]». What it
// takes, what it can do and how its summary reads. Pure.
use std::{collections::HashMap, path::Path, sync::OnceLock};

use serde::{Deserialize, Serialize};

use crate::services::{destination::Destination, space::thousands};

const BYTES_IN_MB: f64 = 1024.0 * 1024.0;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum FileGroup {
    Photos,
    Iphone,
    Pdf,
    Videos,
    Audios,
    Any,
    // The extensions written by hand.
    Custom,
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Original {
    // «Dejarlo».
    #[default]
    Keep,
    // «Moverlo a la papelera después de hacerlo bien» (never deleted for good).
    Trash,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Filter {
    pub group      : FileGroup,
    // Only with Custom: "psd", "dwg"… (without the dot).
    #[serde(default)]
    pub extensions : Vec<String>,
    // «más grandes que X MB».
    #[serde(default)]
    pub min_mb     : Option<f64>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuleAction {
    // The tool of tools.json (with "auto": true).
    pub tool    : String,
    // The same options the action takes from its step (format, level, quality…).
    #[serde(default)]
    pub options : serde_json::Value,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Rule {
    pub id          : String,
    pub name        : String,
    pub folder      : String,
    pub filter      : Filter,
    pub action      : RuleAction,
    #[serde(default)]
    pub original    : Original,
    #[serde(default)]
    pub destination : Destination,
    pub enabled     : bool,
    #[serde(default)]
    pub processed   : u64,
    #[serde(default)]
    pub last_run    : Option<i64>,
    // Everything that arrived before this moment (ms) was already looked at: what arrives later with Glup
    // closed is caught up at start-up.
    #[serde(default)]
    pub seen_until  : i64,
    // What it needs to download first (a learnable of the panel: "video", "background"…): paused until then.
    #[serde(default)]
    pub needs       : Option<String>,
    // The files that arrived while it waited for that download.
    #[serde(default)]
    pub held        : Vec<String>,
}

// What can be done with no screen to review it, and on which files.
pub struct AutoTool {
    pub id       : &'static str,
    // Its action in services/actions.rs (None: done here, as sorting or listening).
    pub action   : Option<&'static str>,
    pub accepts  : &'static [FileGroup],
    // «Pasé 1 foto de iPhone a JPG» / «Pasé {n} fotos de iPhone a JPG».
    pub one      : &'static str,
    pub many     : &'static str,
}

pub const SORT_TOOL: &str       = "folder-sort";
pub const TRANSCRIBE_TOOL: &str = "transcribe";

pub const AUTO_TOOLS: [AutoTool; 8] = [
    AutoTool { id: SORT_TOOL,           action: None,                      accepts: &[FileGroup::Any],                     one: "Ordené 1 archivo",              many: "Ordené {n} archivos" },
    AutoTool { id: "iphone-to-jpg",     action: Some("to-jpg"),            accepts: &[FileGroup::Iphone],                  one: "Pasé 1 foto de iPhone a JPG",   many: "Pasé {n} fotos de iPhone a JPG" },
    AutoTool { id: "convert-image",     action: Some("convert"),           accepts: &[FileGroup::Photos],                  one: "Convertí 1 imagen",             many: "Convertí {n} imágenes" },
    AutoTool { id: "compress-image",    action: Some("compress"),          accepts: &[FileGroup::Photos],                  one: "Reduje el peso de 1 imagen",    many: "Reduje el peso de {n} imágenes" },
    AutoTool { id: "compress-pdf",      action: Some("compress"),          accepts: &[FileGroup::Pdf],                     one: "Reduje el peso de 1 PDF",       many: "Reduje el peso de {n} PDFs" },
    AutoTool { id: "compress-video",    action: Some("compress"),          accepts: &[FileGroup::Videos],                  one: "Reduje el peso de 1 video",     many: "Reduje el peso de {n} videos" },
    AutoTool { id: TRANSCRIBE_TOOL,     action: None,                      accepts: &[FileGroup::Audios, FileGroup::Videos], one: "Pasé 1 audio a texto",        many: "Pasé {n} audios a texto" },
    AutoTool { id: "remove-background", action: Some("remove-background"), accepts: &[FileGroup::Photos],                  one: "Quité el fondo de 1 imagen",    many: "Quité el fondo de {n} imágenes" },
];

pub fn tool(id: &str) -> Option<&'static AutoTool> {
    AUTO_TOOLS.iter().find(|tool| tool.id == id)
}

fn groups() -> &'static HashMap<FileGroup, Vec<String>> {
    static GROUPS: OnceLock<HashMap<FileGroup, Vec<String>>> = OnceLock::new();
    GROUPS.get_or_init(|| serde_json::from_str(include_str!("groups.json")).unwrap_or_default())
}

pub fn extension_of(name: &str) -> String {
    Path::new(name).extension().map(|extension| extension.to_string_lossy().to_lowercase()).unwrap_or_default()
}

fn normalized(extension: &str) -> String {
    extension.trim().trim_start_matches('.').to_lowercase()
}

pub fn in_group(group: FileGroup, name: &str) -> bool {
    match group {
        FileGroup::Any | FileGroup::Custom => true,
        _                                  => groups().get(&group).is_some_and(|extensions| extensions.contains(&extension_of(name))),
    }
}

// The rule takes this file: its type (or one of the extensions written) and, if asked, its size.
pub fn takes(filter: &Filter, name: &str, size: u64) -> bool {
    let kind = match filter.group {
        FileGroup::Custom => filter.extensions.iter().any(|extension| normalized(extension) == extension_of(name)),
        group             => in_group(group, name),
    };
    let big = filter.min_mb.is_none_or(|limit| size as f64 >= limit * BYTES_IN_MB);
    kind && big
}

// The tool can work on this file (a rule for «cualquiera» with «Pasar a JPG» only takes the HEIC ones).
pub fn tool_takes(tool: &AutoTool, name: &str) -> bool {
    tool.accepts.iter().any(|group| in_group(*group, name))
}

// «Pasé 12 fotos de iPhone a JPG en Descargas · 1 no se pudo».
pub fn summary_line(tool: &AutoTool, done: usize, failed: usize, folder: &str) -> String {
    let did = if done == 1 { tool.one.to_string() } else { tool.many.replace("{n}", &thousands(done as u64)) };
    let mut line = if done > 0 { format!("{did} en {folder}") } else { String::new() };
    if failed > 0 {
        let fail = if failed == 1 { "1 no se pudo".to_string() } else { format!("{} no se pudieron", thousands(failed as u64)) };
        line = if line.is_empty() { format!("En {folder}, {fail}") } else { format!("{line} · {fail}") };
    }
    line
}
