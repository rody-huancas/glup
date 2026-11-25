// What an audio or video file holds, from what `ffmpeg -i` prints (there is no ffprobe): its length,
// the picture if there is one, and the codec of its sound and of its picture.
use std::{
    path::Path,
    process::{Command, Stdio},
};

use serde::Serialize;

use crate::services::video::{
    encode::hide_window,
    probe::{parse_duration, parse_probe},
};

pub const PROBE_ERROR: &str = "No pude leer este archivo";

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaInfo {
    // Seconds.
    pub duration    : f64,
    // A real picture (a cover drawn in an MP3 does not count).
    pub has_video   : bool,
    pub width       : u32,
    pub height      : u32,
    pub has_audio   : bool,
    // "aac", "mp3", "pcm_s16le", "opus"…
    pub audio_codec : Option<String>,
    // "h264", "hevc", "vp9"…
    pub video_codec : Option<String>,
    // The whole file, in bits per second (from "bitrate: 1234 kb/s").
    pub bitrate     : Option<u64>,
}

// The codec of the first stream of that kind ("Stream #0:1(und): Audio: aac (LC) (mp4a…), 44100 Hz").
fn codec(text: &str, kind: &str) -> Option<String> {
    let marker = format!("{kind}:");
    text.lines()
        .filter(|line| line.contains("Stream #") && line.contains(&marker) && !line.contains("attached pic"))
        .find_map(|line| line.split(&marker).nth(1)?.split([' ', ',']).find(|word| !word.is_empty()).map(str::to_string))
}

fn bitrate(text: &str) -> Option<u64> {
    text.lines().find_map(|line| {
        let rest = line.split("bitrate:").nth(1)?;
        let kbps = rest.trim().split_whitespace().next()?.parse::<u64>().ok()?;
        Some(kbps * 1000)
    })
}

pub fn parse_media(text: &str) -> Option<MediaInfo> {
    let duration    = parse_duration(text)?;
    let video_codec = codec(text, "Video");
    let audio_codec = codec(text, "Audio");
    let picture     = video_codec.as_ref().and_then(|_| parse_probe(text));

    Some(MediaInfo {
        duration,
        has_video : picture.is_some(),
        width     : picture.map_or(0, |info| info.width),
        height    : picture.map_or(0, |info| info.height),
        has_audio : audio_codec.is_some(),
        audio_codec,
        video_codec : picture.and(video_codec),
        bitrate   : bitrate(text),
    })
}

pub fn probe_media(ffmpeg: &Path, file: &Path) -> Result<MediaInfo, String> {
    let mut command = Command::new(ffmpeg);
    command.args(["-hide_banner", "-nostdin", "-i"]).arg(file).stdin(Stdio::null()).stdout(Stdio::null()).stderr(Stdio::piped());
    hide_window(&mut command);

    let output = command.output().map_err(|_| PROBE_ERROR.to_string())?;
    parse_media(&String::from_utf8_lossy(&output.stderr)).ok_or_else(|| PROBE_ERROR.to_string())
}
