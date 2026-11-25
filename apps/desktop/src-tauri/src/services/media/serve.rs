// The file under the trimming screen, to its <video> or <audio>: only the one file that screen opened
// (by a random name, not by its path), in pieces as the player asks for them (Range), so an hour of
// video is never read whole. Served at http://glupmedia.localhost/<token>.
use std::{
    collections::HashMap,
    fs::File,
    io::{Read, Seek, SeekFrom},
    path::{Path, PathBuf},
    sync::Mutex,
};

use tauri::http::{header, Request, Response, StatusCode};

pub const SCHEME: &str = "glupmedia";
// The biggest piece sent at once.
const MAX_CHUNK: u64 = 4 * 1024 * 1024;

// Files the screen may play, by token.
#[derive(Default)]
pub struct MediaFiles(pub Mutex<HashMap<String, PathBuf>>);

pub fn url_for(token: &str) -> String {
    format!("http://{SCHEME}.localhost/{token}")
}

pub fn new_token() -> String {
    let mut bytes = [0u8; 16];
    let _         = getrandom::fill(&mut bytes);
    bytes.iter().map(|byte| format!("{byte:02x}")).collect()
}

// "bytes=100-" or "bytes=100-199" (or none: from the start), cut to the file and to MAX_CHUNK.
pub fn byte_range(header: Option<&str>, length: u64) -> Option<(u64, u64)> {
    if length == 0 {
        return None;
    }
    let (start, end) = match header.and_then(|value| value.trim().strip_prefix("bytes=")) {
        None       => (0, length - 1),
        Some(spec) => {
            let (from, to) = spec.split(',').next()?.split_once('-')?;
            match (from.trim(), to.trim()) {
                ("", last) => {
                    let count = last.parse::<u64>().ok()?.min(length);
                    (length - count, length - 1)
                }
                (first, "")   => (first.parse().ok()?, length - 1),
                (first, last) => (first.parse().ok()?, last.parse::<u64>().ok()?.min(length - 1)),
            }
        }
    };
    (start <= end && start < length).then(|| (start, end.min(start + MAX_CHUNK - 1)))
}

pub fn content_type(path: &Path) -> &'static str {
    match path.extension().map(|extension| extension.to_string_lossy().to_lowercase()).as_deref() {
        Some("mp4" | "m4v") => "video/mp4",
        Some("mov")         => "video/quicktime",
        Some("webm")        => "video/webm",
        Some("mp3")         => "audio/mpeg",
        Some("m4a" | "aac") => "audio/mp4",
        Some("wav")         => "audio/wav",
        Some("ogg")         => "audio/ogg",
        Some("opus")        => "audio/ogg",
        Some("flac")        => "audio/flac",
        Some("gif")         => "image/gif",
        Some("webp")        => "image/webp",
        _                   => "application/octet-stream",
    }
}

fn empty(status: StatusCode) -> Response<Vec<u8>> {
    Response::builder().status(status).body(Vec::new()).unwrap_or_default()
}

// One answer of the player's requests.
pub fn respond(files: &MediaFiles, request: &Request<Vec<u8>>) -> Response<Vec<u8>> {
    let token = request.uri().path().trim_start_matches('/').to_string();
    let Some(path) = files.0.lock().ok().and_then(|files| files.get(&token).cloned()) else { return empty(StatusCode::NOT_FOUND) };
    let Ok(mut file) = File::open(&path) else { return empty(StatusCode::NOT_FOUND) };
    let length = file.metadata().map(|metadata| metadata.len()).unwrap_or(0);

    let asked = request.headers().get(header::RANGE).and_then(|value| value.to_str().ok());
    let Some((start, end)) = byte_range(asked, length) else { return empty(StatusCode::RANGE_NOT_SATISFIABLE) };

    let mut body = vec![0u8; (end - start + 1) as usize];
    if file.seek(SeekFrom::Start(start)).is_err() || file.read_exact(&mut body).is_err() {
        return empty(StatusCode::INTERNAL_SERVER_ERROR);
    }

    Response::builder()
        .status(StatusCode::PARTIAL_CONTENT)
        .header(header::CONTENT_TYPE, content_type(&path))
        .header(header::ACCEPT_RANGES, "bytes")
        .header(header::CONTENT_RANGE, format!("bytes {start}-{end}/{length}"))
        .header(header::CONTENT_LENGTH, body.len().to_string())
        .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
        .body(body)
        .unwrap_or_else(|_| empty(StatusCode::INTERNAL_SERVER_ERROR))
}
