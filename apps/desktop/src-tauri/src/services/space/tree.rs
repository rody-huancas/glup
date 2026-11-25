// What was found, as a tree of folders and files with the size each one takes on disk (a folder: all
// of its inside), split by kind. It grows while the analysis goes (one folder at a time, under one lock),
// so the screen shows it as it comes. Nodes are never moved: their number is how the screen points to
// them.
use std::{cmp::Reverse, collections::BinaryHeap};

use serde::{Deserialize, Serialize};

// Fotos, videos, documentos, programas, sistema y apps, otros.
pub const KINDS: usize = 6;
pub const NO_PARENT: u32 = u32::MAX;
pub const TOP_FILES: usize = 20;

// What the analysis saw that keeps something out of the bin: a project (or its dependencies), a
// program (an .exe beside its libraries) and a known file that must stay (known.json).
pub const PROJECT: u8 = 1;
pub const PROGRAM: u8 = 2;
pub const KEEP: u8    = 4;
pub const NOT_KNOWN: u16 = u16::MAX;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Kind {
    Photos,
    Videos,
    Documents,
    Programs,
    // Whatever is inside AppData, ProgramData or Program Files: what Windows and the apps keep.
    System,
    Other,
}

pub const ALL_KINDS: [Kind; KINDS] = [Kind::Photos, Kind::Videos, Kind::Documents, Kind::Programs, Kind::System, Kind::Other];

impl Kind {
    pub fn index(self) -> usize {
        ALL_KINDS.iter().position(|kind| *kind == self).unwrap_or(KINDS - 1)
    }
}

#[derive(Clone, Debug)]
pub struct Node {
    pub name     : Box<str>,
    pub parent   : u32,
    pub dir      : bool,
    // Bytes on disk (a folder: everything inside), and how many of them are of each kind.
    pub size     : u64,
    pub kinds    : [u64; KINDS],
    // Files inside (a file: 1).
    pub files    : u32,
    pub children : Vec<u32>,
    // Sent to the recycle bin from the screen.
    pub removed  : bool,
    // What it is itself (PROJECT, PROGRAM, KEEP), and what is anywhere inside it.
    pub own      : u8,
    pub inside   : u8,
    // Its entry of known.json (NOT_KNOWN: none).
    pub known    : u16,
}

#[derive(Debug, Default)]
pub struct Tree {
    pub nodes : Vec<Node>,
    // The biggest files, smallest on top (so the next big one replaces it).
    top       : BinaryHeap<Reverse<(u64, u32)>>,
}

pub struct FileFound {
    pub name  : String,
    pub size  : u64,
    pub kind  : Kind,
    pub known : Option<usize>,
    pub keep  : bool,
}

pub struct FolderFound {
    pub name  : String,
    pub known : Option<usize>,
    pub keep  : bool,
}

// One folder read: its own marks, its files and its folders.
pub struct Read {
    pub own     : u8,
    pub files   : Vec<FileFound>,
    pub folders : Vec<FolderFound>,
}

fn known_of(found: Option<usize>) -> u16 {
    found.and_then(|index| u16::try_from(index).ok()).unwrap_or(NOT_KNOWN)
}

impl Tree {
    pub fn with_root(name: &str) -> Self {
        let mut tree = Tree::default();
        tree.nodes.push(Node { name: name.into(), parent: NO_PARENT, dir: true, size: 0, kinds: [0; KINDS], files: 0, children: Vec::new(), removed: false, own: 0, inside: 0, known: NOT_KNOWN });
        tree
    }

    fn push(&mut self, node: Node) -> u32 {
        let id = self.nodes.len() as u32;
        if node.parent != NO_PARENT {
            self.nodes[node.parent as usize].children.push(id);
        }
        self.nodes.push(node);
        id
    }

    // Size, kinds and files added to a node and every folder above it.
    fn add_up(&mut self, from: u32, size: u64, kinds: &[u64; KINDS], files: u32) {
        let mut at = from;
        while at != NO_PARENT {
            let node = &mut self.nodes[at as usize];
            node.size  += size;
            node.files += files;
            for (total, more) in node.kinds.iter_mut().zip(kinds) {
                *total += more;
            }
            at = node.parent;
        }
    }

    // A mark on a node: its own, and «inside» of it and of every folder above.
    fn mark(&mut self, id: u32, own: u8) {
        if own == 0 {
            return;
        }
        self.nodes[id as usize].own |= own;
        let mut at = id;
        while at != NO_PARENT {
            let node = &mut self.nodes[at as usize];
            node.inside |= own;
            at = node.parent;
        }
    }

    // One folder read: its marks, its files (counted up to the top) and its folders (returned, to be
    // read next).
    pub fn add_folder(&mut self, parent: u32, read: Read) -> Vec<u32> {
        let (mut size, mut kinds) = (0u64, [0u64; KINDS]);
        let count = read.files.len() as u32;
        self.mark(parent, read.own);
        for file in read.files {
            let mut own = [0u64; KINDS];
            own[file.kind.index()] = file.size;
            let id = self.push(Node { name: file.name.into(), parent, dir: false, size: file.size, kinds: own, files: 1, children: Vec::new(), removed: false, own: 0, inside: 0, known: known_of(file.known) });
            self.mark(id, if file.keep { KEEP } else { 0 });
            self.remember(file.size, id);
            size += file.size;
            kinds[file.kind.index()] += file.size;
        }
        self.add_up(parent, size, &kinds, count);
        read.folders
            .into_iter()
            .map(|folder| {
                let id = self.push(Node { name: folder.name.into(), parent, dir: true, size: 0, kinds: [0; KINDS], files: 0, children: Vec::new(), removed: false, own: 0, inside: 0, known: known_of(folder.known) });
                self.mark(id, if folder.keep { KEEP } else { 0 });
                id
            })
            .collect()
    }

    // How much of it is its main kind (0 to 1): the strength of its colour on the map.
    pub fn share(&self, id: u32) -> f64 {
        let node = &self.nodes[id as usize];
        let main = self.main_kind(id);
        if node.size == 0 { 0.0 } else { node.kinds[main.index()] as f64 / node.size as f64 }
    }

    // Why it cannot go to the bin (by what the analysis saw), or None.
    pub fn trash_block(&self, id: u32) -> Option<&'static str> {
        let node = &self.nodes[id as usize];
        if id == 0 {
            return Some("Es la carpeta que revisé");
        }
        let above = self.trail(id).iter().rev().skip(1).fold(0u8, |marks, step| marks | self.nodes[*step as usize].own);
        if node.own & KEEP != 0 {
            return Some("No se debe borrar desde aquí");
        }
        if node.own & PROJECT != 0 || above & PROJECT != 0 {
            return Some("Es parte de un proyecto: bórralo desde el proyecto");
        }
        if node.own & PROGRAM != 0 || above & PROGRAM != 0 {
            return Some("Es de un programa: desinstálalo desde Configuración");
        }
        if above & KEEP != 0 {
            return Some("Está dentro de algo que no se debe borrar desde aquí");
        }
        if node.inside & PROJECT != 0 {
            return Some("Tiene proyectos adentro");
        }
        if node.inside & PROGRAM != 0 {
            return Some("Tiene programas adentro");
        }
        if node.inside & KEEP != 0 {
            return Some("Tiene adentro archivos que no se deben borrar desde aquí");
        }
        None
    }

    fn remember(&mut self, size: u64, id: u32) {
        self.top.push(Reverse((size, id)));
        if self.top.len() > TOP_FILES {
            self.top.pop();
        }
    }

    // The biggest files, biggest first (the ones sent to the bin left out).
    pub fn top_files(&self) -> Vec<u32> {
        let mut found: Vec<(u64, u32)> = self.top.iter().map(|Reverse(pair)| *pair).filter(|(_, id)| !self.nodes[*id as usize].removed).collect();
        found.sort_by(|a, b| b.0.cmp(&a.0).then(a.1.cmp(&b.1)));
        found.into_iter().map(|(_, id)| id).collect()
    }

    // The node and the folders above it, from the top.
    pub fn trail(&self, id: u32) -> Vec<u32> {
        let mut trail = Vec::new();
        let mut at    = id;
        while at != NO_PARENT {
            trail.push(at);
            at = self.nodes[at as usize].parent;
        }
        trail.reverse();
        trail
    }

    // What is inside, biggest first.
    pub fn children(&self, id: u32) -> Vec<u32> {
        let mut children: Vec<u32> = self.nodes[id as usize].children.iter().copied().filter(|child| !self.nodes[*child as usize].removed).collect();
        children.sort_by(|a, b| self.nodes[*b as usize].size.cmp(&self.nodes[*a as usize].size).then(self.nodes[*a as usize].name.cmp(&self.nodes[*b as usize].name)));
        children
    }

    // What most of it is (a file: its own kind).
    pub fn main_kind(&self, id: u32) -> Kind {
        let kinds = &self.nodes[id as usize].kinds;
        ALL_KINDS.into_iter().max_by_key(|kind| kinds[kind.index()]).filter(|kind| kinds[kind.index()] > 0).unwrap_or(Kind::Other)
    }

    // Sent to the bin: it leaves the totals of every folder above it.
    pub fn remove(&mut self, id: u32) {
        let node = self.nodes[id as usize].clone();
        if node.removed {
            return;
        }
        let negative: [u64; KINDS] = node.kinds;
        let mut at = node.parent;
        while at != NO_PARENT {
            let above = &mut self.nodes[at as usize];
            above.size  = above.size.saturating_sub(node.size);
            above.files = above.files.saturating_sub(node.files);
            for (total, less) in above.kinds.iter_mut().zip(negative) {
                *total = total.saturating_sub(less);
            }
            at = above.parent;
        }
        let mut stack = vec![id];
        while let Some(current) = stack.pop() {
            self.nodes[current as usize].removed = true;
            stack.extend(self.nodes[current as usize].children.iter().copied());
        }
    }
}
