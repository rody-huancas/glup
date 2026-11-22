use std::{
    collections::{BTreeSet, HashMap},
    path::Path,
};

use lopdf::{dictionary, Dictionary, Document, Object, ObjectId, Stream};
use serde::Deserialize;

use crate::services::pdf::{own_inherited, save, PdfResult};

pub const SIGN_IMAGE_ERROR: &str = "No pude leer una de las firmas";
pub const SIGN_PAGE_ERROR: &str  = "Una de las firmas está en una página que no existe";
pub const SIGN_EMPTY_ERROR: &str = "No hay nada ubicado para firmar";

// Same values as the frontend (sign/constants/sign.ts): a text box is TEXT_LINE_HEIGHT font sizes tall,
// with the baseline TEXT_BASELINE font sizes above its bottom edge (Helvetica, glyphs centered).
pub const TEXT_LINE_HEIGHT: f32 = 1.25;
pub const TEXT_BASELINE: f32    = 0.37;

const IMAGE_PREFIX: &str = "GlupFirma";
const FONT_NAME: &str    = "GlupHelv";

// A signature (transparent PNG) or a line of text (date, name, DNI…).
#[derive(Clone, Debug, Deserialize, PartialEq)]
#[serde(tag = "kind", rename_all = "lowercase")]
pub enum PlacementContent {
    Image { path: String },
    Text { text: String },
}

// Position and size relative to the page as it is shown (rotation applied), 0 to 1, from the top-left corner.
#[derive(Clone, Debug, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Placement {
    // 1-based.
    pub page: u32,
    #[serde(flatten)]
    pub content: PlacementContent,
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
}

// The visible box of a page (CropBox, otherwise MediaBox) in PDF points, and its rotation (0, 90, 180, 270).
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct PageBox {
    pub left: f32,
    pub bottom: f32,
    pub width: f32,
    pub height: f32,
    pub rotation: u32,
}

// Placement matrix in PDF user space: maps the unit square (image space) onto the placed rectangle.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Matrix {
    pub a: f32,
    pub b: f32,
    pub c: f32,
    pub d: f32,
    pub e: f32,
    pub f: f32,
}

pub struct SignParams<'a> {
    pub document: Document,
    pub placements: &'a [Placement],
}

// For the history line: "Firmado · 2 firmas en 2 páginas".
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct SignSummary {
    pub signatures: usize,
    pub texts: usize,
    pub pages: usize,
}

pub fn summarize(placements: &[Placement]) -> SignSummary {
    let signatures = placements.iter().filter(|item| matches!(item.content, PlacementContent::Image { .. })).count();
    let pages      = placements.iter().map(|item| item.page).collect::<BTreeSet<_>>().len();

    SignSummary { signatures, texts: placements.len() - signatures, pages }
}

impl PageBox {
    // Size as shown: width and height swap on a quarter turn.
    pub fn displayed(&self) -> (f32, f32) {
        if self.rotation % 180 == 0 { (self.width, self.height) } else { (self.height, self.width) }
    }

    // A point given in shown points from the top-left corner, in PDF user space. The viewer turns the
    // page clockwise by `rotation`, so the shown top-left is the box's top-left (0°), bottom-left (90°),
    // bottom-right (180°) or top-right (270°).
    pub fn to_pdf(&self, x: f32, y: f32) -> (f32, f32) {
        let (left, bottom, width, height) = (self.left, self.bottom, self.width, self.height);

        match self.rotation {
            90  => (left + y, bottom + x),
            180 => (left + width - x, bottom + y),
            270 => (left + width - y, bottom + height - x),
            _   => (left + x, bottom + height - y),
        }
    }

    // The unit square onto the placed rectangle, upright as shown.
    pub fn placement_matrix(&self, placement: &Placement) -> Matrix {
        let (shown_width, shown_height) = self.displayed();

        let x      = placement.x * shown_width;
        let y      = placement.y * shown_height;
        let width  = placement.width * shown_width;
        let height = placement.height * shown_height;

        let origin = self.to_pdf(x, y + height);
        let right  = self.to_pdf(x + width, y + height);
        let top    = self.to_pdf(x, y);

        Matrix { a: right.0 - origin.0, b: right.1 - origin.1, c: top.0 - origin.0, d: top.1 - origin.1, e: origin.0, f: origin.1 }
    }
}

fn number(object: &Object) -> Option<f32> {
    object.as_float().ok().or_else(|| object.as_i64().ok().map(|value| value as f32))
}

fn resolve<'a>(document: &'a Document, object: &'a Object) -> &'a Object {
    document.dereference(object).map(|(_, value)| value).unwrap_or(object)
}

fn rectangle(document: &Document, page: &Dictionary, key: &[u8]) -> Option<[f32; 4]> {
    let values = resolve(document, page.get(key).ok()?).as_array().ok()?;
    let values: Vec<f32> = values.iter().filter_map(|value| number(resolve(document, value))).collect();

    match values.as_slice() {
        [x1, y1, x2, y2] => Some([x1.min(*x2), y1.min(*y2), x1.max(*x2), y1.max(*y2)]),
        _ => None,
    }
}

// Expects the page to own its inherited attributes (see own_inherited).
pub fn page_box(document: &Document, page_id: ObjectId) -> Option<PageBox> {
    let page     = document.get_dictionary(page_id).ok()?;
    let visible  = rectangle(document, page, b"CropBox").or_else(|| rectangle(document, page, b"MediaBox"))?;
    let rotation = page.get(b"Rotate").ok().and_then(|value| resolve(document, value).as_i64().ok()).unwrap_or(0);

    Some(PageBox {
        left     : visible[0],
        bottom   : visible[1],
        width    : visible[2] - visible[0],
        height   : visible[3] - visible[1],
        rotation : (rotation.rem_euclid(360) as u32 / 90) * 90,
    })
}

// Helvetica's WinAnsi encoding matches Latin-1 for the accents and ñ; anything else becomes "?".
fn pdf_string(text: &str) -> String {
    let mut encoded = String::from("(");

    for character in text.chars() {
        let code = character as u32;

        match character {
            '(' | ')' | '\\' => {
                encoded.push('\\');
                encoded.push(character);
            }
            _ if (0x20..0x7F).contains(&code) => encoded.push(character),
            _ if (0xA0..=0xFF).contains(&code) => encoded.push_str(&format!("\\{code:03o}")),
            _ => encoded.push('?'),
        }
    }

    encoded.push(')');
    encoded
}

fn format_matrix(matrix: &Matrix) -> String {
    format!("{:.4} {:.4} {:.4} {:.4} {:.4} {:.4}", matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f)
}

// Text upright in the placed box: same directions as the matrix, scaled to the font size.
fn text_operations(matrix: &Matrix, text: &str) -> String {
    let width  = (matrix.a * matrix.a + matrix.b * matrix.b).sqrt().max(f32::EPSILON);
    let height = (matrix.c * matrix.c + matrix.d * matrix.d).sqrt().max(f32::EPSILON);
    let size   = height / TEXT_LINE_HEIGHT;
    let lift   = TEXT_BASELINE * size / height;

    let unit = Matrix {
        a : matrix.a / width,
        b : matrix.b / width,
        c : matrix.c / height,
        d : matrix.d / height,
        e : matrix.e + matrix.c * lift,
        f : matrix.f + matrix.d * lift,
    };

    format!("BT 0 g /{FONT_NAME} {size:.3} Tf {} Tm {} Tj ET\n", format_matrix(&unit), pdf_string(text))
}

// The PNG as an RGB image with its alpha channel as a soft mask, both compressed.
fn embed_image(document: &mut Document, path: &Path) -> PdfResult<ObjectId> {
    let image           = image::open(path).map_err(|_| SIGN_IMAGE_ERROR.to_string())?.to_rgba8();
    let (width, height) = image.dimensions();

    let mut color = Vec::with_capacity((width * height * 3) as usize);
    let mut alpha = Vec::with_capacity((width * height) as usize);

    for pixel in image.pixels() {
        color.extend_from_slice(&pixel.0[..3]);
        alpha.push(pixel.0[3]);
    }

    let mut mask = Stream::new(
        dictionary! {
            "Type" => "XObject", "Subtype" => "Image", "Width" => i64::from(width), "Height" => i64::from(height),
            "ColorSpace" => "DeviceGray", "BitsPerComponent" => 8,
        },
        alpha,
    );
    let _       = mask.compress();
    let mask_id = document.add_object(mask);

    let mut stream = Stream::new(
        dictionary! {
            "Type" => "XObject", "Subtype" => "Image", "Width" => i64::from(width), "Height" => i64::from(height),
            "ColorSpace" => "DeviceRGB", "BitsPerComponent" => 8, "SMask" => mask_id,
        },
        color,
    );
    let _ = stream.compress();

    Ok(document.add_object(stream))
}

// A copy of a dictionary that may sit behind a reference.
fn owned_dictionary(document: &Document, object: Option<&Object>) -> Dictionary {
    object.map(|value| resolve(document, value)).and_then(|value| value.as_dict().ok()).cloned().unwrap_or_default()
}

struct PageAdditions<'a> {
    page_id: ObjectId,
    images: &'a [(String, ObjectId)],
    font: Option<ObjectId>,
    drawing: String,
}

// Adds the names to the page resources and wraps the old content in q … Q, so a changed graphics
// state there never moves what is drawn after it.
fn extend_page(document: &mut Document, additions: PageAdditions) -> PdfResult<()> {
    let PageAdditions { page_id, images, font, drawing } = additions;
    let page = document.get_dictionary(page_id).map_err(|_| SIGN_PAGE_ERROR.to_string())?.clone();

    let mut resources = owned_dictionary(document, page.get(b"Resources").ok());
    let mut xobjects  = owned_dictionary(document, resources.get(b"XObject").ok());
    let mut fonts     = owned_dictionary(document, resources.get(b"Font").ok());

    images.iter().for_each(|(name, id)| xobjects.set(name.as_bytes().to_vec(), *id));
    if let Some(font) = font {
        fonts.set(FONT_NAME, font);
    }

    resources.set("XObject", xobjects);
    if !fonts.is_empty() {
        resources.set("Font", fonts);
    }

    let old: Vec<Object> = match page.get(b"Contents").ok() {
        Some(Object::Reference(id)) => match document.get_object(*id) {
            Ok(Object::Array(items)) => items.clone(),
            _ => vec![Object::Reference(*id)],
        },
        Some(Object::Array(items)) => items.clone(),
        _ => Vec::new(),
    };

    let opening = document.add_object(Stream::new(Dictionary::new(), b"q\n".to_vec()));
    let mut ours = Stream::new(Dictionary::new(), format!("Q\nq\n{drawing}Q\n").into_bytes());
    let _        = ours.compress();
    let closing  = document.add_object(ours);

    let mut contents = vec![Object::Reference(opening)];
    contents.extend(old);
    contents.push(Object::Reference(closing));

    let page = document.get_dictionary_mut(page_id).map_err(|_| SIGN_PAGE_ERROR.to_string())?;
    page.set("Resources", resources);
    page.set("Contents", contents);
    Ok(())
}

// Signatures as images with transparency (each file embedded once, however many times it is used) and
// texts in Helvetica, drawn upright on the page as shown, whatever its rotation and box offset.
pub fn sign(params: SignParams) -> PdfResult<Vec<u8>> {
    let SignParams { mut document, placements } = params;

    if placements.is_empty() {
        return Err(SIGN_EMPTY_ERROR.to_string());
    }

    let pages = document.get_pages();
    if placements.iter().any(|item| !pages.contains_key(&item.page)) {
        return Err(SIGN_PAGE_ERROR.to_string());
    }

    let mut embedded: HashMap<String, (String, ObjectId)> = HashMap::new();
    let mut font: Option<ObjectId>                        = None;

    for path in placements.iter().filter_map(|item| match &item.content {
        PlacementContent::Image { path } => Some(path),
        PlacementContent::Text { .. } => None,
    }) {
        if !embedded.contains_key(path) {
            let id   = embed_image(&mut document, Path::new(path))?;
            let name = format!("{IMAGE_PREFIX}{}", embedded.len() + 1);
            embedded.insert(path.clone(), (name, id));
        }
    }

    if placements.iter().any(|item| matches!(item.content, PlacementContent::Text { .. })) {
        font = Some(document.add_object(dictionary! { "Type" => "Font", "Subtype" => "Type1", "BaseFont" => "Helvetica", "Encoding" => "WinAnsiEncoding" }));
    }

    let used_pages: BTreeSet<u32> = placements.iter().map(|item| item.page).collect();

    for number in used_pages {
        let page_id = pages[&number];
        own_inherited(&mut document, page_id);

        let geometry = page_box(&document, page_id).ok_or(SIGN_PAGE_ERROR)?;
        let mut drawing = String::new();
        let mut images  = Vec::new();
        let mut texts   = false;

        for placement in placements.iter().filter(|item| item.page == number) {
            let matrix = geometry.placement_matrix(placement);

            match &placement.content {
                PlacementContent::Image { path } => {
                    let (name, id) = &embedded[path];
                    drawing.push_str(&format!("q {} cm /{name} Do Q\n", format_matrix(&matrix)));
                    if !images.iter().any(|(known, _)| known == name) {
                        images.push((name.clone(), *id));
                    }
                }
                PlacementContent::Text { text } => {
                    drawing.push_str(&text_operations(&matrix, text));
                    texts = true;
                }
            }
        }

        extend_page(&mut document, PageAdditions { page_id, images: &images, font: font.filter(|_| texts), drawing })?;
    }

    save(&mut document)
}

#[cfg(test)]
mod tests {
    use image::{Rgba, RgbaImage};
    use lopdf::content::Content;

    use super::*;

    const SIZE: (f32, f32) = (595.0, 842.0);

    struct TestPage {
        media: [f32; 4],
        crop: Option<[f32; 4]>,
        rotate: i64,
    }

    fn normal_page() -> TestPage {
        TestPage { media: [0.0, 0.0, SIZE.0, SIZE.1], crop: None, rotate: 0 }
    }

    fn rect(values: [f32; 4]) -> Vec<Object> {
        values.iter().map(|value| Object::Real(*value)).collect()
    }

    fn build_pdf(pages: &[TestPage]) -> Document {
        let mut document = Document::with_version("1.7");
        let pages_id     = document.new_object_id();

        let kids: Vec<Object> = pages
            .iter()
            .map(|page| {
                let content  = document.add_object(Stream::new(Dictionary::new(), b"0 0 1 rg 10 10 50 50 re f\n".to_vec()));
                let mut dict = dictionary! { "Type" => "Page", "Parent" => pages_id, "Contents" => content, "MediaBox" => rect(page.media), "Resources" => Dictionary::new() };

                if let Some(crop) = page.crop {
                    dict.set("CropBox", rect(crop));
                }
                if page.rotate != 0 {
                    dict.set("Rotate", page.rotate);
                }

                document.add_object(dict).into()
            })
            .collect();

        let count = kids.len() as i64;
        document.objects.insert(pages_id, Object::Dictionary(dictionary! { "Type" => "Pages", "Kids" => kids, "Count" => count }));
        let catalog = document.add_object(dictionary! { "Type" => "Catalog", "Pages" => pages_id });
        document.trailer.set("Root", catalog);
        document
    }

    fn signature_png(folder: &Path) -> String {
        let image = RgbaImage::from_fn(60, 20, |x, _| if x % 3 == 0 { Rgba([10, 20, 90, 255]) } else { Rgba([0, 0, 0, 0]) });
        let path  = folder.join("firma.png");
        image.save(&path).unwrap();
        path.to_string_lossy().into_owned()
    }

    fn temp_folder(name: &str) -> std::path::PathBuf {
        let folder = std::env::temp_dir().join(format!("glup-sign-{}-{name}", std::process::id()));
        std::fs::create_dir_all(&folder).unwrap();
        folder
    }

    fn image_at(path: &str, page: u32, area: [f32; 4]) -> Placement {
        Placement { page, content: PlacementContent::Image { path: path.to_string() }, x: area[0], y: area[1], width: area[2], height: area[3] }
    }

    fn close(actual: f32, expected: f32) -> bool {
        (actual - expected).abs() < 0.05
    }

    // The cm operands drawn on a page by the signature, read back from the saved PDF.
    fn drawn_matrices(bytes: &[u8], page: u32) -> Vec<[f32; 6]> {
        let document = Document::load_mem(bytes).unwrap();
        let page_id  = document.get_pages()[&page];
        let content  = Content::decode(&document.get_page_content(page_id)).unwrap();

        content
            .operations
            .windows(2)
            .filter(|pair| pair[0].operator == "cm" && pair[1].operator == "Do")
            .map(|pair| {
                let values: Vec<f32> = pair[0].operands.iter().filter_map(number).collect();
                [values[0], values[1], values[2], values[3], values[4], values[5]]
            })
            .collect()
    }

    fn assert_matrix(actual: [f32; 6], expected: [f32; 6]) {
        assert!(actual.iter().zip(expected).all(|(a, e)| close(*a, e)), "{actual:?} != {expected:?}");
    }

    #[test]
    fn maps_shown_points_for_every_rotation() {
        let page = |rotation| PageBox { left: 0.0, bottom: 0.0, width: 100.0, height: 200.0, rotation };

        assert_eq!(page(0).to_pdf(0.0, 0.0), (0.0, 200.0));
        assert_eq!(page(90).to_pdf(0.0, 0.0), (0.0, 0.0));
        assert_eq!(page(180).to_pdf(0.0, 0.0), (100.0, 0.0));
        assert_eq!(page(270).to_pdf(0.0, 0.0), (100.0, 200.0));
        assert_eq!(page(90).displayed(), (200.0, 100.0));
    }

    #[test]
    fn signs_a_normal_page() {
        let folder    = temp_folder("normal");
        let signature = signature_png(&folder);
        let placement = image_at(&signature, 1, [0.1, 0.8, 0.3, 0.1]);
        let bytes     = sign(SignParams { document: build_pdf(&[normal_page()]), placements: &[placement] }).unwrap();

        let [matrix] = drawn_matrices(&bytes, 1)[..] else { panic!("one signature") };
        assert_matrix(matrix, [0.3 * SIZE.0, 0.0, 0.0, 0.1 * SIZE.1, 0.1 * SIZE.0, SIZE.1 * (1.0 - 0.9)]);

        let document = Document::load_mem(&bytes).unwrap();
        let smasks   = document.objects.values().filter_map(|object| object.as_stream().ok()).filter(|stream| stream.dict.has(b"SMask")).count();
        assert_eq!(smasks, 1, "the signature keeps its transparency");
        let _ = std::fs::remove_dir_all(&folder);
    }

    #[test]
    fn signs_a_page_rotated_90_degrees_upright() {
        let folder    = temp_folder("rotated");
        let signature = signature_png(&folder);
        let page      = TestPage { rotate: 90, ..normal_page() };
        // The whole page as shown: 842 wide, 595 tall.
        let bytes = sign(SignParams { document: build_pdf(&[page]), placements: &[image_at(&signature, 1, [0.0, 0.0, 1.0, 1.0])] }).unwrap();

        let [matrix] = drawn_matrices(&bytes, 1)[..] else { panic!("one signature") };
        // The image's horizontal axis runs up the unrotated page (shown left to right).
        assert_matrix(matrix, [0.0, SIZE.1, -SIZE.0, 0.0, SIZE.0, 0.0]);
        let _ = std::fs::remove_dir_all(&folder);
    }

    #[test]
    fn follows_an_offset_crop_box() {
        let folder    = temp_folder("crop");
        let signature = signature_png(&folder);
        let page      = TestPage { crop: Some([100.0, 200.0, 400.0, 500.0]), ..normal_page() };
        let bytes     = sign(SignParams { document: build_pdf(&[page]), placements: &[image_at(&signature, 1, [0.5, 0.5, 0.5, 0.5])] }).unwrap();

        let [matrix] = drawn_matrices(&bytes, 1)[..] else { panic!("one signature") };
        assert_matrix(matrix, [150.0, 0.0, 0.0, 150.0, 250.0, 200.0]);
        let _ = std::fs::remove_dir_all(&folder);
    }

    #[test]
    fn embeds_the_same_signature_once_for_three_pages() {
        let folder     = temp_folder("three");
        let signature  = signature_png(&folder);
        let placements = (1..=3).map(|page| image_at(&signature, page, [0.6, 0.85, 0.3, 0.1])).collect::<Vec<_>>();
        let pages      = [normal_page(), normal_page(), normal_page()];
        let bytes      = sign(SignParams { document: build_pdf(&pages), placements: &placements }).unwrap();

        let document = Document::load_mem(&bytes).unwrap();
        let images   = document.objects.values().filter_map(|object| object.as_stream().ok()).filter(|stream| stream.dict.has(b"SMask")).count();
        assert_eq!(images, 1);
        (1..=3).for_each(|page| assert_eq!(drawn_matrices(&bytes, page).len(), 1));
        let _ = std::fs::remove_dir_all(&folder);
    }

    #[test]
    fn writes_dates_and_texts_in_helvetica() {
        let text  = Placement { page: 1, content: PlacementContent::Text { text: "Peñaranda (DNI) 12/05/2026".to_string() }, x: 0.1, y: 0.1, width: 0.4, height: 0.03 };
        let bytes = sign(SignParams { document: build_pdf(&[normal_page()]), placements: &[text] }).unwrap();

        let document = Document::load_mem(&bytes).unwrap();
        let page_id  = document.get_pages()[&1];
        let content  = Content::decode(&document.get_page_content(page_id)).unwrap();
        let shown    = content.operations.iter().find(|operation| operation.operator == "Tj").unwrap();

        assert_eq!(shown.operands[0].as_str().unwrap(), "Pe\u{f1}aranda (DNI) 12/05/2026".encode_utf16().map(|unit| unit as u8).collect::<Vec<_>>().as_slice());
        assert!(document.objects.values().any(|object| object.as_dict().is_ok_and(|dict| dict.get(b"BaseFont").and_then(Object::as_name).is_ok_and(|name| name == b"Helvetica"))));
    }

    #[test]
    fn refuses_pages_that_do_not_exist() {
        let text = Placement { page: 4, content: PlacementContent::Text { text: "x".to_string() }, x: 0.0, y: 0.0, width: 0.1, height: 0.1 };
        assert_eq!(sign(SignParams { document: build_pdf(&[normal_page()]), placements: &[text] }).unwrap_err(), SIGN_PAGE_ERROR);
    }

    #[test]
    fn counts_signatures_texts_and_pages() {
        let text = |page| Placement { page, content: PlacementContent::Text { text: "x".to_string() }, x: 0.0, y: 0.0, width: 0.1, height: 0.1 };
        let placements = [image_at("a.png", 1, [0.0; 4]), image_at("a.png", 2, [0.0; 4]), text(2)];

        assert_eq!(summarize(&placements), SignSummary { signatures: 2, texts: 1, pages: 2 });
    }
}
