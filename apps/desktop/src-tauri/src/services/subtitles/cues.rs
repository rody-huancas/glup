// The phrases of the subtitles, made short and readable from what Whisper heard: at most two lines of
// about 42 characters and about 6 seconds on screen. SubRip (.srt) written and read back. Pure.
use serde::{Deserialize, Serialize};

use crate::services::transcribe::compose::{spoken, srt_time, Segment};

pub const LINE_CHARS: usize = 42;
pub const MAX_LINES: usize  = 2;
pub const MAX_CHARS: usize  = LINE_CHARS * MAX_LINES;
pub const MAX_MS: u64       = 6000;

// One phrase on screen, in milliseconds from the start of the video.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Cue {
    pub start : u64,
    pub end   : u64,
    pub text  : String,
}

fn chars(text: &str) -> usize {
    text.chars().count()
}

// The words in `count` pieces of about the same length, none longer than MAX_CHARS (a single word longer
// than that goes alone). A piece prefers to end after a comma or a period once it is long enough.
fn pieces(words: &[&str], count: usize) -> Vec<String> {
    let total  = words.iter().map(|word| chars(word) + 1).sum::<usize>();
    let target = total.div_ceil(count.max(1));

    let mut out: Vec<String> = Vec::new();
    let mut current           = String::new();
    for word in words {
        let length = chars(&current);
        let full   = length > 0 && length + 1 + chars(word) > MAX_CHARS;
        let ended  = length >= target * 3 / 5 && current.ends_with([',', '.', '?', '!', ';', ':', '…']);
        let enough = length >= target && out.len() + 1 < count;
        if full || ((ended || enough) && length > 0) {
            out.push(std::mem::take(&mut current));
        }
        if !current.is_empty() {
            current.push(' ');
        }
        current.push_str(word);
    }
    if !current.is_empty() {
        out.push(current);
    }
    out
}

// One segment of Whisper into one or more phrases, the time shared by their length.
fn split_segment(segment: &Segment) -> Vec<Cue> {
    let text     = segment.text.split_whitespace().collect::<Vec<_>>();
    let joined   = text.join(" ");
    let duration = segment.end.saturating_sub(segment.start);
    if chars(&joined) <= MAX_CHARS && duration <= MAX_MS {
        return vec![Cue { start: segment.start, end: segment.end, text: joined }];
    }

    let count  = chars(&joined).div_ceil(MAX_CHARS).max(duration.div_ceil(MAX_MS) as usize).max(1);
    let parts  = pieces(&text, count);
    let total  = parts.iter().map(|part| chars(part) + 1).sum::<usize>().max(1) as u64;
    let mut at = 0u64;
    parts
        .into_iter()
        .map(|part| {
            let start = segment.start + duration * at / total;
            at       += chars(&part) as u64 + 1;
            let end   = (segment.start + duration * at / total).min(start + MAX_MS);
            Cue { start, end, text: part }
        })
        .collect()
}

// Whisper's segments (its noise, like "[Música]", left out) into phrases, each in its lines.
pub fn build(segments: &[Segment]) -> Vec<Cue> {
    spoken(segments)
        .into_iter()
        .flat_map(split_segment)
        .filter(|cue| !cue.text.is_empty())
        .map(|cue| Cue { text: wrap(&cue.text), ..cue })
        .collect()
}

// Lines of at most LINE_CHARS: two about the same length when it fits, otherwise filled one after another.
pub fn wrap(text: &str) -> String {
    let words: Vec<&str> = text.split_whitespace().collect();
    let joined           = words.join(" ");
    if chars(&joined) <= LINE_CHARS {
        return joined;
    }

    // The space that leaves both lines the most even.
    let best = (1..words.len())
        .map(|cut| (words[..cut].join(" "), words[cut..].join(" ")))
        .filter(|(left, right)| chars(left) <= LINE_CHARS && chars(right) <= LINE_CHARS)
        .min_by_key(|(left, right)| chars(left).abs_diff(chars(right)));
    if let Some((left, right)) = best {
        return format!("{left}\n{right}");
    }

    let mut lines: Vec<String> = Vec::new();
    for word in words {
        match lines.last_mut() {
            Some(line) if chars(line) + 1 + chars(word) <= LINE_CHARS => {
                line.push(' ');
                line.push_str(word);
            }
            _ => lines.push(word.to_string()),
        }
    }
    lines.join("\n")
}

// What was typed: kept as it is when its lines already fit, made into lines again otherwise.
pub fn fit(text: &str) -> String {
    let lines: Vec<&str> = text.lines().map(str::trim).filter(|line| !line.is_empty()).collect();
    if lines.len() <= MAX_LINES && lines.iter().all(|line| chars(line) <= LINE_CHARS) {
        return lines.join("\n");
    }
    wrap(&lines.join(" "))
}

// The phrases in order, none empty, each at least a tenth of a second long.
pub fn tidy(cues: &[Cue]) -> Vec<Cue> {
    let mut out: Vec<Cue> = cues.iter().filter(|cue| !cue.text.trim().is_empty()).map(|cue| Cue { end: cue.end.max(cue.start + 100), text: fit(&cue.text), ..cue.clone() }).collect();
    out.sort_by_key(|cue| cue.start);
    out
}

// SubRip: numbered phrases with their times.
pub fn to_srt(cues: &[Cue]) -> String {
    tidy(cues).iter().enumerate().map(|(index, cue)| format!("{}\n{} --> {}\n{}\n\n", index + 1, srt_time(cue.start), srt_time(cue.end), cue.text)).collect()
}
