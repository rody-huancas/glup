use std::{
    fs::{self, File, OpenOptions},
    io::{self, BufReader, Read, Write},
    path::Path,
    sync::atomic::{AtomicBool, Ordering},
    time::Duration,
};

use sha2::{Digest, Sha256};
use ureq::{config::IpFamily, Agent, ResponseExt};

use crate::services::background::model::{model_path, part_path, ModelFile};

pub const NETWORK_ERROR: &str = "Se cortó la descarga. Vuelve a intentarlo y sigo desde donde quedé.";
pub const CORRUPT_ERROR: &str = "La descarga llegó dañada y la borré. Vuelve a intentarlo.";
pub const WRITE_ERROR: &str   = "No pude guardar la descarga";

const CHUNK_SIZE: usize      = 256 * 1024;
// Progress is reported every this many bytes, not on every chunk.
const PROGRESS_STEP: u64     = 1024 * 1024;
const CONNECT_TIMEOUT: u64   = 20;
// Two hops (huggingface.co, then its CDN), each with its name to look up: room for a slow DNS.
const RESPONSE_TIMEOUT: u64  = 60;
const PARTIAL_CONTENT: u16   = 206;
// A cut download goes on by itself from where it stopped, this many times, before asking.
pub const ATTEMPTS: usize    = 3;

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
    // Fed with every byte written, so the hash is ready when the last chunk lands.
    pub hasher: &'a mut Sha256,
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
        params.hasher.update(&buffer[..read]);
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

// Feeds the hasher with the first `limit` bytes of a file (all of it with u64::MAX).
fn hash_from_disk(path: &Path, limit: u64, hasher: &mut Sha256) -> io::Result<u64> {
    let mut reader = BufReader::new(File::open(path)?).take(limit);
    let mut buffer = vec![0u8; CHUNK_SIZE];
    let mut read   = 0;

    loop {
        let count = reader.read(&mut buffer)?;
        if count == 0 {
            return Ok(read);
        }
        hasher.update(&buffer[..count]);
        read += count as u64;
    }
}

// Downloads hash while they arrive; reading a whole file again is left for the tests.
#[cfg(test)]
pub fn sha256_of(path: &Path) -> io::Result<String> {
    let mut hasher = Sha256::new();
    hash_from_disk(path, u64::MAX, &mut hasher)?;
    Ok(to_hex(&hasher.finalize()))
}

// Hashes what goes through it (an unpacked file), so it needs no second read to be checked.
pub struct HashWriter<W: Write> {
    pub inner  : W,
    pub hasher : Sha256,
}

impl<W: Write> HashWriter<W> {
    pub fn new(inner: W) -> Self {
        Self { inner, hasher: Sha256::new() }
    }

    pub fn matches(self, expected: &str) -> bool {
        to_hex(&self.hasher.finalize()).eq_ignore_ascii_case(expected)
    }
}

impl<W: Write> Write for HashWriter<W> {
    fn write(&mut self, bytes: &[u8]) -> io::Result<usize> {
        let written = self.inner.write(bytes)?;
        self.hasher.update(&bytes[..written]);
        Ok(written)
    }

    fn flush(&mut self) -> io::Result<()> {
        self.inner.flush()
    }
}

#[cfg(test)]
pub fn matches_hash(path: &Path, expected: &str) -> bool {
    sha256_of(path).is_ok_and(|hash| hash.eq_ignore_ascii_case(expected))
}

pub struct DownloadParams<'a> {
    pub folder: &'a Path,
    pub model: &'a ModelFile,
    pub cancel: &'a AtomicBool,
    // Bytes downloaded so far (out of model.size).
    pub on_progress: &'a dyn Fn(u64),
    // The bytes are all here; checking and installing comes next.
    pub on_verifying: &'a dyn Fn(),
    // The network, injected so the whole flow can be tested without it.
    pub fetch: &'a dyn Fn(u64) -> Result<Fetched, String>,
}

fn size_of(path: &Path) -> u64 {
    fs::metadata(path).map(|data| data.len()).unwrap_or(0)
}

// The hash decides: a good file becomes the model, a bad one is removed.
fn install(params: &DownloadParams, hash: &str) -> Result<DownloadEnd, String> {
    let part       = part_path(params.folder, params.model);
    let final_path = model_path(params.folder, params.model);

    if !hash.eq_ignore_ascii_case(params.model.sha256) {
        let _ = fs::remove_file(&part);
        return Err(CORRUPT_ERROR.to_string());
    }

    fs::rename(&part, &final_path).map_err(|_| WRITE_ERROR.to_string())?;
    Ok(DownloadEnd::Installed)
}

// The download, going on by itself from where it stopped when the network cuts it (a few times).
pub fn download(params: DownloadParams) -> Result<DownloadEnd, String> {
    let mut attempt = 1;
    loop {
        match download_once(&params) {
            Err(error) if error == NETWORK_ERROR && attempt < ATTEMPTS && !params.cancel.load(Ordering::SeqCst) => {
                log(&format!("intento {attempt} de {ATTEMPTS} cortado; sigo desde el byte {}", size_of(&part_path(params.folder, params.model))));
                attempt += 1;
            }
            result => return result,
        }
    }
}

// Resumes a cut download from where the .part ended (if the server allows it; a server that sends the
// whole file again, 200 instead of 206, starts it over). The hash is computed while the bytes arrive;
// on a resume, the part already on disk is read once first, so the hash still covers exactly the file.
fn download_once(params: &DownloadParams) -> Result<DownloadEnd, String> {
    if model_path(params.folder, params.model).exists() {
        return Ok(DownloadEnd::Installed);
    }

    let part       = part_path(params.folder, params.model);
    let mut start  = size_of(&part);
    let mut hasher = Sha256::new();

    if start > params.model.size {
        let _ = fs::remove_file(&part);
        start = 0;
    }

    // A whole part left by an earlier run that stopped before installing: only the check is missing.
    if start == params.model.size {
        (params.on_verifying)();
        hash_from_disk(&part, u64::MAX, &mut hasher).map_err(|_| WRITE_ERROR.to_string())?;
        return install(params, &to_hex(&hasher.finalize()));
    }

    let mut fetched = (params.fetch)(start)?;
    if !fetched.resumed {
        start = 0;
    }

    if start > 0 && hash_from_disk(&part, start, &mut hasher).map_err(|_| WRITE_ERROR.to_string())? != start {
        return Err(WRITE_ERROR.to_string());
    }

    let mut file = OpenOptions::new()
        .create(true)
        .write(true)
        .append(start > 0)
        .truncate(start == 0)
        .open(&part)
        .map_err(|_| WRITE_ERROR.to_string())?;

    (params.on_progress)(start);

    let copied = copy_chunks(CopyParams { reader: fetched.reader.as_mut(), file: &mut file, start, cancel: params.cancel, on_progress: params.on_progress, hasher: &mut hasher });
    drop(file);

    match copied {
        Ok(Copied::Cancelled(_)) => return Ok(DownloadEnd::Cancelled),
        Ok(Copied::Complete(_))  => {}
        Err(error)               => {
            log(&format!("se cortó con {} de {} bytes: {error}", size_of(&part), params.model.size));
            return Err(NETWORK_ERROR.to_string());
        }
    }

    // A shorter file is a cut download (kept to resume); a longer one fails the hash.
    if size_of(&part) < params.model.size {
        return Err(NETWORK_ERROR.to_string());
    }

    (params.on_verifying)();
    install(params, &to_hex(&hasher.finalize()))
}

fn log(line: &str) {
    #[cfg(debug_assertions)]
    eprintln!("[glup:descarga] {line}");
    #[cfg(not(debug_assertions))]
    let _ = line;
}

// Only the host of a url (the rest is signed and long).
fn host_of(url: &str) -> &str {
    url.split("//").nth(1).and_then(|rest| rest.split('/').next()).unwrap_or(url)
}

// The order of the addresses tried: IPv4 first. Where IPv6 is set up but does not go out (common at
// home), each IPv6 address of huggingface.co waits until it times out, and the connection gives up
// before reaching IPv4; only when IPv4 fails is everything tried (IPv6-only networks).
pub const FAMILIES: [IpFamily; 2] = [IpFamily::Ipv4Only, IpFamily::Any];

// The agent of every download of Glup.
pub fn agent(family: IpFamily) -> Agent {
    Agent::config_builder()
        .ip_family(family)
        .timeout_connect(Some(Duration::from_secs(CONNECT_TIMEOUT)))
        .timeout_recv_response(Some(Duration::from_secs(RESPONSE_TIMEOUT)))
        .save_redirect_history(true)
        .build()
        .into()
}

// Where a model is asked for, in order: Glup's own copy, then where it came from.
pub fn sources(model: &ModelFile) -> Vec<&'static str> {
    std::iter::once(model.url).chain(model.fallback).collect()
}

// The first source that answers; a copy not published yet (404) or out of reach gives way to the next.
// Each try of a cut download asks again from the first, for the same bytes (the hash checks them all).
pub fn fetch_first(sources: &[&str], fetch: impl Fn(&str) -> Result<Fetched, String>) -> Result<Fetched, String> {
    let mut last = NETWORK_ERROR.to_string();
    for url in sources {
        match fetch(url) {
            Ok(fetched) => return Ok(fetched),
            Err(error)  => {
                log(&format!("{} no respondió; pruebo la siguiente", host_of(url)));
                last = error;
            }
        }
    }
    Err(last)
}

// A model from its sources, asking for the rest of the file when part of it is already here.
pub fn fetch_model(model: &ModelFile, start: u64) -> Result<Fetched, String> {
    fetch_first(&sources(model), |url| fetch_http(url, start))
}

// The real network: one url, asking for the rest of the file when part of it is already here.
pub fn fetch_http(url: &str, start: u64) -> Result<Fetched, String> {
    let asked    = std::time::Instant::now();
    let response = FAMILIES
        .iter()
        .find_map(|family| {
            let mut request = agent(*family).get(url);
            if start > 0 {
                request = request.header("Range", format!("bytes={start}-"));
            }
            request
                .call()
                .inspect_err(|error| log(&format!("{} ({family:?}) desde el byte {start}: falló a los {} ms: {error}", host_of(url), asked.elapsed().as_millis())))
                .ok()
        })
        .ok_or_else(|| NETWORK_ERROR.to_string())?;
    let resumed  = start > 0 && response.status().as_u16() == PARTIAL_CONTENT;
    let header   = |name: &str| response.headers().get(name).and_then(|value| value.to_str().ok()).unwrap_or("-").to_string();
    let hops     = response.get_redirect_history().map(|history| history.iter().map(|uri| uri.host().unwrap_or("?").to_string()).collect::<Vec<_>>().join(" → ")).unwrap_or_default();
    log(&format!(
        "desde el byte {start}: {} en {} ms ({hops}), largo {}, rango {}",
        response.status().as_u16(),
        asked.elapsed().as_millis(),
        header("content-length"),
        header("content-range"),
    ));

    Ok(Fetched { reader: Box::new(response.into_body().into_reader()), resumed })
}
