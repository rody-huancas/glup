use std::{
    collections::HashSet,
    fs::{self, File},
    io,
    path::{Path, PathBuf},
    sync::atomic::{AtomicBool, Ordering},
};

use zip::{write::SimpleFileOptions, CompressionMethod, ZipWriter};

pub const ZIP_ERROR: &str = "No pude crear el ZIP";

// Already compressed formats are stored as they are: deflating them again only costs time.
const STORED_EXTENSIONS: [&str; 20] = [
    "jpg", "jpeg", "png", "webp", "gif", "avif", "heic", "pdf", "zip", "7z", "rar", "gz", "mp3", "mp4", "mov", "mkv", "docx", "xlsx", "pptx", "ico",
];

pub struct ZipEntry<'a> {
    pub source: &'a Path,
    pub name: String,
}

pub struct ZipParams<'a> {
    pub output: &'a Path,
    pub entries: Vec<ZipEntry<'a>>,
    // None: the zip always completes (used when bundling results).
    pub cancel: Option<&'a AtomicBool>,
    pub on_added: &'a dyn Fn(usize),
}

pub struct ZipReport {
    // One per entry, in order: None when added, the error otherwise. Shorter when cancelled.
    pub errors: Vec<Option<String>>,
    pub size: u64,
    pub cancelled: bool,
    // False when nothing ended up inside (or it was cancelled): no file is left behind.
    pub written: bool,
}

pub fn is_precompressed(path: &Path) -> bool {
    path.extension()
        .map(|value| value.to_string_lossy().to_lowercase())
        .is_some_and(|extension| STORED_EXTENSIONS.contains(&extension.as_str()))
}

fn split_name(name: &str) -> (&str, &str) {
    match name.rfind('.') {
        Some(dot) if dot > 0 => (&name[..dot], &name[dot..]),
        _                    => (name, ""),
    }
}

// Flat names for the zip root; repeated names become "name (2).ext", "name (3).ext"… (case-insensitive, as on Windows).
pub fn unique_entry_names(paths: &[PathBuf]) -> Vec<String> {
    let mut taken = HashSet::new();

    paths
        .iter()
        .map(|path| {
            let name           = path.file_name().map(|value| value.to_string_lossy().into_owned()).unwrap_or_default();
            let (stem, suffix) = split_name(&name);

            let unique = std::iter::once(name.clone())
                .chain((2..).map(|copy| format!("{stem} ({copy}){suffix}")))
                .find(|candidate| !taken.contains(&candidate.to_lowercase()))
                .unwrap_or(name.clone());

            taken.insert(unique.to_lowercase());
            unique
        })
        .collect()
}

fn add_entry(writer: &mut ZipWriter<File>, entry: &ZipEntry) -> Result<(), String> {
    let mut source = File::open(entry.source).map_err(|error| error.to_string())?;
    let method     = if is_precompressed(entry.source) { CompressionMethod::Stored } else { CompressionMethod::Deflated };
    let options    = SimpleFileOptions::default().compression_method(method).large_file(true);

    writer.start_file(entry.name.as_str(), options).map_err(|error| error.to_string())?;
    io::copy(&mut source, writer).map_err(|error| error.to_string())?;
    Ok(())
}

fn discard(output: &Path, errors: Vec<Option<String>>, cancelled: bool) -> ZipReport {
    let _ = fs::remove_file(output);
    ZipReport { errors, size: 0, cancelled, written: false }
}

// Adds the files one by one; a cancel or a zip with nothing inside never leaves a half-written file.
pub fn write_zip(params: ZipParams) -> Result<ZipReport, String> {
    let file       = File::create(params.output).map_err(|_| ZIP_ERROR.to_string())?;
    let mut writer = ZipWriter::new(file);
    let mut errors = Vec::with_capacity(params.entries.len());

    for (index, entry) in params.entries.iter().enumerate() {
        if params.cancel.is_some_and(|cancel| cancel.load(Ordering::SeqCst)) {
            drop(writer);
            return Ok(discard(params.output, errors, true));
        }

        errors.push(add_entry(&mut writer, entry).err());
        (params.on_added)(index + 1);
    }

    let finished = writer.finish();

    if finished.is_err() || errors.iter().all(Option::is_some) {
        return Ok(discard(params.output, errors, false));
    }

    let size = fs::metadata(params.output).map(|data| data.len()).unwrap_or(0);
    Ok(ZipReport { errors, size, cancelled: false, written: true })
}

#[cfg(test)]
mod tests {
    use std::io::Read;

    use super::*;

    struct Folder(PathBuf);

    impl Folder {
        fn new(name: &str) -> Self {
            let path = std::env::temp_dir().join(format!("glup-zip-tests-{}-{name}", std::process::id()));
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

    fn names(paths: &[&str]) -> Vec<String> {
        unique_entry_names(&paths.iter().map(PathBuf::from).collect::<Vec<_>>())
    }

    #[test]
    fn repeated_names_get_a_counter() {
        assert_eq!(
            names(&["C:/a/foto.jpg", "C:/b/foto.jpg", "C:/c/FOTO.jpg", "C:/d/notas.txt"]),
            vec!["foto.jpg", "foto (2).jpg", "FOTO (3).jpg", "notas.txt"],
        );
    }

    #[test]
    fn counters_never_collide_with_real_names() {
        assert_eq!(names(&["a/x.png", "b/x (2).png", "c/x.png"]), vec!["x.png", "x (2).png", "x (3).png"]);
        assert_eq!(names(&["a/LEEME", "b/LEEME"]), vec!["LEEME", "LEEME (2)"]);
    }

    #[test]
    fn writes_every_file_flat_with_unique_names() {
        let folder = Folder::new("write");
        fs::create_dir_all(folder.0.join("uno")).unwrap();
        fs::create_dir_all(folder.0.join("dos")).unwrap();

        let paths = vec![folder.0.join("uno/notas.txt"), folder.0.join("dos/notas.txt"), folder.0.join("uno/foto.jpg")];
        fs::write(&paths[0], "primera ".repeat(200)).unwrap();
        fs::write(&paths[1], "segunda").unwrap();
        fs::write(&paths[2], [0xFF, 0xD8, 0xFF, 0xE0]).unwrap();

        let output  = folder.0.join("archivos.zip");
        let entries = paths.iter().zip(unique_entry_names(&paths)).map(|(source, name)| ZipEntry { source, name }).collect();
        let report  = write_zip(ZipParams { output: &output, entries, cancel: None, on_added: &|_| {} }).unwrap();

        assert!(report.written);
        assert!(report.errors.iter().all(Option::is_none));

        let mut archive = zip::ZipArchive::new(File::open(&output).unwrap()).unwrap();
        let mut listed  = (0..archive.len()).map(|index| archive.by_index(index).unwrap().name().unwrap().to_string()).collect::<Vec<_>>();
        listed.sort();
        assert_eq!(listed, vec!["foto.jpg", "notas (2).txt", "notas.txt"]);

        assert_eq!(archive.by_name("foto.jpg").unwrap().compression(), CompressionMethod::Stored);
        assert_eq!(archive.by_name("notas.txt").unwrap().compression(), CompressionMethod::Deflated);

        let mut content = String::new();
        archive.by_name("notas (2).txt").unwrap().read_to_string(&mut content).unwrap();
        assert_eq!(content, "segunda");
    }

    #[test]
    fn cancel_leaves_no_half_zip() {
        let folder = Folder::new("cancel");
        let paths: Vec<PathBuf> = (0..5).map(|index| folder.0.join(format!("f{index}.txt"))).collect();
        paths.iter().for_each(|path| fs::write(path, "datos").unwrap());

        let output  = folder.0.join("archivos.zip");
        let cancel  = AtomicBool::new(false);
        let entries = paths.iter().zip(unique_entry_names(&paths)).map(|(source, name)| ZipEntry { source, name }).collect();

        let report = write_zip(ZipParams {
            output   : &output,
            entries,
            cancel   : Some(&cancel),
            on_added : &|added| {
                if added == 2 {
                    cancel.store(true, Ordering::SeqCst);
                }
            },
        })
        .unwrap();

        assert!(report.cancelled);
        assert!(!report.written);
        assert_eq!(report.errors.len(), 2);
        assert!(!output.exists(), "a cancelled zip must be deleted");
    }

    #[test]
    fn missing_files_are_reported_and_the_rest_is_zipped() {
        let folder = Folder::new("missing");
        let real   = folder.0.join("real.txt");
        fs::write(&real, "hola").unwrap();

        let paths   = vec![real, folder.0.join("borrado.txt")];
        let output  = folder.0.join("archivos.zip");
        let entries = paths.iter().zip(unique_entry_names(&paths)).map(|(source, name)| ZipEntry { source, name }).collect();
        let report  = write_zip(ZipParams { output: &output, entries, cancel: None, on_added: &|_| {} }).unwrap();

        assert!(report.written);
        assert!(report.errors[0].is_none());
        assert!(report.errors[1].is_some());
    }
}
