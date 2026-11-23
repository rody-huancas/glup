use lopdf::Document;
use serde::Deserialize;

use crate::services::pdf::{
    save,
    sign::PageBox,
    stamp::{stamp_pages, text_matrix, text_width, ShownText, StampFont, StampParams, StampText},
    PdfResult,
};

pub const NUMBERED_SUFFIX: &str = "numerado";
pub const NUMBERING_ERROR: &str = "Desde esa página no queda nada que numerar";

const FONT_SIZE: f32 = 10.0;
// From the edges of the page to the number, in points.
const MARGIN: f32    = 28.0;

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum NumberPosition {
    #[default]
    BottomCenter,
    BottomRight,
    TopRight,
}

// "1", "Página 1" or "1 de 12".
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum NumberFormat {
    #[default]
    Number,
    Page,
    OfTotal,
}

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NumberingOptions {
    #[serde(default)]
    pub position     : NumberPosition,
    #[serde(default)]
    pub format       : NumberFormat,
    // The first page that gets a number (1-based); the ones before it (a cover) stay as they are.
    pub start_page   : u32,
    // The number written on that page.
    pub first_number : u32,
}

pub struct LabelParams {
    pub format : NumberFormat,
    pub number : u32,
    pub last   : u32,
}

// The number a page shows, or None for the pages before the first one numbered.
pub fn number_of(options: &NumberingOptions, page: u32) -> Option<u32> {
    (page >= options.start_page).then(|| options.first_number + (page - options.start_page))
}

pub fn label(params: LabelParams) -> String {
    match params.format {
        NumberFormat::Number  => params.number.to_string(),
        NumberFormat::Page    => format!("Página {}", params.number),
        NumberFormat::OfTotal => format!("{} de {}", params.number, params.last),
    }
}

pub fn is_valid(options: &NumberingOptions, total: u32) -> bool {
    options.start_page >= 1 && options.start_page <= total && options.first_number >= 1
}

// Where the number goes on a page as shown: baseline start, upright.
pub fn place(position: NumberPosition, page: &PageBox, text: &str) -> StampText {
    let (width, height) = page.displayed();
    let length          = text_width(text, StampFont::Regular, FONT_SIZE);

    let (x, y) = match position {
        NumberPosition::BottomCenter => ((width - length) / 2.0, height - MARGIN),
        NumberPosition::BottomRight  => (width - MARGIN - length, height - MARGIN),
        NumberPosition::TopRight     => (width - MARGIN - length, MARGIN + FONT_SIZE),
    };

    StampText { text: text.to_string(), size: FONT_SIZE, matrix: text_matrix(page, ShownText { x, y, angle: 0.0 }), gray: 0.0 }
}

// Returns the PDF and how many pages got a number.
pub fn number_pages(mut document: Document, options: &NumberingOptions) -> PdfResult<(Vec<u8>, u32)> {
    let total = document.get_pages().len() as u32;
    if !is_valid(options, total) {
        return Err(NUMBERING_ERROR.to_string());
    }

    let last = options.first_number + (total - options.start_page);
    let draw = |page: u32, geometry: &PageBox| {
        let number = number_of(options, page)?;
        Some(place(options.position, geometry, &label(LabelParams { format: options.format, number, last })))
    };

    let stamped = stamp_pages(&mut document, StampParams { font: StampFont::Regular, opacity: 1.0, draw: &draw })?;
    Ok((save(&mut document)?, stamped))
}
