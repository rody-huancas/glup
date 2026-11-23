// How a video is made lighter: the size of the picture, the bitrates and the FFmpeg arguments. All pure.
use std::{ffi::OsString, path::Path};

use serde::{Deserialize, Serialize};

use crate::services::video::probe::VideoInfo;

// "Para correo": under 25 MB, counted as Glup shows sizes (1 MB = 1024 KB).
pub const EMAIL_BYTES: u64 = 25 * 1024 * 1024;
// Room for the container and for the encoder not hitting the bitrate exactly.
pub const SIZE_SAFETY: f64 = 0.94;
// Below this the picture is not worth it; a longer video ends up above the size asked for.
pub const MIN_VIDEO_BPS: u64 = 200_000;
// A size budget never needs more than this (the result would only be heavier, not better looking).
pub const MAX_BUDGET_VIDEO_BPS: u64 = 4_000_000;
// More than 30 frames a second only adds weight for these uses.
pub const MAX_FPS: u32 = 30;

// The largest picture for each use, as (long side, short side): it fits a vertical video too.
pub const FULL_HD: (u32, u32) = (1920, 1080);
pub const HD: (u32, u32)      = (1280, 720);
pub const SD: (u32, u32)      = (854, 480);

const WHATSAPP_VIDEO_BPS: u64 = 1_800_000;
const WHATSAPP_AUDIO_BPS: u64 = 128_000;
const LIGHTEST_VIDEO_BPS: u64 = 600_000;
const LOW_AUDIO_BPS: u64      = 64_000;
const BUDGET_AUDIO_BPS: u64   = 96_000;
// With a size budget, the bitrate decides the picture: full HD from here, HD from the next.
const FULL_HD_FROM_BPS: u64   = 2_800_000;
const HD_FROM_BPS: u64        = 1_000_000;

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum VideoGoal {
    // 720p at most, good quality, moderate weight.
    #[default]
    Whatsapp,
    // Under 25 MB.
    Email,
    // 480p and lower quality.
    Lightest,
    // Under the size the person typed.
    Target,
}

#[derive(Clone, Copy, Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoOptions {
    pub goal         : VideoGoal,
    pub target_bytes : Option<u64>,
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoPlan {
    pub width     : u32,
    pub height    : u32,
    pub video_bps : u64,
    pub audio_bps : u64,
    // About what the result will weigh.
    pub estimate  : u64,
    // The size asked for cannot be reached: the video is too long. `estimate` says where it ends up.
    pub too_long  : bool,
    // The size it has to stay under, when there is one (correo or a typed size).
    pub budget    : Option<u64>,
}

pub struct ArgsParams<'a> {
    pub input     : &'a Path,
    pub output    : &'a Path,
    pub plan      : &'a VideoPlan,
    pub has_audio : bool,
}

fn even(value: f64) -> u32 {
    ((value / 2.0).round() as u32 * 2).max(2)
}

// The picture scaled down to fit (long, short) keeping its proportion; never made bigger.
pub fn fit(width: u32, height: u32, limit: (u32, u32)) -> (u32, u32) {
    let (long, short) = if width >= height { (width, height) } else { (height, width) };
    let scale         = (limit.0 as f64 / long as f64).min(limit.1 as f64 / short as f64).min(1.0);
    (even(width as f64 * scale), even(height as f64 * scale))
}

// What a stream of these bitrates weighs over the duration, with the container on top (about 1 %).
pub fn estimate_bytes(video_bps: u64, audio_bps: u64, duration: f64) -> u64 {
    ((video_bps + audio_bps) as f64 * duration / 8.0 * 1.01) as u64
}

// The video bitrate that keeps the whole file under `budget` bytes, or None when even the minimum
// would not (the video is too long for it).
pub fn video_bitrate_for(budget: u64, duration: f64, audio_bps: u64) -> Option<u64> {
    let total = budget as f64 * 8.0 * SIZE_SAFETY / duration.max(1.0);
    let video = total - audio_bps as f64;
    (video >= MIN_VIDEO_BPS as f64).then(|| (video as u64).min(MAX_BUDGET_VIDEO_BPS))
}

fn picture_for(bps: u64) -> (u32, u32) {
    if bps >= FULL_HD_FROM_BPS {
        FULL_HD
    } else if bps >= HD_FROM_BPS {
        HD
    } else {
        SD
    }
}

fn fixed(info: &VideoInfo, limit: (u32, u32), video_bps: u64, audio_bps: u64) -> VideoPlan {
    let (width, height) = fit(info.width, info.height, limit);
    VideoPlan { width, height, video_bps, audio_bps, estimate: estimate_bytes(video_bps, audio_bps, info.duration), too_long: false, budget: None }
}

fn budgeted(info: &VideoInfo, budget: u64) -> VideoPlan {
    let normal = if info.has_audio { BUDGET_AUDIO_BPS } else { 0 };
    let low    = if info.has_audio { LOW_AUDIO_BPS } else { 0 };

    // Normal sound while the picture still gets enough; otherwise lighter sound leaves it more room.
    let (video, audio_bps, too_long) = match video_bitrate_for(budget, info.duration, normal) {
        Some(bps) if bps >= LIGHTEST_VIDEO_BPS || !info.has_audio => (bps, normal, false),
        _ => match video_bitrate_for(budget, info.duration, low) {
            Some(bps) => (bps, low, false),
            None      => (MIN_VIDEO_BPS, low, true),
        },
    };

    let (width, height) = fit(info.width, info.height, picture_for(video));
    VideoPlan { width, height, video_bps: video, audio_bps, estimate: estimate_bytes(video, audio_bps, info.duration), too_long, budget: Some(budget) }
}

pub fn plan(info: &VideoInfo, options: VideoOptions) -> VideoPlan {
    let sound = |bps: u64| if info.has_audio { bps } else { 0 };

    match options.goal {
        VideoGoal::Whatsapp => fixed(info, HD, WHATSAPP_VIDEO_BPS, sound(WHATSAPP_AUDIO_BPS)),
        VideoGoal::Lightest => fixed(info, SD, LIGHTEST_VIDEO_BPS, sound(LOW_AUDIO_BPS)),
        VideoGoal::Email    => budgeted(info, EMAIL_BYTES),
        VideoGoal::Target   => budgeted(info, options.target_bytes.unwrap_or(EMAIL_BYTES)),
    }
}

// A second try when the first result went over the budget: the bitrate scaled by how much it went over.
pub fn retry_plan(plan: &VideoPlan, actual: u64, duration: f64) -> Option<VideoPlan> {
    let budget = plan.budget?;
    if actual <= budget || plan.too_long {
        return None;
    }

    let video_bps = ((plan.video_bps as f64 * budget as f64 / actual as f64) * SIZE_SAFETY) as u64;
    (video_bps >= MIN_VIDEO_BPS).then(|| VideoPlan { video_bps, estimate: estimate_bytes(video_bps, plan.audio_bps, duration), ..*plan })
}

// H.264 with Media Foundation (h264_mf, never libx264) and AAC, in an MP4 with its index first so it
// plays while it downloads. FFmpeg turns phone videos upright before scaling, so the size is as shown.
pub fn ffmpeg_args(params: ArgsParams) -> Vec<OsString> {
    let ArgsParams { input, output, plan, has_audio } = params;
    let scale = format!("scale={}:{},setsar=1", plan.width, plan.height);

    let mut flags: Vec<String> = ["-map", "0:v:0", "-vf", &scale, "-fpsmax", &MAX_FPS.to_string()].map(String::from).to_vec();
    // Profile 100 is "High"; h264_mf only takes the number.
    flags.extend(["-c:v", "h264_mf", "-profile:v", "100", "-rate_control", "pc_vbr", "-b:v", &plan.video_bps.to_string(), "-pix_fmt", "nv12"].map(String::from));

    if has_audio && plan.audio_bps > 0 {
        flags.extend(["-map", "0:a:0", "-c:a", "aac", "-b:a", &plan.audio_bps.to_string(), "-ac", "2"].map(String::from));
    } else {
        flags.push("-an".to_string());
    }

    flags.extend(["-movflags", "+faststart", "-progress", "pipe:1", "-stats_period", "0.5", "-nostats", "-loglevel", "error"].map(String::from));

    let mut args: Vec<OsString> = ["-hide_banner", "-nostdin", "-y", "-i"].map(OsString::from).to_vec();
    args.push(input.as_os_str().to_owned());
    args.extend(flags.into_iter().map(OsString::from));
    args.push(output.as_os_str().to_owned());
    args
}
