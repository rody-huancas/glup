// Text drawn on top of every page (watermark, page numbers), upright as the page is shown whatever
// its rotation and box offset, in one of the 14 standard fonts (nothing is embedded).
use lopdf::{dictionary, Dictionary, Document, Object, ObjectId, Stream};

use crate::services::pdf::{
    own_inherited,
    sign::{page_box, pdf_string, PageBox},
    PdfResult, PDF_WRITE_ERROR,
};

const FONT_NAME: &str  = "GlupStamp";
const STATE_NAME: &str = "GlupStampGs";

// Glyph widths in 1/1000 em for the printable ASCII range (32..=126), from the standard AFM files.
const HELVETICA_WIDTHS: [u16; 95] = [
    278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
    556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
    1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
    667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
    333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
    556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];

const HELVETICA_BOLD_WIDTHS: [u16; 95] = [
    278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278,
    556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611,
    975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778,
    667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556,
    333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611,
    611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584,
];

// Capital letters are this tall (1/1000 em), to center text vertically.
pub const CAP_HEIGHT: f32 = 718.0;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum StampFont {
    Regular,
    Bold,
}

impl StampFont {
    fn base_font(self) -> &'static str {
        match self {
            StampFont::Regular => "Helvetica",
            StampFont::Bold    => "Helvetica-Bold",
        }
    }

    fn widths(self) -> &'static [u16; 95] {
        match self {
            StampFont::Regular => &HELVETICA_WIDTHS,
            StampFont::Bold    => &HELVETICA_BOLD_WIDTHS,
        }
    }
}

// Accented letters are as wide as their base letter in Helvetica.
fn base_letter(character: char) -> char {
    match character {
        'á' | 'à' | 'â' | 'ä' | 'ã' | 'å' => 'a',
        'é' | 'è' | 'ê' | 'ë'             => 'e',
        'í' | 'ì' | 'î' | 'ï'             => 'i',
        'ó' | 'ò' | 'ô' | 'ö' | 'õ'       => 'o',
        'ú' | 'ù' | 'û' | 'ü'             => 'u',
        'ñ'                               => 'n',
        'Á' | 'À' | 'Â' | 'Ä' | 'Ã' | 'Å' => 'A',
        'É' | 'È' | 'Ê' | 'Ë'             => 'E',
        'Í' | 'Ì' | 'Î' | 'Ï'             => 'I',
        'Ó' | 'Ò' | 'Ô' | 'Ö' | 'Õ'       => 'O',
        'Ú' | 'Ù' | 'Û' | 'Ü'             => 'U',
        'Ñ'                               => 'N',
        // What WinAnsi cannot show is drawn as "?".
        _ if (character as u32) > 0xFF    => '?',
        _                                 => character,
    }
}

// Width of a text in points at a font size.
pub fn text_width(text: &str, font: StampFont, size: f32) -> f32 {
    let units: u32 = text
        .chars()
        .map(|character| {
            let code = base_letter(character) as u32;
            if (32..=126).contains(&code) { u32::from(font.widths()[(code - 32) as usize]) } else { 556 }
        })
        .sum();

    units as f32 * size / 1000.0
}

// A line of text placed in the page as shown (points from the top-left corner, y down). `angle` turns
// it counterclockwise as seen, in radians.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct ShownText {
    pub x     : f32,
    pub y     : f32,
    pub angle : f32,
}

// The text matrix (Tm) that draws a baseline starting at `place`, upright as shown, on that page.
pub fn text_matrix(page: &PageBox, place: ShownText) -> [f32; 6] {
    let (cos, sin) = (place.angle.cos(), place.angle.sin());
    // Along the baseline and towards the top of the letters, in shown coordinates (y grows down).
    let along = (cos, -sin);
    let up    = (-sin, -cos);

    let origin = page.to_pdf(place.x, place.y);
    let right  = page.to_pdf(place.x + along.0, place.y + along.1);
    let top    = page.to_pdf(place.x + up.0, place.y + up.1);

    [right.0 - origin.0, right.1 - origin.1, top.0 - origin.0, top.1 - origin.1, origin.0, origin.1]
}

pub struct StampText {
    pub text   : String,
    pub size   : f32,
    pub matrix : [f32; 6],
    // 0 black … 1 white.
    pub gray   : f32,
}

pub struct StampParams<'a> {
    pub font    : StampFont,
    // Fill opacity, 0 to 1 (1 is solid).
    pub opacity : f32,
    // What to draw on each page, given its number (1-based) and its box. None leaves the page alone.
    pub draw    : &'a dyn Fn(u32, &PageBox) -> Option<StampText>,
}

fn text_operations(stamp: &StampText) -> String {
    let [a, b, c, d, e, f] = stamp.matrix;
    format!(
        "BT {:.3} g /{FONT_NAME} {:.2} Tf {a:.5} {b:.5} {c:.5} {d:.5} {e:.3} {f:.3} Tm {} Tj ET\n",
        stamp.gray,
        stamp.size,
        pdf_string(&stamp.text),
    )
}

// A copy of a dictionary that may sit behind a reference.
fn owned_dictionary(document: &Document, object: Option<&Object>) -> Dictionary {
    object
        .map(|value| document.dereference(value).map(|(_, value)| value).unwrap_or(value))
        .and_then(|value| value.as_dict().ok())
        .cloned()
        .unwrap_or_default()
}

fn content_list(document: &Document, page: &Dictionary) -> Vec<Object> {
    match page.get(b"Contents").ok() {
        Some(Object::Reference(id)) => match document.get_object(*id) {
            Ok(Object::Array(items)) => items.clone(),
            _                        => vec![Object::Reference(*id)],
        },
        Some(Object::Array(items)) => items.clone(),
        _                          => Vec::new(),
    }
}

struct PageStampParams<'a> {
    page_id  : ObjectId,
    font_id  : ObjectId,
    state_id : ObjectId,
    drawing  : &'a str,
}

// The old content goes inside q … Q, so whatever it leaves changed never moves the stamp; the stamp
// is drawn last, on top.
fn stamp_page(document: &mut Document, params: PageStampParams) -> PdfResult<()> {
    let page = document.get_dictionary(params.page_id).map_err(|_| PDF_WRITE_ERROR.to_string())?.clone();

    let mut resources = owned_dictionary(document, page.get(b"Resources").ok());
    let mut fonts     = owned_dictionary(document, resources.get(b"Font").ok());
    let mut states    = owned_dictionary(document, resources.get(b"ExtGState").ok());

    fonts.set(FONT_NAME, params.font_id);
    states.set(STATE_NAME, params.state_id);
    resources.set("Font", fonts);
    resources.set("ExtGState", states);

    let opening      = document.add_object(Stream::new(Dictionary::new(), b"q\n".to_vec()));
    let mut ours     = Stream::new(Dictionary::new(), format!("Q\nq /{STATE_NAME} gs\n{}Q\n", params.drawing).into_bytes());
    let _            = ours.compress();
    let closing      = document.add_object(ours);
    let mut contents = vec![Object::Reference(opening)];
    contents.extend(content_list(document, &page));
    contents.push(Object::Reference(closing));

    let page = document.get_dictionary_mut(params.page_id).map_err(|_| PDF_WRITE_ERROR.to_string())?;
    page.set("Resources", resources);
    page.set("Contents", contents);
    Ok(())
}

// Draws on every page that `draw` returns something for; returns how many pages were stamped.
pub fn stamp_pages(document: &mut Document, params: StampParams) -> PdfResult<u32> {
    let font_id  = document.add_object(dictionary! {
        "Type"     => "Font",
        "Subtype"  => "Type1",
        "BaseFont" => params.font.base_font(),
        "Encoding" => "WinAnsiEncoding",
    });
    let state_id = document.add_object(dictionary! { "Type" => "ExtGState", "ca" => params.opacity.clamp(0.0, 1.0), "CA" => params.opacity.clamp(0.0, 1.0) });

    let mut stamped = 0;
    for (number, page_id) in document.get_pages() {
        own_inherited(document, page_id);

        let Some(geometry) = page_box(document, page_id) else { continue };
        let Some(text)     = (params.draw)(number, &geometry) else { continue };

        stamp_page(document, PageStampParams { page_id, font_id, state_id, drawing: &text_operations(&text) })?;
        stamped += 1;
    }

    Ok(stamped)
}
