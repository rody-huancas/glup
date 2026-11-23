// Which language the OCR reads in. Pure: the lists come from Windows.
pub const SPANISH: &str = "es";

// "es-PE" → "es".
fn base(tag: &str) -> String {
    tag.split(['-', '_']).next().unwrap_or(tag).to_ascii_lowercase()
}

// The first of the person's languages that Windows can read (by its base: "es-PE" matches "es-ES");
// otherwise Spanish if it is there; otherwise the first one installed.
pub fn choose_language(preferred: &[String], available: &[String]) -> Option<String> {
    let find = |wanted: &str| available.iter().find(|tag| base(tag) == wanted).cloned();

    preferred
        .iter()
        .find_map(|tag| available.iter().find(|candidate| candidate.eq_ignore_ascii_case(tag)).cloned().or_else(|| find(&base(tag))))
        .or_else(|| find(SPANISH))
        .or_else(|| available.first().cloned())
}
