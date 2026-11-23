// Contraseña, marca de agua, números de página y sacar imágenes, with PDFs generated in the temp folder.
use std::{fs, path::PathBuf};

use image::{codecs::jpeg::JpegEncoder, DynamicImage, ImageFormat, Rgb, RgbImage};
use lopdf::{content::Content, dictionary, Document, Object, ObjectId, Stream};

use super::{
    images::{extract, image_name},
    load, load_bytes,
    numbering::{is_valid as numbering_valid, label, number_of, number_pages, LabelParams, NumberFormat, NumberPosition, NumberingOptions},
    protect::{check_password, is_valid_password, protect, unlock, SHORT_PASSWORD, WRONG_PASSWORD},
    sign::PageBox,
    stamp::{text_width, StampFont, CAP_HEIGHT},
    watermark::{clean_text, place, watermark, WatermarkOpacity, WatermarkOptions, WatermarkPosition, WatermarkSize},
    PASSWORD_ERROR,
};

struct Folder(PathBuf);

impl Folder {
    fn new(name: &str) -> Self {
        let path = std::env::temp_dir().join(format!("glup-pdf-extras-{}-{name}", std::process::id()));
        let _    = fs::remove_dir_all(&path);
        fs::create_dir_all(&path).unwrap();
        Self(path)
    }

    fn write(&self, name: &str, bytes: &[u8]) -> PathBuf {
        let path = self.0.join(name);
        fs::write(&path, bytes).unwrap();
        path
    }
}

impl Drop for Folder {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}

struct TestPage {
    width    : i64,
    height   : i64,
    rotation : i64,
    // Image XObjects drawn on the page.
    images   : Vec<ObjectId>,
}

fn page(width: i64, rotation: i64) -> TestPage {
    TestPage { width, height: 842, rotation, images: Vec::new() }
}

fn build(document: &mut Document, pages: Vec<TestPage>) {
    let pages_id = document.new_object_id();
    let font_id  = document.add_object(dictionary! { "Type" => "Font", "Subtype" => "Type1", "BaseFont" => "Helvetica" });

    let kids: Vec<Object> = pages
        .into_iter()
        .map(|item| {
            let names: Vec<String> = (0..item.images.len()).map(|index| format!("Im{index}")).collect();
            let drawing: String    = names.iter().map(|name| format!("q 200 0 0 150 50 400 cm /{name} Do Q\n")).collect();
            let content            = document.add_object(Stream::new(dictionary! {}, format!("BT /F1 24 Tf 72 720 Td (Glup) Tj ET\n{drawing}").into_bytes()));

            let mut xobjects = lopdf::Dictionary::new();
            names.iter().zip(&item.images).for_each(|(name, id)| xobjects.set(name.as_bytes().to_vec(), *id));

            let mut dict = dictionary! {
                "Type"      => "Page",
                "Parent"    => pages_id,
                "MediaBox"  => vec![0.into(), 0.into(), item.width.into(), item.height.into()],
                "Contents"  => content,
                "Resources" => dictionary! { "Font" => dictionary! { "F1" => font_id }, "XObject" => xobjects },
            };
            if item.rotation != 0 {
                dict.set("Rotate", item.rotation);
            }
            document.add_object(dict).into()
        })
        .collect();

    let count = kids.len() as i64;
    document.objects.insert(pages_id, Object::Dictionary(dictionary! { "Type" => "Pages", "Kids" => kids, "Count" => count }));
    let catalog = document.add_object(dictionary! { "Type" => "Catalog", "Pages" => pages_id });
    document.trailer.set("Root", catalog);
}

fn sample(pages: Vec<TestPage>) -> Document {
    let mut document = Document::with_version("1.7");
    build(&mut document, pages);
    document
}

fn bytes_of(mut document: Document) -> Vec<u8> {
    let mut buffer = Vec::new();
    document.save_to(&mut buffer).unwrap();
    buffer
}

fn widths(document: &Document) -> Vec<i64> {
    document
        .get_pages()
        .values()
        .map(|&id| document.get_dictionary(id).unwrap().get(b"MediaBox").unwrap().as_array().unwrap()[2].as_float().unwrap().round() as i64)
        .collect()
}

// The Tm operands and the string of every Tj drawn on a page, in order.
fn drawn_texts(document: &Document, number: u32) -> Vec<([f32; 6], String)> {
    let page_id = document.get_pages()[&number];
    let content = Content::decode(&document.get_page_content(page_id)).unwrap();
    let mut out = Vec::new();
    let mut tm  = [0.0; 6];

    for operation in content.operations {
        match operation.operator.as_str() {
            "Tm" => {
                let values: Vec<f32> = operation.operands.iter().map(|value| value.as_float().unwrap()).collect();
                tm = [values[0], values[1], values[2], values[3], values[4], values[5]];
            }
            "Tj" => {
                let text = operation.operands[0].as_str().map(|bytes| bytes.iter().map(|&byte| byte as char).collect()).unwrap_or_default();
                out.push((tm, text));
            }
            _ => {}
        }
    }

    out
}

fn close(actual: f32, expected: f32) -> bool {
    (actual - expected).abs() < 0.01
}

// --- Poner y quitar contraseña ---

#[test]
fn protects_with_aes_256_and_opens_only_with_the_password() {
    let folder = Folder::new("protect");
    let bytes  = protect(sample(vec![page(201, 0), page(202, 0)]), "glup1234").unwrap();
    let path   = folder.write("contrato-protegido.pdf", &bytes);

    // Without the password Glup refuses it, as before ("Primero quítale la contraseña").
    assert_eq!(load(&path).unwrap_err(), PASSWORD_ERROR);

    // AES-256: version 5, revision 6, with the AESV3 crypt filter (the /Encrypt dictionary is plain text).
    let text = String::from_utf8_lossy(&bytes);
    assert!(text.contains("/V 5") && text.contains("/R 6") && text.contains("/AESV3"), "not AES-256");
    // The page text is not readable without the key.
    assert!(!text.contains("(Glup) Tj"));

    assert!(check_password(&path, "glup1234"));
    assert!(!check_password(&path, "glup12345"));

    let opened = Document::load_with_password(&path, "glup1234").unwrap();
    assert_eq!(widths(&opened), vec![201, 202]);
}

#[test]
fn removes_the_password_only_when_it_is_right() {
    let folder = Folder::new("unlock");
    let path   = folder.write("contrato.pdf", &protect(sample(vec![page(201, 0), page(202, 0), page(203, 0)]), "contraseña ñ").unwrap());

    assert_eq!(unlock(&path, "contrasena n").unwrap_err(), WRONG_PASSWORD);
    assert_eq!(unlock(&path, "").unwrap_err(), WRONG_PASSWORD);

    let unlocked = folder.write("contrato-sin-clave.pdf", &unlock(&path, "contraseña ñ").unwrap());
    let document = load(&unlocked).unwrap();
    assert!(!document.trailer.has(b"Encrypt"));
    assert_eq!(widths(&document), vec![201, 202, 203]);
}

#[test]
fn refuses_short_passwords() {
    assert!(is_valid_password("1234"));
    assert!(is_valid_password("ñandú"));
    assert!(!is_valid_password("abc"));
    assert_eq!(protect(sample(vec![page(201, 0)]), "abc").unwrap_err(), SHORT_PASSWORD);
}

// --- Marca de agua ---

fn copy_mark(position: WatermarkPosition) -> WatermarkOptions {
    WatermarkOptions { text: "COPIA".to_string(), size: WatermarkSize::Medium, opacity: WatermarkOpacity::Soft, position }
}

#[test]
fn draws_the_watermark_on_every_page_on_top_and_transparent() {
    let bytes    = watermark(sample(vec![page(595, 0), page(595, 0), page(595, 0)]), &copy_mark(WatermarkPosition::Diagonal)).unwrap();
    let document = load_bytes(&bytes).unwrap();

    for number in 1..=3 {
        let texts = drawn_texts(&document, number);
        // The page's own text first, the watermark last (on top).
        assert_eq!(texts.last().unwrap().1, "COPIA");
    }

    let alpha = document.objects.values().filter_map(|object| object.as_dict().ok()).find_map(|dict| dict.get(b"ca").ok()).unwrap();
    assert!(close(alpha.as_float().unwrap(), WatermarkOpacity::Soft.alpha()));
}

#[test]
fn the_diagonal_goes_from_bottom_left_to_top_right_and_is_centered() {
    let bytes    = watermark(sample(vec![page(595, 0)]), &copy_mark(WatermarkPosition::Diagonal)).unwrap();
    let document = load_bytes(&bytes).unwrap();
    let (tm, _)  = drawn_texts(&document, 1).pop().unwrap();

    let angle = (842.0_f32).atan2(595.0);
    assert!(close(tm[0], angle.cos()) && close(tm[1], angle.sin()));

    // The middle of the text (half its width along the baseline, half the capital height up) is the page center.
    let geometry = PageBox { left: 0.0, bottom: 0.0, width: 595.0, height: 842.0, rotation: 0 };
    let size     = place(&copy_mark(WatermarkPosition::Diagonal), &geometry, "COPIA").size;
    let half     = text_width("COPIA", StampFont::Bold, size) / 2.0;
    let lift     = CAP_HEIGHT * size / 2000.0;
    let center   = (tm[4] + tm[0] * half + tm[2] * lift, tm[5] + tm[1] * half + tm[3] * lift);
    assert!((center.0 - 297.5).abs() < 0.5 && (center.1 - 421.0).abs() < 0.5, "{center:?}");
}

#[test]
fn the_watermark_stays_upright_on_rotated_pages() {
    let bytes    = watermark(sample(vec![page(595, 90), page(595, 270)]), &copy_mark(WatermarkPosition::Corner)).unwrap();
    let document = load_bytes(&bytes).unwrap();

    // A page turned 90° clockwise shows its left edge on top: reading left to right is going up in the PDF.
    let (quarter, _) = drawn_texts(&document, 1).pop().unwrap();
    assert!(close(quarter[0], 0.0) && close(quarter[1], 1.0));

    let (three_quarters, _) = drawn_texts(&document, 2).pop().unwrap();
    assert!(close(three_quarters[0], 0.0) && close(three_quarters[1], -1.0));

    // Inside the page box.
    for tm in [quarter, three_quarters] {
        assert!((0.0..=595.0).contains(&tm[4]) && (0.0..=842.0).contains(&tm[5]), "{tm:?}");
    }
}

#[test]
fn watermark_text_is_one_trimmed_line() {
    assert_eq!(clean_text("  BORRADOR \n final "), "BORRADOR final");
    assert_eq!(clean_text(&"x".repeat(80)).chars().count(), 40);
    assert!(watermark(sample(vec![page(595, 0)]), &WatermarkOptions { text: "   ".to_string(), ..copy_mark(WatermarkPosition::Corner) }).is_err());
}

// --- Numerar páginas ---

fn numbering(start_page: u32, first_number: u32, format: NumberFormat) -> NumberingOptions {
    NumberingOptions { position: NumberPosition::BottomCenter, format, start_page, first_number }
}

#[test]
fn numbers_every_page_from_the_one_chosen() {
    let options          = numbering(2, 1, NumberFormat::OfTotal);
    let (bytes, stamped) = number_pages(sample(vec![page(595, 0), page(595, 0), page(595, 0), page(595, 0)]), &options).unwrap();
    let document         = load_bytes(&bytes).unwrap();

    assert_eq!(stamped, 3);
    // The cover keeps only its own text.
    assert_eq!(drawn_texts(&document, 1).len(), 1);
    assert_eq!(drawn_texts(&document, 2).last().unwrap().1, "1 de 3");
    assert_eq!(drawn_texts(&document, 4).last().unwrap().1, "3 de 3");
}

#[test]
fn page_numbers_stay_upright_on_rotated_pages() {
    let options    = NumberingOptions { position: NumberPosition::BottomRight, ..numbering(1, 1, NumberFormat::Page) };
    let (bytes, _) = number_pages(sample(vec![page(595, 90), page(595, 180)]), &options).unwrap();
    let document   = load_bytes(&bytes).unwrap();

    let (quarter, text) = drawn_texts(&document, 1).pop().unwrap();
    assert_eq!(text, "P\u{e1}gina 1");
    assert!(close(quarter[0], 0.0) && close(quarter[1], 1.0));

    // Upside down, left to right is right to left in the PDF; bottom right as shown is near the PDF's top left.
    let (half, _) = drawn_texts(&document, 2).pop().unwrap();
    assert!(close(half[0], -1.0) && close(half[1], 0.0));
    assert!(half[4] < 595.0 / 2.0 && half[5] > 842.0 / 2.0, "{half:?}");
}

#[test]
fn labels_and_numbers() {
    let options = numbering(3, 5, NumberFormat::Number);
    assert_eq!(number_of(&options, 2), None);
    assert_eq!(number_of(&options, 3), Some(5));
    assert_eq!(number_of(&options, 6), Some(8));

    assert_eq!(label(LabelParams { format: NumberFormat::Number, number: 7, last: 12 }), "7");
    assert_eq!(label(LabelParams { format: NumberFormat::Page, number: 7, last: 12 }), "Página 7");
    assert_eq!(label(LabelParams { format: NumberFormat::OfTotal, number: 7, last: 12 }), "7 de 12");

    assert!(numbering_valid(&options, 3));
    assert!(!numbering_valid(&options, 2));
    assert!(!numbering_valid(&numbering(0, 1, NumberFormat::Number), 3));
    assert!(number_pages(sample(vec![page(595, 0)]), &numbering(2, 1, NumberFormat::Number)).is_err());
}

// --- Sacar imágenes ---

fn jpeg(width: u32, height: u32) -> Vec<u8> {
    let image      = RgbImage::from_fn(width, height, |x, y| Rgb([(x * 255 / width) as u8, (y * 255 / height) as u8, 90]));
    let mut buffer = Vec::new();
    DynamicImage::ImageRgb8(image).write_with_encoder(JpegEncoder::new_with_quality(&mut buffer, 90)).unwrap();
    buffer
}

fn image_object(document: &mut Document, width: i64, height: i64, filter: Option<&str>, content: Vec<u8>) -> ObjectId {
    let mut dict = dictionary! {
        "Type" => "XObject", "Subtype" => "Image", "Width" => width, "Height" => height,
        "ColorSpace" => "DeviceRGB", "BitsPerComponent" => 8,
    };
    if let Some(filter) = filter {
        dict.set("Filter", filter);
    }
    document.add_object(Stream::new(dict, content))
}

#[test]
fn extracts_jpegs_as_they_are_and_the_rest_as_png() {
    let photo        = jpeg(120, 90);
    let mut document = Document::with_version("1.7");

    let jpeg_id  = image_object(&mut document, 120, 90, Some("DCTDecode"), photo.clone());
    let raw      = RgbImage::from_fn(100, 80, |x, y| Rgb([x as u8, y as u8, 200])).into_raw();
    let mut flat = Stream::new(dictionary! {
        "Type" => "XObject", "Subtype" => "Image", "Width" => 100, "Height" => 80, "ColorSpace" => "DeviceRGB", "BitsPerComponent" => 8,
    }, raw.clone());
    flat.compress().unwrap();
    let flat_id  = document.add_object(flat);
    // A bullet: too small to be a photo.
    let icon_id  = image_object(&mut document, 16, 16, None, vec![0; 16 * 16 * 3]);

    // The JPEG twice (on two pages) comes out once.
    let pages = vec![
        TestPage { images: vec![jpeg_id, icon_id], ..page(595, 0) },
        TestPage { images: vec![flat_id, jpeg_id], ..page(595, 0) },
    ];
    build(&mut document, pages);

    let document = load_bytes(&bytes_of(document)).unwrap();
    let images   = extract(&document);

    assert_eq!(images.len(), 2);
    assert_eq!(images[0].extension, "jpg");
    assert_eq!(images[0].bytes, photo);

    assert_eq!(images[1].extension, "png");
    let decoded = image::load_from_memory_with_format(&images[1].bytes, ImageFormat::Png).unwrap().to_rgb8();
    assert_eq!(decoded.dimensions(), (100, 80));
    assert_eq!(decoded.into_raw(), raw);
}

#[test]
fn a_pdf_without_photos_gives_nothing() {
    let document = load_bytes(&bytes_of(sample(vec![page(595, 0), page(595, 0)]))).unwrap();
    assert!(extract(&document).is_empty());
}

#[test]
fn names_the_extracted_images() {
    assert_eq!(image_name("contrato", 1, 12, "jpg"), "contrato-img-01.jpg");
    assert_eq!(image_name("contrato", 7, 120, "png"), "contrato-img-007.png");
}

#[test]
fn a_pdf_without_password_has_nothing_to_remove() {
    let folder = Folder::new("plain");
    let path   = folder.write("contrato.pdf", &bytes_of(sample(vec![page(201, 0)])));
    assert_eq!(unlock(&path, "glup1234").unwrap_err(), super::protect::NOT_PROTECTED);
}

// For checking with another reader by hand: GLUP_SAMPLE_DIR=<folder> cargo test writes_protected_sample -- --ignored
#[test]
#[ignore]
fn writes_protected_sample() {
    let folder = PathBuf::from(std::env::var("GLUP_SAMPLE_DIR").expect("GLUP_SAMPLE_DIR"));
    let bytes  = protect(sample(vec![page(595, 0), page(595, 90)]), "contraseña ñ").unwrap();
    fs::write(folder.join("glup-protegido.pdf"), bytes).unwrap();
}
