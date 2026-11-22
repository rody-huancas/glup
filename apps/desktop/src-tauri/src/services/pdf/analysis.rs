use std::collections::HashSet;

use lopdf::{Document, Object, ObjectId};
#[cfg(test)]
use lopdf::Dictionary;

// What a PDF's weight is made of (stored bytes, as in the file).
#[derive(Debug, Default)]
pub struct Breakdown {
    pub image_bytes: u64,
    pub mask_bytes: u64,
    pub font_bytes: u64,
    pub content_bytes: u64,
    pub form_bytes: u64,
    pub metadata_bytes: u64,
    pub other_bytes: u64,
}

#[cfg(test)]
#[derive(Debug)]
pub struct ImageEntry {
    pub id: ObjectId,
    pub filter: String,
    pub color_space: String,
    pub bits: i64,
    pub width: i64,
    pub height: i64,
    pub has_mask: bool,
    pub bytes: u64,
}

// Why a PDF could not get lighter, in plain words.
pub const MOSTLY_FONTS: &str   = "Este PDF casi no tiene fotos: su peso viene de las letras y fuentes que trae adentro.";
pub const LIGHT_IMAGES: &str   = "Sus imágenes ya están livianas: no hay más que quitar sin que se vean mal.";
pub const MOSTLY_DRAWING: &str = "Su peso viene del dibujo de las páginas (texto y trazos), que ya está comprimido.";
pub const ALREADY_LIGHT: &str  = "Ya está bien optimizado: no encontré nada más que quitar.";

#[cfg(test)]
fn name_list(object: Option<&Object>) -> String {
    match object {
        Some(Object::Name(name)) => String::from_utf8_lossy(name).into_owned(),
        Some(Object::Array(items)) => items
            .iter()
            .filter_map(|item| item.as_name().ok())
            .map(|name| String::from_utf8_lossy(name).into_owned())
            .collect::<Vec<_>>()
            .join("+"),
        Some(Object::Reference(_)) => "ref".to_string(),
        _ => "-".to_string(),
    }
}

#[cfg(test)]
fn color_space(document: &Document, dictionary: &Dictionary) -> String {
    match dictionary.get(b"ColorSpace") {
        Ok(Object::Name(name)) => String::from_utf8_lossy(name).into_owned(),
        Ok(Object::Array(items)) => items.first().and_then(|item| item.as_name().ok()).map(|name| String::from_utf8_lossy(name).into_owned()).unwrap_or_default(),
        Ok(Object::Reference(id)) => match document.get_object(*id) {
            Ok(Object::Name(name)) => String::from_utf8_lossy(name).into_owned(),
            Ok(Object::Array(items)) => items.first().and_then(|item| item.as_name().ok()).map(|name| String::from_utf8_lossy(name).into_owned()).unwrap_or_default(),
            _ => "ref".to_string(),
        },
        _ => "-".to_string(),
    }
}

// Ids referenced from the pages' /Contents (page drawing streams).
fn content_ids(document: &Document) -> HashSet<ObjectId> {
    document
        .get_pages()
        .values()
        .filter_map(|&page| document.get_dictionary(page).ok())
        .flat_map(|page| match page.get(b"Contents") {
            Ok(Object::Reference(id)) => vec![*id],
            Ok(Object::Array(items)) => items.iter().filter_map(|item| item.as_reference().ok()).collect(),
            _ => Vec::new(),
        })
        .collect()
}

// Ids used as soft masks or font programs, to tell them apart from regular images and streams.
fn referenced_by(document: &Document, keys: &[&[u8]]) -> HashSet<ObjectId> {
    document
        .objects
        .values()
        .filter_map(|object| match object {
            Object::Dictionary(dictionary) => Some(dictionary),
            Object::Stream(stream) => Some(&stream.dict),
            _ => None,
        })
        .flat_map(|dictionary| keys.iter().filter_map(|key| dictionary.get(key).and_then(Object::as_reference).ok()))
        .collect()
}

pub fn analyze(document: &Document) -> Breakdown {
    let contents = content_ids(document);
    let masks    = referenced_by(document, &[b"SMask", b"Mask"]);
    let fonts    = referenced_by(document, &[b"FontFile", b"FontFile2", b"FontFile3"]);
    let mut breakdown = Breakdown::default();

    for (id, object) in &document.objects {
        let Object::Stream(stream) = object else { continue };

        let bytes   = stream.content.len() as u64;
        let dict    = &stream.dict;
        let subtype = dict.get(b"Subtype").and_then(Object::as_name).ok();
        let kind    = dict.get(b"Type").and_then(Object::as_name).ok();

        if subtype == Some(b"Image") && masks.contains(id) {
            breakdown.mask_bytes += bytes;
        } else if subtype == Some(b"Image") {
            breakdown.image_bytes += bytes;
        } else if fonts.contains(id) {
            breakdown.font_bytes += bytes;
        } else if contents.contains(id) {
            breakdown.content_bytes += bytes;
        } else if subtype == Some(b"Form") {
            breakdown.form_bytes += bytes;
        } else if kind == Some(b"Metadata") {
            breakdown.metadata_bytes += bytes;
        } else {
            breakdown.other_bytes += bytes;
        }
    }

    breakdown
}

// Picks the plain-language reason from where the weight is.
pub fn explain(breakdown: &Breakdown) -> &'static str {
    let images  = breakdown.image_bytes + breakdown.mask_bytes;
    let fonts   = breakdown.font_bytes;
    let drawing = breakdown.content_bytes + breakdown.form_bytes;
    let biggest = images.max(fonts).max(drawing);

    if biggest == 0 {
        ALREADY_LIGHT
    } else if biggest == fonts {
        MOSTLY_FONTS
    } else if biggest == images {
        LIGHT_IMAGES
    } else {
        MOSTLY_DRAWING
    }
}

// Every image with its filter, color space, bits, size and mask (for the analysis test).
#[cfg(test)]
pub fn image_entries(document: &Document) -> Vec<ImageEntry> {
    document
        .objects
        .iter()
        .filter_map(|(id, object)| object.as_stream().ok().map(|stream| (id, stream)))
        .filter(|(_, stream)| stream.dict.get(b"Subtype").and_then(Object::as_name).is_ok_and(|name| name == b"Image"))
        .map(|(id, stream)| {
            let dict = &stream.dict;

            ImageEntry {
                id          : *id,
                filter      : name_list(dict.get(b"Filter").ok()),
                color_space : color_space(document, dict),
                bits        : dict.get(b"BitsPerComponent").and_then(Object::as_i64).unwrap_or(0),
                width       : dict.get(b"Width").and_then(Object::as_i64).unwrap_or(0),
                height      : dict.get(b"Height").and_then(Object::as_i64).unwrap_or(0),
                has_mask    : dict.has(b"SMask") || dict.has(b"Mask"),
                bytes       : stream.content.len() as u64,
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use std::path::Path;

    use super::*;

    // Prints the breakdown of the PDF in GLUP_ANALYZE_PDF (run with --ignored --nocapture).
    #[test]
    #[ignore]
    fn prints_breakdown() {
        let Ok(path) = std::env::var("GLUP_ANALYZE_PDF") else { return };
        let bytes    = std::fs::metadata(&path).unwrap().len();
        let document = Document::load(Path::new(&path)).unwrap();
        let report   = analyze(&document);
        let kb       = |value: u64| format!("{:.1} KB", value as f64 / 1024.0);

        println!("\n=== {path}");
        println!("páginas {} · archivo {} · versión {}", document.get_pages().len(), kb(bytes), document.version);
        println!(
            "imágenes {} · máscaras {} · fuentes {} · contenido {} · forms {} · metadatos {} · otros {}",
            kb(report.image_bytes),
            kb(report.mask_bytes),
            kb(report.font_bytes),
            kb(report.content_bytes),
            kb(report.form_bytes),
            kb(report.metadata_bytes),
            kb(report.other_bytes),
        );

        let mut images = image_entries(&document);
        images.sort_by_key(|image| std::cmp::Reverse(image.bytes));

        for image in images.iter().take(12) {
            println!(
                "  img {:?}: {} · {} · {} bits · {}x{} · máscara {} · {}",
                image.id, image.filter, image.color_space, image.bits, image.width, image.height, image.has_mask, kb(image.bytes),
            );
        }

        println!("  … {} imágenes en total · motivo: {}", images.len(), explain(&report));
    }
}
