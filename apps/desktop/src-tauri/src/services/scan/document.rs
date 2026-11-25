// The scanned PDF: one page per sheet, the cleaned image filling it (or centred on A4 or Carta) and,
// when it was read, the words on top as invisible text (render mode 3), so they can be searched and
// selected where they are.
use jpeg_encoder::{ColorType, Encoder};
use lopdf::{
    content::{Content, Operation},
    dictionary, Document, Object, ObjectId, Stream, StringFormat,
};
use serde::Deserialize;

use super::{enhance::PageImage, geometry::PaperMatch};
use crate::services::text::ocr::WordBox;

pub const ENCODE_ERROR: &str = "No pude armar el PDF";

// Points: A4 and Carta, short side by long side.
pub const A4_POINTS: (f64, f64)     = (595.28, 841.89);
pub const LETTER_POINTS: (f64, f64) = (612.0, 792.0);
// Colour and grey pages: a good JPEG, light enough for a document.
pub const JPEG_QUALITY: u8          = 80;
const IMAGE_NAME: &str              = "Im0";
const FONT_NAME: &str               = "F0";
// Every glyph of the hidden font is this wide (thousandths of the size): the width of a word is then
// known exactly and Tz makes it match its box.
const GLYPH_WIDTH: f64              = 500.0;
// The baseline sits this share of the box above its bottom (the room of descenders).
const BASELINE: f64                 = 0.22;

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PaperChoice {
    // A4 or Carta when the sheet looks like one, its own size if not.
    #[default]
    Auto,
    A4,
    Letter,
}

pub struct ScanPdfPage {
    pub image : PageImage,
    pub words : Vec<WordBox>,
    pub paper : PaperMatch,
}

// The page in points, upright as the image: A4 or Carta (by choice, or found by Automático), or the
// image's own proportion with the long side of an A4.
pub fn page_points(choice: PaperChoice, paper: PaperMatch, width: u32, height: u32) -> (f64, f64) {
    let (short, long) = match (choice, paper) {
        (PaperChoice::A4, _) | (PaperChoice::Auto, PaperMatch::A4)         => A4_POINTS,
        (PaperChoice::Letter, _) | (PaperChoice::Auto, PaperMatch::Letter) => LETTER_POINTS,
        (PaperChoice::Auto, PaperMatch::Own)                               => {
            let ratio = width.max(height) as f64 / width.min(height).max(1) as f64;
            (A4_POINTS.1 / ratio, A4_POINTS.1)
        }
    };
    if width > height { (long, short) } else { (short, long) }
}

// The image as large as it fits, centred (it fills the page when they share the proportion).
pub fn image_rect(page: (f64, f64), width: u32, height: u32) -> (f64, f64, f64, f64) {
    let scale = (page.0 / width.max(1) as f64).min(page.1 / height.max(1) as f64);
    let (w, h) = (width as f64 * scale, height as f64 * scale);
    ((page.0 - w) / 2.0, (page.1 - h) / 2.0, w, h)
}

// The text as WinAnsi bytes (the encoding of the standard fonts): Spanish letters are in it; what is
// not becomes "?".
pub fn win_ansi(text: &str) -> Vec<u8> {
    text.chars()
        .map(|character| match character {
            '€' => 0x80,
            '‘' => 0x91,
            '’' => 0x92,
            '“' => 0x93,
            '”' => 0x94,
            '•' => 0x95,
            '–' => 0x96,
            '—' => 0x97,
            ' '..='~' | '\u{A0}'..='\u{FF}' => character as u32 as u8,
            _ => b'?',
        })
        .collect()
}

fn jpeg(pixels: &[u8], width: u32, height: u32, color: ColorType) -> Result<Vec<u8>, String> {
    let mut bytes = Vec::new();
    Encoder::new(&mut bytes, JPEG_QUALITY).encode(pixels, width as u16, height as u16, color).map_err(|_| ENCODE_ERROR.to_string())?;
    Ok(bytes)
}

// One bit per pixel, rows padded to a byte; 1 is paper (white in DeviceGray).
pub fn pack_bits(image: &image::GrayImage) -> Vec<u8> {
    let (width, height) = image.dimensions();
    let row_bytes       = width.div_ceil(8) as usize;
    let mut bytes       = vec![0u8; row_bytes * height as usize];
    for (x, y, pixel) in image.enumerate_pixels() {
        if pixel.0[0] >= 128 {
            bytes[y as usize * row_bytes + x as usize / 8] |= 0x80 >> (x % 8);
        }
    }
    bytes
}

fn image_stream(image: &PageImage) -> Result<Stream, String> {
    let (width, height) = image.dimensions();
    let base            = |space: &str, bits: i64| dictionary! {
        "Type"             => "XObject",
        "Subtype"          => "Image",
        "Width"            => i64::from(width),
        "Height"           => i64::from(height),
        "ColorSpace"       => space,
        "BitsPerComponent" => bits,
    };

    match image {
        PageImage::Color(rgb) => {
            let mut dictionary = base("DeviceRGB", 8);
            dictionary.set("Filter", "DCTDecode");
            Ok(Stream::new(dictionary, jpeg(rgb.as_raw(), width, height, ColorType::Rgb)?))
        }
        PageImage::Gray(gray) => {
            let mut dictionary = base("DeviceGray", 8);
            dictionary.set("Filter", "DCTDecode");
            Ok(Stream::new(dictionary, jpeg(gray.as_raw(), width, height, ColorType::Luma)?))
        }
        // Text in black and white: one bit per pixel, deflated (a page of text weighs a few dozen KB).
        PageImage::Bw(gray) => {
            let mut stream = Stream::new(base("DeviceGray", 1), pack_bits(gray));
            stream.compress().map_err(|_| ENCODE_ERROR.to_string())?;
            Ok(stream)
        }
    }
}

fn real(value: f64) -> Object {
    Object::Real(value as f32)
}

// The words, invisible, each one stretched to its box on the page.
fn text_operations(words: &[WordBox], rect: (f64, f64, f64, f64)) -> Vec<Operation> {
    let (left, bottom, width, height) = rect;
    let mut operations = vec![Operation::new("BT", vec![]), Operation::new("Tr", vec![3.into()])];

    for word in words {
        let bytes = win_ansi(&word.text);
        if bytes.is_empty() || word.width <= 0.0 || word.height <= 0.0 {
            continue;
        }
        let box_width  = word.width * width;
        let box_height = word.height * height;
        let x          = left + word.x * width;
        let y          = bottom + (1.0 - word.y - word.height) * height + box_height * BASELINE;
        let size       = box_height.max(1.0);
        let natural    = bytes.len() as f64 * GLYPH_WIDTH / 1000.0 * size;
        let stretch    = (box_width / natural.max(0.01) * 100.0).clamp(1.0, 1000.0);

        operations.push(Operation::new("Tf", vec![Object::Name(FONT_NAME.as_bytes().to_vec()), real(size)]));
        operations.push(Operation::new("Tz", vec![real(stretch)]));
        operations.push(Operation::new("Tm", vec![1.into(), 0.into(), 0.into(), 1.into(), real(x), real(y)]));
        operations.push(Operation::new("Tj", vec![Object::String(bytes, StringFormat::Literal)]));
    }

    operations.push(Operation::new("ET", vec![]));
    operations
}

fn hidden_font(document: &mut Document) -> ObjectId {
    let widths: Vec<Object> = (32..=255).map(|_| Object::Integer(GLYPH_WIDTH as i64)).collect();
    document.add_object(dictionary! {
        "Type"      => "Font",
        "Subtype"   => "Type1",
        "BaseFont"  => "Helvetica",
        "Encoding"  => "WinAnsiEncoding",
        "FirstChar" => 32,
        "LastChar"  => 255,
        "Widths"    => widths,
    })
}

pub fn build(pages: &[ScanPdfPage], choice: PaperChoice) -> Result<Vec<u8>, String> {
    if pages.is_empty() {
        return Err(ENCODE_ERROR.to_string());
    }

    let mut document = Document::with_version("1.7");
    let pages_id     = document.new_object_id();
    let font_id      = pages.iter().any(|page| !page.words.is_empty()).then(|| hidden_font(&mut document));
    let mut kids     = Vec::with_capacity(pages.len());

    for page in pages {
        let (width, height) = page.image.dimensions();
        let size            = page_points(choice, page.paper, width, height);
        let rect            = image_rect(size, width, height);
        let image_id        = document.add_object(image_stream(&page.image)?);

        let mut operations = vec![
            Operation::new("q", vec![]),
            Operation::new("cm", vec![real(rect.2), 0.into(), 0.into(), real(rect.3), real(rect.0), real(rect.1)]),
            Operation::new("Do", vec![Object::Name(IMAGE_NAME.as_bytes().to_vec())]),
            Operation::new("Q", vec![]),
        ];
        if !page.words.is_empty() {
            operations.extend(text_operations(&page.words, rect));
        }

        let encoded    = Content { operations }.encode().map_err(|_| ENCODE_ERROR.to_string())?;
        let mut stream = Stream::new(dictionary! {}, encoded);
        let _          = stream.compress();
        let content_id = document.add_object(stream);

        let mut resources = dictionary! { "XObject" => dictionary! { IMAGE_NAME => image_id } };
        if let (Some(font), false) = (font_id, page.words.is_empty()) {
            resources.set("Font", dictionary! { FONT_NAME => font });
        }

        kids.push(Object::from(document.add_object(dictionary! {
            "Type"      => "Page",
            "Parent"    => pages_id,
            "MediaBox"  => vec![0.into(), 0.into(), real(size.0), real(size.1)],
            "Contents"  => content_id,
            "Resources" => resources,
        })));
    }

    let count = kids.len() as i64;
    document.objects.insert(pages_id, Object::Dictionary(dictionary! { "Type" => "Pages", "Kids" => kids, "Count" => count }));
    let catalog = document.add_object(dictionary! { "Type" => "Catalog", "Pages" => pages_id });
    document.trailer.set("Root", catalog);

    let mut bytes = Vec::new();
    document.save_to(&mut bytes).map_err(|_| ENCODE_ERROR.to_string())?;
    Ok(bytes)
}
