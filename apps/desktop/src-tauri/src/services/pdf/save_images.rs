use std::{
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicU64, Ordering},
        Mutex,
    },
};

use serde::Deserialize;

use crate::services::{destination::Destination, pdf::split::page_stem};

pub const SESSION_ERROR: &str = "Se perdió el trabajo en curso";
pub const PAGE_ERROR: &str    = "No pude guardar la página";

static NEXT_SESSION: AtomicU64 = AtomicU64::new(1);

#[derive(Clone, Copy, Debug, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PageImageFormat {
    Jpg,
    Png,
}

impl PageImageFormat {
    pub fn extension(self) -> &'static str {
        match self {
            Self::Jpg => "jpg",
            Self::Png => "png",
        }
    }

    pub fn label(self) -> &'static str {
        match self {
            Self::Jpg => "JPG",
            Self::Png => "PNG",
        }
    }
}

// Pages rendered by pdf.js arrive one by one and are written into `folder`
// (the final folder, or a scratch one when they end up in a zip).
pub struct PageImageSession {
    pub source: PathBuf,
    pub format: PageImageFormat,
    pub total: u32,
    pub folder: PathBuf,
    pub saved: Vec<PathBuf>,
    pub bundle: bool,
    // Where the zip goes when bundling.
    pub destination: Destination,
}

#[derive(Default)]
pub struct PageImageSessions(Mutex<HashMap<u64, PageImageSession>>);

pub struct SavePageParams<'a> {
    pub sessions: &'a PageImageSessions,
    pub session: u64,
    pub page: u32,
    pub bytes: &'a [u8],
}

pub fn open(sessions: &PageImageSessions, session: PageImageSession) -> u64 {
    let id = NEXT_SESSION.fetch_add(1, Ordering::Relaxed);

    if let Ok(mut map) = sessions.0.lock() {
        map.insert(id, session);
    }

    id
}

fn stem_of(path: &Path) -> String {
    path.file_stem().map(|value| value.to_string_lossy().into_owned()).unwrap_or_default()
}

// "contrato-p03.jpg" inside the session folder.
pub fn save_page(params: SavePageParams) -> Result<(), String> {
    let mut map = params.sessions.0.lock().map_err(|_| SESSION_ERROR.to_string())?;
    let session = map.get_mut(&params.session).ok_or(SESSION_ERROR)?;
    let name    = format!("{}.{}", page_stem(&stem_of(&session.source), params.page, session.total), session.format.extension());
    let path    = session.folder.join(name);

    fs::write(&path, params.bytes).map_err(|_| PAGE_ERROR.to_string())?;
    session.saved.push(path);
    Ok(())
}

pub fn close(sessions: &PageImageSessions, session: u64) -> Option<PageImageSession> {
    sessions.0.lock().ok()?.remove(&session)
}
