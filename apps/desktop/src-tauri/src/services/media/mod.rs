// Audio y video with the FFmpeg already learned (downloaded with permission, run as its own process):
// "Sacar el audio" of videos and "Recortar" an audio or a video, with what the trimming screen needs.
pub mod animation;
pub mod extract;
pub mod preview;
pub mod probe;
pub mod serve;
pub mod trim;

#[cfg(test)]
mod tests;

use std::{
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
    process::{Command, Stdio},
    sync::{atomic::AtomicBool, Mutex},
};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

use self::{
    animation::{animation_args, animation_detail, width_for, AnimationArgs, AnimationOptions},
    extract::{extract_args, ExtractArgs, ExtractOptions, NO_SOUND},
    preview::{playable, plays_codecs, preview_args, samples_of, strip_args, wave_args, wave_bars},
    probe::{probe_media, MediaInfo},
    serve::{new_token, url_for, MediaFiles},
    trim::{keyframe_args, keyframe_before, parse_keyframes, trim_args, TrimArgs, TrimMode},
};
use crate::services::video::{
    encode::{encode, hide_window, EncodeParams, Encoded},
    tool::{ffmpeg_path, MISSING_ERROR},
};

pub const PREVIEW_ERROR: &str = "No pude preparar la vista previa";
pub const TRIM_ERROR: &str    = "No pude recortarlo";
pub const EXTRACT_ERROR: &str = "No pude sacar el audio";
pub const TRIM_ACTION: &str   = "trim";
pub const GIF_ACTION: &str    = "to-gif";
pub const GIF_ERROR: &str     = "No pude hacer la animación";

pub fn ffmpeg(app: &AppHandle) -> Result<PathBuf, String> {
    ffmpeg_path(app).ok_or_else(|| MISSING_ERROR.to_string())
}

// The light copies made for the screen while it is open, to delete when it closes, and the last
// animation previewed for each choice (saved by copying it when nothing changed).
#[derive(Default)]
pub struct MediaSession {
    previews   : Mutex<Vec<PathBuf>>,
    animations : Mutex<HashMap<String, PathBuf>>,
}

impl MediaSession {
    fn keep(&self, path: PathBuf) {
        if let Ok(mut previews) = self.previews.lock() {
            previews.push(path);
        }
    }
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenedMedia {
    pub info     : MediaInfo,
    // Where the player reads it (None: the webview cannot play it, a preview is needed).
    pub url      : Option<String>,
}

fn serve_file(app: &AppHandle, path: &Path) -> String {
    let token = new_token();
    if let Ok(mut files) = app.state::<MediaFiles>().0.lock() {
        files.insert(token.clone(), path.to_path_buf());
    }
    url_for(&token)
}

// The file for the screen: what it is and, if the webview plays it, where.
pub fn open(app: &AppHandle, path: &str) -> Result<OpenedMedia, String> {
    let file = PathBuf::from(path);
    let info = probe_media(&ffmpeg(app)?, &file)?;
    let url  = (playable(&file) && plays_codecs(info.video_codec.as_deref(), info.audio_codec.as_deref())).then(|| serve_file(app, &file));
    Ok(OpenedMedia { info, url })
}

// A light copy the webview can play (a few seconds for most files), deleted when the screen closes.
pub fn make_preview(app: &AppHandle, path: &str) -> Result<String, String> {
    let ffmpeg = ffmpeg(app)?;
    let source = PathBuf::from(path);
    let info   = probe_media(&ffmpeg, &source)?;
    let folder = std::env::temp_dir().join("glup-recorte");
    fs::create_dir_all(&folder).map_err(|_| PREVIEW_ERROR.to_string())?;
    let output = folder.join(format!("{}.{}", new_token(), if info.has_video { "mp4" } else { "mp3" }));

    let cancel = AtomicBool::new(false);
    let done   = encode(EncodeParams { ffmpeg: &ffmpeg, args: preview_args(&source, &output, info.has_video), duration: info.duration, cancel: &cancel, on_progress: &|_| {} });
    if !matches!(done, Ok(Encoded::Done)) {
        let _ = fs::remove_file(&output);
        return Err(PREVIEW_ERROR.to_string());
    }
    app.state::<MediaSession>().keep(output.clone());
    Ok(serve_file(app, &output))
}

fn run_capture(ffmpeg: &Path, args: Vec<std::ffi::OsString>) -> Option<Vec<u8>> {
    let mut command = Command::new(ffmpeg);
    command.args(args).stdin(Stdio::null()).stdout(Stdio::piped()).stderr(Stdio::piped());
    hide_window(&mut command);
    command.output().ok().map(|output| [output.stdout, output.stderr].concat()).filter(|bytes| !bytes.is_empty())
}

fn run_stdout(ffmpeg: &Path, args: Vec<std::ffi::OsString>) -> Option<Vec<u8>> {
    let mut command = Command::new(ffmpeg);
    command.args(args).stdin(Stdio::null()).stdout(Stdio::piped()).stderr(Stdio::null());
    hide_window(&mut command);
    command.output().ok().filter(|output| output.status.success()).map(|output| output.stdout)
}

// Where a video's key frames are (seconds), for "Rápido".
pub fn keyframes(app: &AppHandle, path: &str) -> Result<Vec<f64>, String> {
    let bytes = run_capture(&ffmpeg(app)?, keyframe_args(Path::new(path))).unwrap_or_default();
    Ok(parse_keyframes(&String::from_utf8_lossy(&bytes)))
}

// `count` frames of the video side by side, as one JPEG.
pub fn strip(app: &AppHandle, path: &str, count: u32) -> Result<Vec<u8>, String> {
    let ffmpeg = ffmpeg(app)?;
    let info   = probe_media(&ffmpeg, Path::new(path))?;
    run_stdout(&ffmpeg, strip_args(Path::new(path), count.clamp(1, 40), info.duration)).ok_or_else(|| PREVIEW_ERROR.to_string())
}

// The shape of the sound in `bars` bars (0 to 1).
pub fn wave(app: &AppHandle, path: &str, bars: usize) -> Result<Vec<f32>, String> {
    let bytes = run_stdout(&ffmpeg(app)?, wave_args(Path::new(path))).ok_or_else(|| PREVIEW_ERROR.to_string())?;
    Ok(wave_bars(&samples_of(&bytes), bars.clamp(1, 2000)))
}

// The screen closed: its files are not served any more and its copies go.
pub fn close(app: &AppHandle) {
    if let Ok(mut files) = app.state::<MediaFiles>().0.lock() {
        files.clear();
    }
    let session = app.state::<MediaSession>();
    if let Ok(mut previews) = session.previews.lock() {
        for preview in previews.drain(..) {
            let _ = fs::remove_file(preview);
        }
    }
    if let Ok(mut animations) = session.animations.lock() {
        animations.clear();
    };
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnimationRequest {
    pub path        : String,
    pub start       : f64,
    pub end         : f64,
    pub options     : AnimationOptions,
    pub destination : Option<crate::services::destination::Destination>,
    pub task_id     : Option<String>,
}

// The same video, stretch and options: the same animation.
fn animation_key(request: &AnimationRequest) -> String {
    format!("{}|{:.2}|{:.2}|{:?}", request.path, request.start, request.end, request.options)
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AnimationPreview {
    pub url    : String,
    pub size   : u64,
    pub width  : u32,
    pub height : u32,
}

pub struct RenderParams<'a> {
    pub ffmpeg      : &'a Path,
    pub request     : &'a AnimationRequest,
    pub output      : &'a Path,
    pub cancel      : &'a AtomicBool,
    pub on_progress : &'a dyn Fn(f64),
}

// The animation of the stretch into `output` (None: cancelled, the half-made file deleted); its width.
pub fn render_animation(params: RenderParams) -> Result<Option<u32>, String> {
    let source = Path::new(&params.request.path);
    let info   = probe_media(params.ffmpeg, source)?;
    let end    = params.request.end.min(info.duration);
    let args   = animation_args(AnimationArgs { input: source, output: params.output, start: params.request.start, end, options: params.request.options, source: info.width });
    match encode(EncodeParams { ffmpeg: params.ffmpeg, args, duration: end - params.request.start, cancel: params.cancel, on_progress: params.on_progress }) {
        Ok(Encoded::Done) => Ok(Some(width_for(params.request.options.width, info.width))),
        Ok(Encoded::Cancelled) => {
            let _ = fs::remove_file(params.output);
            Ok(None)
        }
        Err(_) => {
            let _ = fs::remove_file(params.output);
            Err(GIF_ERROR.to_string())
        }
    }
}

// «Ver cómo queda»: the real animation in a temporary file, shown on the screen with its weight.
pub fn preview_animation(app: &AppHandle, request: &AnimationRequest) -> Result<AnimationPreview, String> {
    let ffmpeg = ffmpeg(app)?;
    let folder = std::env::temp_dir().join("glup-recorte");
    fs::create_dir_all(&folder).map_err(|_| GIF_ERROR.to_string())?;
    let output = folder.join(format!("{}.{}", new_token(), animation::extension(request.options.format)));

    let cancel = AtomicBool::new(false);
    render_animation(RenderParams { ffmpeg: &ffmpeg, request, output: &output, cancel: &cancel, on_progress: &|_| {} })?.ok_or(GIF_ERROR)?;
    let size    = fs::metadata(&output).map(|data| data.len()).unwrap_or(0);
    let (width, height) = image::image_dimensions(&output).unwrap_or((0, 0));
    let session = app.state::<MediaSession>();
    session.keep(output.clone());
    if let Ok(mut animations) = session.animations.lock() {
        animations.insert(animation_key(request), output.clone());
    }
    Ok(AnimationPreview { url: serve_file(app, &output), size, width, height })
}

// What «Guardar» saves: the preview already made for these same choices, or a new one.
pub fn save_animation(app: &AppHandle, request: AnimationRequest) -> Result<crate::services::actions::ActionReport, String> {
    use crate::services::actions::{run_single, SingleOutput, SingleParams};
    use crate::services::naming::OutputKind;

    let made = app.state::<MediaSession>().animations.lock().ok().and_then(|animations| animations.get(&animation_key(&request)).cloned()).filter(|path| path.is_file());
    run_single(SingleParams {
        app,
        action      : GIF_ACTION,
        path        : &request.path,
        destination : request.destination.clone(),
        task_id     : request.task_id.clone(),
        make        : &|job| {
            let output = job.reserve(OutputKind::Converted { extension: animation::extension(request.options.format) });
            let width  = match &made {
                Some(preview) => {
                    fs::copy(preview, &output).map_err(|_| GIF_ERROR.to_string())?;
                    image::image_dimensions(&output).map(|(width, _)| width).unwrap_or(request.options.width)
                }
                None => {
                    let ffmpeg = ffmpeg(app)?;
                    let Some(width) = render_animation(RenderParams { ffmpeg: &ffmpeg, request: &request, output: &output, cancel: job.cancel(), on_progress: &|done| job.progress(done) })? else { return Ok(None) };
                    width
                }
            };
            Ok(Some(SingleOutput {
                size   : fs::metadata(&output).map(|data| data.len()).unwrap_or(0),
                output,
                kind   : "image",
                detail : animation_detail(request.options, width, request.end - request.start),
            }))
        },
    })
}

pub struct ExtractParams<'a> {
    pub ffmpeg      : &'a Path,
    pub source      : &'a Path,
    pub output      : &'a Path,
    pub options     : ExtractOptions,
    pub cancel      : &'a AtomicBool,
    pub on_progress : &'a dyn Fn(f64),
}

// What one extraction made: its size and whether the sound was copied as it was. None: cancelled.
pub struct Extracted {
    pub size   : u64,
    pub copied : bool,
}

pub fn extract_audio(params: ExtractParams) -> Result<Option<Extracted>, String> {
    let info = probe_media(params.ffmpeg, params.source)?;
    if !info.has_audio {
        return Err(NO_SOUND.to_string());
    }

    let (args, copied) = extract_args(ExtractArgs { input: params.source, output: params.output, options: params.options, codec: info.audio_codec.as_deref() });
    let remove         = || {
        let _ = fs::remove_file(params.output);
    };
    match encode(EncodeParams { ffmpeg: params.ffmpeg, args, duration: info.duration, cancel: params.cancel, on_progress: params.on_progress }) {
        Ok(Encoded::Done) => Ok(Some(Extracted { size: fs::metadata(params.output).map(|data| data.len()).unwrap_or(0), copied })),
        Ok(Encoded::Cancelled) => {
            remove();
            Ok(None)
        }
        Err(_) => {
            remove();
            Err(EXTRACT_ERROR.to_string())
        }
    }
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrimRequest {
    pub path        : String,
    pub start       : f64,
    pub end         : f64,
    pub mode        : TrimMode,
    pub destination : Option<crate::services::destination::Destination>,
    pub task_id     : Option<String>,
}

pub struct TrimParams<'a> {
    pub ffmpeg      : &'a Path,
    pub request     : &'a TrimRequest,
    pub output      : &'a Path,
    pub cancel      : &'a AtomicBool,
    pub on_progress : &'a dyn Fn(f64),
}

pub struct Trimmed {
    pub size      : u64,
    pub has_video : bool,
    // Where it really starts: a fast cut of a video goes back to the key frame before the start asked.
    pub start     : f64,
}

// The stretch, in the same format. None: cancelled (the half-made file is deleted).
pub fn trim(params: TrimParams) -> Result<Option<Trimmed>, String> {
    let source = Path::new(&params.request.path);
    let info   = probe_media(params.ffmpeg, source)?;
    let end    = params.request.end.min(info.duration);
    let args   = trim_args(TrimArgs {
        input     : source,
        output    : params.output,
        start     : params.request.start,
        end,
        mode      : params.request.mode,
        has_video : info.has_video,
        video_bps : info.bitrate.unwrap_or(0),
    })?;

    let start = if params.request.mode == TrimMode::Fast && info.has_video {
        let bytes = run_capture(params.ffmpeg, keyframe_args(source)).unwrap_or_default();
        keyframe_before(&parse_keyframes(&String::from_utf8_lossy(&bytes)), params.request.start)
    } else {
        params.request.start
    };

    let remove = || {
        let _ = fs::remove_file(params.output);
    };
    match encode(EncodeParams { ffmpeg: params.ffmpeg, args, duration: end - params.request.start, cancel: params.cancel, on_progress: params.on_progress }) {
        Ok(Encoded::Done) => Ok(Some(Trimmed { size: fs::metadata(params.output).map(|data| data.len()).unwrap_or(0), has_video: info.has_video, start })),
        Ok(Encoded::Cancelled) => {
            remove();
            Ok(None)
        }
        Err(error) => {
            remove();
            Err(if error == crate::services::video::encode::ENCODE_ERROR { TRIM_ERROR.to_string() } else { error })
        }
    }
}

// "0:12.4": minutes, seconds and tenths (hours when there are).
pub fn clock(seconds: f64) -> String {
    let tenths  = (seconds.max(0.0) * 10.0).round() as u64;
    let (whole, tenth) = (tenths / 10, tenths % 10);
    let (hours, minutes, secs) = (whole / 3600, whole % 3600 / 60, whole % 60);
    if hours > 0 { format!("{hours}:{minutes:02}:{secs:02}.{tenth}") } else { format!("{minutes}:{secs:02}.{tenth}") }
}

// "Recorte de 0:12.0 a 1:05.5 · rápido, sin perder calidad" (from where it really starts).
pub fn trim_detail(request: &TrimRequest, start: f64) -> String {
    let mode = match request.mode {
        TrimMode::Fast  => "rápido, sin perder calidad",
        TrimMode::Exact => "exacto",
    };
    format!("Recorte de {} a {} · {mode}", clock(start), clock(request.end))
}

// "Audio sacado en MP3" (· "sin recodificar" when it was copied).
pub fn extract_detail(options: ExtractOptions, copied: bool) -> String {
    let format = extract::extension(options.format).to_uppercase();
    if copied { format!("Audio sacado en {format} · sin recodificar") } else { format!("Audio sacado en {format}") }
}
