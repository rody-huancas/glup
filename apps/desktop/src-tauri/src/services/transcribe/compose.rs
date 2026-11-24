// "Pasar audio a texto": the text with paragraphs and the subtitles, made from Whisper's segments. Pure.
use serde::{Deserialize, Serialize};

// A piece of speech with its time, in milliseconds from the start of the file.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Segment {
    pub start : u64,
    pub end   : u64,
    pub text  : String,
}

// The segments of one file.
#[derive(Clone, Debug, PartialEq)]
pub struct FileSegments {
    pub name     : String,
    pub segments : Vec<Segment>,
}

// A silence this long starts a new paragraph…
pub const PARAGRAPH_PAUSE_MS: u64 = 1500;
// …and so does a sentence ending once the paragraph is this long.
pub const PARAGRAPH_CHARS: usize = 500;

// What Whisper writes when there is no speech ("[Música]", "(risas)", "♪"): not words.
pub fn is_noise(text: &str) -> bool {
    let clean = text.trim();
    clean.is_empty()
        || (clean.starts_with('[') && clean.ends_with(']'))
        || (clean.starts_with('(') && clean.ends_with(')'))
        || !clean.chars().any(char::is_alphanumeric)
}

pub fn spoken(segments: &[Segment]) -> Vec<&Segment> {
    segments.iter().filter(|segment| !is_noise(&segment.text)).collect()
}

// The words in paragraphs: a new one after a long pause, or at a sentence end once it grew long.
pub fn paragraphs(segments: &[Segment]) -> String {
    let mut text                   = String::new();
    let mut paragraph_length       = 0;
    let mut previous: Option<&Segment> = None;

    for segment in spoken(segments) {
        let words = segment.text.trim();

        if let Some(before) = previous {
            let pause = segment.start.saturating_sub(before.end) >= PARAGRAPH_PAUSE_MS;
            let ended = before.text.trim_end().ends_with(['.', '?', '!', '…']);
            if pause || (ended && paragraph_length >= PARAGRAPH_CHARS) {
                text.push_str("\n\n");
                paragraph_length = 0;
            } else {
                text.push(' ');
            }
        }

        text.push_str(words);
        paragraph_length += words.chars().count();
        previous = Some(segment);
    }

    text
}

// Several files: each one under its name as a title (the same style as "Sacar texto").
pub fn compose(files: &[FileSegments]) -> String {
    let parts: Vec<(String, String)> = files.iter().map(|file| (file.name.clone(), paragraphs(&file.segments))).filter(|(_, text)| !text.is_empty()).collect();

    match parts.as_slice() {
        [] => String::new(),
        [(_, text)] if files.len() == 1 => text.clone(),
        _ => parts.iter().map(|(name, text)| format!("{name}\n{}\n\n{text}", "=".repeat(name.chars().count()))).collect::<Vec<_>>().join("\n\n\n"),
    }
}

// "00:01:02,500"
pub fn srt_time(ms: u64) -> String {
    format!("{:02}:{:02}:{:02},{:03}", ms / 3_600_000, ms / 60_000 % 60, ms / 1000 % 60, ms % 1000)
}

// SubRip: numbered cues with their times. Several files are laid one after the other, each starting
// where the previous one ended, so the subtitles follow them played in a row.
pub fn srt(files: &[FileSegments]) -> String {
    let mut out    = String::new();
    let mut index  = 0;
    let mut offset = 0;

    for file in files {
        for segment in spoken(&file.segments) {
            index += 1;
            out.push_str(&format!("{index}\n{} --> {}\n{}\n\n", srt_time(offset + segment.start), srt_time(offset + segment.end), segment.text.trim()));
        }
        offset += file.segments.last().map(|segment| segment.end).unwrap_or(0);
    }

    out
}

// "3 min 20 s", "45 s", "1 h 05 min".
pub fn duration_label(seconds: f64) -> String {
    let total = seconds.round() as u64;
    let (hours, minutes, rest) = (total / 3600, total / 60 % 60, total % 60);

    match (hours, minutes) {
        (0, 0) => format!("{rest} s"),
        (0, _) if rest == 0 => format!("{minutes} min"),
        (0, _) => format!("{minutes} min {rest} s"),
        _ => format!("{hours} h {minutes:02} min"),
    }
}

// "Audio pasado a texto · 3 min 20 s".
pub fn history_detail(seconds: f64) -> String {
    format!("Audio pasado a texto · {}", duration_label(seconds))
}
