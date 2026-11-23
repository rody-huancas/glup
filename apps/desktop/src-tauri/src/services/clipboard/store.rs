// The list of what was copied, kept pure: a repeated copy goes back to the top instead of twice, the
// oldest that are not pinned go away past the limit, pinned ones stay on top.
use serde::{Deserialize, Serialize};

pub const DEFAULT_LIMIT: u32 = 200;
pub const MIN_LIMIT: u32     = 10;
pub const MAX_LIMIT: u32     = 1000;
// What a line shows of a text: its first lines, up to this many characters.
pub const PREVIEW_LINES: usize = 3;
pub const PREVIEW_CHARS: usize = 280;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ClipKind {
    Text,
    Image,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClipItem {
    // The hash of the content: the same copy always has the same id.
    pub id     : String,
    pub kind   : ClipKind,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub text   : Option<String>,
    #[serde(default)]
    pub width  : u32,
    #[serde(default)]
    pub height : u32,
    // The program it came from ("Google Chrome"), when Windows says.
    #[serde(default)]
    pub source : Option<String>,
    pub date   : String,
    #[serde(default)]
    pub pinned : bool,
}

// What a line of the screen needs (the whole text stays in Rust).
#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClipView {
    pub id      : String,
    pub kind    : ClipKind,
    pub preview : String,
    pub width   : u32,
    pub height  : u32,
    pub source  : Option<String>,
    pub date    : String,
    pub pinned  : bool,
}

pub fn clamp_limit(limit: Option<u32>) -> usize {
    limit.unwrap_or(DEFAULT_LIMIT).clamp(MIN_LIMIT, MAX_LIMIT) as usize
}

// Past the limit the oldest that are not pinned go; returns the list and the ids that left.
pub fn trim(mut items: Vec<ClipItem>, limit: usize) -> (Vec<ClipItem>, Vec<String>) {
    let mut dropped = Vec::new();

    while items.len() > limit {
        let Some(oldest) = items.iter().rposition(|item| !item.pinned) else { break };
        dropped.push(items.remove(oldest).id);
    }

    (items, dropped)
}

// A new copy goes on top. Copying the same again moves it up (it keeps its pin) instead of repeating it.
pub fn add(items: Vec<ClipItem>, item: ClipItem, limit: usize) -> (Vec<ClipItem>, Vec<String>) {
    let pinned   = items.iter().any(|current| current.id == item.id && current.pinned);
    let mut next = vec![ClipItem { pinned, ..item }];
    let id       = next[0].id.clone();
    next.extend(items.into_iter().filter(|current| current.id != id));

    trim(next, limit)
}

// Copied again from the list: back to the top, with the time of now.
pub fn touch(items: Vec<ClipItem>, id: &str, date: &str) -> Vec<ClipItem> {
    let Some(found) = items.iter().find(|item| item.id == id).cloned() else { return items };

    let mut next = vec![ClipItem { date: date.to_string(), ..found }];
    next.extend(items.into_iter().filter(|item| item.id != id));
    next
}

pub fn remove(items: Vec<ClipItem>, ids: &[String]) -> Vec<ClipItem> {
    items.into_iter().filter(|item| !ids.contains(&item.id)).collect()
}

pub fn set_pinned(items: Vec<ClipItem>, id: &str, pinned: bool) -> Vec<ClipItem> {
    items.into_iter().map(|item| if item.id == id { ClipItem { pinned, ..item } } else { item }).collect()
}

// Accents and capitals do not matter when searching: "cancion" finds "Canción".
pub fn fold(text: &str) -> String {
    text.chars()
        .flat_map(char::to_lowercase)
        .map(|letter| match letter {
            'á' | 'à' | 'â' | 'ä' | 'ã' => 'a',
            'é' | 'è' | 'ê' | 'ë'       => 'e',
            'í' | 'ì' | 'î' | 'ï'       => 'i',
            'ó' | 'ò' | 'ô' | 'ö' | 'õ' => 'o',
            'ú' | 'ù' | 'û' | 'ü'       => 'u',
            'ç'                         => 'c',
            other                       => other,
        })
        .collect()
}

// Every word typed has to be in the text or in the program's name, in any order.
pub fn matches(item: &ClipItem, query: &str) -> bool {
    let words: Vec<String> = fold(query).split_whitespace().map(str::to_string).collect();
    if words.is_empty() {
        return true;
    }

    let haystack = fold(&format!("{} {}", item.text.as_deref().unwrap_or_default(), item.source.as_deref().unwrap_or_default()));
    words.iter().all(|word| haystack.contains(word.as_str()))
}

// The first lines of a text, on as little room as a line needs.
pub fn preview(text: &str) -> String {
    let lines: Vec<&str> = text.lines().map(str::trim_end).filter(|line| !line.trim().is_empty()).take(PREVIEW_LINES).collect();
    let joined           = lines.join("\n");

    if joined.chars().count() > PREVIEW_CHARS {
        format!("{}…", joined.chars().take(PREVIEW_CHARS).collect::<String>().trim_end())
    } else {
        joined
    }
}

// Pinned on top, then from the newest to the oldest; only what the search finds.
pub fn view(items: &[ClipItem], query: &str) -> Vec<ClipView> {
    let found = items.iter().filter(|item| matches(item, query));
    let (pinned, rest): (Vec<&ClipItem>, Vec<&ClipItem>) = found.partition(|item| item.pinned);

    pinned
        .into_iter()
        .chain(rest)
        .map(|item| ClipView {
            id      : item.id.clone(),
            kind    : item.kind,
            preview : item.text.as_deref().map(preview).unwrap_or_default(),
            width   : item.width,
            height  : item.height,
            source  : item.source.clone(),
            date    : item.date.clone(),
            pinned  : item.pinned,
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn text(id: &str) -> ClipItem {
        ClipItem { id: id.to_string(), kind: ClipKind::Text, text: Some(format!("texto {id}")), width: 0, height: 0, source: None, date: String::new(), pinned: false }
    }

    fn ids(items: &[ClipItem]) -> Vec<&str> {
        items.iter().map(|item| item.id.as_str()).collect()
    }

    #[test]
    fn a_repeated_copy_goes_back_to_the_top_once() {
        let (items, _) = add(vec![text("c"), text("b"), text("a")], text("a"), 10);
        assert_eq!(ids(&items), ["a", "c", "b"]);
    }

    #[test]
    fn a_repeated_copy_keeps_its_pin() {
        let items      = set_pinned(vec![text("b"), text("a")], "a", true);
        let (items, _) = add(items, text("a"), 10);

        assert_eq!(ids(&items), ["a", "b"]);
        assert!(items[0].pinned);
    }

    #[test]
    fn past_the_limit_the_oldest_unpinned_go_and_pinned_stay() {
        let items            = set_pinned(vec![text("c"), text("b"), text("a")], "a", true);
        let (items, dropped) = add(items, text("d"), 3);

        assert_eq!(ids(&items), ["d", "c", "a"]);
        assert_eq!(dropped, ["b"]);
    }

    #[test]
    fn pinned_ones_never_go_even_over_the_limit() {
        let items            = set_pinned(set_pinned(vec![text("b"), text("a")], "a", true), "b", true);
        let (items, dropped) = add(items, text("c"), 2);

        assert_eq!(ids(&items), ["b", "a"]);
        assert_eq!(dropped, ["c"]);
    }

    #[test]
    fn a_lower_limit_trims_from_the_end() {
        let (items, dropped) = trim(vec![text("c"), text("b"), text("a")], 1);
        assert_eq!(ids(&items), ["c"]);
        assert_eq!(dropped, ["a", "b"]);
        assert_eq!(clamp_limit(None), 200);
        assert_eq!(clamp_limit(Some(1)), MIN_LIMIT as usize);
        assert_eq!(clamp_limit(Some(99_999)), MAX_LIMIT as usize);
    }

    #[test]
    fn copying_again_from_the_list_moves_it_up() {
        let items = touch(vec![text("b"), text("a")], "a", "ahora");
        assert_eq!(ids(&items), ["a", "b"]);
        assert_eq!(items[0].date, "ahora");
        assert_eq!(ids(&touch(items, "x", "ahora")), ["a", "b"]);
    }

    #[test]
    fn removing_and_pinning() {
        let items = remove(vec![text("c"), text("b"), text("a")], &["b".to_string()]);
        assert_eq!(ids(&items), ["c", "a"]);

        let shown = view(&set_pinned(items, "a", true), "");
        assert_eq!(shown.iter().map(|item| item.id.as_str()).collect::<Vec<_>>(), ["a", "c"]);
    }

    #[test]
    fn the_search_ignores_accents_and_capitals_and_looks_at_the_program() {
        let song   = ClipItem { text: Some("La Canción del verano".to_string()), source: Some("Bloc de notas".to_string()), ..text("x") };
        let others = vec![song.clone(), text("y")];

        assert!(matches(&song, "cancion VERANO"));
        assert!(matches(&song, "notas"));
        assert!(!matches(&song, "invierno"));
        assert_eq!(view(&others, "cancion").len(), 1);
        assert_eq!(view(&others, "  ").len(), 2);
    }

    #[test]
    fn a_text_shows_its_first_lines() {
        assert_eq!(preview("uno\n\n dos\ntres\ncuatro"), "uno\n dos\ntres");
        assert!(preview(&"a".repeat(400)).ends_with('…'));
    }
}
