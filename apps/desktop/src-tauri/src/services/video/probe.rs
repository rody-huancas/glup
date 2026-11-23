// What a video is (length, size as shown, sound), read from what `ffmpeg -i` prints. Only ffmpeg.exe
// is downloaded, so there is no ffprobe: its summary has everything needed.
use std::{
    path::Path,
    process::{Command, Stdio},
};

use serde::Serialize;

use crate::services::video::encode::hide_window;

pub const PROBE_ERROR: &str = "No pude leer este video";

#[derive(Clone, Copy, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoInfo {
    // Seconds.
    pub duration  : f64,
    // As it is shown: a phone video recorded upright is taller than wide.
    pub width     : u32,
    pub height    : u32,
    pub has_audio : bool,
}

// "00:01:02.50" → 62.5.
pub fn parse_clock(text: &str) -> Option<f64> {
    let mut parts = text.trim().split(':');
    let hours     = parts.next()?.parse::<f64>().ok()?;
    let minutes   = parts.next()?.parse::<f64>().ok()?;
    let seconds   = parts.next()?.parse::<f64>().ok()?;
    parts.next().is_none().then_some(hours * 3600.0 + minutes * 60.0 + seconds)
}

// The first "WIDTHxHEIGHT" in a stream line (skipping things like "0x31637661").
fn dimensions(line: &str) -> Option<(u32, u32)> {
    line.split([',', ' ', '[']).find_map(|word| {
        let (width, height) = word.trim().split_once('x')?;
        let width           = width.parse::<u32>().ok()?;
        let height          = height.parse::<u32>().ok()?;
        (width >= 16 && height >= 16).then_some((width, height))
    })
}

// "Display Matrix: rotation of -90.00 degrees" (or the old "rotate : 90" tag).
fn rotation(text: &str) -> i64 {
    for line in text.lines().map(str::trim) {
        let lower = line.to_ascii_lowercase();
        let value = if let Some(rest) = lower.split("rotation of").nth(1) {
            rest.trim().split_whitespace().next()
        } else if lower.starts_with("rotate") {
            lower.split(':').nth(1).map(str::trim)
        } else {
            None
        };

        if let Some(degrees) = value.and_then(|value| value.parse::<f64>().ok()) {
            return degrees.round() as i64;
        }
    }
    0
}

// Parses the summary ffmpeg prints for an input. None if there is no video stream or no length.
pub fn parse_probe(text: &str) -> Option<VideoInfo> {
    let duration = text.lines().find_map(|line| {
        let rest = line.trim().strip_prefix("Duration:")?;
        parse_clock(rest.split(',').next()?)
    })?;

    let video           = text.lines().find(|line| line.contains("Stream #") && line.contains("Video:"))?;
    let (width, height) = dimensions(video.split("Video:").nth(1)?)?;
    let has_audio       = text.lines().any(|line| line.contains("Stream #") && line.contains("Audio:"));
    let quarter         = rotation(text).rem_euclid(180) == 90;

    let (width, height) = if quarter { (height, width) } else { (width, height) };
    Some(VideoInfo { duration, width, height, has_audio })
}

// `ffmpeg -i file` prints the summary and stops (with an error, as there is no output): that is expected.
pub fn probe(ffmpeg: &Path, video: &Path) -> Result<VideoInfo, String> {
    let mut command = Command::new(ffmpeg);
    command.args(["-hide_banner", "-nostdin", "-i"]).arg(video).stdin(Stdio::null()).stdout(Stdio::null()).stderr(Stdio::piped());
    hide_window(&mut command);

    let output = command.output().map_err(|_| PROBE_ERROR.to_string())?;
    parse_probe(&String::from_utf8_lossy(&output.stderr)).ok_or_else(|| PROBE_ERROR.to_string())
}
