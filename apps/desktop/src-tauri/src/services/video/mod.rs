pub mod encode;
pub mod plan;
pub mod probe;
pub mod progress;
pub mod tool;

#[cfg(test)]
mod tests;

use std::{
    fs,
    path::{Path, PathBuf},
    sync::atomic::AtomicBool,
};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

use crate::services::{
    actions::ActionControl,
    background::download::{self, DownloadEnd, DownloadParams},
    progress::{self as task_progress, DownloadSpan},
    tasks::TaskSummary,
    video::{
        encode::{encode, EncodeParams, Encoded},
        plan::{ffmpeg_args, plan, retry_plan, ArgsParams, VideoOptions, VideoPlan},
        probe::{probe, VideoInfo},
        tool::{media_foundation_available, tools_folder, FFMPEG_DOWNLOAD, MEDIA_ERROR, MISSING_ERROR},
    },
};

pub const DOWNLOAD_ACTION_ID: &str = "download-video-tool";
pub const REDUCED_SUFFIX: &str     = "reducido";
pub const VIDEO_EXTENSION: &str    = "mp4";

pub const ALREADY_LIGHT: &str     = "Este video ya estaba liviano";
pub const LEARNED_MESSAGE: &str   = "Listo, ya sé trabajar con videos";
pub const CANCELLED_MESSAGE: &str = "Dejé la descarga a medias. La próxima vez sigo desde ahí.";

// "Aprender a trabajar con videos": the compressed ffmpeg.exe out of the FFmpeg zip, resumed if cut,
// checked, unpacked and checked again.
pub fn download_tool(app: &AppHandle, task: &Option<String>) -> Result<TaskSummary, String> {
    download_tool_as(app, &DownloadSpan::single(task, FFMPEG_DOWNLOAD.size))
}

// The same download as part of a bigger one (FFmpeg and then the Whisper model, shown as one).
pub fn download_tool_as(app: &AppHandle, span: &DownloadSpan) -> Result<TaskSummary, String> {
    let control = app.state::<ActionControl>();
    control.begin(&span.task);

    let folder = tools_folder(app)?;
    if tool::ffmpeg_in(&folder).is_file() {
        return Ok(TaskSummary::success(LEARNED_MESSAGE.to_string()));
    }

    let end = download::download(DownloadParams {
        folder       : &folder,
        model        : &FFMPEG_DOWNLOAD,
        cancel       : &control.cancelled,
        on_progress  : &|done| task_progress::emit(app, span.downloading(done)),
        on_verifying : &|| task_progress::emit(app, span.verifying()),
        fetch        : &tool::fetch_range,
    })?;

    match end {
        DownloadEnd::Cancelled => Ok(TaskSummary::calm(CANCELLED_MESSAGE.to_string())),
        DownloadEnd::Installed => {
            tool::unpack(&folder)?;
            Ok(TaskSummary::success(LEARNED_MESSAGE.to_string()))
        }
    }
}

pub fn delete_tool(app: &AppHandle) -> Result<(), String> {
    tool::delete_in(&tools_folder(app)?)
}

fn ffmpeg(app: &AppHandle) -> Result<PathBuf, String> {
    tool::ffmpeg_path(app).ok_or_else(|| MISSING_ERROR.to_string())
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlanRequest {
    pub paths   : Vec<String>,
    pub options : VideoOptions,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoPlanReport {
    pub path : String,
    pub info : Option<VideoInfo>,
    pub plan : Option<VideoPlan>,
}

// For the "¿Para qué es?" step: what each video is and how it would come out, before starting (to warn
// when it is too long for the size asked for).
pub fn plan_videos(app: &AppHandle, request: PlanRequest) -> Result<Vec<VideoPlanReport>, String> {
    let ffmpeg = ffmpeg(app)?;

    Ok(request
        .paths
        .into_iter()
        .map(|path| {
            let info = probe(&ffmpeg, Path::new(&path)).ok();
            let plan = info.as_ref().map(|info| plan(info, request.options));
            VideoPlanReport { path, info, plan }
        })
        .collect())
}

// Video info for get_files_info, when ffmpeg is already here.
pub fn probe_if_ready(ffmpeg: Option<&Path>, path: &Path) -> Option<VideoInfo> {
    probe(ffmpeg?, path).ok()
}

pub struct ReduceVideoParams<'a> {
    pub app         : &'a AppHandle,
    pub source      : &'a Path,
    // Where the result goes (already reserved, unique in the destination).
    pub output      : &'a Path,
    pub options     : VideoOptions,
    pub cancel      : &'a AtomicBool,
    // 0 to 1 for this video.
    pub on_progress : &'a dyn Fn(f64),
}

pub enum VideoResult {
    Saved(u64),
    // Lighter was not possible: nothing saved.
    AlreadyLight,
    Cancelled,
}

fn run_once(params: &ReduceVideoParams, ffmpeg: &Path, info: &VideoInfo, plan: &VideoPlan) -> Result<Encoded, String> {
    let args = ffmpeg_args(ArgsParams { input: params.source, output: params.output, plan, has_audio: info.has_audio });
    encode(EncodeParams { ffmpeg, args, duration: info.duration, cancel: params.cancel, on_progress: params.on_progress })
}

// One video into video-reducido.mp4. A half-made or not lighter file never stays behind. With a size
// to stay under, a result that went over is made again once, with the bitrate corrected.
pub fn reduce(params: ReduceVideoParams) -> Result<VideoResult, String> {
    let ffmpeg = ffmpeg(params.app)?;
    if !media_foundation_available() {
        return Err(MEDIA_ERROR.to_string());
    }

    let info   = probe(&ffmpeg, params.source)?;
    let first  = plan(&info, params.options);
    let remove = || {
        let _ = fs::remove_file(params.output);
    };

    let mut current = first;
    for attempt in 0..2 {
        match run_once(&params, &ffmpeg, &info, &current) {
            Ok(Encoded::Done)      => {}
            Ok(Encoded::Cancelled) => {
                remove();
                return Ok(VideoResult::Cancelled);
            }
            Err(error) => {
                remove();
                return Err(error);
            }
        }

        let size = fs::metadata(params.output).map(|data| data.len()).unwrap_or(u64::MAX);
        match (attempt, retry_plan(&current, size, info.duration)) {
            (0, Some(next)) => current = next,
            _               => break,
        }
    }

    let size   = fs::metadata(params.output).map(|data| data.len()).unwrap_or(u64::MAX);
    let before = fs::metadata(params.source).map(|data| data.len()).unwrap_or(0);
    if size >= before {
        remove();
        return Ok(VideoResult::AlreadyLight);
    }

    Ok(VideoResult::Saved(size))
}
