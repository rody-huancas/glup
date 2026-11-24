// The safety net of a lossy output: the new file is decoded and compared with the picture it came from.
// If it is not close enough (or cannot be read back), it is not saved.
use image::{imageops::FilterType, DynamicImage};

// The comparison is made on copies this size at most, so a 48 MP photo takes no time.
const COMPARE_SIDE: u32 = 512;
// Peak signal-to-noise ratio (dB) below which the copy looks worse than the photo. A JPG at quality 75
// of a photo is usually well above 35.
pub const MIN_PSNR: f64 = 30.0;

fn small(image: &DynamicImage) -> image::RgbImage {
    image.resize(COMPARE_SIDE, COMPARE_SIDE, FilterType::Triangle).to_rgb8()
}

pub fn psnr(original: &DynamicImage, encoded: &DynamicImage) -> f64 {
    let (a, b) = (small(original), small(encoded));
    if a.dimensions() != b.dimensions() {
        return 0.0;
    }

    let squared: f64 = a.as_raw().iter().zip(b.as_raw()).map(|(x, y)| (f64::from(*x) - f64::from(*y)).powi(2)).sum();
    let mean         = squared / a.as_raw().len().max(1) as f64;
    if mean == 0.0 { f64::INFINITY } else { 10.0 * (255.0_f64.powi(2) / mean).log10() }
}

// The bytes decode, to the same size, and look like the original.
pub fn looks_the_same(original: &DynamicImage, encoded: &[u8]) -> bool {
    image::load_from_memory(encoded).is_ok_and(|copy| {
        (copy.width(), copy.height()) == (original.width(), original.height()) && psnr(&super::decode::flatten_on_white(original), &copy) >= MIN_PSNR
    })
}

#[cfg(test)]
mod tests {
    use image::{Rgb, RgbImage};

    use super::*;
    use crate::services::image::convert::encode_jpeg;

    fn photo() -> DynamicImage {
        DynamicImage::ImageRgb8(RgbImage::from_fn(300, 200, |x, y| Rgb([(x % 256) as u8, (y % 256) as u8, ((x + y) % 256) as u8])))
    }

    #[test]
    fn a_good_jpg_passes_and_a_ruined_one_does_not() {
        let original = photo();
        assert!(looks_the_same(&original, &encode_jpeg(&original, 85).unwrap()));

        let other = DynamicImage::ImageRgb8(RgbImage::from_pixel(300, 200, Rgb([128, 128, 128])));
        assert!(!looks_the_same(&original, &encode_jpeg(&other, 85).unwrap()));
        assert!(!looks_the_same(&original, b"no es una imagen"));
        assert!(!looks_the_same(&original, &encode_jpeg(&DynamicImage::ImageRgb8(RgbImage::new(10, 10)), 85).unwrap()));
    }
}
