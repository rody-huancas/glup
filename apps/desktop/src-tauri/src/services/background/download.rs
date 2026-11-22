use std::{
    fs::{self, File, OpenOptions},
    io::{self, BufReader, Read, Write},
    path::Path,
    sync::atomic::{AtomicBool, Ordering},
    time::Duration,
};

use sha2::{Digest, Sha256};
use ureq::Agent;

use crate::services::background::model::{model_path, part_path, ModelFile};

pub const NETWORK_ERROR: &str = "Se cortó la descarga. Vuelve a intentarlo y sigo desde donde quedé.";
pub const CORRUPT_ERROR: &str = "La descarga llegó dañada y la borré. Vuelve a intentarlo.";
pub const WRITE_ERROR: &str   = "No pude guardar la descarga";

const CHUNK_SIZE: usize      = 256 * 1024;
// Progress is reported every this many bytes, not on every chunk.
const PROGRESS_STEP: u64     = 1024 * 1024;
const CONNECT_TIMEOUT: u64   = 20;
const RESPONSE_TIMEOUT: u64  = 30;
const PARTIAL_CONTENT: u16   = 206;

// What the server sends: the rest of the file (resumed) or the whole file again.
pub struct Fetched {
    pub reader: Box<dyn Read>,
    pub resumed: bool,
}

#[derive(Debug, PartialEq, Eq)]
pub enum DownloadEnd {
    Installed,
    // Stopped by the person; the part stays to go on later.
    Cancelled,
}

pub struct CopyParams<'a> {
    pub reader: &'a mut dyn Read,
    pub file: &'a mut dyn Write,
    // Bytes already in the file.
    pub start: u64,
    pub cancel: &'a AtomicBool,
    pub on_progress: &'a dyn Fn(u64),
}

#[derive(Debug, PartialEq, Eq)]
pub enum Copied {
    Complete(u64),
    Cancelled(u64),
}

// Copies until the reader ends or the person cancels; returns the bytes in the file.
pub fn copy_chunks(params: CopyParams) -> io::Result<Copied> {
    let mut buffer   = vec![0u8; CHUNK_SIZE];
    let mut written  = params.start;
    let mut reported = written;

    loop {
        if params.cancel.load(Ordering::SeqCst) {
            params.file.flush()?;
            return Ok(Copied::Cancelled(written));
        }

        let read = params.reader.read(&mut buffer)?;
        if read == 0 {
            params.file.flush()?;
            (params.on_progress)(written);
            return Ok(Copied::Complete(written));
        }

        params.file.write_all(&buffer[..read])?;
        written += read as u64;

        if written - reported >= PROGRESS_STEP {
            reported = written;
            (params.on_progress)(written);
        }
    }
}

fn to_hex(bytes: &[u8]) -> String {
    bytes.iter().map(|byte| format!("{byte:02x}")).collect()
}

pub fn sha256_of(path: &Path) -> io::Result<String> {
    let mut reader = BufReader::new(File::open(path)?);
    let mut hasher = Sha256::new();
    let mut buffer = vec![0u8; CHUNK_SIZE];

    loop {
        let read = reader.read(&mut buffer)?;
        if read == 0 {
            break;
        }
        hasher.update(&buffer[..read]);
    }

    Ok(to_hex(&hasher.finalize()))
}

pub fn matches_hash(path: &Path, expected: &str) -> bool {
    sha256_of(path).is_ok_and(|hash| hash.eq_ignore_ascii_case(expected))
}

pub struct DownloadParams<'a> {
    pub folder: &'a Path,
    pub model: &'a ModelFile,
    pub cancel: &'a AtomicBool,
    // Bytes downloaded so far (out of model.size).
    pub on_progress: &'a dyn Fn(u64),
    // The network, injected so the whole flow can be tested without it.
    pub fetch: &'a dyn Fn(u64) -> Result<Fetched, String>,
}

fn size_of(path: &Path) -> u64 {
    fs::metadata(path).map(|data| data.len()).unwrap_or(0)
}

// The hash decides: a good file becomes the model, a bad one is removed.
fn verify_and_install(params: &DownloadParams) -> Result<DownloadEnd, String> {
    let part       = part_path(params.folder, params.model);
    let final_path = model_path(params.folder, params.model);

    if !matches_hash(&part, params.model.sha256) {
        let _ = fs::remove_file(&part);
        return Err(CORRUPT_ERROR.to_string());
    }

    fs::rename(&part, &final_path).map_err(|_| WRITE_ERROR.to_string())?;
    Ok(DownloadEnd::Installed)
}

// Resumes a cut download from where the .part ended (if the server allows it) and checks the hash.
pub fn download(params: DownloadParams) -> Result<DownloadEnd, String> {
    if model_path(params.folder, params.model).exists() {
        return Ok(DownloadEnd::Installed);
    }

    let part      = part_path(params.folder, params.model);
    let mut start = size_of(&part);

    if start > params.model.size {
        let _ = fs::remove_file(&part);
        start = 0;
    }

    if start < params.model.size {
        let mut fetched = (params.fetch)(start)?;
        if !fetched.resumed {
            start = 0;
        }

        let mut file = OpenOptions::new()
            .create(true)
            .write(true)
            .append(start > 0)
            .truncate(start == 0)
            .open(&part)
            .map_err(|_| WRITE_ERROR.to_string())?;

        (params.on_progress)(start);

        let copied = copy_chunks(CopyParams { reader: fetched.reader.as_mut(), file: &mut file, start, cancel: params.cancel, on_progress: params.on_progress });

        match copied {
            Ok(Copied::Cancelled(_)) => return Ok(DownloadEnd::Cancelled),
            Ok(Copied::Complete(_))  => {}
            Err(_)                   => return Err(NETWORK_ERROR.to_string()),
        }

        // A shorter file is a cut download (kept to resume); a longer one cannot be right.
        let size = size_of(&part);
        if size < params.model.size {
            return Err(NETWORK_ERROR.to_string());
        }
    }

    verify_and_install(&params)
}

// The real network: the fixed url, asking for the rest of the file when part of it is already here.
pub fn fetch_http(url: &str, start: u64) -> Result<Fetched, String> {
    let agent: Agent = Agent::config_builder()
        .timeout_connect(Some(Duration::from_secs(CONNECT_TIMEOUT)))
        .timeout_recv_response(Some(Duration::from_secs(RESPONSE_TIMEOUT)))
        .build()
        .into();

    let mut request = agent.get(url);
    if start > 0 {
        request = request.header("Range", format!("bytes={start}-"));
    }

    let response = request.call().map_err(|_| NETWORK_ERROR.to_string())?;
    let resumed  = start > 0 && response.status().as_u16() == PARTIAL_CONTENT;

    Ok(Fetched { reader: Box::new(response.into_body().into_reader()), resumed })
}
