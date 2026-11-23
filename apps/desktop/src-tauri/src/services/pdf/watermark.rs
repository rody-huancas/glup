use lopdf::Document;
use serde::Deserialize;

use crate::services::pdf::{
    save,
    sign::PageBox,
    stamp::{stamp_pages, text_matrix, text_width, ShownText, StampFont, StampParams, StampText, CAP_HEIGHT},
    PdfResult,
};

pub const WATERMARK_SUFFIX: &str = "marca";
pub const EMPTY_TEXT: &str       = "Escribe el texto de la marca de agua";
pub const MAX_TEXT: usize        = 40;

// Mid gray: readable on white and on dark photos.
const GRAY: f32          = 0.5;
// Space between the corner text and the edges of the page, in points.
const CORNER_MARGIN: f32  = 28.0;

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum WatermarkSize {
    Small,
    #[default]
    Medium,
    Large,
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum WatermarkOpacity {
    Soft,
    #[default]
    Medium,
    Strong,
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum WatermarkPosition {
    // Across the page, from the bottom-left towards the top-right corner.
    #[default]
    Diagonal,
    // Small, at the bottom-right corner.
    Corner,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WatermarkOptions {
    pub text     : String,
    #[serde(default)]
    pub size     : WatermarkSize,
    #[serde(default)]
    pub opacity  : WatermarkOpacity,
    #[serde(default)]
    pub position : WatermarkPosition,
}

impl WatermarkOpacity {
    pub fn alpha(self) -> f32 {
        match self {
            WatermarkOpacity::Soft   => 0.15,
            WatermarkOpacity::Medium => 0.3,
            WatermarkOpacity::Strong => 0.5,
        }
    }
}

impl WatermarkSize {
    // Diagonal: how much of the diagonal the text spans.
    fn diagonal_share(self) -> f32 {
        match self {
            WatermarkSize::Small  => 0.45,
            WatermarkSize::Medium => 0.65,
            WatermarkSize::Large  => 0.85,
        }
    }

    // Corner: the font size in points.
    fn corner_size(self) -> f32 {
        match self {
            WatermarkSize::Small  => 12.0,
            WatermarkSize::Medium => 18.0,
            WatermarkSize::Large  => 26.0,
        }
    }
}

// Trimmed and one line; too long a text is cut.
pub fn clean_text(text: &str) -> String {
    text.split_whitespace().collect::<Vec<_>>().join(" ").chars().take(MAX_TEXT).collect()
}

// Where the text goes on one page and how big, from the size of the page as shown.
pub fn place(options: &WatermarkOptions, page: &PageBox, text: &str) -> StampText {
    let (width, height) = page.displayed();
    let unit            = text_width(text, StampFont::Bold, 1.0).max(f32::EPSILON);

    let (size, shown) = match options.position {
        WatermarkPosition::Diagonal => {
            let angle    = height.atan2(width);
            let diagonal = width.hypot(height);
            // Never taller than a third of the shorter side, for very short texts.
            let size     = (diagonal * options.size.diagonal_share() / unit).min(width.min(height) / 3.0);
            let half     = unit * size / 2.0;
            let lift     = CAP_HEIGHT * size / 2000.0;
            // From the center, half the text back along the baseline and half the letter height down.
            let x        = width / 2.0 - half * angle.cos() + lift * angle.sin();
            let y        = height / 2.0 + half * angle.sin() + lift * angle.cos();
            (size, ShownText { x, y, angle })
        }
        WatermarkPosition::Corner => {
            let size = options.size.corner_size();
            let x    = width - CORNER_MARGIN - unit * size;
            let y    = height - CORNER_MARGIN;
            (size, ShownText { x, y, angle: 0.0 })
        }
    };

    StampText { text: text.to_string(), size, matrix: text_matrix(page, shown), gray: GRAY }
}

// The same text on every page, on top of the content.
pub fn watermark(mut document: Document, options: &WatermarkOptions) -> PdfResult<Vec<u8>> {
    let text = clean_text(&options.text);
    if text.is_empty() {
        return Err(EMPTY_TEXT.to_string());
    }

    let draw = |_: u32, page: &PageBox| Some(place(options, page, &text));
    stamp_pages(&mut document, StampParams { font: StampFont::Bold, opacity: options.opacity.alpha(), draw: &draw })?;
    save(&mut document)
}
