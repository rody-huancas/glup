use lopdf::Document;

use crate::services::pdf::{assemble, PagePick, PdfResult};

// Longer names fall back to "<name>-seleccion".
pub const MAX_SELECTION_NAME: usize = 60;

pub const PAGES_SUFFIX: &str     = "paginas";
pub const SELECTION_SUFFIX: &str = "seleccion";

// One page as its own PDF.
pub fn extract_page(document: &Document, page: u32) -> PdfResult<Vec<u8>> {
    assemble(vec![PagePick { document: document.clone(), pages: vec![page] }])
}

// The chosen pages, in the order given, as one PDF.
pub fn extract_pages(document: Document, pages: Vec<u32>) -> PdfResult<Vec<u8>> {
    assemble(vec![PagePick { document, pages }])
}

// "contrato-p01" … two digits at least, more when the document needs them.
pub fn page_stem(stem: &str, page: u32, total: u32) -> String {
    let digits = total.to_string().len().max(2);
    format!("{stem}-p{page:0digits$}")
}

// [1, 2, 3, 5, 8, 9, 10] → "1-3-5-8-10": consecutive runs joined by their ends.
pub fn ranges_label(pages: &[u32]) -> String {
    let mut parts: Vec<String> = Vec::new();
    let mut index              = 0;

    while index < pages.len() {
        let start = pages[index];
        let mut end = start;

        while index + 1 < pages.len() && pages[index + 1] == end + 1 {
            index += 1;
            end    = pages[index];
        }

        parts.push(if start == end { start.to_string() } else { format!("{start}-{end}") });
        index += 1;
    }

    parts.join("-")
}

// "contrato-paginas-1-3-5-8-10", or "contrato-seleccion" when that gets too long.
pub fn selection_stem(stem: &str, pages: &[u32]) -> String {
    let name = format!("{stem}-{PAGES_SUFFIX}-{}", ranges_label(pages));

    if name.chars().count() > MAX_SELECTION_NAME {
        format!("{stem}-{SELECTION_SUFFIX}")
    } else {
        name
    }
}
