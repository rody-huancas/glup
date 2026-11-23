// What is never kept: what Windows marks as private (password managers do) and what comes from a program
// the person excluded in Ajustes. Decided before the content is even read.
use std::path::Path;

// The formats Windows' own clipboard history respects.
pub const EXCLUDE_FORMAT: &str = "ExcludeClipboardContentFromMonitorProcessing";
pub const HISTORY_FORMAT: &str = "CanIncludeInClipboardHistory";
pub const CLOUD_FORMAT: &str   = "CanUploadToCloudClipboard";

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct PrivacyMarks {
    // ExcludeClipboardContentFromMonitorProcessing is there (its value does not matter).
    pub exclude : bool,
    // The DWORD of CanIncludeInClipboardHistory and CanUploadToCloudClipboard, when there.
    pub history : Option<u32>,
    pub cloud   : Option<u32>,
}

pub fn is_private(marks: PrivacyMarks) -> bool {
    marks.exclude || marks.history == Some(0) || marks.cloud == Some(0)
}

// "C:\Program Files\Banco\banco.exe" → "banco.exe", as the list of Ajustes keeps it.
pub fn exe_name(path: &str) -> Option<String> {
    Path::new(path).file_name().map(|name| name.to_string_lossy().into_owned())
}

pub fn is_excluded(source_path: Option<&str>, excluded: &[String]) -> bool {
    let Some(name) = source_path.and_then(exe_name) else { return false };
    excluded.iter().any(|program| program.eq_ignore_ascii_case(&name))
}

pub struct KeepParams<'a> {
    pub marks    : PrivacyMarks,
    // The process that copied it, and its file.
    pub pid      : Option<u32>,
    pub path     : Option<&'a str>,
    // Glup's own process: what it copies ("Copiar texto de la pantalla", "Copiar de nuevo") is not repeated.
    pub own      : u32,
    pub excluded : &'a [String],
}

// Whether a copy may be kept: not private, not from an excluded program and not Glup's own.
pub fn keep(params: KeepParams) -> bool {
    !is_private(params.marks) && params.pid != Some(params.own) && !is_excluded(params.path, params.excluded)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn what_password_managers_mark_is_never_kept() {
        assert!(!is_private(PrivacyMarks::default()));
        assert!(is_private(PrivacyMarks { exclude: true, ..Default::default() }));
        assert!(is_private(PrivacyMarks { history: Some(0), ..Default::default() }));
        assert!(is_private(PrivacyMarks { cloud: Some(0), ..Default::default() }));
    }

    #[test]
    fn allowed_marks_do_not_hide_it() {
        assert!(!is_private(PrivacyMarks { history: Some(1), cloud: Some(1), exclude: false }));
    }

    #[test]
    fn only_what_is_not_private_excluded_or_glups_own_is_kept() {
        let excluded = vec!["banco.exe".to_string()];
        let notepad  = r"C:\Windows\notepad.exe";
        let params   = |marks: PrivacyMarks, pid: u32, path: &'static str| KeepParams { marks, pid: Some(pid), path: Some(path), own: 7, excluded: &excluded };

        assert!(keep(params(PrivacyMarks::default(), 1, notepad)));
        assert!(!keep(params(PrivacyMarks { exclude: true, ..Default::default() }, 1, notepad)));
        assert!(!keep(params(PrivacyMarks { history: Some(0), ..Default::default() }, 1, r"C:\Apps\Bitwarden.exe")));
        assert!(!keep(params(PrivacyMarks::default(), 1, r"C:\Banco\Banco.exe")));
        assert!(!keep(params(PrivacyMarks::default(), 7, r"C:\Glup\glup.exe")));
        assert!(keep(KeepParams { marks: PrivacyMarks::default(), pid: None, path: None, own: 7, excluded: &excluded }));
    }

    #[test]
    fn excluded_programs_match_by_file_name_whatever_the_capitals() {
        let excluded = vec!["Banco.exe".to_string()];

        assert!(is_excluded(Some(r"C:\Program Files\Banco\banco.EXE"), &excluded));
        assert!(!is_excluded(Some(r"C:\Windows\notepad.exe"), &excluded));
        assert!(!is_excluded(None, &excluded));
        assert_eq!(exe_name(r"C:\Apps\x\Telegram.exe").as_deref(), Some("Telegram.exe"));
    }
}
