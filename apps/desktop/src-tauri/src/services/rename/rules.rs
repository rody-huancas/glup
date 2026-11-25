// The rules of "Renombrar en lote", applied in order to the name without its extension. The extension
// is never touched (only made lower case, when asked). Pure.
use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Side {
    Start,
    #[default]
    End,
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Case {
    #[default]
    Lower,
    Upper,
    // «Tipo oración»: the first letter in capital, the rest small.
    Sentence,
}

#[derive(Clone, Debug, PartialEq, Eq, Deserialize, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum Rule {
    // «Viaje {n}»: {n} is the number (without it, it goes at the end).
    #[serde(rename_all = "camelCase")]
    Number { text: String, digits: u32, start: i64, step: i64 },
    #[serde(rename_all = "camelCase")]
    Replace { find: String, with: String, case_sensitive: bool },
    Add { text: String, side: Side },
    // Every one of these characters.
    #[serde(rename_all = "camelCase")]
    RemoveChars { chars: String },
    // `count` characters from `from` (1 is the first; from the end when `from_end`).
    #[serde(rename_all = "camelCase")]
    RemoveRange { from: usize, count: usize, from_end: bool },
    Case { case: Case },
    // The date of the photo or of the file ("YYYY-MM-DD", "DD-MM-YYYY", "YYYYMMDD", "YYYY-MM-DD HH.mm").
    #[serde(rename_all = "camelCase")]
    Date { format: String, side: Side, separator: String },
}

// What a file brings to the rules: its place in the order and its date.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct Moment {
    pub year   : i32,
    pub month  : u32,
    pub day    : u32,
    pub hour   : u32,
    pub minute : u32,
}

pub fn format_date(moment: Moment, format: &str) -> String {
    format
        .replace("YYYY", &format!("{:04}", moment.year))
        .replace("MM", &format!("{:02}", moment.month))
        .replace("DD", &format!("{:02}", moment.day))
        .replace("HH", &format!("{:02}", moment.hour))
        .replace("mm", &format!("{:02}", moment.minute))
}

// "2026:11:25 14:30:00" (EXIF) to its parts.
pub fn parse_exif_date(text: &str) -> Option<Moment> {
    let (date, time) = text.trim().split_once(' ').unwrap_or((text.trim(), "00:00:00"));
    let parts: Vec<u32> = date.split([':', '-']).filter_map(|part| part.parse().ok()).collect();
    let clock: Vec<u32> = time.split(':').filter_map(|part| part.parse().ok()).collect();
    let [year, month, day] = parts[..] else { return None };
    (year > 1900 && (1..=12).contains(&month) && (1..=31).contains(&day)).then(|| Moment { year: year as i32, month, day, hour: clock.first().copied().unwrap_or(0), minute: clock.get(1).copied().unwrap_or(0) })
}

fn replace_any_case(text: &str, find: &str, with: &str) -> String {
    let lower = text.to_lowercase();
    let wanted = find.to_lowercase();
    if wanted.is_empty() || lower.len() != text.len() {
        // Letters that change length in lower case: compare char by char instead.
        return replace_chars_any_case(text, find, with);
    }
    let mut out  = String::new();
    let mut last = 0;
    for (at, _) in lower.match_indices(&wanted) {
        out.push_str(&text[last..at]);
        out.push_str(with);
        last = at + wanted.len();
    }
    out.push_str(&text[last..]);
    out
}

fn replace_chars_any_case(text: &str, find: &str, with: &str) -> String {
    let source: Vec<char> = text.chars().collect();
    let wanted: Vec<char> = find.chars().flat_map(char::to_lowercase).collect();
    if wanted.is_empty() {
        return text.to_string();
    }
    let mut out = String::new();
    let mut at  = 0;
    while at < source.len() {
        let window: Vec<char> = source[at..].iter().take(wanted.len()).flat_map(|character| character.to_lowercase()).collect();
        if window == wanted {
            out.push_str(with);
            at += wanted.len();
        } else {
            out.push(source[at]);
            at += 1;
        }
    }
    out
}

fn sentence(text: &str) -> String {
    let lower = text.to_lowercase();
    let mut chars = lower.chars();
    match chars.next() {
        Some(first) => first.to_uppercase().chain(chars).collect(),
        None        => String::new(),
    }
}

// One rule on the name (without extension). `index` is the place of the file in the order (0 first).
pub fn apply(rule: &Rule, name: &str, index: usize, moment: Moment) -> String {
    match rule {
        Rule::Number { text, digits, start, step } => {
            let number = start + step * index as i64;
            let padded = if number < 0 { format!("-{:0width$}", -number, width = *digits as usize) } else { format!("{number:0width$}", width = *digits as usize) };
            if text.contains("{n}") { text.replace("{n}", &padded) } else if text.is_empty() { padded } else { format!("{text} {padded}") }
        }
        Rule::Replace { find, with, case_sensitive } if !find.is_empty() => {
            if *case_sensitive { name.replace(find.as_str(), with) } else { replace_any_case(name, find, with) }
        }
        Rule::Replace { .. } => name.to_string(),
        Rule::Add { text, side: Side::Start } => format!("{text}{name}"),
        Rule::Add { text, side: Side::End }   => format!("{name}{text}"),
        Rule::RemoveChars { chars } => name.chars().filter(|character| !chars.contains(*character)).collect(),
        Rule::RemoveRange { from, count, from_end } => {
            let letters: Vec<char> = name.chars().collect();
            let length = letters.len();
            let start  = from.saturating_sub(1).min(length);
            let (begin, end) = if *from_end { (length.saturating_sub(start + count), length.saturating_sub(start)) } else { (start, (start + count).min(length)) };
            letters[..begin].iter().chain(&letters[end..]).collect()
        }
        Rule::Case { case: Case::Lower }    => name.to_lowercase(),
        Rule::Case { case: Case::Upper }    => name.to_uppercase(),
        Rule::Case { case: Case::Sentence } => sentence(name),
        Rule::Date { format, side, separator } => {
            let date = format_date(moment, format);
            match side {
                Side::Start => format!("{date}{separator}{name}"),
                Side::End   => format!("{name}{separator}{date}"),
            }
        }
    }
}

// The name and its extension ("foto.final.JPG" → "foto.final", "JPG"); a name that starts with a dot
// has no extension.
pub fn split_name(file: &str) -> (&str, Option<&str>) {
    match file.rfind('.') {
        Some(at) if at > 0 => (&file[..at], Some(&file[at + 1..])),
        _                  => (file, None),
    }
}

pub struct NameParams<'a> {
    pub file      : &'a str,
    pub rules     : &'a [Rule],
    pub index     : usize,
    pub moment    : Moment,
    pub lower_ext : bool,
}

// Every rule in order on the name, the extension put back as it was (or in lower case).
pub fn new_name(params: NameParams) -> String {
    let (stem, extension) = split_name(params.file);
    let stem = params.rules.iter().fold(stem.to_string(), |name, rule| apply(rule, &name, params.index, params.moment));
    match extension {
        Some(extension) => format!("{stem}.{}", if params.lower_ext { extension.to_lowercase() } else { extension.to_string() }),
        None            => stem,
    }
}
