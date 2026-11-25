use std::{fs::File, io::Read, path::Path};

use rayon::prelude::*;
use serde::Serialize;

use crate::services::{pdf::info, video::{self, probe::VideoInfo}};

pub const PDF_EXTENSIONS: [&str; 1]    = ["pdf"];
pub const IMAGE_EXTENSIONS: [&str; 12] = ["png", "jpg", "jpeg", "webp", "gif", "bmp", "tif", "tiff", "avif", "heic", "heif", "hif"];
pub const VIDEO_EXTENSIONS: [&str; 8]  = ["mp4", "mov", "mkv", "avi", "webm", "3gp", "m4v", "wmv"];
pub const AUDIO_EXTENSIONS: [&str; 9]  = ["mp3", "m4a", "wav", "ogg", "opus", "aac", "flac", "wma", "amr"];
// The photos of iPhone ("Fotos de iPhone a JPG").
pub const IPHONE_EXTENSIONS: [&str; 3] = ["heic", "heif", "hif"];

// The first box of an ISO file (MP4, MOV, 3GP, M4V, HEIC…).
fn iso_box(head: &[u8]) -> bool {
    matches!(head.get(4..8), Some(b"ftyp" | b"moov" | b"wide" | b"mdat" | b"free" | b"skip"))
}

// WMV and WMA: the header of an ASF file.
const ASF: [u8; 8] = [0x30, 0x26, 0xB2, 0x75, 0x8E, 0x66, 0xCF, 0x11];

// Enough bytes to recognize every supported signature; the file is never decoded.
const SNIFF_BYTES: usize = 16;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum FileKind {
    Pdf,
    Image,
    Video,
    Audio,
    Other,
}

#[derive(Serialize)]
pub struct FileInfo {
    pub path: String,
    pub name: String,
    pub extension: String,
    pub size: u64,
    pub kind: FileKind,
    // PDFs only: page count and whether a password is needed to open it.
    pub pages: Option<u32>,
    pub protected: bool,
    // Videos only, once ffmpeg is here: seconds, and the picture as shown.
    pub duration: Option<f64>,
    pub width: Option<u32>,
    pub height: Option<u32>,
}

fn kind_of(extension: &str) -> FileKind {
    if PDF_EXTENSIONS.contains(&extension) {
        FileKind::Pdf
    } else if IMAGE_EXTENSIONS.contains(&extension) {
        FileKind::Image
    } else if VIDEO_EXTENSIONS.contains(&extension) {
        FileKind::Video
    } else if AUDIO_EXTENSIONS.contains(&extension) {
        FileKind::Audio
    } else {
        FileKind::Other
    }
}

// Kind from the file signature (magic numbers).
pub fn sniff_kind(head: &[u8]) -> FileKind {
    let starts = |signature: &[u8]| head.starts_with(signature);
    // AVIF, HEIC and HEIF are ISO boxes too, told apart by their brand.
    let ftyp   = crate::services::image::heif::container::is_heif(head);
    let webp   = starts(b"RIFF") && head.get(8..12) == Some(b"WEBP");
    // MP4, MOV, 3GP and M4V share the ISO box format ("ftyp", or "moov"/"wide"/"mdat" in old QuickTime);
    // MKV and WebM start with EBML; AVI is RIFF; WMV is ASF.
    let video  = iso_box(head) || starts(&[0x1A, 0x45, 0xDF, 0xA3]) || (starts(b"RIFF") && head.get(8..12) == Some(b"AVI ")) || starts(&ASF);

    if starts(b"%PDF") {
        FileKind::Pdf
    } else if starts(&[0x89, b'P', b'N', b'G']) || starts(&[0xFF, 0xD8, 0xFF]) || starts(b"GIF8") || starts(b"BM")
        || starts(b"II*\0") || starts(b"MM\0*") || webp || ftyp
    {
        FileKind::Image
    } else if video {
        FileKind::Video
    } else {
        FileKind::Other
    }
}

fn read_head(path: &Path) -> Vec<u8> {
    let mut head = Vec::with_capacity(SNIFF_BYTES);

    if let Ok(file) = File::open(path) {
        let _ = file.take(SNIFF_BYTES as u64).read_to_end(&mut head);
    }

    head
}

// Metadata plus the first bytes: the extension says what it should be, the signature confirms it.
// ffmpeg, when it is already here, reads a video's length and picture size.
pub fn read(path: &str, ffmpeg: Option<&Path>) -> FileInfo {
    let file_path = Path::new(path);
    let metadata  = file_path.metadata().ok();
    let is_file   = metadata.as_ref().is_some_and(|data| data.is_file());

    let name = file_path
        .file_name()
        .map(|value| value.to_string_lossy().into_owned())
        .unwrap_or_else(|| path.to_string());

    let extension = file_path
        .extension()
        .map(|value| value.to_string_lossy().to_lowercase())
        .unwrap_or_default();

    let expected = if is_file { kind_of(&extension) } else { FileKind::Other };
    // Audio formats are too varied to check by their first bytes (an MP3 without tags, raw AAC…): FFmpeg reads them later.
    let head     = read_head(file_path);
    // A video named as one in an ISO box is a video even when its brand is that of a HEIF sequence
    // ("hevc", "msf1"…), as some phones write their HEVC videos.
    let as_video = expected == FileKind::Video && iso_box(&head);
    let kind     = if expected == FileKind::Audio || as_video || (expected != FileKind::Other && sniff_kind(&head) == expected) { expected } else { FileKind::Other };

    let pdf   = if kind == FileKind::Pdf { info::read(file_path) } else { None };
    let video = if kind == FileKind::Video { video::probe_if_ready(ffmpeg, file_path) } else { None };
    let audio = if kind == FileKind::Audio { ffmpeg.and_then(|ffmpeg| video::probe::probe_duration(ffmpeg, file_path)) } else { None };

    FileInfo {
        path: path.to_string(),
        name,
        extension,
        size: metadata.map(|data| data.len()).unwrap_or(0),
        kind,
        pages: pdf.as_ref().map(|data| data.pages).filter(|pages| *pages > 0),
        protected: pdf.is_some_and(|data| data.protected),
        duration: video.map(|data: VideoInfo| data.duration).or(audio),
        width: video.map(|data| data.width),
        height: video.map(|data| data.height),
    }
}

// Many files are read in parallel; the order of `paths` is kept.
pub fn read_all(paths: &[String], ffmpeg: Option<&Path>) -> Vec<FileInfo> {
    paths.par_iter().map(|path| read(path, ffmpeg)).collect()
}

#[cfg(test)]
mod tests {
    use std::{fs, time::Instant};

    use super::*;

    // The previous version: metadata and extension only, one file after another.
    fn read_by_extension(path: &str) -> FileKind {
        let file_path = Path::new(path);
        let is_file   = fs::metadata(file_path).is_ok_and(|data| data.is_file());
        let extension = file_path.extension().map(|value| value.to_string_lossy().to_lowercase()).unwrap_or_default();

        if is_file { kind_of(&extension) } else { FileKind::Other }
    }

    fn best_of(runs: usize, mut work: impl FnMut()) -> f64 {
        (0..runs)
            .map(|_| {
                let start = Instant::now();
                work();
                start.elapsed().as_secs_f64() * 1000.0
            })
            .fold(f64::MAX, f64::min)
    }

    #[test]
    fn recognizes_signatures() {
        assert_eq!(sniff_kind(b"%PDF-1.7"), FileKind::Pdf);
        assert_eq!(sniff_kind(&[0x89, b'P', b'N', b'G', 13, 10]), FileKind::Image);
        assert_eq!(sniff_kind(&[0xFF, 0xD8, 0xFF, 0xE0]), FileKind::Image);
        assert_eq!(sniff_kind(b"RIFF\0\0\0\0WEBPVP8 "), FileKind::Image);
        assert_eq!(sniff_kind(b"\0\0\0\x1cftypavif"), FileKind::Image);
        assert_eq!(sniff_kind(b"\0\0\0\x18ftypheic"), FileKind::Image);
        assert_eq!(sniff_kind(b"\0\0\0\x18ftypmif1"), FileKind::Image);
        assert_eq!(sniff_kind(b"\0\0\0\x18ftypmp42"), FileKind::Video);
        assert_eq!(sniff_kind(b"\0\0\0\x14ftypqt  "), FileKind::Video);
        assert_eq!(sniff_kind(&[0x1A, 0x45, 0xDF, 0xA3, 0x9F]), FileKind::Video);
        assert_eq!(sniff_kind(b"RIFF\0\0\0\0AVI LIST"), FileKind::Video);
        assert_eq!(sniff_kind(b"hola"), FileKind::Other);
        assert_eq!(sniff_kind(&[0x30, 0x26, 0xB2, 0x75, 0x8E, 0x66, 0xCF, 0x11, 0xA6]), FileKind::Video);
    }

    #[test]
    fn a_phone_video_with_a_heif_brand_is_still_a_video() {
        let folder = std::env::temp_dir().join(format!("glup-file-info-phone-{}", std::process::id()));
        fs::create_dir_all(&folder).unwrap();

        for (name, brand) in [("whatsapp.mp4", b"isom"), ("celular.mp4", b"hevc"), ("samsung.mp4", b"msf1"), ("iphone.mov", b"qt  ")] {
            let file = folder.join(name);
            fs::write(&file, [&b"\0\0\0\x18ftyp"[..], brand, &[0; 8]].concat()).unwrap();
            assert_eq!(read(file.to_str().unwrap(), None).kind, FileKind::Video, "{name}");
        }
        // The same brand in a photo is still a photo.
        let photo = folder.join("foto.heic");
        fs::write(&photo, [&b"\0\0\0\x18ftypheic"[..], &[0; 8]].concat()).unwrap();
        assert_eq!(read(photo.to_str().unwrap(), None).kind, FileKind::Image);
        let _ = fs::remove_dir_all(&folder);
    }

    #[test]
    fn renamed_text_is_not_an_image() {
        let folder = std::env::temp_dir().join(format!("glup-file-info-{}", std::process::id()));
        fs::create_dir_all(&folder).unwrap();

        let fake = folder.join("no-soy-imagen.png");
        fs::write(&fake, "texto").unwrap();

        assert_eq!(read(fake.to_str().unwrap(), None).kind, FileKind::Other);
        let _ = fs::remove_dir_all(&folder);
    }

    #[test]
    fn times_fifty_images() {
        let folder = std::env::temp_dir().join(format!("glup-file-info-bench-{}", std::process::id()));
        fs::create_dir_all(&folder).unwrap();

        let paths: Vec<String> = (0..50)
            .map(|index| {
                let path  = folder.join(format!("foto-{index:02}.png"));
                let image = image::RgbImage::from_fn(1200, 900, |x, y| image::Rgb([(x % 256) as u8, (y % 256) as u8, (index * 5) as u8]));
                image.save(&path).unwrap();
                path.to_string_lossy().into_owned()
            })
            .collect();

        let before = best_of(5, || {
            let _ = paths.iter().map(|path| read_by_extension(path)).collect::<Vec<_>>();
        });
        let after = best_of(5, || {
            let _ = read_all(&paths, None);
        });

        println!("\n[get_files_info] 50 imágenes · antes {before:.2} ms (secuencial) · ahora {after:.2} ms (paralelo, con firma)");
        assert!(read_all(&paths, None).iter().all(|info| info.kind == FileKind::Image));

        let _ = fs::remove_dir_all(&folder);
    }
}
