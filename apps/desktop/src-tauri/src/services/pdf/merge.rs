use std::path::Path;

use crate::services::{
    image::{to_pdf::PdfBuilder, SourceFormat},
    pdf::{assemble, load, load_bytes, PagePick, PdfResult},
};

// A PDF keeps all its pages; an image becomes an A4 page, like "A PDF".
pub fn pick(path: &Path) -> PdfResult<PagePick> {
    if SourceFormat::from_path(path).is_some() {
        let mut builder = PdfBuilder::new();
        builder.add_image(path)?;
        return Ok(PagePick::all(load_bytes(&builder.finish()?)?));
    }

    Ok(PagePick::all(load(path)?))
}

pub fn page_count(picks: &[PagePick]) -> usize {
    picks.iter().map(|pick| pick.pages.len()).sum()
}

// All the picked files, one after another, in a single PDF.
pub fn merge(picks: Vec<PagePick>) -> PdfResult<Vec<u8>> {
    assemble(picks)
}
