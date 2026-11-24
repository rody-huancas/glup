// On the small photos in src-tauri/fixtures/heif (made for these tests; see its README). Each picture
// is checked as Windows decodes it and as FFmpeg does: the same size, upright, the primary picture.
// The exact colours are checked on FFmpeg's (Glup's own conversion to sRGB); Windows reads the colour
// signalling of these encoders (libheif, libaom) a little differently, so for it each colour only has
// to be the same colour.
//
// Windows needs its HEIF, HEVC and AV1 extensions; FFmpeg is GLUP_FFMPEG=<ffmpeg.exe> or the one
// Glup downloaded. Without them those checks say so and stop (a CI machine has neither).
use std::path::{Path, PathBuf};

use image::{Rgba, RgbaImage};

use super::{
    container::{self, Codec, Colour, Transform},
    decode_via, wic, DecodeParams, Via,
};
use crate::services::image::{
    convert::encode_jpeg,
    guard,
    metadata::{self, CarryParams},
};

fn fixture(name: &str) -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("fixtures").join("heif").join(name)
}

fn ffmpeg() -> Option<PathBuf> {
    let path = std::env::var("GLUP_FFMPEG").map(PathBuf::from).ok().or_else(|| {
        std::env::var("APPDATA").ok().map(|folder| Path::new(&folder).join("dev.glup.desktop").join("tools").join("ffmpeg.exe"))
    })?;
    path.is_file().then_some(path)
}

// Every way to decode this machine has.
fn decoders(sample: &[u8]) -> Vec<(&'static str, Option<PathBuf>)> {
    let mut found = Vec::new();
    if wic::decode(sample, Some(8)).is_ok() {
        found.push(("Windows", None));
    } else {
        eprintln!("[glup:heif] sin el decodificador de Windows: no lo pruebo");
    }
    match ffmpeg() {
        Some(path) => found.push(("FFmpeg", Some(path))),
        None       => eprintln!("[glup:heif] sin FFmpeg: no lo pruebo"),
    }
    found
}

fn decoded(name: &str) -> Vec<(&'static str, RgbaImage)> {
    let path  = fixture(name);
    let bytes = std::fs::read(&path).unwrap();
    let info  = container::parse(&bytes).unwrap();

    decoders(&bytes)
        .into_iter()
        .map(|(who, ffmpeg)| {
            let via   = ffmpeg.as_deref().map_or(Via::Windows, Via::Ffmpeg);
            let image = decode_via(&DecodeParams { path: &path, bytes: &bytes, info: &info, via, fit: None }).unwrap_or_else(|error| panic!("{who}: {error:?}"));
            (who, image)
        })
        .collect()
}

fn near(pixel: &Rgba<u8>, expected: [u8; 3], tolerance: u8) -> bool {
    pixel.0[..3].iter().zip(expected).all(|(got, want)| got.abs_diff(want) <= tolerance)
}

// Which of the four colours of the samples it is.
fn name_of(pixel: &Rgba<u8>) -> &'static str {
    let [r, g, b, _] = pixel.0.map(i32::from);
    match () {
        _ if r > 190 && g > 190 && b > 190 => "white",
        _ if r > g + 100 && r > b + 100   => "red",
        _ if g > r + 100 && g > b + 100   => "green",
        _ if b > r + 100 && b > g + 100   => "blue",
        _                                 => "other",
    }
}

fn same(who: &str, pixel: &Rgba<u8>, expected: [u8; 3]) -> bool {
    if who == "FFmpeg" { near(pixel, expected, 6) } else { name_of(pixel) == name_of(&Rgba([expected[0], expected[1], expected[2], 255])) }
}

fn assert_quadrants(who: &str, image: &RgbaImage, corners: [[u8; 3]; 4]) {
    let (w, h) = image.dimensions();
    let spots  = [(4, 4), (w - 5, 4), (4, h - 5), (w - 5, h - 5)];
    for ((x, y), expected) in spots.into_iter().zip(corners) {
        let pixel = image.get_pixel(x, y);
        assert!(same(who, pixel, expected), "{who}: ({x}, {y}) es {:?}, esperaba {expected:?}", pixel.0);
    }
}

const RED: [u8; 3]   = [220, 30, 30];
const GREEN: [u8; 3] = [30, 200, 30];
const BLUE: [u8; 3]  = [30, 30, 220];
const WHITE: [u8; 3] = [240, 240, 240];

#[test]
fn the_container_says_what_the_primary_picture_is() {
    let rotated = container::read(&fixture("rotada.heic")).unwrap();
    assert_eq!((rotated.codec, rotated.width, rotated.height, rotated.pictures), (Some(Codec::Hevc), 64, 48, 1));
    assert_eq!(rotated.transforms, [Transform::Rotate(3)]);
    assert!(rotated.exif.as_ref().is_some_and(|exif| exif.starts_with(b"II*\0") || exif.starts_with(b"MM\0*")));

    let deep = container::read(&fixture("diez-bits-p3.heic")).unwrap();
    assert!(matches!(deep.colour, Some(Colour::Nclx { primaries: 12, transfer: 13, .. })));

    let burst = container::read(&fixture("rafaga.heic")).unwrap();
    assert_eq!(burst.pictures, 2);

    let grid = container::read(&fixture("mosaico.heic")).unwrap();
    assert_eq!((grid.codec, grid.width, grid.height), (Some(Codec::Hevc), 120, 60));

    let avif = container::read(&fixture("rotada.avif")).unwrap();
    assert_eq!((avif.codec, avif.transforms.as_slice()), (Some(Codec::Av1), [Transform::Rotate(1)].as_slice()));

    assert!(container::parse(b"\x89PNG\r\n\x1a\n").is_none());
}

#[test]
fn a_rotated_heic_comes_out_upright() {
    for (who, image) in decoded("rotada.heic") {
        // 64×48 turned a quarter clockwise (EXIF 6, irot 270°).
        assert_eq!(image.dimensions(), (48, 64), "{who}");
        assert_quadrants(who, &image, [BLUE, RED, WHITE, GREEN]);
    }
}

#[test]
fn a_rotated_avif_comes_out_upright() {
    for (who, image) in decoded("rotada.avif") {
        // irot 90° counter-clockwise.
        assert_eq!(image.dimensions(), (48, 64), "{who}");
        assert_quadrants(who, &image, [GREEN, WHITE, RED, BLUE]);
    }
}

#[test]
fn a_burst_gives_its_primary_picture() {
    for (who, image) in decoded("rafaga.heic") {
        assert_eq!(image.dimensions(), (64, 48), "{who}");
        assert!(same(who, image.get_pixel(10, 10), [40, 40, 200]), "{who}: {:?}", image.get_pixel(10, 10).0);
    }
}

#[test]
fn a_grid_of_tiles_is_joined_and_cropped() {
    for (who, image) in decoded("mosaico.heic") {
        assert_eq!(image.dimensions(), (120, 60), "{who}");
        assert!(same(who, image.get_pixel(10, 30), RED), "{who}");
        assert!(same(who, image.get_pixel(110, 30), BLUE), "{who}");
    }
}

// Steps never go down, and with FFmpeg the ends reach black and white; 10 bits come down to 8 without
// a step skipped or cut short (each one is close to the ramp it was made from).
fn assert_ramp(who: &str, row: Vec<u8>) {
    assert!(row.windows(2).all(|pair| u16::from(pair[1]) + 3 >= u16::from(pair[0])), "{who}: {row:?}");
    if who == "FFmpeg" {
        let expected = |x: usize| (x * 255 / (row.len() - 1)) as i32;
        assert!(row.iter().enumerate().all(|(x, value)| (i32::from(*value) - expected(x)).abs() <= 5), "{who}: {row:?}");
    } else {
        assert!(row[row.len() - 1] - row[0] > 180, "{who}: {row:?}");
    }
}

#[test]
fn ten_bits_in_display_p3_come_to_eight_in_srgb() {
    for (who, image) in decoded("diez-bits-p3.heic") {
        assert_eq!(image.dimensions(), (64, 48), "{who}");
        // P3 (0,8 0,4 0,2) is about (219, 95, 31) in sRGB; as if it were sRGB it would be (204, 102, 51).
        let top = image.get_pixel(32, 6);
        assert!(near(top, [219, 95, 31], 5), "{who}: {:?}", top.0);
        assert!(!near(top, [204, 102, 51], 5), "{who}: quedó en P3");
        assert_ramp(who, (0..64).map(|x| image.get_pixel(x, 40).0[0]).collect());
    }
}

#[test]
fn a_ten_bit_avif_keeps_its_steps() {
    for (who, image) in decoded("diez-bits.avif") {
        assert_eq!(image.dimensions(), (64, 48), "{who}");
        assert_ramp(who, (0..64).map(|x| image.get_pixel(x, 24).0[1]).collect());
    }
}


// "Fotos de iPhone a JPG" end to end: upright, checked, with its date and, unless asked, without its place.
#[test]
fn a_heic_becomes_a_jpg_with_its_date_and_without_its_place() {
    let path = fixture("rotada.heic");
    for (who, image) in decoded("rotada.heic") {
        let photo = image::DynamicImage::ImageRgba8(image);
        let jpg   = encode_jpeg(&photo, 85).unwrap();
        assert!(guard::looks_the_same(&photo, &jpg), "{who}");

        for keep in [false, true] {
            let out         = metadata::carry(CarryParams { source: &path, bytes: jpg.clone(), keep_location: keep });
            let mut decoder = image::codecs::jpeg::JpegDecoder::new(std::io::Cursor::new(&out)).unwrap();
            let exif        = image::ImageDecoder::exif_metadata(&mut decoder).unwrap().unwrap();
            let read        = metadata::parse(exif.strip_prefix(b"Exif\0\0").unwrap_or(&exif)).unwrap();
            assert_eq!(read.date_taken().as_deref(), Some("2024:05:17 10:20:30"), "{who}");
            assert_eq!(!read.gps.is_empty(), keep, "{who}");
            assert_eq!(image::load_from_memory(&out).unwrap().width(), 48, "{who}");
        }
    }
}
