// Runs every image path on generated samples inside the system temp folder and prints the sizes.
use std::{
    fs,
    path::{Path, PathBuf},
};

use image::{DynamicImage, ImageFormat, Rgb, RgbImage, Rgba, RgbaImage};

use super::{
    compress::compress,
    convert::{convert, encode_jpeg},
    decode::{decode, has_transparency},
    to_pdf::PdfBuilder,
    SourceFormat, TargetFormat,
};

struct Samples {
    folder: PathBuf,
}

impl Samples {
    fn new(name: &str) -> Self {
        let folder = std::env::temp_dir().join(format!("glup-image-tests-{}-{name}", std::process::id()));
        let _      = fs::remove_dir_all(&folder);
        fs::create_dir_all(&folder).expect("temp folder");
        Self { folder }
    }

    fn path(&self, name: &str) -> PathBuf {
        self.folder.join(name)
    }
}

impl Drop for Samples {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.folder);
    }
}

// Photo-like: smooth gradients plus a little deterministic noise.
fn photo(width: u32, height: u32) -> DynamicImage {
    let image = RgbImage::from_fn(width, height, |x, y| {
        let noise = ((x * 7919 + y * 104_729) % 23) as u8;
        Rgb([
            ((x * 255 / width) as u8).saturating_add(noise),
            ((y * 255 / height) as u8).saturating_add(noise / 2),
            (((x + y) * 128 / (width + height)) as u8 + 60).saturating_add(noise),
        ])
    });

    DynamicImage::ImageRgb8(image)
}

// A lilac circle on a fully transparent background.
fn sticker(size: u32) -> DynamicImage {
    let center = size as f32 / 2.0;
    let image  = RgbaImage::from_fn(size, size / 2 * 3 / 2, |x, y| {
        let distance = ((x as f32 - center).powi(2) + (y as f32 - center * 0.75).powi(2)).sqrt();
        if distance < center * 0.6 { Rgba([157, 144, 250, 255]) } else { Rgba([0, 0, 0, 0]) }
    });

    DynamicImage::ImageRgba8(image)
}

// Inserts a minimal EXIF block saying "rotate 90° clockwise" (orientation 6) right after the JPEG SOI.
fn with_exif_rotation(jpeg: &[u8]) -> Vec<u8> {
    let tiff: [u8; 26] = [
        b'I', b'I', 42, 0, 8, 0, 0, 0, // header, IFD at offset 8
        1, 0, // one entry
        0x12, 0x01, 3, 0, 1, 0, 0, 0, 6, 0, 0, 0, // Orientation (0x0112), SHORT, 1, value 6
        0, 0, 0, 0, // no next IFD
    ];
    let length = (2 + 6 + tiff.len()) as u16;

    let mut out = vec![0xFF, 0xD8, 0xFF, 0xE1];
    out.extend_from_slice(&length.to_be_bytes());
    out.extend_from_slice(b"Exif\0\0");
    out.extend_from_slice(&tiff);
    out.extend_from_slice(&jpeg[2..]);
    out
}

fn save_as(image: &DynamicImage, path: &Path, format: ImageFormat) {
    image.save_with_format(path, format).expect("sample");
}

fn kb(bytes: usize) -> String {
    format!("{:.1} KB", bytes as f64 / 1024.0)
}

fn size_of(path: &Path) -> usize {
    fs::metadata(path).map(|data| data.len() as usize).unwrap_or(0)
}

#[test]
fn converts_to_every_format() {
    let samples = Samples::new("convert");
    let source  = samples.path("foto.png");
    save_as(&photo(1600, 1200), &source, ImageFormat::Png);

    println!("\n[convertir] foto.png 1600x1200 ({})", kb(size_of(&source)));

    for format in [TargetFormat::Webp, TargetFormat::Jpg, TargetFormat::Png, TargetFormat::Avif, TargetFormat::Ico] {
        let bytes = convert(&source, format).expect("convert");
        println!("  → {:<4} {}", format.label(), kb(bytes.len()));
        assert!(!bytes.is_empty());
    }

    let ico = convert(&source, TargetFormat::Ico).unwrap();
    assert_eq!(u16::from_le_bytes([ico[4], ico[5]]), 6, "six sizes in the .ico");

    let avif = convert(&source, TargetFormat::Avif).unwrap();
    assert_eq!(&avif[4..12], b"ftypavif");
}

#[test]
fn jpg_fills_transparency_with_white() {
    let samples = Samples::new("white");
    let source  = samples.path("sticker.png");
    save_as(&sticker(400), &source, ImageFormat::Png);

    let jpeg   = encode_jpeg(&decode(&source).unwrap(), 85).unwrap();
    let back   = image::load_from_memory(&jpeg).unwrap().to_rgb8();
    let corner = back.get_pixel(2, 2);

    println!("\n[jpg con transparencia] sticker.png {} → JPG {} · esquina {:?}", kb(size_of(&source)), kb(jpeg.len()), corner.0);
    assert!(corner.0.iter().all(|&channel| channel > 245), "transparent corner should be white");
}

#[test]
fn ico_is_square_without_cropping() {
    let samples = Samples::new("ico");
    let source  = samples.path("sticker.png");
    save_as(&sticker(300), &source, ImageFormat::Png);

    let ico     = convert(&source, TargetFormat::Ico).unwrap();
    let largest = image::load_from_memory_with_format(&ico, ImageFormat::Ico).unwrap();

    println!("\n[ico] sticker 300x225 → .ico {} · mayor {}x{}", kb(ico.len()), largest.width(), largest.height());
    assert_eq!((largest.width(), largest.height()), (256, 256));
    assert!(has_transparency(&largest));
}

#[test]
fn compresses_keeping_the_format() {
    let samples = Samples::new("compress");
    let image   = photo(1600, 1200);

    let jpeg = samples.path("foto.jpg");
    fs::write(&jpeg, {
        let mut buffer = Vec::new();
        image.write_with_encoder(image::codecs::jpeg::JpegEncoder::new_with_quality(&mut buffer, 97)).unwrap();
        buffer
    })
    .unwrap();

    let cases = [
        (jpeg, SourceFormat::Jpeg),
        (samples.path("foto.png"), SourceFormat::Png),
        (samples.path("foto.bmp"), SourceFormat::Bmp),
        (samples.path("foto.tiff"), SourceFormat::Tiff),
        (samples.path("foto.webp"), SourceFormat::Webp),
        (samples.path("sticker.bmp"), SourceFormat::Bmp),
    ];

    save_as(&image, &cases[1].0, ImageFormat::Png);
    save_as(&image, &cases[2].0, ImageFormat::Bmp);
    save_as(&image, &cases[3].0, ImageFormat::Tiff);
    save_as(&image, &cases[4].0, ImageFormat::WebP);
    save_as(&sticker(400), &cases[5].0, ImageFormat::Bmp);

    println!("\n[comprimir]");

    for (path, format) in &cases {
        let result = compress(path, *format).expect("compress");
        let name   = path.file_name().unwrap().to_string_lossy();
        println!("  {:<12} {:>10} → {:>10} (.{})", name, kb(size_of(path)), kb(result.bytes.len()), result.extension);
    }

    assert_eq!(compress(&cases[2].0, SourceFormat::Bmp).unwrap().extension, "jpg");
    assert_eq!(compress(&cases[5].0, SourceFormat::Bmp).unwrap().extension, "png");
}

#[test]
fn compressing_twice_is_not_smaller() {
    let samples = Samples::new("twice");
    let source  = samples.path("foto.jpg");
    fs::write(&source, encode_jpeg(&photo(800, 600), 60).unwrap()).unwrap();

    let again = compress(&source, SourceFormat::Jpeg).unwrap();
    println!("\n[ya comprimida] foto.jpg q60 {} → q80 {}", kb(size_of(&source)), kb(again.bytes.len()));
    assert!(again.bytes.len() >= size_of(&source), "an already small JPG must not shrink, so nothing is saved");
}

#[test]
fn reads_exif_orientation() {
    let samples = Samples::new("exif");
    let source  = samples.path("girada.jpg");
    fs::write(&source, with_exif_rotation(&encode_jpeg(&photo(400, 300), 85).unwrap())).unwrap();

    let image = decode(&source).unwrap();
    println!("\n[exif] guardada 400x300 con orientación 6 → leída {}x{}", image.width(), image.height());
    assert_eq!((image.width(), image.height()), (300, 400));
}

#[test]
fn builds_a_pdf_one_page_per_image() {
    let samples = Samples::new("pdf");
    let jpeg    = encode_jpeg(&photo(1600, 1200), 85).unwrap();

    let paths = [samples.path("a.jpg"), samples.path("b.png"), samples.path("c.jpg")];
    fs::write(&paths[0], &jpeg).unwrap();
    save_as(&sticker(400), &paths[1], ImageFormat::Png);
    fs::write(&paths[2], with_exif_rotation(&jpeg)).unwrap();

    let mut builder = PdfBuilder::new();
    paths.iter().for_each(|path| builder.add_image(path).expect("page"));
    let pdf = builder.finish().unwrap();

    let document = lopdf::Document::load_mem(&pdf).unwrap();
    let raw_jpeg = pdf.windows(jpeg.len().min(4096)).any(|window| window == &jpeg[..jpeg.len().min(4096)]);

    println!(
        "\n[pdf] a.jpg {} + b.png {} + c.jpg (girada) → PDF {} · {} páginas · JPG sin recomprimir: {}",
        kb(jpeg.len()),
        kb(size_of(&paths[1])),
        kb(pdf.len()),
        document.get_pages().len(),
        raw_jpeg,
    );

    assert_eq!(document.get_pages().len(), 3);
    assert!(raw_jpeg, "the JPG bytes must be embedded as they are");
}

#[test]
fn avif_input_is_reported() {
    let samples = Samples::new("avif");
    let source  = samples.path("foto.avif");
    fs::write(&source, convert_to_avif(&samples)).unwrap();

    assert!(decode(&source).is_err());
}

fn convert_to_avif(samples: &Samples) -> Vec<u8> {
    let png = samples.path("base.png");
    save_as(&photo(200, 150), &png, ImageFormat::Png);
    convert(&png, TargetFormat::Avif).unwrap()
}
