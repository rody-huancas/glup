// The three ways of saving subtitles: a .srt beside the video, a track inside it that can be switched
// off (no picture made again), or drawn on the picture (for WhatsApp, Instagram or TikTok, where they
// cannot be switched on). The drawing is libass (in the LGPL FFmpeg), from an .ass file with Glup's style.
use std::{ffi::OsString, path::Path};

use serde::Deserialize;

use crate::services::subtitles::cues::{tidy, Cue};

pub const EMBED_UNSUPPORTED: &str = "Este formato no lleva subtítulos adentro: guárdalos aparte o pégalos en la imagen";
// The file the filter reads, in the folder FFmpeg runs in (no path to escape inside the filter).
pub const ASS_NAME: &str          = "subtitulos.ass";
// The picture of a burned video is made at the file's own bitrate, within these.
const MIN_VIDEO_BPS: u64          = 1_500_000;
const MAX_VIDEO_BPS: u64          = 15_000_000;

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SubtitleMode {
    // «Archivo .srt aparte».
    #[default]
    File,
    // «Dentro del video, se pueden apagar».
    Embed,
    // «Pegados en la imagen».
    Burn,
}

// The subtitle codec each container takes as a track.
pub fn track_codec(extension: &str) -> Option<&'static str> {
    match extension {
        "mp4" | "m4v" | "mov" | "3gp" => Some("mov_text"),
        "mkv"                         => Some("srt"),
        "webm"                        => Some("webvtt"),
        _                             => None,
    }
}

// What a burned video is saved as: the same container when it takes H.264 and AAC, MP4 otherwise.
pub fn burned_extension(extension: &str) -> &'static str {
    match extension {
        "mov" => "mov",
        "mkv" => "mkv",
        "m4v" => "m4v",
        _     => "mp4",
    }
}

// The ISO 639-2 code of the track's language (players show it as "Español").
pub fn language_tag(code: Option<&str>) -> Option<&'static str> {
    Some(match code? {
        "es" => "spa",
        "en" => "eng",
        "pt" => "por",
        "fr" => "fra",
        "it" => "ita",
        "de" => "deu",
        "ca" => "cat",
        "qu" => "que",
        _    => return None,
    })
}

pub struct EmbedArgs<'a> {
    pub input     : &'a Path,
    pub srt       : &'a Path,
    pub output    : &'a Path,
    pub extension : &'a str,
    pub language  : Option<&'a str>,
}

// Everything copied as it is, plus the phrases as a track, on by default.
pub fn embed_args(params: EmbedArgs) -> Result<Vec<OsString>, String> {
    let codec = track_codec(params.extension).ok_or_else(|| EMBED_UNSUPPORTED.to_string())?;

    let mut args: Vec<OsString> = ["-hide_banner", "-nostdin", "-y", "-i"].map(Into::into).to_vec();
    args.push(params.input.as_os_str().to_owned());
    args.push("-i".into());
    args.push(params.srt.as_os_str().to_owned());
    args.extend(["-map", "0:v", "-map", "0:a?", "-map", "1:0", "-c", "copy", "-c:s", codec, "-disposition:s:0", "default"].map(OsString::from));
    if let Some(tag) = language_tag(params.language) {
        args.push("-metadata:s:s:0".into());
        args.push(format!("language={tag}").into());
    }
    if codec == "mov_text" {
        args.extend(["-movflags", "+faststart"].map(OsString::from));
    }
    args.extend(["-progress", "pipe:1", "-nostats"].map(OsString::from));
    args.push(params.output.as_os_str().to_owned());
    Ok(args)
}

// The size of the letters: by the height of the video, smaller on a narrow (vertical) one so 42
// characters still fit across.
pub fn font_size(width: u32, height: u32) -> u32 {
    let by_height = f64::from(height) * 0.058;
    let by_width  = f64::from(width) * 0.042;
    by_height.min(by_width).round().max(16.0) as u32
}

// "0:01:02.50"
fn ass_time(ms: u64) -> String {
    format!("{}:{:02}:{:02}.{:02}", ms / 3_600_000, ms / 60_000 % 60, ms / 1000 % 60, ms % 1000 / 10)
}

// The phrase as libass reads it: its own line breaks, and none of its override tags.
fn ass_text(text: &str) -> String {
    text.replace('\\', "/").replace('{', "(").replace('}', ")").lines().collect::<Vec<_>>().join("\\N")
}

pub struct AssParams<'a> {
    pub cues       : &'a [Cue],
    pub width      : u32,
    pub height     : u32,
    // «Fondo»: a half-transparent box behind the letters instead of only their border.
    pub background : bool,
}

// White letters with a dark border, at the bottom in the middle (a box behind them with «Fondo»).
pub fn ass_document(params: AssParams) -> String {
    let size    = font_size(params.width, params.height);
    let margin  = (f64::from(params.height) * 0.06).round() as u32;
    let sides   = (f64::from(params.width) * 0.05).round() as u32;
    // BorderStyle 3 draws a box in the border colour (its alpha: 0 is solid, FF clear); 1 is the outline.
    let (border, outline_colour, outline) = if params.background { (3, "&H60000000", (size / 5).max(2)) } else { (1, "&H00000000", (size / 14).max(2)) };

    let mut out = format!(
        "[Script Info]\nScriptType: v4.00+\nPlayResX: {width}\nPlayResY: {height}\nWrapStyle: 2\nScaledBorderAndShadow: yes\n\n\
         [V4+ Styles]\n\
         Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n\
         Style: Glup,Arial,{size},&H00FFFFFF,&H000000FF,{outline_colour},&H80000000,-1,0,0,0,100,100,0,0,{border},{outline},0,2,{sides},{sides},{margin},1\n\n\
         [Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n",
        width = params.width,
        height = params.height,
    );
    for cue in tidy(params.cues) {
        out.push_str(&format!("Dialogue: 0,{},{},Glup,,0,0,0,,{}\n", ass_time(cue.start), ass_time(cue.end), ass_text(&cue.text)));
    }
    out
}

// Where libass finds its letters: the fonts of Windows (the FFmpeg build has no configuration of its own).
pub fn fonts_conf(fonts: &Path, cache: &Path) -> String {
    format!(
        "<?xml version=\"1.0\"?>\n<!DOCTYPE fontconfig SYSTEM \"fonts.dtd\">\n<fontconfig>\n  <dir>{}</dir>\n  <cachedir>{}</cachedir>\n</fontconfig>\n",
        fonts.display(),
        cache.display(),
    )
}

pub struct BurnArgs<'a> {
    pub input       : &'a Path,
    pub output      : &'a Path,
    pub video_bps   : u64,
    // The sound goes as it is when it already is AAC.
    pub audio_codec : Option<&'a str>,
}

// The picture made again with the phrases drawn (h264_mf, as Reducir peso does); run in the folder of
// ASS_NAME.
pub fn burn_args(params: BurnArgs) -> Vec<OsString> {
    let rate = params.video_bps.clamp(MIN_VIDEO_BPS, MAX_VIDEO_BPS).to_string();

    let mut args: Vec<OsString> = ["-hide_banner", "-nostdin", "-y", "-i"].map(Into::into).to_vec();
    args.push(params.input.as_os_str().to_owned());
    args.extend(["-map", "0:v:0", "-map", "0:a:0?", "-vf"].map(OsString::from));
    args.push(format!("ass={ASS_NAME}").into());
    args.extend(["-c:v", "h264_mf", "-b:v"].map(OsString::from));
    args.push(rate.into());
    args.extend(["-pix_fmt", "nv12"].map(OsString::from));
    if params.audio_codec == Some("aac") {
        args.extend(["-c:a", "copy"].map(OsString::from));
    } else {
        args.extend(["-c:a", "aac", "-b:a", "192k"].map(OsString::from));
    }
    args.extend(["-movflags", "+faststart", "-progress", "pipe:1", "-nostats"].map(OsString::from));
    args.push(params.output.as_os_str().to_owned());
    args
}
