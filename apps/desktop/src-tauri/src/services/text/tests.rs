use std::{
    path::{Path, PathBuf},
    process::Command,
    time::Instant,
};

use image::{Rgba, RgbaImage};

use super::{
    compose::{compose, history_detail, join_lines, pages_read, pages_with_text, to_windows_lines, FileText, LineBox, PageText},
    language::choose_language,
    ocr::{fit_for_engine, to_bgra_on_white},
    text_path, TextNameParams,
};
use crate::services::history::{point_entry, HistoryEntry};

fn tags(values: &[&str]) -> Vec<String> {
    values.iter().map(|value| value.to_string()).collect()
}

fn page(page: Option<u32>, text: &str) -> PageText {
    PageText { page, text: text.to_string() }
}

fn file(name: &str, pages: Vec<PageText>) -> FileText {
    FileText { name: name.to_string(), pages }
}

fn line(text: &str, top: f32) -> LineBox {
    LineBox { text: text.to_string(), top, height: 20.0 }
}

// --- Language ---

#[test]
fn reads_in_the_language_of_the_system_when_there_is_one() {
    assert_eq!(choose_language(&tags(&["es-PE", "en-US"]), &tags(&["en-US", "es-ES"])), Some("es-ES".to_string()));
    assert_eq!(choose_language(&tags(&["en-GB"]), &tags(&["es-ES", "en-US"])), Some("en-US".to_string()));
    assert_eq!(choose_language(&tags(&["pt-BR"]), &tags(&["pt-BR", "es-ES"])), Some("pt-BR".to_string()));
}

#[test]
fn prefers_spanish_when_the_system_language_cannot_be_read() {
    assert_eq!(choose_language(&tags(&["qu-PE"]), &tags(&["en-US", "es-MX"])), Some("es-MX".to_string()));
    assert_eq!(choose_language(&[], &tags(&["en-US", "es-ES"])), Some("es-ES".to_string()));
}

#[test]
fn takes_the_first_installed_otherwise() {
    assert_eq!(choose_language(&tags(&["qu-PE"]), &tags(&["fr-FR", "de-DE"])), Some("fr-FR".to_string()));
    assert_eq!(choose_language(&tags(&["es-PE"]), &[]), None);
}

// --- Putting the text together ---

#[test]
fn keeps_lines_and_marks_paragraphs_by_the_gaps() {
    let lines = vec![line("Contrato de alquiler", 10.0), line("entre las partes", 34.0), line("Primera cláusula", 90.0), line("  ", 120.0)];
    assert_eq!(join_lines(&lines), "Contrato de alquiler\nentre las partes\n\nPrimera cláusula");
    assert_eq!(join_lines(&[]), "");
}

#[test]
fn one_image_is_just_its_text() {
    assert_eq!(compose(&[file("foto.jpg", vec![page(None, "  Hola Glup  ")])]), "Hola Glup");
}

#[test]
fn a_pdf_goes_by_page_and_skips_empty_ones() {
    let pdf = file("contrato.pdf", vec![page(Some(1), "Uno"), page(Some(2), " \n "), page(Some(3), "Tres")]);
    assert_eq!(compose(&[pdf.clone()]), "Página 1\n\nUno\n\nPágina 3\n\nTres");
    assert_eq!(pages_read(&[pdf.clone()]), 3);
    assert_eq!(pages_with_text(&[pdf]), 2);
}

#[test]
fn several_files_go_under_their_names() {
    let files = [
        file("recibo.png", vec![page(None, "Total 120")]),
        file("vacia.png", vec![page(None, "")]),
        file("acta.pdf", vec![page(Some(1), "Acta"), page(Some(2), "Firmas")]),
    ];

    assert_eq!(
        compose(&files),
        "recibo.png\n==========\n\nTotal 120\n\n\nacta.pdf\n========\n\nPágina 1\n\nActa\n\nPágina 2\n\nFirmas"
    );
}

#[test]
fn nothing_written_gives_nothing() {
    assert_eq!(compose(&[file("blanco.png", vec![page(None, "  ---  ")])]), "");
    assert_eq!(compose(&[]), "");
}

#[test]
fn history_and_line_ends() {
    assert_eq!(history_detail(1), "Texto sacado · 1 página");
    assert_eq!(history_detail(3), "Texto sacado · 3 páginas");
    assert_eq!(to_windows_lines("a\nb\r\nc"), "a\r\nb\r\nc");
}

// --- The .txt name ---

fn name_for(sources: &[&str], taken: &[&str]) -> PathBuf {
    let sources: Vec<PathBuf> = sources.iter().map(PathBuf::from).collect();
    let taken: Vec<PathBuf>   = taken.iter().map(PathBuf::from).collect();
    text_path(TextNameParams { folder: Path::new("C:/docs"), sources: &sources, stamp: "2026-11-22-2130", exists: &|path| taken.iter().any(|item| item == path) }).unwrap()
}

#[test]
fn names_the_txt_after_the_file() {
    assert_eq!(name_for(&["C:/docs/foto.jpg"], &[]), PathBuf::from("C:/docs/foto.txt"));
    assert_eq!(name_for(&["C:/docs/contrato.pdf"], &[]), PathBuf::from("C:/docs/contrato.txt"));
    assert_eq!(name_for(&["C:/docs/contrato.pdf"], &["C:/docs/contrato.txt"]), PathBuf::from("C:/docs/contrato (2).txt"));
    assert_eq!(name_for(&["C:/docs/a.png", "C:/docs/b.pdf"], &[]), PathBuf::from("C:/docs/textos-2026-11-22-2130.txt"));
}

#[test]
fn the_history_line_points_at_the_saved_txt() {
    let entry = HistoryEntry {
        id     : "1".to_string(),
        name   : "contrato.pdf".to_string(),
        path   : "C:/docs/contrato.pdf".to_string(),
        kind   : "text".to_string(),
        action : "extract-text".to_string(),
        detail : "Texto sacado · 3 páginas".to_string(),
        date   : String::new(),
    };
    let moved = point_entry(vec![entry], "1", Path::new("C:/docs/contrato.txt"));
    assert_eq!((moved[0].name.as_str(), moved[0].path.as_str()), ("contrato.txt", "C:/docs/contrato.txt"));
    assert_eq!(moved[0].detail, "Texto sacado · 3 páginas");
}

// --- Image preparation ---

#[test]
fn big_images_are_scaled_to_the_engine_limit_keeping_the_proportion() {
    let fitted = fit_for_engine(RgbaImage::new(12_000, 6_000), 10_000);
    assert_eq!(fitted.dimensions(), (10_000, 5_000));
    assert_eq!(fit_for_engine(RgbaImage::new(800, 600), 10_000).dimensions(), (800, 600));
}

#[test]
fn transparency_becomes_white_and_bytes_go_as_bgra() {
    let mut image = RgbaImage::new(2, 1);
    image.put_pixel(0, 0, Rgba([10, 20, 30, 255]));
    image.put_pixel(1, 0, Rgba([0, 0, 0, 0]));
    assert_eq!(to_bgra_on_white(&image), vec![30, 20, 10, 255, 255, 255, 255, 255]);
}

// --- With the real OCR of Windows (cargo test text::tests::real -- --ignored --nocapture) ---

// Draws text on a white picture with the fonts of Windows (System.Drawing), as a photo of a page would show it.
fn draw_text(path: &Path, size: (u32, u32), lines: &[&str], font_size: u32) {
    let text   = lines.join("`n");
    let script = format!(
        "Add-Type -AssemblyName System.Drawing; $b = New-Object System.Drawing.Bitmap {w},{h}; $g = [System.Drawing.Graphics]::FromImage($b); \
         $g.Clear([System.Drawing.Color]::White); $g.TextRenderingHint = 'AntiAlias'; $f = New-Object System.Drawing.Font('Arial',{font_size}); \
         $g.DrawString(\"{text}\", $f, [System.Drawing.Brushes]::Black, 60, 60); $b.Save('{path}', [System.Drawing.Imaging.ImageFormat]::Png)",
        w = size.0,
        h = size.1,
        path = path.display(),
    );
    let done = Command::new("powershell").args(["-NoProfile", "-Command", &script]).status().unwrap();
    assert!(done.success());
}

fn temp_file(name: &str) -> PathBuf {
    std::env::temp_dir().join(format!("glup-text-tests-{}-{name}", std::process::id()))
}

#[test]
#[ignore]
fn real_ocr_reads_known_text() {
    let path = temp_file("hola.png");
    draw_text(&path, (900, 300), &["Hola Glup 2026"], 40);

    let text = super::read_image(&path).unwrap();
    let _    = std::fs::remove_file(&path);
    println!("language: {:?}, text: {text:?}", super::ocr::language());
    assert!(text.contains("Hola Glup 2026"), "{text}");
}

const PAGE: [&str; 24] = [
    "CONTRATO DE ARRENDAMIENTO DE VIVIENDA",
    "",
    "Conste por el presente documento el contrato de arrendamiento que celebran,",
    "de una parte, el propietario del inmueble ubicado en la avenida principal",
    "número 1234, y de la otra parte, el arrendatario, en los términos siguientes.",
    "",
    "PRIMERA. El propietario da en arrendamiento el inmueble descrito, que se",
    "encuentra en buen estado de conservación y con todos sus servicios.",
    "",
    "SEGUNDA. El plazo del contrato es de doce meses, contados desde la fecha",
    "de su firma, pudiendo renovarse por acuerdo de ambas partes.",
    "",
    "TERCERA. La renta mensual es de mil doscientos soles, que se pagará por",
    "adelantado dentro de los primeros cinco días de cada mes.",
    "",
    "CUARTA. El arrendatario entrega una garantía equivalente a dos meses de",
    "renta, que le será devuelta al término del contrato.",
    "",
    "QUINTA. Queda prohibido subarrendar el inmueble total o parcialmente sin",
    "autorización escrita del propietario.",
    "",
    "SEXTA. Cualquier controversia se resolverá en los juzgados de la ciudad.",
    "",
    "Firmado en señal de conformidad el día veintidós de noviembre de 2026.",
];

// The numbers for the summary: a photo of a document (12 MP) and five scanned pages as pdf.js renders them.
#[test]
#[ignore]
fn real_ocr_times_for_a_photo_and_five_scanned_pages() {
    let photo = temp_file("foto.png");
    draw_text(&photo, (4000, 3000), &PAGE, 44);
    let start = Instant::now();
    let text  = super::read_image(&photo).unwrap();
    println!("foto 4000x3000: {:.2} s, {} caracteres", start.elapsed().as_secs_f64(), text.chars().count());
    assert!(text.contains("ARRENDAMIENTO"));
    let _ = std::fs::remove_file(&photo);

    // A4 at scale 2 (what "A imágenes" uses): 1190 x 1684.
    let page_path = temp_file("pagina.png");
    draw_text(&page_path, (1190, 1684), &PAGE, 16);
    let bytes = std::fs::read(&page_path).unwrap();
    let _     = std::fs::remove_file(&page_path);

    let start = Instant::now();
    for _ in 0..5 {
        assert!(super::read_page(&bytes).unwrap().contains("CONTRATO"));
    }
    println!("5 páginas escaneadas: {:.2} s", start.elapsed().as_secs_f64());
}
