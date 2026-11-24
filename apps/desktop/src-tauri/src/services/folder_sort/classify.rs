// Where each file goes: by its type (the folders and extensions live in categories.json, to adjust them
// without touching the code) or by the year and month it was last modified.
use std::{path::Path, sync::OnceLock};

use chrono::{DateTime, Datelike, Local};
use serde::Deserialize;

const CATEGORIES: &str = include_str!("categories.json");

const MONTHS: [&str; 12] = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

#[derive(Clone, Debug, Deserialize)]
pub struct CategoryDef {
    pub folder     : String,
    pub extensions : Vec<String>,
}

#[derive(Clone, Debug, Deserialize)]
pub struct SortTable {
    pub categories  : Vec<CategoryDef>,
    // The folder of whatever no category claims.
    pub other       : String,
    // Extensions of a download still in progress: those files are never touched.
    pub downloading : Vec<String>,
}

impl Default for SortTable {
    fn default() -> Self {
        Self { categories: Vec::new(), other: "Otros".to_string(), downloading: Vec::new() }
    }
}

static TABLE: OnceLock<SortTable> = OnceLock::new();

// Read once; a broken file leaves everything in "Otros" rather than stopping Glup.
pub fn table() -> &'static SortTable {
    TABLE.get_or_init(|| serde_json::from_str(CATEGORIES).unwrap_or_default())
}

// The extension in lowercase, without the dot ("" when it has none).
pub fn extension_of(name: &str) -> String {
    Path::new(name).extension().map(|value| value.to_string_lossy().to_lowercase()).unwrap_or_default()
}

pub fn type_folder(table: &SortTable, name: &str) -> String {
    let extension = extension_of(name);

    table
        .categories
        .iter()
        .find(|category| !extension.is_empty() && category.extensions.iter().any(|known| known.eq_ignore_ascii_case(&extension)))
        .map_or_else(|| table.other.clone(), |category| category.folder.clone())
}

pub fn is_downloading(table: &SortTable, name: &str) -> bool {
    let extension = extension_of(name);
    !extension.is_empty() && table.downloading.iter().any(|known| known.eq_ignore_ascii_case(&extension))
}

// "2026" and "11 - Noviembre", in the local time of the PC, from the modification date (ms).
pub fn date_folders(modified: i64) -> [String; 2] {
    let date  = DateTime::from_timestamp_millis(modified).unwrap_or_default().with_timezone(&Local);
    let month = date.month0() as usize;
    [date.year().to_string(), format!("{:02} - {}", month + 1, MONTHS[month])]
}

// The order the type folders are shown in (as in the file), "Otros" last.
pub fn type_rank(table: &SortTable, folder: &str) -> usize {
    table.categories.iter().position(|category| category.folder == folder).unwrap_or(table.categories.len())
}

#[cfg(test)]
mod tests {
    use chrono::TimeZone;

    use super::*;

    #[test]
    fn the_file_of_categories_reads_and_has_the_ten_folders() {
        let table = table();
        let names: Vec<_> = table.categories.iter().map(|category| category.folder.as_str()).collect();

        assert_eq!(names, ["Imágenes", "PDFs", "Documentos", "Hojas de cálculo", "Presentaciones", "Videos", "Audio", "Comprimidos", "Instaladores"]);
        assert_eq!(table.other, "Otros");
        assert!(table.downloading.contains(&"crdownload".to_string()));
    }

    #[test]
    fn each_file_goes_to_the_folder_of_its_type_whatever_the_case() {
        let table = table();

        assert_eq!(type_folder(table, "foto.JPG"), "Imágenes");
        assert_eq!(type_folder(table, "contrato.pdf"), "PDFs");
        assert_eq!(type_folder(table, "carta.docx"), "Documentos");
        assert_eq!(type_folder(table, "notas.xlsx"), "Hojas de cálculo");
        assert_eq!(type_folder(table, "charla.pptx"), "Presentaciones");
        assert_eq!(type_folder(table, "video.mp4"), "Videos");
        assert_eq!(type_folder(table, "nota de voz.opus"), "Audio");
        assert_eq!(type_folder(table, "fotos.zip"), "Comprimidos");
        assert_eq!(type_folder(table, "programa-setup.exe"), "Instaladores");
        assert_eq!(type_folder(table, "plano.dwg"), "Otros");
        assert_eq!(type_folder(table, "LEEME"), "Otros");
        assert_eq!(type_folder(table, "respaldo.tar.gz"), "Comprimidos");
    }

    #[test]
    fn a_download_in_progress_is_told_by_its_extension() {
        let table = table();

        assert!(is_downloading(table, "pelicula.mp4.crdownload"));
        assert!(is_downloading(table, "instalador.exe.part"));
        assert!(is_downloading(table, "algo.TMP"));
        assert!(is_downloading(table, "archivo.opdownload"));
        assert!(!is_downloading(table, "partitura.pdf"));
        assert!(!is_downloading(table, "part"));
    }

    #[test]
    fn by_date_a_year_folder_and_a_month_folder_in_spanish() {
        let november = Local.with_ymd_and_hms(2026, 11, 24, 10, 0, 0).unwrap().timestamp_millis();
        let january  = Local.with_ymd_and_hms(2025, 1, 2, 8, 30, 0).unwrap().timestamp_millis();

        assert_eq!(date_folders(november), ["2026".to_string(), "11 - Noviembre".to_string()]);
        assert_eq!(date_folders(january), ["2025".to_string(), "01 - Enero".to_string()]);
    }

    #[test]
    fn the_folders_keep_the_order_of_the_file_and_others_go_last() {
        let table = table();
        assert!(type_rank(table, "Imágenes") < type_rank(table, "PDFs"));
        assert_eq!(type_rank(table, "Otros"), table.categories.len());
    }
}
