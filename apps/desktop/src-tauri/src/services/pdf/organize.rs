use std::collections::HashSet;

use lopdf::{Document, Object};
use serde::Deserialize;

use crate::services::pdf::{assemble, own_inherited, PagePick, PdfResult};

pub const ORGANIZED_SUFFIX: &str = "organizado";
pub const ORGANIZE_ERROR: &str   = "Esas páginas no se pueden organizar así";

const QUARTER_TURN: u32 = 90;
const FULL_TURN: i64    = 360;

// One page of the result, in the new order: its number in the original (1-based) and the turn added
// on top of the one it already had (0, 90, 180 or 270, clockwise).
#[derive(Clone, Copy, Debug, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OrganizedPage {
    pub page     : u32,
    pub rotation : u32,
}

pub struct OrganizeParams<'a> {
    pub document : Document,
    pub pages    : &'a [OrganizedPage],
}

// What changed, for the history line.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct OrganizeSummary {
    pub kept    : u32,
    pub removed : u32,
    pub rotated : u32,
}

// At least one page, each one present once, and only quarter turns.
pub fn is_valid(pages: &[OrganizedPage], total: u32) -> bool {
    let mut seen = HashSet::new();

    !pages.is_empty()
        && pages.iter().all(|item| {
            item.page >= 1 && item.page <= total && item.rotation < 360 && item.rotation % QUARTER_TURN == 0 && seen.insert(item.page)
        })
}

pub fn summarize(pages: &[OrganizedPage], total: u32) -> OrganizeSummary {
    let kept = pages.len() as u32;

    OrganizeSummary {
        kept,
        removed : total.saturating_sub(kept),
        rotated : pages.iter().filter(|item| item.rotation != 0).count() as u32,
    }
}

// "Organizado · 12 páginas (2 quitadas, 3 giradas)"; only what happened goes in the parentheses.
pub fn detail(summary: OrganizeSummary) -> String {
    let plural = |count: u32, one: &str, many: &str| format!("{count} {}", if count == 1 { one } else { many });
    let pages  = plural(summary.kept, "página", "páginas");

    let mut changes = Vec::new();
    if summary.removed > 0 {
        changes.push(plural(summary.removed, "quitada", "quitadas"));
    }
    if summary.rotated > 0 {
        changes.push(plural(summary.rotated, "girada", "giradas"));
    }

    if changes.is_empty() { format!("Organizado · {pages}") } else { format!("Organizado · {pages} ({})", changes.join(", ")) }
}

// The rotation a page will have: the one it had (its own or inherited) plus the turn added.
pub fn combined_rotation(current: i64, added: u32) -> i64 {
    (current + added as i64).rem_euclid(FULL_TURN)
}

fn current_rotation(document: &Document, page_id: lopdf::ObjectId) -> i64 {
    let Ok(page) = document.get_dictionary(page_id) else { return 0 };
    let Ok(value) = page.get(b"Rotate") else { return 0 };

    document.dereference(value).ok().and_then(|(_, value)| value.as_i64().ok()).unwrap_or(0)
}

// A new PDF with the pages in the new order, each one turned as asked. Page contents are copied as
// they are (nothing is re-encoded) and links between kept pages keep working, as in "Separar".
pub fn organize(params: OrganizeParams) -> PdfResult<Vec<u8>> {
    let OrganizeParams { mut document, pages } = params;
    let numbered = document.get_pages();

    for item in pages {
        let Some(&page_id) = numbered.get(&item.page) else { continue };

        // Inherited first, so a /Rotate that came from the page tree is the one that gets added to.
        own_inherited(&mut document, page_id);
        let rotation = combined_rotation(current_rotation(&document, page_id), item.rotation);

        if let Ok(page) = document.get_dictionary_mut(page_id) {
            page.set("Rotate", Object::Integer(rotation));
        }
    }

    assemble(vec![PagePick { document, pages: pages.iter().map(|item| item.page).collect() }])
}
