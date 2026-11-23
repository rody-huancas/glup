// The sound of an audio or video file as Whisper wants it: 16 kHz, one channel, 32-bit floats. FFmpeg
// (the LGPL one downloaded for videos) reads every format and writes the samples to its output.
use std::{
    io::Read,
    path::Path,
    process::{Command, Stdio},
    sync::atomic::{AtomicBool, Ordering},
};

use crate::services::video::encode::hide_window;

pub const SAMPLE_RATE: u32 = 16_000;
pub const AUDIO_ERROR: &str = "No pude leer el sonido de este archivo";

const CHUNK: usize = 1 << 16;

pub fn decode_args(input: &Path) -> Vec<std::ffi::OsString> {
    let mut args: Vec<std::ffi::OsString> = ["-hide_banner", "-nostdin", "-loglevel", "error", "-i"].map(Into::into).to_vec();
    args.push(input.as_os_str().to_owned());
    args.extend(["-vn", "-ac", "1", "-ar", "16000", "-f", "f32le", "-acodec", "pcm_f32le", "pipe:1"].map(Into::into));
    args
}

// Little-endian float bytes to samples (a trailing partial sample is dropped).
pub fn to_samples(bytes: &[u8]) -> Vec<f32> {
    bytes.chunks_exact(4).map(|chunk| f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]])).collect()
}

// None when it was cancelled while reading.
pub fn decode(ffmpeg: &Path, input: &Path, cancel: &AtomicBool) -> Result<Option<Vec<f32>>, String> {
    let mut command = Command::new(ffmpeg);
    command.args(decode_args(input)).stdin(Stdio::null()).stdout(Stdio::piped()).stderr(Stdio::null());
    hide_window(&mut command);

    let mut child  = command.spawn().map_err(|_| AUDIO_ERROR.to_string())?;
    let mut output = child.stdout.take().ok_or(AUDIO_ERROR)?;
    let mut bytes  = Vec::new();
    let mut buffer = vec![0u8; CHUNK];

    loop {
        if cancel.load(Ordering::SeqCst) {
            let _ = child.kill();
            let _ = child.wait();
            return Ok(None);
        }
        let read = output.read(&mut buffer).map_err(|_| AUDIO_ERROR.to_string())?;
        if read == 0 {
            break;
        }
        bytes.extend_from_slice(&buffer[..read]);
    }

    let status = child.wait().map_err(|_| AUDIO_ERROR.to_string())?;
    if !status.success() || bytes.is_empty() {
        return Err(AUDIO_ERROR.to_string());
    }
    Ok(Some(to_samples(&bytes)))
}

pub fn seconds_of(samples: &[f32]) -> f64 {
    samples.len() as f64 / SAMPLE_RATE as f64
}
