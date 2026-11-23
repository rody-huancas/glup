// Images on the Windows clipboard travel as a DIB: a BITMAPINFOHEADER and the rows of pixels. Kept pure,
// both ways, so it can be tested without a clipboard.
use image::RgbaImage;

const HEADER_SIZE: usize = 40;
const BI_RGB: u32        = 0;
const BI_BITFIELDS: u32  = 3;

// Bigger images are not kept: they would make the list heavy and slow to open.
pub const MAX_SIDE: u32   = 8000;
pub const MAX_PIXELS: u64 = 16_777_216;

fn read_u16(bytes: &[u8], at: usize) -> Option<u16> {
    bytes.get(at..at + 2).map(|slice| u16::from_le_bytes([slice[0], slice[1]]))
}

fn read_u32(bytes: &[u8], at: usize) -> Option<u32> {
    bytes.get(at..at + 4).map(|slice| u32::from_le_bytes([slice[0], slice[1], slice[2], slice[3]]))
}

pub fn fits(width: u32, height: u32) -> bool {
    width > 0 && height > 0 && width <= MAX_SIDE && height <= MAX_SIDE && width as u64 * height as u64 <= MAX_PIXELS
}

// Width and height from the header, before reading any pixel (to skip the big ones early).
pub fn dib_size(bytes: &[u8]) -> Option<(u32, u32)> {
    let width  = read_u32(bytes, 4)? as i32;
    let height = read_u32(bytes, 8)? as i32;
    Some((width.unsigned_abs(), height.unsigned_abs()))
}

// 24 and 32 bits per pixel, plain or with the usual masks; rows bottom-up (or top-down with a negative
// height). A 32-bit image whose alpha is all zero is opaque: many programs leave it empty.
pub fn dib_to_rgba(bytes: &[u8]) -> Option<RgbaImage> {
    let header      = read_u32(bytes, 0)? as usize;
    let raw_width   = read_u32(bytes, 4)? as i32;
    let raw_height  = read_u32(bytes, 8)? as i32;
    let bits        = read_u16(bytes, 14)?;
    let compression = read_u32(bytes, 16)?;
    let colors      = read_u32(bytes, 32)? as usize;

    let (width, height) = (raw_width.unsigned_abs(), raw_height.unsigned_abs());
    if header < HEADER_SIZE || raw_width <= 0 || !fits(width, height) || !(bits == 24 || bits == 32) {
        return None;
    }
    if compression != BI_RGB && !(compression == BI_BITFIELDS && bits == 32) {
        return None;
    }

    let masks  = if compression == BI_BITFIELDS && header == HEADER_SIZE { 12 } else { 0 };
    let start  = header + masks + colors * 4;
    let step   = bits as usize / 8;
    let stride = (width as usize * bits as usize).div_ceil(32) * 4;
    let pixels = bytes.get(start..start + stride * height as usize)?;

    let mut image  = RgbaImage::new(width, height);
    let mut opaque = true;

    for y in 0..height as usize {
        let row  = if raw_height > 0 { height as usize - 1 - y } else { y };
        let line = &pixels[row * stride..row * stride + width as usize * step];

        for (x, pixel) in line.chunks_exact(step).enumerate() {
            let alpha = if step == 4 { pixel[3] } else { 255 };
            if alpha != 0 {
                opaque = false;
            }
            image.put_pixel(x as u32, y as u32, image::Rgba([pixel[2], pixel[1], pixel[0], alpha]));
        }
    }

    if bits == 32 && opaque {
        image.pixels_mut().for_each(|pixel| pixel.0[3] = 255);
    }

    Some(image)
}

// The other way, to copy an image back: 32 bits, bottom-up, the form every program reads.
pub fn rgba_to_dib(image: &RgbaImage) -> Vec<u8> {
    let (width, height) = image.dimensions();
    let size            = width as usize * height as usize * 4;
    let mut bytes       = Vec::with_capacity(HEADER_SIZE + size);

    bytes.extend_from_slice(&(HEADER_SIZE as u32).to_le_bytes());
    bytes.extend_from_slice(&(width as i32).to_le_bytes());
    bytes.extend_from_slice(&(height as i32).to_le_bytes());
    bytes.extend_from_slice(&1u16.to_le_bytes());
    bytes.extend_from_slice(&32u16.to_le_bytes());
    bytes.extend_from_slice(&BI_RGB.to_le_bytes());
    bytes.extend_from_slice(&(size as u32).to_le_bytes());
    bytes.extend_from_slice(&[0u8; 16]);

    for y in (0..height).rev() {
        for x in 0..width {
            let [red, green, blue, alpha] = image.get_pixel(x, y).0;
            bytes.extend_from_slice(&[blue, green, red, alpha]);
        }
    }

    bytes
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample() -> RgbaImage {
        RgbaImage::from_fn(3, 2, |x, y| image::Rgba([x as u8 * 80, y as u8 * 120, 30, 255]))
    }

    #[test]
    fn an_image_survives_the_round_trip() {
        let image = sample();
        assert_eq!(dib_to_rgba(&rgba_to_dib(&image)), Some(image));
        assert_eq!(dib_size(&rgba_to_dib(&sample())), Some((3, 2)));
    }

    #[test]
    fn a_24_bit_image_with_padded_rows_reads_right() {
        // 2x1, 24 bits: 6 bytes of pixels padded to 8.
        let mut bytes = rgba_to_dib(&RgbaImage::new(2, 1))[..HEADER_SIZE].to_vec();
        bytes[14] = 24;
        bytes.extend_from_slice(&[10, 20, 30, 40, 50, 60, 0, 0]);

        let image = dib_to_rgba(&bytes).unwrap();
        assert_eq!(image.get_pixel(0, 0).0, [30, 20, 10, 255]);
        assert_eq!(image.get_pixel(1, 0).0, [60, 50, 40, 255]);
    }

    #[test]
    fn an_empty_alpha_means_opaque() {
        let mut bytes = rgba_to_dib(&sample());
        bytes[HEADER_SIZE..].chunks_exact_mut(4).for_each(|pixel| pixel[3] = 0);

        assert!(dib_to_rgba(&bytes).unwrap().pixels().all(|pixel| pixel.0[3] == 255));
    }

    #[test]
    fn huge_or_broken_images_are_not_read() {
        assert!(!fits(9000, 10));
        assert!(!fits(5000, 5000));
        assert!(fits(3840, 2160));

        let mut bytes = rgba_to_dib(&sample());
        bytes[4..8].copy_from_slice(&9000i32.to_le_bytes());
        assert_eq!(dib_to_rgba(&bytes), None);
        assert_eq!(dib_to_rgba(&bytes[..30]), None);
    }
}
