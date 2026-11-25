// What the trimming screen shows: the file itself when the webview plays it, a light copy otherwise
// (MKV, AVI…), the strip of frames under a video and the shape of the sound under an audio.
use std::{ffi::OsString, path::Path};

// What WebView2 plays by itself (a MOV or MP4 in a codec it does not know still falls back to a copy).
pub const PLAYABLE: [&str; 11] = ["mp4", "m4v", "mov", "webm", "mp3", "m4a", "aac", "wav", "ogg", "opus", "flac"];

// The shape of the sound is read at this rate: enough for a few hundred bars, light on an hour.
pub const WAVE_RATE: u32 = 2000;
// The strip of frames: this tall, in pixels.
pub const STRIP_HEIGHT: u32 = 56;

// What WebView2 decodes by itself: a phone video in HEVC (or an MP4 with AC-3 sound) gets the light copy.
const PLAYABLE_VIDEO: [&str; 4] = ["h264", "vp8", "vp9", "av1"];
const PLAYABLE_AUDIO: [&str; 9] = ["aac", "mp3", "opus", "vorbis", "flac", "pcm_s16le", "pcm_s24le", "pcm_f32le", "pcm_u8"];

pub fn plays_codecs(video: Option<&str>, audio: Option<&str>) -> bool {
    video.is_none_or(|codec| PLAYABLE_VIDEO.contains(&codec)) && audio.is_none_or(|codec| PLAYABLE_AUDIO.contains(&codec))
}

pub fn playable(path: &Path) -> bool {
    path.extension().map(|extension| extension.to_string_lossy().to_lowercase()).is_some_and(|extension| PLAYABLE.contains(&extension.as_str()))
}

// A small MP4 (480 px tall at most) or an MP3, only to see and hear it on screen.
pub fn preview_args(input: &Path, output: &Path, has_video: bool) -> Vec<OsString> {
    let mut args: Vec<OsString> = ["-hide_banner", "-nostdin", "-y", "-i"].map(Into::into).to_vec();
    args.push(input.as_os_str().to_owned());
    if has_video {
        args.extend(["-map", "0:v:0", "-map", "0:a:0?", "-vf", "scale=-2:'min(480,ih)'", "-c:v", "h264_mf", "-b:v", "900k", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart"].map(OsString::from));
    } else {
        args.extend(["-map", "0:a:0", "-vn", "-c:a", "libmp3lame", "-q:a", "6"].map(OsString::from));
    }
    args.extend(["-progress", "pipe:1", "-nostats"].map(OsString::from));
    args.push(output.as_os_str().to_owned());
    args
}

// `count` frames spread over the whole video, side by side in one JPEG.
pub fn strip_args(input: &Path, count: u32, duration: f64) -> Vec<OsString> {
    let rate   = f64::from(count) / duration.max(0.1);
    let filter = format!("fps={rate:.6},scale=-2:{STRIP_HEIGHT},tile={count}x1");
    let mut args: Vec<OsString> = ["-hide_banner", "-nostdin", "-loglevel", "error", "-i"].map(Into::into).to_vec();
    args.push(input.as_os_str().to_owned());
    args.extend(["-map", "0:v:0", "-an", "-vf"].map(OsString::from));
    args.push(filter.into());
    args.extend(["-frames:v", "1", "-f", "image2", "-c:v", "mjpeg", "pipe:1"].map(OsString::from));
    args
}

// The sound in one channel, few samples a second, as 16-bit numbers on stdout.
pub fn wave_args(input: &Path) -> Vec<OsString> {
    let mut args: Vec<OsString> = ["-hide_banner", "-nostdin", "-loglevel", "error", "-i"].map(Into::into).to_vec();
    args.push(input.as_os_str().to_owned());
    args.extend(["-vn", "-ac", "1", "-ar"].map(OsString::from));
    args.push(WAVE_RATE.to_string().into());
    args.extend(["-f", "s16le", "-acodec", "pcm_s16le", "pipe:1"].map(OsString::from));
    args
}

pub fn samples_of(bytes: &[u8]) -> Vec<i16> {
    bytes.chunks_exact(2).map(|pair| i16::from_le_bytes([pair[0], pair[1]])).collect()
}

// The loudest sample of each of `count` equal pieces, from 0 to 1 against the loudest of all.
pub fn wave_bars(samples: &[i16], count: usize) -> Vec<f32> {
    if count == 0 {
        return Vec::new();
    }
    if samples.is_empty() {
        return vec![0.0; count];
    }

    let peaks: Vec<u16> = (0..count)
        .map(|index| {
            let start = index * samples.len() / count;
            let end   = ((index + 1) * samples.len() / count).max(start + 1).min(samples.len());
            samples[start.min(samples.len() - 1)..end].iter().map(|sample| sample.unsigned_abs()).max().unwrap_or(0)
        })
        .collect();
    let loudest = peaks.iter().copied().max().unwrap_or(0).max(1);
    peaks.into_iter().map(|peak| f32::from(peak) / f32::from(loudest)).collect()
}
