// PDFs are generated in the system temp folder; every page gets a distinct width so order can be checked.
use std::{fs, path::PathBuf};

use image::{DynamicImage, Rgb, RgbImage};
use lopdf::{dictionary, Document, Object};

use super::{
    assemble, info, load, load_bytes,
    merge::{merge, page_count, pick},
    organize::{combined_rotation, detail, is_valid, organize, summarize, OrganizeParams, OrganizeSummary, OrganizedPage},
    reduce::{reduce, NORMAL_PROFILE},
    split::{extract_page, extract_pages, page_stem, ranges_label, selection_stem},
    PagePick,
};
use crate::services::image::to_pdf::PdfBuilder;

struct Folder(PathBuf);

impl Folder {
    fn new(name: &str) -> Self {
        let path = std::env::temp_dir().join(format!("glup-pdf-tests-{}-{name}", std::process::id()));
        let _    = fs::remove_dir_all(&path);
        fs::create_dir_all(&path).unwrap();
        Self(path)
    }
}

impl Drop for Folder {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}

// Pages share their Resources through the parent Pages node, so assembling must copy them down.
fn sample(widths: &[i64]) -> Document {
    let mut document = Document::with_version("1.7");
    let pages_id     = document.new_object_id();
    let font_id      = document.add_object(dictionary! { "Type" => "Font", "Subtype" => "Type1", "BaseFont" => "Helvetica" });

    let kids: Vec<Object> = widths
        .iter()
        .map(|&width| {
            let content = document.add_object(lopdf::Stream::new(dictionary! {}, b"BT /F1 24 Tf 72 720 Td (Glup) Tj ET".to_vec()));
            let page    = document.add_object(dictionary! {
                "Type"     => "Page",
                "Parent"   => pages_id,
                "MediaBox" => vec![0.into(), 0.into(), width.into(), 842.into()],
                "Contents" => content,
            });
            page.into()
        })
        .collect();

    let count = kids.len() as i64;
    document.objects.insert(
        pages_id,
        Object::Dictionary(dictionary! {
            "Type"      => "Pages",
            "Kids"      => kids,
            "Count"     => count,
            "Resources" => dictionary! { "Font" => dictionary! { "F1" => font_id } },
        }),
    );

    let catalog = document.add_object(dictionary! { "Type" => "Catalog", "Pages" => pages_id });
    document.trailer.set("Root", catalog);
    document
}

fn widths(bytes: &[u8]) -> Vec<i64> {
    let document = load_bytes(bytes).unwrap();

    document
        .get_pages()
        .values()
        .map(|&id| {
            let page = document.get_dictionary(id).unwrap();
            page.get(b"MediaBox").unwrap().as_array().unwrap()[2].as_float().unwrap().round() as i64
        })
        .collect()
}

fn has_own_resources(bytes: &[u8]) -> bool {
    let document = load_bytes(bytes).unwrap();
    document.get_pages().values().all(|&id| document.get_dictionary(id).unwrap().has(b"Resources"))
}

fn photo(width: u32, height: u32, seed: u32) -> Vec<u8> {
    let image = RgbImage::from_fn(width, height, |x, y| {
        let noise = ((x * 7919 + y * 104_729 + seed * 31) % 29) as u8;
        Rgb([((x * 255 / width) as u8).saturating_add(noise), ((y * 255 / height) as u8).saturating_add(noise), 120 + noise / 2])
    });

    let mut buffer = Vec::new();
    DynamicImage::ImageRgb8(image).write_with_encoder(image::codecs::jpeg::JpegEncoder::new_with_quality(&mut buffer, 95)).unwrap();
    buffer
}

#[test]
fn merges_documents_in_order_keeping_resources() {
    let merged = assemble(vec![PagePick::all(sample(&[500, 501])), PagePick::all(sample(&[600, 601, 602]))]).unwrap();

    assert_eq!(widths(&merged), vec![500, 501, 600, 601, 602]);
    assert!(has_own_resources(&merged), "inherited resources must be copied onto each page");
}

#[test]
fn merges_pdfs_and_images_from_files() {
    let folder = Folder::new("merge");
    let pdf    = folder.0.join("contrato.pdf");
    let photo1 = folder.0.join("foto.jpg");

    sample(&[500, 501]).save(&pdf).unwrap();
    fs::write(&photo1, photo(800, 600, 1)).unwrap();

    let picks = vec![pick(&pdf).unwrap(), pick(&photo1).unwrap()];
    assert_eq!(page_count(&picks), 3);

    let merged = merge(picks).unwrap();
    let pages  = widths(&merged);

    assert_eq!(pages.len(), 3);
    assert_eq!(&pages[..2], &[500, 501]);
}

#[test]
fn splits_every_page_and_chosen_pages_in_order() {
    let document = sample(&[500, 501, 502, 503]);

    for page in 1..=4u32 {
        assert_eq!(widths(&extract_page(&document, page).unwrap()), vec![499 + i64::from(page)]);
    }

    let chosen = extract_pages(document, vec![4, 1, 2]).unwrap();
    assert_eq!(widths(&chosen), vec![503, 500, 501]);
    assert!(has_own_resources(&chosen));
}

#[test]
fn names_pages_and_selections() {
    assert_eq!(page_stem("contrato", 3, 12), "contrato-p03");
    assert_eq!(page_stem("contrato", 7, 120), "contrato-p007");
    assert_eq!(ranges_label(&[1, 2, 3, 5, 8, 9, 10]), "1-3-5-8-10");
    assert_eq!(ranges_label(&[8, 9, 1]), "8-9-1");
    assert_eq!(selection_stem("contrato", &[1, 2, 3, 5, 8, 9, 10]), "contrato-paginas-1-3-5-8-10");

    let many: Vec<u32> = (1..=60).step_by(2).collect();
    assert_eq!(selection_stem("contrato", &many), "contrato-seleccion");
}

#[test]
fn reads_page_count_without_password() {
    let folder = Folder::new("info");
    let path   = folder.0.join("contrato.pdf");
    sample(&[500, 501, 502]).save(&path).unwrap();

    let read = info::read(&path).unwrap();
    assert_eq!(read.pages, 3);
    assert!(!read.protected);
    assert!(load(&path).is_ok());
}

#[test]
fn reduces_a_pdf_with_photos() {
    let folder = Folder::new("reduce");
    let source = folder.0.join("fotos.pdf");

    let mut builder = PdfBuilder::new();
    for seed in 0..3 {
        let path = folder.0.join(format!("foto-{seed}.jpg"));
        fs::write(&path, photo(3000, 2000, seed)).unwrap();
        builder.add_image(&path).unwrap();
    }
    fs::write(&source, builder.finish().unwrap()).unwrap();

    let before  = fs::metadata(&source).unwrap().len();
    let reduced = reduce(&source, &NORMAL_PROFILE).unwrap().bytes;
    let after   = reduced.len() as u64;

    println!(
        "\n[reducir peso PDF] 3 fotos 3000x2000 · {:.1} MB → {:.1} MB ({:.0} % menos)",
        before as f64 / 1_048_576.0,
        after as f64 / 1_048_576.0,
        (1.0 - after as f64 / before as f64) * 100.0,
    );

    assert!(after < before);
    assert_eq!(load_bytes(&reduced).unwrap().get_pages().len(), 3);
}

fn pick_pages(pages: &[(u32, u32)]) -> Vec<OrganizedPage> {
    pages.iter().map(|&(page, rotation)| OrganizedPage { page, rotation }).collect()
}

fn rotations(bytes: &[u8]) -> Vec<i64> {
    let document = load_bytes(bytes).unwrap();

    document
        .get_pages()
        .values()
        .map(|&id| document.get_dictionary(id).unwrap().get(b"Rotate").and_then(Object::as_i64).unwrap_or(0))
        .collect()
}

// Page 1 links to page 3; `rotated_at` gives one page its own /Rotate.
fn sample_with_link(widths: &[i64], rotated_at: Option<(u32, i64)>) -> Document {
    let mut document = sample(widths);
    let pages        = document.get_pages();
    let target       = pages[&3];
    let link         = document.add_object(dictionary! {
        "Type"    => "Annot",
        "Subtype" => "Link",
        "Rect"    => vec![0.into(), 0.into(), 100.into(), 100.into()],
        "Dest"    => vec![target.into(), "Fit".into()],
    });

    document.get_dictionary_mut(pages[&1]).unwrap().set("Annots", vec![Object::Reference(link)]);
    if let Some((page, rotation)) = rotated_at {
        document.get_dictionary_mut(pages[&page]).unwrap().set("Rotate", rotation);
    }
    document
}

#[test]
fn organizes_pages_in_the_new_order() {
    let bytes = organize(OrganizeParams { document: sample(&[201, 202, 203, 204]), pages: &pick_pages(&[(4, 0), (2, 0), (1, 0), (3, 0)]) }).unwrap();
    assert_eq!(widths(&bytes), vec![204, 202, 201, 203]);
    assert!(has_own_resources(&bytes));
}

#[test]
fn organizing_drops_the_removed_pages() {
    let bytes = organize(OrganizeParams { document: sample(&[201, 202, 203, 204, 205]), pages: &pick_pages(&[(1, 0), (3, 0), (5, 0)]) }).unwrap();
    assert_eq!(widths(&bytes), vec![201, 203, 205]);
}

#[test]
fn rotation_adds_to_the_one_a_page_already_had() {
    let document = sample_with_link(&[201, 202, 203], Some((2, 270)));
    let bytes    = organize(OrganizeParams { document, pages: &pick_pages(&[(1, 90), (2, 180), (3, 0)]) }).unwrap();

    assert_eq!(rotations(&bytes), vec![90, 90, 0]);
    assert_eq!(combined_rotation(-90, 90), 0);
    assert_eq!(combined_rotation(450, 0), 90);
}

#[test]
fn rotation_inherited_from_the_page_tree_is_kept() {
    let mut document = sample(&[201, 202]);
    let pages_id     = document.catalog().unwrap().get(b"Pages").unwrap().as_reference().unwrap();
    document.get_dictionary_mut(pages_id).unwrap().set("Rotate", 90);

    let bytes = organize(OrganizeParams { document, pages: &pick_pages(&[(2, 90), (1, 0)]) }).unwrap();
    assert_eq!(rotations(&bytes), vec![180, 90]);
}

#[test]
fn reorders_removes_and_rotates_together_keeping_links() {
    let document = sample_with_link(&[201, 202, 203, 204], Some((3, 90)));
    let bytes    = organize(OrganizeParams { document, pages: &pick_pages(&[(3, 90), (1, 0), (4, 270)]) }).unwrap();

    assert_eq!(widths(&bytes), vec![203, 201, 204]);
    assert_eq!(rotations(&bytes), vec![180, 0, 270]);

    // The link on the old page 1 (now the second) still points at the old page 3 (now the first).
    let result = load_bytes(&bytes).unwrap();
    let pages  = result.get_pages();
    let annots = result.get_dictionary(pages[&2]).unwrap().get(b"Annots").unwrap().as_array().unwrap().clone();
    let link   = result.get_dictionary(annots[0].as_reference().unwrap()).unwrap();
    let dest   = link.get(b"Dest").unwrap().as_array().unwrap();
    assert_eq!(dest[0].as_reference().unwrap(), pages[&1]);
}

#[test]
fn validates_the_organized_pages() {
    assert!(is_valid(&pick_pages(&[(2, 0), (1, 270)]), 3));
    assert!(!is_valid(&[], 3));
    assert!(!is_valid(&pick_pages(&[(4, 0)]), 3));
    assert!(!is_valid(&pick_pages(&[(0, 0)]), 3));
    assert!(!is_valid(&pick_pages(&[(1, 0), (1, 90)]), 3));
    assert!(!is_valid(&pick_pages(&[(1, 45)]), 3));
    assert!(!is_valid(&pick_pages(&[(1, 360)]), 3));
}

#[test]
fn describes_what_was_organized() {
    let summary = summarize(&pick_pages(&[(1, 90), (3, 0), (4, 180), (5, 270)]), 6);
    assert_eq!(summary, OrganizeSummary { kept: 4, removed: 2, rotated: 3 });
    assert_eq!(detail(summary), "Organizado · 4 páginas (2 quitadas, 3 giradas)");
    assert_eq!(detail(OrganizeSummary { kept: 12, removed: 0, rotated: 0 }), "Organizado · 12 páginas");
    assert_eq!(detail(OrganizeSummary { kept: 1, removed: 1, rotated: 0 }), "Organizado · 1 página (1 quitada)");
    assert_eq!(detail(OrganizeSummary { kept: 3, removed: 0, rotated: 1 }), "Organizado · 3 páginas (1 girada)");
}
