// "Sacar el audio": the sound of a video as MP3 (LAME, LGPL, in the same FFmpeg), M4A (AAC) or WAV.
// When the sound is already what was asked for (AAC into M4A, MP3 into MP3, PCM into WAV) it is
// copied as it is: faster, and nothing is lost.
use std::{ffi::OsString, path::Path};

use serde::Deserialize;

pub const NO_SOUND: &str = "Este video no tiene sonido";

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AudioFormat {
    #[default]
    Mp3,
    M4a,
    Wav,
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AudioQuality {
    #[default]
    Normal,
    High,
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtractOptions {
    pub format  : AudioFormat,
    pub quality : AudioQuality,
}

pub fn extension(format: AudioFormat) -> &'static str {
    match format {
        AudioFormat::Mp3 => "mp3",
        AudioFormat::M4a => "m4a",
        AudioFormat::Wav => "wav",
    }
}

// The sound can go as it is into that format.
pub fn can_copy(format: AudioFormat, codec: &str) -> bool {
    match format {
        AudioFormat::Mp3 => codec == "mp3",
        AudioFormat::M4a => codec == "aac" || codec == "alac",
        AudioFormat::Wav => codec == "pcm_s16le",
    }
}

fn encoder(options: ExtractOptions) -> Vec<&'static str> {
    let high = options.quality == AudioQuality::High;
    match options.format {
        // VBR: about 245 kb/s (Alta) or 175 kb/s (Normal).
        AudioFormat::Mp3 => vec!["-c:a", "libmp3lame", "-q:a", if high { "0" } else { "2" }],
        AudioFormat::M4a => vec!["-c:a", "aac", "-b:a", if high { "256k" } else { "160k" }],
        AudioFormat::Wav => vec!["-c:a", "pcm_s16le"],
    }
}

pub struct ExtractArgs<'a> {
    pub input   : &'a Path,
    pub output  : &'a Path,
    pub options : ExtractOptions,
    // The codec of the video's sound (None: unknown, it is made again).
    pub codec   : Option<&'a str>,
}

// Only the first sound track, no picture, no subtitles; progress on stdout.
pub fn extract_args(params: ExtractArgs) -> (Vec<OsString>, bool) {
    let copy = params.codec.is_some_and(|codec| can_copy(params.options.format, codec));

    let mut args: Vec<OsString> = ["-hide_banner", "-nostdin", "-y", "-i"].map(Into::into).to_vec();
    args.push(params.input.as_os_str().to_owned());
    args.extend(["-map", "0:a:0", "-vn", "-sn", "-dn"].map(OsString::from));
    if copy {
        args.extend(["-c:a", "copy"].map(OsString::from));
    } else {
        args.extend(encoder(params.options).into_iter().map(OsString::from));
    }
    if params.options.format == AudioFormat::M4a {
        args.extend(["-movflags", "+faststart"].map(OsString::from));
    }
    args.extend(["-progress", "pipe:1", "-nostats"].map(OsString::from));
    args.push(params.output.as_os_str().to_owned());
    (args, copy)
}
