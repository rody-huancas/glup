// "Video a GIF": a stretch of a video as an animated GIF (with a palette of its own, so it does not
// look pixelated) or as an animated WebP (much lighter, and WhatsApp and the web show it). Pure.
use std::{ffi::OsString, path::Path};

use serde::Deserialize;

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Hash, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AnimationFormat {
    #[default]
    Gif,
    Webp,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnimationOptions {
    pub format       : AnimationFormat,
    pub width        : u32,
    pub fps          : u32,
    // «Repetir siempre».
    pub loop_forever : bool,
}

pub fn extension(format: AnimationFormat) -> &'static str {
    match format {
        AnimationFormat::Gif  => "gif",
        AnimationFormat::Webp => "webp",
    }
}

// The width asked, never wider than the video (a small video keeps its own).
pub fn width_for(asked: u32, source: u32) -> u32 {
    let width = asked.clamp(64, 1920);
    if source > 0 { width.min(source) } else { width }
}

pub struct AnimationArgs<'a> {
    pub input   : &'a Path,
    pub output  : &'a Path,
    // Seconds.
    pub start   : f64,
    pub end     : f64,
    pub options : AnimationOptions,
    // The width of the video as shown.
    pub source  : u32,
}

// GIF: one palette made for this stretch (only what moves counts, stats_mode=diff) and used with a soft
// dither (sierra2_4a), only the changed area of each frame written. WebP: lossy at a good quality.
pub fn animation_args(params: AnimationArgs) -> Vec<OsString> {
    let width = width_for(params.options.width, params.source);
    let fps   = params.options.fps.clamp(5, 30);
    let scale = format!("fps={fps},scale={width}:-2:flags=lanczos");

    let mut args: Vec<OsString> = ["-hide_banner", "-nostdin", "-y", "-ss"].map(Into::into).to_vec();
    args.push(format!("{:.3}", params.start.max(0.0)).into());
    args.push("-t".into());
    args.push(format!("{:.3}", (params.end - params.start).max(0.1)).into());
    args.push("-i".into());
    args.push(params.input.as_os_str().to_owned());
    args.extend(["-an", "-sn"].map(OsString::from));

    match params.options.format {
        AnimationFormat::Gif => {
            args.push("-filter_complex".into());
            args.push(format!("[0:v:0]{scale},split[a][b];[a]palettegen=max_colors=256:stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle[out]").into());
            args.extend(["-map", "[out]", "-loop"].map(OsString::from));
            args.push(if params.options.loop_forever { "0" } else { "-1" }.into());
        }
        AnimationFormat::Webp => {
            args.extend(["-map", "0:v:0", "-vf"].map(OsString::from));
            args.push(scale.into());
            args.extend(["-c:v", "libwebp_anim", "-lossless", "0", "-q:v", "70", "-compression_level", "4", "-loop"].map(OsString::from));
            args.push(if params.options.loop_forever { "0" } else { "1" }.into());
        }
    }
    args.extend(["-progress", "pipe:1", "-nostats"].map(OsString::from));
    args.push(params.output.as_os_str().to_owned());
    args
}

// "GIF · 480 px · 15 cuadros/s · 6,2 s".
pub fn animation_detail(options: AnimationOptions, width: u32, seconds: f64) -> String {
    let format = extension(options.format).to_uppercase();
    let length = format!("{seconds:.1}").replace('.', ",");
    format!("{format} · {width} px · {} cuadros/s · {length} s", options.fps)
}
