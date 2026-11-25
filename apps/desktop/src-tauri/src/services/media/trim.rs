// "Recortar": a stretch of an audio or a video into "<nombre> (recorte).ext", the same format.
// Rápido copies the streams (no quality lost): a video can only start on a key frame, so the start goes
// back to the one just before (the screen shows where). Exacto makes the stretch again (h264_mf for the
// picture, as Reducir peso does, and the matching sound encoder).
use std::{ffi::OsString, path::Path};

use serde::Deserialize;

pub const EXACT_UNSUPPORTED: &str = "Este formato solo puedo recortarlo en modo rápido";
pub const RANGE_ERROR: &str       = "El tramo elegido está vacío";
// The picture of an exact cut is made at the file's own bitrate, within these.
const MIN_VIDEO_BPS: u64 = 1_000_000;
const MAX_VIDEO_BPS: u64 = 15_000_000;

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TrimMode {
    #[default]
    Fast,
    Exact,
}

// The key frame a fast cut starts on: the last one at or before the start asked (0 without any).
pub fn keyframe_before(keyframes: &[f64], at: f64) -> f64 {
    keyframes.iter().copied().filter(|time| *time <= at + 0.001).fold(0.0, f64::max)
}

// "… pts_time:12.345 …" of every key frame that showinfo printed.
pub fn parse_keyframes(text: &str) -> Vec<f64> {
    let mut times: Vec<f64> = text
        .lines()
        .filter(|line| line.contains("Parsed_showinfo"))
        .filter_map(|line| line.split("pts_time:").nth(1)?.split_whitespace().next()?.parse::<f64>().ok())
        .collect();
    times.sort_by(f64::total_cmp);
    times.dedup();
    times
}

// Only the key frames are decoded (fast even on a long video), and showinfo tells their time.
pub fn keyframe_args(input: &Path) -> Vec<OsString> {
    let mut args: Vec<OsString> = ["-hide_banner", "-nostdin", "-skip_frame", "nokey", "-i"].map(Into::into).to_vec();
    args.push(input.as_os_str().to_owned());
    args.extend(["-map", "0:v:0", "-vf", "showinfo", "-an", "-f", "null", "-"].map(OsString::from));
    args
}

fn lower_extension(path: &Path) -> String {
    path.extension().map(|extension| extension.to_string_lossy().to_lowercase()).unwrap_or_default()
}

// The encoders of an exact cut for that format (None: only a fast cut).
pub fn exact_codecs(extension: &str, has_video: bool, video_bps: u64) -> Option<Vec<String>> {
    let rate  = video_bps.clamp(MIN_VIDEO_BPS, MAX_VIDEO_BPS).to_string();
    let video = |codec: &str| vec!["-c:v".to_string(), codec.to_string(), "-b:v".to_string(), rate.clone()];
    let audio = |list: &[&str]| list.iter().map(|item| item.to_string()).collect::<Vec<_>>();

    if has_video {
        let (picture, sound) = match extension {
            "mp4" | "m4v" | "mov" | "3gp" | "mkv" => (video("h264_mf"), audio(&["-c:a", "aac", "-b:a", "192k"])),
            "avi"                                 => (video("h264_mf"), audio(&["-c:a", "libmp3lame", "-q:a", "2"])),
            "wmv"                                 => (video("wmv2"), audio(&["-c:a", "wmav2", "-b:a", "192k"])),
            "webm"                                => ([video("libvpx-vp9"), audio(&["-deadline", "realtime", "-cpu-used", "8"])].concat(), audio(&["-c:a", "libopus", "-b:a", "128k"])),
            _                                     => return None,
        };
        return Some([picture, sound].concat());
    }

    let sound: &[&str] = match extension {
        "mp3"         => &["-c:a", "libmp3lame", "-q:a", "2"],
        "m4a" | "aac" => &["-c:a", "aac", "-b:a", "192k"],
        "wav"         => &["-c:a", "pcm_s16le"],
        "flac"        => &["-c:a", "flac"],
        "ogg"         => &["-c:a", "libvorbis", "-q:a", "5"],
        "opus"        => &["-c:a", "libopus", "-b:a", "128k"],
        "wma"         => &["-c:a", "wmav2", "-b:a", "192k"],
        _             => return None,
    };
    Some(audio(sound))
}

pub struct TrimArgs<'a> {
    pub input     : &'a Path,
    pub output    : &'a Path,
    // Seconds.
    pub start     : f64,
    pub end       : f64,
    pub mode      : TrimMode,
    pub has_video : bool,
    // The file's own bitrate (for an exact cut of a video).
    pub video_bps : u64,
}

fn seconds(value: f64) -> OsString {
    format!("{:.3}", value.max(0.0)).into()
}

// The command line of the cut. The first picture (not covers) and every sound track; progress on stdout.
pub fn trim_args(params: TrimArgs) -> Result<Vec<OsString>, String> {
    if params.end - params.start < 0.05 {
        return Err(RANGE_ERROR.to_string());
    }
    let extension = lower_extension(params.input);

    let mut args: Vec<OsString> = ["-hide_banner", "-nostdin", "-y", "-ss"].map(Into::into).to_vec();
    args.push(seconds(params.start));
    args.push("-i".into());
    args.push(params.input.as_os_str().to_owned());
    args.push("-t".into());
    args.push(seconds(params.end - params.start));
    args.extend(["-map", "0:v:0?", "-map", "0:a?", "-map_metadata", "0"].map(OsString::from));

    match params.mode {
        TrimMode::Fast => args.extend(["-c", "copy", "-avoid_negative_ts", "make_zero"].map(OsString::from)),
        TrimMode::Exact => {
            let codecs = exact_codecs(&extension, params.has_video, params.video_bps).ok_or_else(|| EXACT_UNSUPPORTED.to_string())?;
            args.extend(codecs.into_iter().map(OsString::from));
        }
    }
    if matches!(extension.as_str(), "mp4" | "m4v" | "mov" | "m4a") {
        args.extend(["-movflags", "+faststart"].map(OsString::from));
    }
    args.extend(["-progress", "pipe:1", "-nostats"].map(OsString::from));
    args.push(params.output.as_os_str().to_owned());
    Ok(args)
}
