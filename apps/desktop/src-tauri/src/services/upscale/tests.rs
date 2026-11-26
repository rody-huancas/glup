use image::{imageops::FilterType, Rgb, RgbImage};

use super::{
    preview_rect,
    tiles::{fits, image_of, looks_broken, padded_side, paste, plan, tensor_of, PasteParams, Rect, Tile, OVERLAP},
};

fn picture(width: u32, height: u32) -> RgbImage {
    RgbImage::from_fn(width, height, |x, y| Rgb([(x * 7 % 256) as u8, (y * 5 % 256) as u8, ((x + y) % 256) as u8]))
}

// A stand-in for the model: every pixel four times (what the real one does to the size).
fn nearest_x4(image: &RgbImage) -> RgbImage {
    image::imageops::resize(image, image.width() * 4, image.height() * 4, FilterType::Nearest)
}

fn stitch(image: &RgbImage, side: u32, scale: u32) -> RgbImage {
    let mut output = RgbImage::new(image.width() * scale, image.height() * scale);
    let size       = padded_side(side, OVERLAP);
    for tile in plan(image.width(), image.height(), side, OVERLAP) {
        // The piece as the model gets it (padded to one size), through the stand-in.
        let piece    = image_of(&tensor_of(image, tile.input, size), size, size);
        let upscaled = nearest_x4(&piece);
        paste(PasteParams { output: &mut output, tile, upscaled: &upscaled, model: 4, scale });
    }
    output
}

#[test]
fn the_pieces_cover_the_photo_once_with_their_overlap() {
    let tiles = plan(600, 430, 256, 16);
    assert_eq!(tiles.len(), 6);
    assert_eq!(tiles[0], Tile { core: Rect { x: 0, y: 0, width: 256, height: 256 }, input: Rect { x: 0, y: 0, width: 272, height: 272 } });
    assert_eq!(tiles[4], Tile { core: Rect { x: 256, y: 256, width: 256, height: 174 }, input: Rect { x: 240, y: 240, width: 288, height: 190 } });

    let mut seen = vec![0u8; 600 * 430];
    for tile in &tiles {
        assert!(tile.input.x <= tile.core.x && tile.input.x + tile.input.width >= tile.core.x + tile.core.width);
        assert!(tile.input.x + tile.input.width <= 600 && tile.input.y + tile.input.height <= 430);
        for y in tile.core.y..tile.core.y + tile.core.height {
            for x in tile.core.x..tile.core.x + tile.core.width {
                seen[(y * 600 + x) as usize] += 1;
            }
        }
    }
    assert!(seen.iter().all(|count| *count == 1));
    // Smaller than one piece: one piece, the photo itself.
    assert_eq!(plan(100, 80, 256, 16), vec![Tile { core: Rect { x: 0, y: 0, width: 100, height: 80 }, input: Rect { x: 0, y: 0, width: 100, height: 80 } }]);
}

#[test]
fn the_pieces_put_together_are_the_whole_photo() {
    let image = picture(300, 210);
    // x4: exactly what the whole photo would give.
    assert_eq!(stitch(&image, 64, 4), nearest_x4(&image));
    // x2: each pixel the average of its 2 × 2, so piece by piece is exactly the whole one halved (no seams).
    let big   = nearest_x4(&image);
    let whole = RgbImage::from_fn(600, 420, |x, y| {
        let sum = |channel: usize| (0..2).flat_map(|dy| (0..2).map(move |dx| (dx, dy))).map(|(dx, dy)| u32::from(big.get_pixel(x * 2 + dx, y * 2 + dy)[channel])).sum::<u32>();
        Rgb([0, 1, 2].map(|channel| (sum(channel) as f32 / 4.0).round() as u8))
    });
    assert_eq!(stitch(&image, 64, 2), whole);
}

#[test]
fn the_same_size_goes_through_the_model_and_back_down() {
    use super::{detail, UpscaleOptions};

    let image = picture(300, 210);
    let same  = stitch(&image, 64, 1);
    assert_eq!(same.dimensions(), (300, 210));
    // Piece by piece it is the whole one brought back down with Lanczos (no seams; at the photo's own
    // edges a piece repeats its last pixel where the whole one does not, a step or two of difference)…
    let whole = image::imageops::resize(&nearest_x4(&image), 300, 210, FilterType::Lanczos3);
    let diff  = whole.pixels().zip(same.pixels()).map(|(a, b)| a.0.iter().zip(b.0.iter()).map(|(x, y)| x.abs_diff(*y)).max().unwrap_or(0)).max().unwrap_or(0);
    assert!(diff <= 4, "{diff}");
    let inner = |image: &RgbImage| image::imageops::crop_imm(image, 4, 4, 292, 202).to_image();
    assert!(inner(&whole).pixels().zip(inner(&same).pixels()).all(|(a, b)| a.0.iter().zip(b.0.iter()).all(|(x, y)| x.abs_diff(*y) <= 2)));
    // …and with the stand-in (every pixel four times) it is the photo again.
    assert!(!looks_broken(&image, &same));

    let options = |scale| UpscaleOptions { scale, ..UpscaleOptions::default() };
    assert_eq!((options(0).scale(), options(1).scale(), options(2).scale(), options(4).scale()), (1, 1, 2, 4));
    assert_eq!((options(1).tag(), options(4).tag()), ("mejorada".to_string(), "x4".to_string()));
    assert_eq!(detail(options(1), 1000, 750), "Mejorada, mismo tamaño · 1000 × 750 px");
    assert!(fits(6000, 6000, 1));
}

#[test]
fn the_model_reads_and_gives_planes_from_0_to_1() {
    let image  = picture(40, 30);
    let values = tensor_of(&image, Rect { x: 0, y: 0, width: 40, height: 30 }, 40);
    assert_eq!(values.len(), 40 * 40 * 3);
    let back   = image_of(&values, 40, 40);
    assert_eq!(image::imageops::crop_imm(&back, 0, 0, 40, 30).to_image(), image);
    // Below the photo, its last row repeated.
    assert_eq!(back.get_pixel(5, 39), image.get_pixel(5, 29));
    // Out of range or NaN: clamped.
    let odd = image_of(&[f32::NAN, 2.0, -1.0], 1, 1);
    assert_eq!(*odd.get_pixel(0, 0), Rgb([0, 255, 0]));
}

#[test]
fn a_broken_result_is_not_saved() {
    let image = picture(120, 90);
    assert!(!looks_broken(&image, &nearest_x4(&image)));
    assert!(looks_broken(&image, &RgbImage::new(480, 360)));
    let noise = RgbImage::from_fn(480, 360, |x, y| Rgb([((x * 97 + y * 31) % 256) as u8, ((x * 13 + y * 71) % 256) as u8, ((x * y) % 256) as u8]));
    assert!(looks_broken(&image, &noise));
}

#[test]
fn a_size_limit_and_a_piece_to_compare() {
    assert!(fits(1000, 750, 4));
    assert!(fits(3000, 2000, 2));
    assert!(!fits(4000, 3000, 2));
    assert!(!fits(4000, 3000, 4));
    assert_eq!(preview_rect(1000, 800, 160, 0.5, 0.5), Rect { x: 420, y: 320, width: 160, height: 160 });
    assert_eq!(preview_rect(1000, 800, 160, 0.99, 0.0), Rect { x: 840, y: 0, width: 160, height: 160 });
    assert_eq!(preview_rect(100, 80, 160, 0.5, 0.5), Rect { x: 0, y: 0, width: 100, height: 80 });
}

// The real models on a 1000 px photo, on the card and on the processor apart (GLUP_UPSCALE_MODELS: the
// folder with both .onnx). `cargo test real_upscale -- --ignored --nocapture`
#[test]
#[ignore]
fn real_upscale_times_for_a_1000_px_photo() {
    use std::{path::PathBuf, time::Instant};

    use super::model::{UpscaleLevel, MODEL_SCALE};
    use crate::services::background::session::{infer, open, Device};

    let folder = PathBuf::from(std::env::var("GLUP_UPSCALE_MODELS").unwrap());
    let photo  = RgbImage::from_fn(1000, 750, |x, y| {
        let wave = ((f64::from(x) / 23.0).sin() * (f64::from(y) / 17.0).cos() * 60.0) as i32;
        Rgb([(120 + wave).clamp(0, 255) as u8, (x * 255 / 1000) as u8, (y * 255 / 750) as u8])
    });
    let small = image::imageops::resize(&photo, 250, 188, FilterType::Triangle);

    for level in [UpscaleLevel::Fast, UpscaleLevel::Detail] {
        let model = folder.join(level.model().name);
        for device in [Device::Gpu, Device::Cpu] {
            let Ok(mut session) = open(&model, device) else {
                println!("{level:?} {device:?}: no se pudo abrir");
                continue;
            };
            for (name, image, scale) in [("1000 px x1", &photo, 1), ("1000 px x2", &photo, 2), ("1000 px x4", &photo, 4), ("250 px x4", &small, 4)] {
                let start      = Instant::now();
                let mut output = RgbImage::new(image.width() * scale, image.height() * scale);
                let pieces     = plan(image.width(), image.height(), level.tile(), OVERLAP);
                let size       = padded_side(level.tile(), OVERLAP);
                for tile in &pieces {
                    let input    = tensor_of(image, tile.input, size);
                    let values   = infer(&mut session, &input, [1, 3, size as usize, size as usize]).unwrap();
                    let upscaled = image_of(&values, size * MODEL_SCALE, size * MODEL_SCALE);
                    paste(PasteParams { output: &mut output, tile: *tile, upscaled: &upscaled, model: MODEL_SCALE, scale });
                }
                println!("{level:?} {device:?} {name}: {} bloques, {:.1} s", pieces.len(), start.elapsed().as_secs_f64());
                assert!(!looks_broken(image, &output));
            }
        }
    }
}

// The real download of both levels through Glup's own downloader, into a temporary folder (deleted
// after), with its log. `cargo test real_upscale_download -- --ignored --nocapture`
#[test]
#[ignore]
fn real_upscale_download_of_both_levels() {
    use std::sync::atomic::AtomicBool;

    use super::model::{DETAIL_MODEL, FAST_MODEL};
    use crate::services::background::download::{download, fetch_model, DownloadEnd, DownloadParams};

    let folder = std::env::temp_dir().join(format!("glup-upscale-download-{}", std::process::id()));
    let _      = std::fs::remove_dir_all(&folder);
    std::fs::create_dir_all(&folder).unwrap();
    let cancel = AtomicBool::new(false);
    for model in [&FAST_MODEL, &DETAIL_MODEL] {
        let start = std::time::Instant::now();
        let end   = download(DownloadParams { folder: &folder, model, cancel: &cancel, on_progress: &|_| {}, on_verifying: &|| {}, fetch: &|from| fetch_model(model, from) });
        println!("{}: {end:?} en {:.1} s", model.name, start.elapsed().as_secs_f64());
        assert_eq!(end, Ok(DownloadEnd::Installed));
    }

    // A resume through the CDN: 206 and exactly the rest of the file.
    let mut fetched = fetch_model(&DETAIL_MODEL, 30_000_000).unwrap();
    let mut rest    = Vec::new();
    std::io::Read::read_to_end(&mut fetched.reader, &mut rest).unwrap();
    assert!(fetched.resumed);
    assert_eq!(rest.len() as u64, DETAIL_MODEL.size - 30_000_000);
    let _ = std::fs::remove_dir_all(&folder);
}
