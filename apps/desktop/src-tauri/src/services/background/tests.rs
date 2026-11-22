// Generated files in the system temp folder. The tests that need the real model are #[ignore]:
// cargo test background -- --ignored --nocapture (GLUP_MODEL and GLUP_BG_IMAGES point to it and the photos).
use std::{
    fs,
    io::{self, Cursor, Read},
    path::{Path, PathBuf},
    sync::atomic::AtomicBool,
    time::{Duration, Instant},
};

use image::{DynamicImage, GenericImageView, ImageFormat, Rgb, RgbImage, Rgba, RgbaImage};

use super::{
    cutout,
    download::{copy_chunks, download, matches_hash, sha256_of, CopyParams, Copied, DownloadEnd, DownloadParams, Fetched, CORRUPT_ERROR, NETWORK_ERROR},
    mask::{apply_mask, mask_from_logits, on_white, preprocess, Mask, MEAN, MODEL_SIDE, STD},
    model::{delete_in, model_path, part_path, status_in, ModelFile},
    session::{infer, is_idle, open, Device},
    BackgroundKind, CutoutParams, REMOVED_SUFFIX,
};
use crate::services::naming::{output_path, OutputKind, OutputNameParams};

struct Folder(PathBuf);

impl Folder {
    fn new(name: &str) -> Self {
        let folder = std::env::temp_dir().join(format!("glup-background-tests-{}-{name}", std::process::id()));
        let _      = fs::remove_dir_all(&folder);
        fs::create_dir_all(&folder).expect("temp folder");
        Self(folder)
    }
}

impl Drop for Folder {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}

// A fake model file and its description, as if it were on a server.
fn fake_model(folder: &Path, bytes: &[u8]) -> ModelFile {
    let source = folder.join("served.bin");
    fs::write(&source, bytes).expect("served file");
    let hash = sha256_of(&source).expect("hash");
    fs::remove_file(&source).expect("cleanup");

    ModelFile { name: "model.onnx", url: "https://example.invalid/model.onnx", sha256: Box::leak(hash.into_boxed_str()), size: bytes.len() as u64 }
}

fn served_bytes() -> Vec<u8> {
    (0..3_000_000u32).map(|value| (value % 251) as u8).collect()
}

// Hands out the bytes from `start`, failing after `cut` bytes when given (a dropped connection).
struct Flaky {
    data: Cursor<Vec<u8>>,
    left: Option<usize>,
}

impl Read for Flaky {
    fn read(&mut self, buffer: &mut [u8]) -> io::Result<usize> {
        match self.left {
            Some(0) => Err(io::Error::new(io::ErrorKind::ConnectionReset, "cut")),
            Some(left) => {
                let take = buffer.len().min(left);
                let read = self.data.read(&mut buffer[..take])?;
                self.left = Some(left - read);
                Ok(read)
            }
            None => self.data.read(buffer),
        }
    }
}

fn server(bytes: Vec<u8>, cut: Option<usize>, ranges: bool) -> impl Fn(u64) -> Result<Fetched, String> {
    move |start| {
        let from = if ranges { start as usize } else { 0 };
        Ok(Fetched { reader: Box::new(Flaky { data: Cursor::new(bytes[from..].to_vec()), left: cut }), resumed: ranges && start > 0 })
    }
}

fn run_download(folder: &Path, model: &ModelFile, fetch: &dyn Fn(u64) -> Result<Fetched, String>) -> Result<DownloadEnd, String> {
    let cancel = AtomicBool::new(false);
    download(DownloadParams { folder, model, cancel: &cancel, on_progress: &|_| {}, fetch })
}

#[test]
fn preprocess_normalizes_each_plane() {
    let image  = RgbImage::from_pixel(300, 200, Rgb([255, 128, 0]));
    let input  = preprocess(&image);
    let plane  = (MODEL_SIDE * MODEL_SIDE) as usize;
    let expect = |channel: usize, value: f32| (value / 255.0 - MEAN[channel]) / STD[channel];

    assert_eq!(input.len(), plane * 3);
    assert!((input[0] - expect(0, 255.0)).abs() < 1e-4);
    assert!((input[plane + 10] - expect(1, 128.0)).abs() < 1e-4);
    assert!((input[plane * 2 + plane - 1] - expect(2, 0.0)).abs() < 1e-4);
}

#[test]
fn logits_become_a_soft_mask() {
    let mask = mask_from_logits(&[0.0, 20.0, -20.0, 2.0], 2).expect("mask");

    assert!((mask.get_pixel(0, 0)[0] - 0.5).abs() < 1e-6);
    assert!(mask.get_pixel(1, 0)[0] > 0.999);
    assert!(mask.get_pixel(0, 1)[0] < 0.001);
    assert!(mask_from_logits(&[0.0; 3], 2).is_err());
}

#[test]
fn the_mask_becomes_the_alpha_and_keeps_existing_transparency() {
    let mut image = RgbaImage::from_pixel(2, 1, Rgba([10, 20, 30, 255]));
    image.put_pixel(1, 0, Rgba([10, 20, 30, 128]));
    let mask = Mask::from_raw(2, 1, vec![0.5, 1.0]).expect("mask");

    let out = apply_mask(&image, &mask);

    assert_eq!(out.get_pixel(0, 0).0, [10, 20, 30, 128]);
    assert_eq!(out.get_pixel(1, 0).0, [10, 20, 30, 128]);
}

#[test]
fn white_background_blends_by_alpha() {
    let image = RgbaImage::from_fn(3, 1, |x, _| Rgba([0, 100, 200, [0, 255, 128][x as usize]]));
    let out   = on_white(&image);

    assert_eq!(out.get_pixel(0, 0).0, [255, 255, 255]);
    assert_eq!(out.get_pixel(1, 0).0, [0, 100, 200]);
    assert_eq!(out.get_pixel(2, 0).0, [127, 177, 227]);
}

// Left half subject, right half background, as the model would answer.
fn half_logits() -> Vec<f32> {
    let side = MODEL_SIDE as usize;
    (0..side * side).map(|index| if index % side < side / 2 { 12.0 } else { -12.0 }).collect()
}

#[test]
fn cutout_writes_a_transparent_png_at_the_original_size() {
    let image   = DynamicImage::ImageRgb8(RgbImage::from_pixel(400, 300, Rgb([200, 30, 30])));
    let removed = cutout(CutoutParams { image: &image, logits: &half_logits(), kind: BackgroundKind::Transparent }).expect("cutout");
    let decoded = image::load_from_memory_with_format(&removed.bytes, ImageFormat::Png).expect("png");

    assert_eq!(removed.extension, "png");
    assert_eq!(decoded.dimensions(), (400, 300));
    assert_eq!(decoded.to_rgba8().get_pixel(20, 150)[3], 255);
    assert_eq!(decoded.to_rgba8().get_pixel(380, 150)[3], 0);
}

#[test]
fn cutout_on_white_writes_a_jpg() {
    let image   = DynamicImage::ImageRgb8(RgbImage::from_pixel(400, 300, Rgb([200, 30, 30])));
    let removed = cutout(CutoutParams { image: &image, logits: &half_logits(), kind: BackgroundKind::White }).expect("cutout");
    let decoded = image::load_from_memory_with_format(&removed.bytes, ImageFormat::Jpeg).expect("jpg").to_rgb8();
    let right   = decoded.get_pixel(380, 150);
    let left    = decoded.get_pixel(20, 150);

    assert_eq!(removed.extension, "jpg");
    assert!(right.0.iter().all(|channel| *channel > 245));
    assert!(left[0] > 180 && left[1] < 60);
}

#[test]
fn output_names_use_the_suffix_and_never_overwrite() {
    let folder = Path::new("C:/fotos");
    let name   = |extension, taken: &[&str]| {
        let taken = taken.iter().map(PathBuf::from).collect::<Vec<_>>();
        output_path(
            &OutputNameParams { folder, source: Path::new("C:/fotos/foto.jpg"), kind: OutputKind::Suffixed { suffix: REMOVED_SUFFIX, extension } },
            |path| taken.iter().any(|item| item == path),
        )
    };

    assert_eq!(name("png", &[]), PathBuf::from("C:/fotos/foto-sin-fondo.png"));
    assert_eq!(name("jpg", &[]), PathBuf::from("C:/fotos/foto-sin-fondo.jpg"));
    assert_eq!(name("png", &["C:/fotos/foto-sin-fondo.png"]), PathBuf::from("C:/fotos/foto-sin-fondo (2).png"));
}

#[test]
fn hash_check_tells_good_from_bad() {
    let folder = Folder::new("hash");
    let file   = folder.0.join("a.bin");
    fs::write(&file, b"glup").expect("file");

    // sha256("glup")
    assert_eq!(sha256_of(&file).expect("hash"), "95ba21691bdaf17b21bf5c5ba67522e578f72c9fdb39db71f2de89ff33495b2c");
    assert!(matches_hash(&file, "95BA21691BDAF17B21BF5C5BA67522E578F72C9FDB39DB71F2DE89FF33495B2C"));
    assert!(!matches_hash(&file, "00"));
    assert!(!matches_hash(&folder.0.join("missing.bin"), "00"));
}

#[test]
fn a_good_download_is_installed() {
    let folder = Folder::new("good");
    let bytes  = served_bytes();
    let model  = fake_model(&folder.0, &bytes);

    assert_eq!(run_download(&folder.0, &model, &server(bytes, None, true)), Ok(DownloadEnd::Installed));
    assert!(model_path(&folder.0, &model).exists());
    assert!(!part_path(&folder.0, &model).exists());
    assert!(status_in(&folder.0, &model).installed);
}

#[test]
fn a_damaged_download_is_deleted_and_reported() {
    let folder    = Folder::new("damaged");
    let bytes     = served_bytes();
    let model     = fake_model(&folder.0, &bytes);
    let mut wrong = bytes.clone();
    wrong[1000] ^= 0xFF;

    assert_eq!(run_download(&folder.0, &model, &server(wrong, None, true)), Err(CORRUPT_ERROR.to_string()));
    assert!(!model_path(&folder.0, &model).exists());
    assert!(!part_path(&folder.0, &model).exists());
}

#[test]
fn a_cut_download_resumes_where_it_stopped() {
    let folder = Folder::new("resume");
    let bytes  = served_bytes();
    let model  = fake_model(&folder.0, &bytes);

    assert_eq!(run_download(&folder.0, &model, &server(bytes.clone(), Some(1_200_000), true)), Err(NETWORK_ERROR.to_string()));

    let partial = status_in(&folder.0, &model);
    assert!(!partial.installed);
    assert_eq!(partial.partial, 1_200_000);

    // The second try only asks for the rest; the hash checks the joined file.
    let asked = std::cell::Cell::new(0u64);
    let fetch = server(bytes, None, true);
    let spy   = |start: u64| {
        asked.set(start);
        fetch(start)
    };

    assert_eq!(run_download(&folder.0, &model, &spy), Ok(DownloadEnd::Installed));
    assert_eq!(asked.get(), 1_200_000);
}

#[test]
fn a_server_without_ranges_starts_over() {
    let folder = Folder::new("restart");
    let bytes  = served_bytes();
    let model  = fake_model(&folder.0, &bytes);

    let _ = run_download(&folder.0, &model, &server(bytes.clone(), Some(500_000), false));
    assert_eq!(run_download(&folder.0, &model, &server(bytes, None, false)), Ok(DownloadEnd::Installed));
}

#[test]
fn cancelling_keeps_the_part() {
    let mut reader = Cursor::new(vec![1u8; 1000]);
    let mut file   = Vec::new();
    let cancel     = AtomicBool::new(true);

    let copied = copy_chunks(CopyParams { reader: &mut reader, file: &mut file, start: 40, cancel: &cancel, on_progress: &|_| {} }).expect("copy");
    assert_eq!(copied, Copied::Cancelled(40));
}

#[test]
fn deleting_removes_the_model_and_any_part() {
    let folder = Folder::new("delete");
    let model  = ModelFile { name: "m.onnx", url: "", sha256: "", size: 10 };
    fs::write(model_path(&folder.0, &model), b"0123456789").expect("model");
    fs::write(part_path(&folder.0, &model), b"01").expect("part");

    delete_in(&folder.0, &model).expect("delete");

    assert_eq!(status_in(&folder.0, &model).installed, false);
    assert_eq!(status_in(&folder.0, &model).partial, 0);
}

#[test]
fn the_session_is_let_go_after_five_idle_minutes() {
    let used = Instant::now();

    assert!(!is_idle(used, used + Duration::from_secs(299), Duration::from_secs(300)));
    assert!(is_idle(used, used + Duration::from_secs(300), Duration::from_secs(300)));
}

// Real model, real photos: times per image on the CPU and on the graphics card, cut-outs saved next
// to GLUP_BG_OUT (or the temp folder) to look at.
#[test]
#[ignore]
fn real_model_times_per_image() {
    let model  = PathBuf::from(std::env::var("GLUP_MODEL").expect("GLUP_MODEL"));
    let photos = PathBuf::from(std::env::var("GLUP_BG_IMAGES").expect("GLUP_BG_IMAGES"));
    let out    = std::env::var("GLUP_BG_OUT").map(PathBuf::from).unwrap_or_else(|_| std::env::temp_dir().join("glup-background-out"));
    fs::create_dir_all(&out).expect("out");

    let mut names = fs::read_dir(&photos).expect("photos").filter_map(|entry| entry.ok().map(|entry| entry.path())).collect::<Vec<_>>();
    names.sort();

    for device in [Device::Gpu, Device::Cpu] {
        let started     = Instant::now();
        let mut session = match open(&model, device) {
            Ok(session) => session,
            Err(error)  => {
                println!("{device:?}: no se pudo cargar ({error})");
                continue;
            }
        };
        println!("{device:?}: carga {:.1} s", started.elapsed().as_secs_f32());

        for path in &names {
            let image   = crate::services::image::decode::decode(path).expect("photo");
            let started  = Instant::now();
            let input    = preprocess(&image.to_rgb8());
            let ready    = started.elapsed().as_secs_f32();
            let logits   = match infer(&mut session, &input) {
                Ok(logits) => logits,
                Err(error) => {
                    println!("{device:?} {}: falló ({error})", path.display());
                    continue;
                }
            };
            let inferred = started.elapsed().as_secs_f32() - ready;
            let removed  = cutout(CutoutParams { image: &image, logits: &logits, kind: BackgroundKind::Transparent }).expect("cutout");
            let stem     = path.file_stem().map(|stem| stem.to_string_lossy().into_owned()).unwrap_or_default();

            println!("{device:?} {stem}: {:.2} s ({}x{}; preparar {ready:.2} s, modelo {inferred:.2} s)", started.elapsed().as_secs_f32(), image.width(), image.height());
            fs::write(out.join(format!("{stem}-{device:?}-sin-fondo.png")), &removed.bytes).expect("write");
        }
    }
}

// The real url: it follows the redirect and honors the range, so a cut download really resumes.
#[test]
#[ignore]
fn real_url_resumes_from_a_byte() {
    use super::{download::fetch_http, model::BACKGROUND_MODEL};

    let start       = BACKGROUND_MODEL.size - 1_000_000;
    let mut fetched = fetch_http(BACKGROUND_MODEL.url, start).expect("fetch");
    let mut rest    = Vec::new();
    fetched.reader.read_to_end(&mut rest).expect("read");

    assert!(fetched.resumed);
    assert_eq!(rest.len(), 1_000_000);
}
