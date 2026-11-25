use std::path::{Path, PathBuf};

pub const COMPRESSED_SUFFIX: &str = "comprimida";
pub const BATCH_PDF_PREFIX: &str  = "imagenes";
pub const ZIP_EXTENSION: &str     = "zip";

pub enum OutputKind<'a> {
    // foto.png → foto.webp
    Converted { extension: &'a str },
    // foto.jpg → foto-comprimida.jpg
    Compressed { extension: &'a str },
    // foto.png → foto.pdf
    Pdf,
    // several images → imagenes-AAAA-MM-DD-HHmm.pdf, next to the first one
    BatchPdf { stamp: &'a str },
    // archivos-AAAA-MM-DD-HHmm.zip, resultados-AAAA-MM-DD-HHmm.zip
    Archive { prefix: &'a str, stamp: &'a str },
    // contrato.pdf → contrato-unido.pdf, contrato-reducido.pdf, contrato-paginas.zip
    Suffixed { suffix: &'a str, extension: &'a str },
    // contrato.pdf → contrato-paginas-1-3-5.pdf (the whole name comes ready)
    Named { name: &'a str, extension: &'a str },
    // cancion.mp3 → cancion (recorte).mp3, viaje.mp4 → viaje (subtítulos).mp4
    Tagged { tag: &'a str, extension: &'a str },
    // contrato.pdf → contrato-paginas/ (a folder, no extension)
    Folder { suffix: &'a str },
    // foto.jpg → foto.jpg in another folder, as it was (Ordenar una carpeta moves it there)
    Same,
}

pub struct OutputNameParams<'a> {
    // Destination folder: the source folder, its Glup subfolder or the chosen one.
    pub folder: &'a Path,
    pub source: &'a Path,
    pub kind: OutputKind<'a>,
}

fn stem_of(path: &Path) -> String {
    path.file_stem().map(|value| value.to_string_lossy().into_owned()).unwrap_or_default()
}

fn extension_of(path: &Path) -> String {
    path.extension().map(|value| value.to_string_lossy().into_owned()).unwrap_or_default()
}

fn base_name(params: &OutputNameParams) -> (String, String) {
    let stem = stem_of(params.source);

    match params.kind {
        OutputKind::Converted { extension }        => (stem, extension.to_string()),
        OutputKind::Compressed { extension }       => (format!("{stem}-{COMPRESSED_SUFFIX}"), extension.to_string()),
        OutputKind::Pdf                            => (stem, "pdf".to_string()),
        OutputKind::BatchPdf { stamp }             => (format!("{BATCH_PDF_PREFIX}-{stamp}"), "pdf".to_string()),
        OutputKind::Archive { prefix, stamp }      => (format!("{prefix}-{stamp}"), ZIP_EXTENSION.to_string()),
        OutputKind::Suffixed { suffix, extension } => (format!("{stem}-{suffix}"), extension.to_string()),
        OutputKind::Named { name, extension }      => (name.to_string(), extension.to_string()),
        OutputKind::Tagged { tag, extension }      => (format!("{stem} ({tag})"), extension.to_string()),
        OutputKind::Folder { suffix }              => (format!("{stem}-{suffix}"), String::new()),
        OutputKind::Same                           => (stem, extension_of(params.source)),
    }
}

// Inside the destination folder; a taken name becomes "name (2).ext", "name (3).ext"…
// `exists` is injected so the naming stays pure and testable.
pub fn output_path(params: &OutputNameParams, exists: impl Fn(&Path) -> bool) -> PathBuf {
    let folder            = params.folder;
    let (name, extension) = base_name(params);
    let dotted            = if extension.is_empty() { String::new() } else { format!(".{extension}") };
    let first             = folder.join(format!("{name}{dotted}"));

    if !exists(&first) {
        return first;
    }

    (2..)
        .map(|copy| folder.join(format!("{name} ({copy}){dotted}")))
        .find(|candidate| !exists(candidate))
        .unwrap_or(first)
}

#[cfg(test)]
mod tests {
    use std::collections::HashSet;

    use super::*;

    fn taken(paths: &[&str]) -> impl Fn(&Path) -> bool {
        let set: HashSet<PathBuf> = paths.iter().map(PathBuf::from).collect();
        move |path| set.contains(path)
    }

    fn name_for(source: &str, kind: OutputKind, existing: &[&str]) -> PathBuf {
        let source = Path::new(source);
        let folder = source.parent().unwrap_or_else(|| Path::new(""));
        output_path(&OutputNameParams { folder, source, kind }, taken(existing))
    }

    #[test]
    fn converted_keeps_the_name_with_the_new_extension() {
        assert_eq!(name_for("C:/fotos/foto.png", OutputKind::Converted { extension: "webp" }, &[]), PathBuf::from("C:/fotos/foto.webp"));
    }

    #[test]
    fn compressed_adds_the_suffix() {
        assert_eq!(
            name_for("C:/fotos/foto.jpg", OutputKind::Compressed { extension: "jpg" }, &[]),
            PathBuf::from("C:/fotos/foto-comprimida.jpg"),
        );
    }

    #[test]
    fn compressed_can_change_the_extension() {
        assert_eq!(
            name_for("C:/fotos/escaneo.bmp", OutputKind::Compressed { extension: "jpg" }, &[]),
            PathBuf::from("C:/fotos/escaneo-comprimida.jpg"),
        );
    }

    #[test]
    fn single_pdf_uses_the_image_name() {
        assert_eq!(name_for("C:/fotos/foto.png", OutputKind::Pdf, &[]), PathBuf::from("C:/fotos/foto.pdf"));
    }

    #[test]
    fn batch_pdf_uses_the_stamp_in_the_first_folder() {
        assert_eq!(
            name_for("C:/fotos/a.jpg", OutputKind::BatchPdf { stamp: "2026-11-21-1830" }, &[]),
            PathBuf::from("C:/fotos/imagenes-2026-11-21-1830.pdf"),
        );
    }

    #[test]
    fn archives_use_their_prefix_and_stamp() {
        assert_eq!(
            name_for("C:/fotos/a.jpg", OutputKind::Archive { prefix: "archivos", stamp: "2026-11-22-0930" }, &["C:/fotos/archivos-2026-11-22-0930.zip"]),
            PathBuf::from("C:/fotos/archivos-2026-11-22-0930 (2).zip"),
        );
    }

    #[test]
    fn pdf_outputs_use_suffixes_names_and_folders() {
        assert_eq!(name_for("C:/docs/contrato.pdf", OutputKind::Suffixed { suffix: "unido", extension: "pdf" }, &[]), PathBuf::from("C:/docs/contrato-unido.pdf"));
        assert_eq!(name_for("C:/docs/contrato.pdf", OutputKind::Named { name: "contrato-paginas-1-3", extension: "pdf" }, &[]), PathBuf::from("C:/docs/contrato-paginas-1-3.pdf"));
        assert_eq!(name_for("C:/musica/cancion.mp3", OutputKind::Tagged { tag: "recorte", extension: "mp3" }, &[]), PathBuf::from("C:/musica/cancion (recorte).mp3"));
        assert_eq!(name_for("C:/v/viaje.mkv", OutputKind::Tagged { tag: "recorte", extension: "mkv" }, &["C:/v/viaje (recorte).mkv"]), PathBuf::from("C:/v/viaje (recorte) (2).mkv"));
        assert_eq!(name_for("C:/v/viaje.mp4", OutputKind::Tagged { tag: "subtítulos", extension: "mp4" }, &[]), PathBuf::from("C:/v/viaje (subtítulos).mp4"));
        assert_eq!(name_for("C:/fotos/playa.heic", OutputKind::Tagged { tag: "Instagram historia", extension: "jpg" }, &[]), PathBuf::from("C:/fotos/playa (Instagram historia).jpg"));
        assert_eq!(name_for("C:/fotos/playa.png", OutputKind::Tagged { tag: "marca", extension: "png" }, &[]), PathBuf::from("C:/fotos/playa (marca).png"));
        assert_eq!(name_for("C:/fotos/vieja.jpg", OutputKind::Tagged { tag: "x4", extension: "jpg" }, &["C:/fotos/vieja (x4).jpg"]), PathBuf::from("C:/fotos/vieja (x4) (2).jpg"));
        assert_eq!(name_for("C:/fotos/vieja.jpg", OutputKind::Tagged { tag: "mejorada", extension: "jpg" }, &[]), PathBuf::from("C:/fotos/vieja (mejorada).jpg"));
        assert_eq!(name_for("C:/docs/contrato.pdf", OutputKind::Folder { suffix: "paginas" }, &["C:/docs/contrato-paginas"]), PathBuf::from("C:/docs/contrato-paginas (2)"));
    }

    #[test]
    fn taken_names_get_a_counter() {
        let existing = ["C:/fotos/foto-comprimida.jpg", "C:/fotos/foto-comprimida (2).jpg"];

        assert_eq!(
            name_for("C:/fotos/foto.jpg", OutputKind::Compressed { extension: "jpg" }, &existing),
            PathBuf::from("C:/fotos/foto-comprimida (3).jpg"),
        );
    }

    #[test]
    fn counter_starts_at_two() {
        assert_eq!(
            name_for("C:/fotos/foto.png", OutputKind::Converted { extension: "webp" }, &["C:/fotos/foto.webp"]),
            PathBuf::from("C:/fotos/foto (2).webp"),
        );
    }

    #[test]
    fn names_are_resolved_inside_the_destination_folder() {
        let params = OutputNameParams {
            folder : Path::new("D:/salida"),
            source : Path::new("C:/fotos/foto.jpg"),
            kind   : OutputKind::Compressed { extension: "jpg" },
        };

        assert_eq!(output_path(&params, taken(&["D:/salida/foto-comprimida.jpg"])), PathBuf::from("D:/salida/foto-comprimida (2).jpg"));
        assert_eq!(output_path(&params, taken(&["C:/fotos/foto-comprimida.jpg"])), PathBuf::from("D:/salida/foto-comprimida.jpg"));
    }

    #[test]
    fn names_with_dots_keep_their_stem() {
        assert_eq!(
            name_for("C:/fotos/vacaciones.2026.png", OutputKind::Converted { extension: "jpg" }, &[]),
            PathBuf::from("C:/fotos/vacaciones.2026.jpg"),
        );
    }

    #[test]
    fn same_keeps_the_name_and_numbers_it_when_taken() {
        let moved = |existing: &[&str]| {
            let folder = Path::new("C:/descargas/PDFs");
            output_path(&OutputNameParams { folder, source: Path::new("C:/descargas/contrato.pdf"), kind: OutputKind::Same }, taken(existing))
        };

        assert_eq!(moved(&[]), PathBuf::from("C:/descargas/PDFs/contrato.pdf"));
        assert_eq!(moved(&["C:/descargas/PDFs/contrato.pdf"]), PathBuf::from("C:/descargas/PDFs/contrato (2).pdf"));
        assert_eq!(
            output_path(&OutputNameParams { folder: Path::new("C:/d/Otros"), source: Path::new("C:/d/LEEME"), kind: OutputKind::Same }, taken(&["C:/d/Otros/LEEME"])),
            PathBuf::from("C:/d/Otros/LEEME (2)"),
        );
    }
}
