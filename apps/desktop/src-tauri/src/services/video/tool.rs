// FFmpeg, the program that does the video work. It is never part of Glup: it is downloaded once,
// with permission, and run as its own process. LGPL build (no GPL or nonfree parts), pinned below.
use std::{
    fs::{self, File},
    io::{self, BufReader, BufWriter, Write},
    path::{Path, PathBuf},
    time::Duration,
};

use flate2::bufread::DeflateDecoder;
use tauri::{AppHandle, Manager};
use ureq::Agent;

use crate::services::background::{
    download::{HashWriter, Fetched, NETWORK_ERROR, WRITE_ERROR},
    model::{ModelFile, ModelStatus},
};

pub const TOOLS_FOLDER: &str = "tools";
pub const FFMPEG_NAME: &str  = "ffmpeg.exe";

// FFmpeg n9.0.2, BtbN/FFmpeg-Builds "win64-lgpl-9.0" from the autobuild of 2026-10-31 (month-end builds
// stay published for about two years). The zip has ffmpeg, ffprobe and ffplay (169 MB); only the
// compressed bytes of bin/ffmpeg.exe are asked for, with an HTTP Range: 55 MB instead of 169.
// To move it to a copy in the repo's Releases, change the url, the range and the hashes together.
pub const FFMPEG_ZIP_URL: &str = "https://github.com/FFmpeg-Builds/FFmpeg-Builds/releases/download/autobuild-2026-10-31-12-59/ffmpeg-n9.0.2-39-g7adfbe40dc-win64-lgpl-9.0.zip";
// Where the deflated bin/ffmpeg.exe starts inside that zip (after its local header) and how long it is.
pub const FFMPEG_DATA_START: u64 = 111_661_878;
pub const FFMPEG_DATA_SIZE: u64  = 54_814_869;
// SHA-256 of those compressed bytes, and of ffmpeg.exe once unpacked (132 MB).
pub const FFMPEG_DATA_SHA256: &str = "ad2cd0c9e3ffc2b82ec9a502800b5e6fbef09a3cc165c09968730f87ba20a3e7";
pub const FFMPEG_EXE_SHA256: &str  = "d03c858a130cae1382902925d9f46eb15d7de42e025d34cc29b7ddca6cfb4c62";

// The compressed part is downloaded (and resumed) like the background model, under this name.
pub const FFMPEG_DOWNLOAD: ModelFile = ModelFile {
    name   : "ffmpeg.exe.deflate",
    url    : FFMPEG_ZIP_URL,
    sha256 : FFMPEG_DATA_SHA256,
    size   : FFMPEG_DATA_SIZE,
};

pub const FOLDER_ERROR: &str  = "No pude preparar la carpeta de lo que aprendo";
pub const DELETE_ERROR: &str  = "No pude borrarlo";
pub const UNPACK_ERROR: &str  = "La descarga llegó dañada y la borré. Vuelve a intentarlo.";
pub const MISSING_ERROR: &str = "Primero tengo que aprender a trabajar con videos";
// The N editions of Windows come without Media Foundation, which makes the H.264 video.
pub const MEDIA_ERROR: &str   = "Tu Windows no trae lo necesario para videos. Instala el «Paquete de características multimedia» desde Configuración › Aplicaciones › Características opcionales.";

const CONNECT_TIMEOUT: u64  = 20;
const RESPONSE_TIMEOUT: u64 = 30;
const PARTIAL_CONTENT: u16  = 206;
// The Media Foundation libraries FFmpeg loads for h264_mf and aac_mf.
const MEDIA_LIBRARIES: [&str; 2] = ["mfplat.dll", "mf.dll"];

pub fn tools_folder(app: &AppHandle) -> Result<PathBuf, String> {
    let folder = app.path().app_data_dir().map_err(|_| FOLDER_ERROR.to_string())?.join(TOOLS_FOLDER);
    fs::create_dir_all(&folder).map_err(|_| FOLDER_ERROR.to_string())?;
    Ok(folder)
}

pub fn ffmpeg_in(folder: &Path) -> PathBuf {
    folder.join(FFMPEG_NAME)
}

fn download_path(folder: &Path) -> PathBuf {
    folder.join(FFMPEG_DOWNLOAD.name)
}

fn part_path(folder: &Path) -> PathBuf {
    crate::services::background::model::part_path(folder, &FFMPEG_DOWNLOAD)
}

fn size_of(path: &Path) -> Option<u64> {
    fs::metadata(path).ok().map(|data| data.len())
}

// Installed: ffmpeg.exe is there (its size, for Ajustes). Otherwise what the download weighs and how
// much of it is already here.
pub fn status_in(folder: &Path) -> ModelStatus {
    match size_of(&ffmpeg_in(folder)) {
        Some(size) => ModelStatus { installed: true, size, partial: 0 },
        None       => ModelStatus { installed: false, size: FFMPEG_DATA_SIZE, partial: size_of(&part_path(folder)).unwrap_or(0) },
    }
}

pub fn status(app: &AppHandle) -> Result<ModelStatus, String> {
    Ok(status_in(&tools_folder(app)?))
}

// The installed ffmpeg.exe, if any.
pub fn ffmpeg_path(app: &AppHandle) -> Option<PathBuf> {
    let path = ffmpeg_in(&tools_folder(app).ok()?);
    path.is_file().then_some(path)
}

// The range of the zip that holds ffmpeg.exe, from where the part already downloaded ends.
pub fn range_header(start: u64) -> String {
    format!("bytes={}-{}", FFMPEG_DATA_START + start, FFMPEG_DATA_START + FFMPEG_DATA_SIZE - 1)
}

// Always a Range request: a server that answers with the whole zip (200) is not sending ffmpeg.exe.
pub fn fetch_range(start: u64) -> Result<Fetched, String> {
    let agent: Agent = Agent::config_builder()
        .timeout_connect(Some(Duration::from_secs(CONNECT_TIMEOUT)))
        .timeout_recv_response(Some(Duration::from_secs(RESPONSE_TIMEOUT)))
        .build()
        .into();

    let response = agent.get(FFMPEG_ZIP_URL).header("Range", range_header(start)).call().map_err(|_| NETWORK_ERROR.to_string())?;
    if response.status().as_u16() != PARTIAL_CONTENT {
        return Err(NETWORK_ERROR.to_string());
    }

    Ok(Fetched { reader: Box::new(response.into_body().into_reader()), resumed: start > 0 })
}

// Inflates the verified download into ffmpeg.exe and checks that hash too; the compressed file goes.
pub fn unpack(folder: &Path) -> Result<(), String> {
    let source = download_path(folder);
    let target = ffmpeg_in(folder);
    let temp   = folder.join(format!("{FFMPEG_NAME}.tmp"));

    // The hash of ffmpeg.exe is taken while it is written, not by reading it again.
    let inflate = || -> io::Result<bool> {
        let mut reader = DeflateDecoder::new(BufReader::new(File::open(&source)?));
        let mut writer = HashWriter::new(BufWriter::new(File::create(&temp)?));
        io::copy(&mut reader, &mut writer)?;
        writer.flush()?;
        Ok(writer.matches(FFMPEG_EXE_SHA256))
    };

    let unpacked = inflate().unwrap_or(false);
    // let unpacked = inflate().is_ok() && matches_hash(&temp, FFMPEG_EXE_SHA256);
    let _        = fs::remove_file(&source);

    if !unpacked {
        let _ = fs::remove_file(&temp);
        return Err(UNPACK_ERROR.to_string());
    }

    fs::rename(&temp, &target).map_err(|_| WRITE_ERROR.to_string())
}

// "Borrar" in Ajustes: ffmpeg.exe and any half download. Glup's own files, not the person's.
pub fn delete_in(folder: &Path) -> Result<(), String> {
    for path in [ffmpeg_in(folder), download_path(folder), part_path(folder), folder.join(format!("{FFMPEG_NAME}.tmp"))] {
        if path.exists() {
            fs::remove_file(&path).map_err(|_| DELETE_ERROR.to_string())?;
        }
    }

    Ok(())
}

// Media Foundation, given whether a file exists in the system folder (injected for tests).
pub fn media_foundation_in(system: &Path, exists: impl Fn(&Path) -> bool) -> bool {
    MEDIA_LIBRARIES.iter().all(|name| exists(&system.join(name)))
}

pub fn media_foundation_available() -> bool {
    let root = std::env::var_os("SystemRoot").map(PathBuf::from).unwrap_or_else(|| PathBuf::from(r"C:\Windows"));
    media_foundation_in(&root.join("System32"), Path::exists)
}
