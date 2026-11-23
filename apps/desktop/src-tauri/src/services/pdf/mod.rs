pub mod analysis;
pub mod info;
pub mod merge;
pub mod organize;
pub mod reduce;
pub mod save_images;
pub mod sign;
pub mod split;

#[cfg(test)]
mod tests;

use std::{collections::BTreeMap, path::Path};

use lopdf::{dictionary, Document, Object, ObjectId};

pub type PdfResult<T> = Result<T, String>;

pub const PASSWORD_ERROR: &str = "Este PDF tiene contraseña, todavía no puedo abrirlo";
pub const PDF_READ_ERROR: &str = "No pude leer el PDF";
pub const PDF_WRITE_ERROR: &str = "No pude crear el PDF";

// Attributes a page can inherit from its parents in the page tree.
const INHERITED_KEYS: [&[u8]; 4] = [b"Resources", b"MediaBox", b"CropBox", b"Rotate"];
const MAX_TREE_DEPTH: usize     = 32;

// Loads a PDF; documents that need a password are refused (an empty user password is fine).
pub fn load(path: &Path) -> PdfResult<Document> {
    let document = Document::load(path).map_err(|error| match error {
        lopdf::Error::Decryption(_) => PASSWORD_ERROR.to_string(),
        _                           => PDF_READ_ERROR.to_string(),
    })?;

    if document.is_encrypted() {
        return Err(PASSWORD_ERROR.to_string());
    }

    Ok(document)
}

pub fn load_bytes(bytes: &[u8]) -> PdfResult<Document> {
    Document::load_mem(bytes).map_err(|_| PDF_READ_ERROR.to_string())
}

pub fn save(document: &mut Document) -> PdfResult<Vec<u8>> {
    let mut buffer = Vec::new();
    document.save_to(&mut buffer).map_err(|_| PDF_WRITE_ERROR.to_string())?;
    Ok(buffer)
}

// Copies inherited attributes (resources, boxes, rotation) onto the page, so it stands on its own
// once the intermediate nodes of the page tree are dropped.
pub(crate) fn own_inherited(document: &mut Document, page_id: ObjectId) {
    let mut inherited: Vec<(Vec<u8>, Object)> = Vec::new();
    let mut parent = document.get_dictionary(page_id).ok().and_then(|page| page.get(b"Parent").and_then(Object::as_reference).ok());

    for _ in 0..MAX_TREE_DEPTH {
        let Some(node_id) = parent else { break };
        let Ok(node) = document.get_dictionary(node_id) else { break };
        let Ok(page) = document.get_dictionary(page_id) else { break };

        for key in INHERITED_KEYS {
            let missing = !page.has(key) && !inherited.iter().any(|(name, _)| name.as_slice() == key);
            if let (true, Ok(value)) = (missing, node.get(key)) {
                inherited.push((key.to_vec(), value.clone()));
            }
        }

        parent = node.get(b"Parent").and_then(Object::as_reference).ok();
    }

    if let Ok(page) = document.get_dictionary_mut(page_id) {
        inherited.into_iter().for_each(|(key, value)| page.set(key, value));
    }
}

// Pages of one source document to put in the result, in that order (1-based numbers).
pub struct PagePick {
    pub document: Document,
    pub pages: Vec<u32>,
}

impl PagePick {
    pub fn all(document: Document) -> Self {
        let pages = document.get_pages().keys().copied().collect();
        Self { document, pages }
    }
}

// Builds a new PDF from the picked pages of one or more documents, in order.
// Objects are renumbered per document, so internal links between kept pages still work;
// outlines (bookmarks) and named destinations belong to the old catalogs and are not carried over.
pub fn assemble(picks: Vec<PagePick>) -> PdfResult<Vec<u8>> {
    let mut objects: BTreeMap<ObjectId, Object> = BTreeMap::new();
    let mut kids: Vec<ObjectId>                = Vec::new();
    let mut next_id                            = 1;

    for PagePick { mut document, pages } in picks {
        let numbered = document.get_pages();
        pages.iter().filter_map(|number| numbered.get(number)).for_each(|&page_id| own_inherited(&mut document, page_id));

        document.renumber_objects_with(next_id);
        next_id = document.max_id + 1;

        let numbered = document.get_pages();
        kids.extend(pages.iter().filter_map(|number| numbered.get(number).copied()));

        objects.extend(document.objects.into_iter().filter(|(_, object)| {
            let kind = object.as_dict().ok().and_then(|dict| dict.get(b"Type").and_then(Object::as_name).ok());
            !matches!(kind, Some(b"Catalog" | b"Pages" | b"Outlines"))
        }));
    }

    if kids.is_empty() {
        return Err(PDF_WRITE_ERROR.to_string());
    }

    let mut result = Document::with_version("1.7");
    let pages_id   = (next_id, 0);
    let catalog_id = (next_id + 1, 0);

    for kid in &kids {
        if let Some(Object::Dictionary(page)) = objects.get_mut(kid) {
            page.set("Parent", pages_id);
        }
    }

    result.objects   = objects;
    result.max_id    = next_id + 1;
    let count        = kids.len() as i64;
    let kids: Vec<_> = kids.into_iter().map(Object::Reference).collect();

    result.objects.insert(pages_id, Object::Dictionary(dictionary! { "Type" => "Pages", "Kids" => kids, "Count" => count }));
    result.objects.insert(catalog_id, Object::Dictionary(dictionary! { "Type" => "Catalog", "Pages" => pages_id }));
    result.trailer.set("Root", catalog_id);

    result.prune_objects();
    result.renumber_objects();
    result.compress();

    save(&mut result)
}
