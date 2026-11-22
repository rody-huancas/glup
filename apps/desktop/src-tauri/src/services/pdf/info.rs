use std::path::Path;

use lopdf::Document;

pub struct PdfInfo {
    pub pages: u32,
    // Needs a password to open; an empty user password (only restrictions) is not protected.
    pub protected: bool,
}

// Reads the trailer, the xref and the page tree only; objects and streams are not parsed.
pub fn read(path: &Path) -> Option<PdfInfo> {
    let metadata = Document::load_metadata(path).ok()?;

    Some(PdfInfo {
        pages     : metadata.page_count,
        protected : metadata.encrypted && metadata.page_count == 0,
    })
}
