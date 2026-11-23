// "Sacar texto": how the text read from each file and page is put together, and the .txt name. Pure.
use serde::Deserialize;

// A line found by the OCR: its text and where it is (top edge and height, in pixels).
#[derive(Clone, Debug, PartialEq)]
pub struct LineBox {
    pub text   : String,
    pub top    : f32,
    pub height : f32,
}

// The text of one page of a PDF, or of a whole image (page None).
#[derive(Clone, Debug, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PageText {
    pub page : Option<u32>,
    pub text : String,
}

#[derive(Clone, Debug, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileText {
    // The file's name, shown as a title when there are several.
    pub name  : String,
    pub pages : Vec<PageText>,
}

// A gap between two lines larger than this share of the line height starts a new paragraph.
pub const PARAGRAPH_GAP: f32 = 0.8;

// The lines in reading order, one per row, with a blank line where the gap says a paragraph ends.
pub fn join_lines(lines: &[LineBox]) -> String {
    let mut text                       = String::new();
    let mut previous: Option<&LineBox> = None;

    for line in lines.iter().filter(|line| !line.text.trim().is_empty()) {
        if let Some(before) = previous {
            let gap    = line.top - (before.top + before.height);
            let height = before.height.max(line.height).max(1.0);
            text.push_str(if gap > height * PARAGRAPH_GAP { "\n\n" } else { "\n" });
        }
        text.push_str(line.text.trim());
        previous = Some(line);
    }

    text
}

fn has_text(text: &str) -> bool {
    text.chars().any(char::is_alphanumeric)
}

// Pages (and images) with something written in them.
pub fn pages_with_text(files: &[FileText]) -> u32 {
    files.iter().flat_map(|file| &file.pages).filter(|page| has_text(&page.text)).count() as u32
}

// Pages and images read, with text or not ("Texto sacado · 3 páginas").
pub fn pages_read(files: &[FileText]) -> u32 {
    files.iter().map(|file| file.pages.len() as u32).sum()
}

fn compose_pages(file: &FileText) -> String {
    let several = file.pages.len() > 1 || file.pages.iter().any(|page| page.page.is_some());

    file.pages
        .iter()
        .filter(|page| has_text(&page.text))
        .map(|page| match (several, page.page) {
            (true, Some(number)) => format!("Página {number}\n\n{}", page.text.trim()),
            _                    => page.text.trim().to_string(),
        })
        .collect::<Vec<_>>()
        .join("\n\n")
}

// One file: its text (by "Página N" for PDFs). Several: each one under its name as a title.
// Files and pages with nothing written are left out.
pub fn compose(files: &[FileText]) -> String {
    let parts: Vec<(String, String)> = files.iter().map(|file| (file.name.clone(), compose_pages(file))).filter(|(_, text)| !text.is_empty()).collect();

    match parts.as_slice() {
        [] => String::new(),
        [(_, text)] if files.len() == 1 => text.clone(),
        _ => parts.iter().map(|(name, text)| format!("{name}\n{}\n\n{text}", "=".repeat(name.chars().count()))).collect::<Vec<_>>().join("\n\n\n"),
    }
}

// "Texto sacado · 3 páginas".
pub fn history_detail(pages: u32) -> String {
    format!("Texto sacado · {pages} {}", if pages == 1 { "página" } else { "páginas" })
}

// Windows line ends, so the .txt opens right in any editor.
pub fn to_windows_lines(text: &str) -> String {
    text.replace("\r\n", "\n").replace('\n', "\r\n")
}
