// Photos that look the same without being the same file: a burst, the same photo in another size or
// saved again. A difference hash of our own (dHash): the photo in grey at 9 × 8, one bit per pair of
// neighbours (is the left one brighter?). Two photos whose 64 bits differ in a few look alike.
use std::path::{Path, PathBuf};

use image::{imageops::FilterType, DynamicImage};

use crate::services::{
    image::decode::{decode, orientation},
    parallel::{run_parallel, ParallelParams},
};

// Bits (of 64) two photos may differ in and still count as alike.
pub const SIMILAR_DISTANCE: u32 = 10;
// A JPEG is read at least this big (the hash needs 9 × 8).
const SMALL_SIDE: u16 = 64;

// The photos it looks at (by extension; HEIC and AVIF through the same reading as every image tool).
pub const PHOTO_EXTENSIONS: [&str; 9] = ["jpg", "jpeg", "png", "webp", "heic", "heif", "hif", "avif", "bmp"];

pub fn is_photo(path: &Path) -> bool {
    path.extension().and_then(|extension| extension.to_str()).is_some_and(|extension| PHOTO_EXTENSIONS.contains(&extension.to_lowercase().as_str()))
}

pub fn difference_hash(image: &DynamicImage) -> u64 {
    let small = image.resize_exact(9, 8, FilterType::Triangle).to_luma8();
    let mut bits = 0u64;
    for y in 0..8 {
        for x in 0..8 {
            bits <<= 1;
            if small.get_pixel(x, y).0[0] > small.get_pixel(x + 1, y).0[0] {
                bits |= 1;
            }
        }
    }
    bits
}

pub fn distance(a: u64, b: u64) -> u32 {
    (a ^ b).count_ones()
}

// A JPEG read already small (its decoder can skip to 1/8 of the size: a dozen times faster than reading
// it whole), turned as its EXIF says, like every other reading.
fn small_jpeg(path: &Path) -> Option<DynamicImage> {
    use jpeg_decoder::{Decoder, PixelFormat};

    let mut decoder = Decoder::new(std::io::BufReader::new(std::fs::File::open(path).ok()?));
    decoder.scale(SMALL_SIDE, SMALL_SIDE).ok()?;
    let pixels = decoder.decode().ok()?;
    let info   = decoder.info()?;
    let (width, height) = (u32::from(info.width), u32::from(info.height));

    let mut image = match info.pixel_format {
        PixelFormat::L8    => DynamicImage::ImageLuma8(image::GrayImage::from_raw(width, height, pixels)?),
        PixelFormat::RGB24 => DynamicImage::ImageRgb8(image::RgbImage::from_raw(width, height, pixels)?),
        _                  => return None,
    };
    image.apply_orientation(orientation(path));
    Some(image)
}

fn photo_hash(path: &Path) -> Option<u64> {
    let jpeg = path.extension().and_then(|extension| extension.to_str()).is_some_and(|extension| matches!(extension.to_lowercase().as_str(), "jpg" | "jpeg"));
    let image = if jpeg { small_jpeg(path).or_else(|| decode(path).ok()) } else { decode(path).ok() };
    image.map(|image| difference_hash(&image))
}

pub struct SimilarParams<'a> {
    pub photos      : &'a [PathBuf],
    pub threads     : usize,
    pub cancel      : &'a std::sync::atomic::AtomicBool,
    pub on_progress : &'a (dyn Fn(usize, usize) + Sync),
}

fn find(parent: &mut [usize], item: usize) -> usize {
    let mut root = item;
    while parent[root] != root {
        root = parent[root];
    }
    let mut item = item;
    while parent[item] != root {
        let next     = parent[item];
        parent[item] = root;
        item         = next;
    }
    root
}

// The positions of alike hashes, grouped (two alike to a third are together even if a bit further).
pub fn alike_groups(hashes: &[Option<u64>]) -> Vec<Vec<usize>> {
    let mut parent: Vec<usize> = (0..hashes.len()).collect();
    for a in 0..hashes.len() {
        let Some(first) = hashes[a] else { continue };
        for b in a + 1..hashes.len() {
            if let Some(second) = hashes[b] {
                if distance(first, second) <= SIMILAR_DISTANCE {
                    let (root_a, root_b) = (find(&mut parent, a), find(&mut parent, b));
                    parent[root_b] = root_a;
                }
            }
        }
    }

    let mut groups: std::collections::HashMap<usize, Vec<usize>> = std::collections::HashMap::new();
    for item in 0..hashes.len() {
        if hashes[item].is_some() {
            let root = find(&mut parent, item);
            groups.entry(root).or_default().push(item);
        }
    }
    let mut found: Vec<Vec<usize>> = groups.into_values().filter(|group| group.len() > 1).collect();
    found.sort();
    found
}

// Groups of photos that look alike (paths), from every photo given.
pub fn similar_photos(params: SimilarParams) -> Vec<Vec<PathBuf>> {
    let total = params.photos.len();
    (params.on_progress)(0, total);
    let hashes: Vec<Option<u64>> = run_parallel(ParallelParams {
        paths       : params.photos,
        threads     : params.threads,
        cancel      : params.cancel,
        work        : photo_hash,
        on_finished : &|done| (params.on_progress)(done, total),
    })
    .into_iter()
    .map(Option::flatten)
    .collect();

    alike_groups(&hashes).into_iter().map(|group| group.into_iter().map(|index| params.photos[index].clone()).collect()).collect()
}

