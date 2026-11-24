// The date a photo was taken, kept in the new file when its format has room for it (JPG, PNG, WebP).
// Re-encoding drops the whole EXIF block; this writes back a small new one with only the camera, the
// dates and, if "Quitar ubicación" is off, where it was taken (its GPS block). Orientation is always 1:
// the pixels are already upright. AVIF, ICO and PDF get nothing.
use std::{io::Cursor, path::Path};

use image::{ImageDecoder, ImageReader};

use super::heif;

// EXIF tags kept.
const MAKE: u16              = 0x010F;
const MODEL: u16             = 0x0110;
const ORIENTATION: u16       = 0x0112;
const DATE_TIME: u16         = 0x0132;
const EXIF_IFD: u16          = 0x8769;
const GPS_IFD: u16           = 0x8825;
const DATE_ORIGINAL: u16     = 0x9003;
const DATE_DIGITIZED: u16    = 0x9004;
const OFFSET_TIME: u16       = 0x9010;
const OFFSET_ORIGINAL: u16   = 0x9011;
const OFFSET_DIGITIZED: u16  = 0x9012;

const KEPT_MAIN: [u16; 3] = [MAKE, MODEL, DATE_TIME];
const KEPT_EXIF: [u16; 5] = [DATE_ORIGINAL, DATE_DIGITIZED, OFFSET_TIME, OFFSET_ORIGINAL, OFFSET_DIGITIZED];

const TYPE_SHORT: u16 = 3;
const TYPE_LONG: u16  = 4;

// One field, its value already in little-endian order.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Field {
    pub tag   : u16,
    pub kind  : u16,
    pub count : u32,
    pub value : Vec<u8>,
}

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct PhotoMetadata {
    pub main : Vec<Field>,
    pub exif : Vec<Field>,
    pub gps  : Vec<Field>,
}

#[cfg(test)]
impl PhotoMetadata {
    pub fn date_taken(&self) -> Option<String> {
        self.exif.iter().chain(&self.main).find(|field| field.tag == DATE_ORIGINAL || field.tag == DATE_TIME).map(|field| String::from_utf8_lossy(&field.value).trim_end_matches('\0').to_string())
    }
}

// Bytes of each part of a value of this type (to turn it around), and its size.
fn unit(kind: u16) -> Option<(usize, usize)> {
    match kind {
        1 | 2 | 6 | 7 => Some((1, 1)),
        3 | 8         => Some((2, 2)),
        4 | 9 | 11    => Some((4, 4)),
        5 | 10        => Some((4, 8)),
        12            => Some((8, 8)),
        _             => None,
    }
}

struct Tiff<'a> {
    data   : &'a [u8],
    little : bool,
}

impl Tiff<'_> {
    fn u16(&self, at: usize) -> Option<u16> {
        let bytes: [u8; 2] = self.data.get(at..at + 2)?.try_into().ok()?;
        Some(if self.little { u16::from_le_bytes(bytes) } else { u16::from_be_bytes(bytes) })
    }

    fn u32(&self, at: usize) -> Option<u32> {
        let bytes: [u8; 4] = self.data.get(at..at + 4)?.try_into().ok()?;
        Some(if self.little { u32::from_le_bytes(bytes) } else { u32::from_be_bytes(bytes) })
    }

    // Every field of the IFD at `at`.
    fn fields(&self, at: usize) -> Vec<Field> {
        let Some(count) = self.u16(at) else { return Vec::new() };

        (0..usize::from(count).min(512))
            .filter_map(|index| {
                let entry          = at + 2 + index * 12;
                let (tag, kind)    = (self.u16(entry)?, self.u16(entry + 2)?);
                let count          = self.u32(entry + 4)?;
                let (part, size)   = unit(kind)?;
                let length         = size.checked_mul(count as usize).filter(|length| *length <= 64 * 1024)?;
                let start          = if length <= 4 { entry + 8 } else { self.u32(entry + 8)? as usize };
                let mut value      = self.data.get(start..start.checked_add(length)?)?.to_vec();
                if !self.little && part > 1 {
                    value.chunks_mut(part).for_each(<[u8]>::reverse);
                }
                Some(Field { tag, kind, count, value })
            })
            .collect()
    }

    fn pointer(fields: &[Field], tag: u16) -> Option<usize> {
        let field = fields.iter().find(|field| field.tag == tag && field.kind == TYPE_LONG)?;
        Some(u32::from_le_bytes(field.value.get(..4)?.try_into().ok()?) as usize)
    }
}

// From the TIFF part of an EXIF block ("II*" or "MM*").
pub fn parse(tiff: &[u8]) -> Option<PhotoMetadata> {
    let little = match tiff.get(..4)? {
        b"II*\0" => true,
        b"MM\0*" => false,
        _        => return None,
    };
    let reader = Tiff { data: tiff, little };
    let main   = reader.fields(reader.u32(4)? as usize);
    let exif   = Tiff::pointer(&main, EXIF_IFD).map(|at| reader.fields(at)).unwrap_or_default();
    let gps    = Tiff::pointer(&main, GPS_IFD).map(|at| reader.fields(at)).unwrap_or_default();

    let keep = |fields: Vec<Field>, kept: &[u16]| fields.into_iter().filter(|field| kept.contains(&field.tag)).collect::<Vec<_>>();
    Some(PhotoMetadata { main: keep(main, &KEPT_MAIN), exif: keep(exif, &KEPT_EXIF), gps: gps.into_iter().filter(|field| field.tag <= 0x001F).collect() })
}

// The EXIF block of any photo: HEIC and AVIF from their container, the rest through image's decoders.
pub fn read(path: &Path) -> Option<PhotoMetadata> {
    let block = if heif::is_heif(path) {
        heif::exif(path)?
    } else {
        ImageReader::open(path).ok()?.with_guessed_format().ok()?.into_decoder().ok()?.exif_metadata().ok()??
    };
    let tiff = block.strip_prefix(b"Exif\0\0").unwrap_or(&block);
    parse(tiff)
}

fn field(tag: u16, kind: u16, value: u32) -> Field {
    let value = if kind == TYPE_SHORT { (value as u16).to_le_bytes().to_vec() } else { value.to_le_bytes().to_vec() };
    Field { tag, kind, count: 1, value }
}

// One IFD at `at`, with its long values right after it; returns the bytes.
fn write_ifd(fields: &[Field], at: usize, next: u32) -> Vec<u8> {
    let mut fields = fields.to_vec();
    fields.sort_by_key(|field| field.tag);

    let table_size = 2 + fields.len() * 12 + 4;
    let mut table  = Vec::with_capacity(table_size);
    let mut extra  = Vec::new();
    table.extend((fields.len() as u16).to_le_bytes());

    for field in &fields {
        table.extend(field.tag.to_le_bytes());
        table.extend(field.kind.to_le_bytes());
        table.extend(field.count.to_le_bytes());
        if field.value.len() <= 4 {
            let mut inline = field.value.clone();
            inline.resize(4, 0);
            table.extend(inline);
        } else {
            table.extend(((at + table_size + extra.len()) as u32).to_le_bytes());
            extra.extend(&field.value);
            if extra.len() % 2 == 1 {
                extra.push(0);
            }
        }
    }
    table.extend(next.to_le_bytes());
    table.extend(extra);
    table
}

fn ifd_size(fields: &[Field]) -> usize {
    2 + fields.len() * 12 + 4 + fields.iter().filter(|field| field.value.len() > 4).map(|field| field.value.len().div_ceil(2) * 2).sum::<usize>()
}

// A new TIFF block (little-endian): the camera, the dates, the GPS block if asked, orientation 1.
// None when there is nothing worth keeping (no date, no camera, no place).
pub fn build(metadata: &PhotoMetadata, keep_location: bool) -> Option<Vec<u8>> {
    let gps = if keep_location { metadata.gps.clone() } else { Vec::new() };
    if metadata.main.is_empty() && metadata.exif.is_empty() && gps.is_empty() {
        return None;
    }

    let main_fields = |exif_at: u32, gps_at: u32| {
        let mut fields = metadata.main.clone();
        fields.push(field(ORIENTATION, TYPE_SHORT, 1));
        if !metadata.exif.is_empty() {
            fields.push(field(EXIF_IFD, TYPE_LONG, exif_at));
        }
        if !gps.is_empty() {
            fields.push(field(GPS_IFD, TYPE_LONG, gps_at));
        }
        fields
    };

    // The pointers have a fixed size: measure with zeros, then write with the real places.
    let main_at = 8;
    let exif_at = main_at + ifd_size(&main_fields(0, 0));
    let gps_at  = exif_at + if metadata.exif.is_empty() { 0 } else { ifd_size(&metadata.exif) };

    let mut tiff = b"II*\0".to_vec();
    tiff.extend((main_at as u32).to_le_bytes());
    tiff.extend(write_ifd(&main_fields(exif_at as u32, gps_at as u32), main_at, 0));
    if !metadata.exif.is_empty() {
        tiff.extend(write_ifd(&metadata.exif, exif_at, 0));
    }
    if !gps.is_empty() {
        tiff.extend(write_ifd(&gps, gps_at, 0));
    }
    Some(tiff)
}

const CRC_POLY: u32 = 0xEDB8_8320;

fn crc32(bytes: &[u8]) -> u32 {
    !bytes.iter().fold(!0_u32, |crc, byte| (0..8).fold(crc ^ u32::from(*byte), |crc, _| if crc & 1 == 1 { (crc >> 1) ^ CRC_POLY } else { crc >> 1 }))
}

// JPG: an APP1 "Exif" segment right after the start.
fn into_jpeg(image: &[u8], tiff: &[u8]) -> Option<Vec<u8>> {
    let length = u16::try_from(2 + 6 + tiff.len()).ok()?;
    let mut out = image.get(..2)?.to_vec();
    out.extend([0xFF, 0xE1]);
    out.extend(length.to_be_bytes());
    out.extend(b"Exif\0\0");
    out.extend(tiff);
    out.extend(&image[2..]);
    Some(out)
}

// PNG: an eXIf chunk after IHDR (any one it had is replaced).
fn into_png(image: &[u8], tiff: &[u8]) -> Option<Vec<u8>> {
    let mut out = image.get(..8)?.to_vec();
    let mut at  = 8;

    while at + 12 <= image.len() {
        let length = u32::from_be_bytes(image[at..at + 4].try_into().ok()?) as usize;
        let end    = at.checked_add(12 + length).filter(|end| *end <= image.len())?;
        let kind   = &image[at + 4..at + 8];

        if kind != b"eXIf" {
            out.extend(&image[at..end]);
        }
        if kind == b"IHDR" {
            out.extend((tiff.len() as u32).to_be_bytes());
            let mut chunk = b"eXIf".to_vec();
            chunk.extend(tiff);
            out.extend(&chunk);
            out.extend(crc32(&chunk).to_be_bytes());
        }
        at = end;
    }
    Some(out)
}

fn riff_chunk(kind: &[u8], data: &[u8]) -> Vec<u8> {
    let mut chunk = kind.to_vec();
    chunk.extend((data.len() as u32).to_le_bytes());
    chunk.extend(data);
    if data.len() % 2 == 1 {
        chunk.push(0);
    }
    chunk
}

// WebP: the extended header (VP8X) says there is an EXIF chunk, which goes at the end.
fn into_webp(image: &[u8], tiff: &[u8]) -> Option<Vec<u8>> {
    const EXIF_FLAG: u8  = 0x08;
    const ALPHA_FLAG: u8 = 0x10;

    let body            = image.get(12..)?;
    let first           = body.get(..4)?;
    let decoder         = image::codecs::webp::WebPDecoder::new(Cursor::new(image)).ok()?;
    let (width, height) = decoder.dimensions();
    let alpha           = decoder.color_type().has_alpha();

    let mut chunks = if first == b"VP8X" {
        let mut chunks = body.to_vec();
        chunks[8] |= EXIF_FLAG;
        chunks
    } else {
        let mut header = vec![EXIF_FLAG | if alpha { ALPHA_FLAG } else { 0 }, 0, 0, 0];
        header.extend(&(width - 1).to_le_bytes()[..3]);
        header.extend(&(height - 1).to_le_bytes()[..3]);
        let mut chunks = riff_chunk(b"VP8X", &header);
        chunks.extend(body);
        chunks
    };
    chunks.extend(riff_chunk(b"EXIF", tiff));

    let mut out = b"RIFF".to_vec();
    out.extend(((chunks.len() + 4) as u32).to_le_bytes());
    out.extend(b"WEBP");
    out.extend(chunks);
    Some(out)
}

pub struct CarryParams<'a> {
    pub source        : &'a Path,
    pub bytes         : Vec<u8>,
    pub keep_location : bool,
}

// The new file with the date of the photo (and its place, if asked) when its format holds EXIF; as it
// was otherwise, or if the original had none.
pub fn carry(params: CarryParams) -> Vec<u8> {
    let Some(tiff) = read(params.source).and_then(|metadata| build(&metadata, params.keep_location)) else { return params.bytes };
    let bytes      = &params.bytes;

    let with = if bytes.starts_with(&[0xFF, 0xD8]) {
        into_jpeg(bytes, &tiff)
    } else if bytes.starts_with(b"\x89PNG\r\n\x1a\n") {
        into_png(bytes, &tiff)
    } else if bytes.starts_with(b"RIFF") && bytes.get(8..12) == Some(b"WEBP") {
        into_webp(bytes, &tiff)
    } else {
        None
    };
    with.unwrap_or(params.bytes)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ascii(tag: u16, text: &str) -> Field {
        let mut value = text.as_bytes().to_vec();
        value.push(0);
        Field { tag, kind: 2, count: value.len() as u32, value }
    }

    fn rational(tag: u16, values: &[(u32, u32)]) -> Field {
        Field { tag, kind: 5, count: values.len() as u32, value: values.iter().flat_map(|(n, d)| n.to_le_bytes().into_iter().chain(d.to_le_bytes())).collect() }
    }

    fn sample() -> PhotoMetadata {
        PhotoMetadata {
            main : vec![ascii(MAKE, "Apple"), ascii(MODEL, "iPhone 15"), ascii(DATE_TIME, "2024:05:17 10:20:30")],
            exif : vec![ascii(DATE_ORIGINAL, "2024:05:17 10:20:30"), ascii(OFFSET_ORIGINAL, "-05:00")],
            gps  : vec![ascii(1, "S"), rational(2, &[(12, 1), (3, 1), (3050, 100)])],
        }
    }

    #[test]
    fn a_new_block_reads_back_with_the_date_and_without_the_place() {
        let without = parse(&build(&sample(), false).unwrap()).unwrap();
        assert_eq!(without.date_taken().as_deref(), Some("2024:05:17 10:20:30"));
        assert_eq!(without.main, sample().main);
        assert_eq!(without.exif, sample().exif);
        assert!(without.gps.is_empty());

        let with = parse(&build(&sample(), true).unwrap()).unwrap();
        assert_eq!(with.gps, sample().gps);
        assert_eq!(build(&PhotoMetadata::default(), true), None);
    }

    #[test]
    fn the_orientation_is_always_upright() {
        let tiff   = build(&sample(), false).unwrap();
        let reader = Tiff { data: &tiff, little: true };
        let main   = reader.fields(8);
        assert_eq!(main.iter().find(|field| field.tag == ORIENTATION).map(|field| field.value.clone()), Some(vec![1, 0]));
    }

    #[test]
    fn big_endian_blocks_are_read_too() {
        // MM, one IFD with Make "Sony" and an orientation of 6.
        let mut tiff = b"MM\0*\0\0\0\x08\0\x02".to_vec();
        tiff.extend([0x01, 0x0F, 0, 2, 0, 0, 0, 5, 0, 0, 0, 38]);
        tiff.extend([0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, 6, 0, 0]);
        tiff.extend([0, 0, 0, 0]);
        tiff.extend(b"Sony\0");
        let read = parse(&tiff).unwrap();
        assert_eq!(read.main, vec![ascii(MAKE, "Sony")]);
    }

    #[test]
    fn the_block_goes_into_jpg_png_and_webp() {
        let tiff = build(&sample(), true).unwrap();

        let jpeg = into_jpeg(&[0xFF, 0xD8, 0xFF, 0xD9], &tiff).unwrap();
        assert_eq!(&jpeg[2..4], &[0xFF, 0xE1]);
        assert_eq!(&jpeg[6..12], b"Exif\0\0");
        assert_eq!(&jpeg[jpeg.len() - 2..], &[0xFF, 0xD9]);

        let mut png = Vec::new();
        image::DynamicImage::new_rgb8(4, 4).write_to(&mut std::io::Cursor::new(&mut png), image::ImageFormat::Png).unwrap();
        let with = into_png(&png, &tiff).unwrap();
        let mut decoder = image::codecs::png::PngDecoder::new(std::io::Cursor::new(&with)).unwrap();
        assert_eq!(decoder.exif_metadata().unwrap().as_deref(), Some(tiff.as_slice()));
        // Twice: still one block.
        assert_eq!(into_png(&with, &tiff).unwrap().len(), with.len());

        let rgb   = image::RgbImage::new(4, 4);
        let webp  = webp::Encoder::from_rgb(&rgb, 4, 4).encode_simple(false, 80.0).unwrap().to_vec();
        let with  = into_webp(&webp, &tiff).unwrap();
        let mut decoder = image::codecs::webp::WebPDecoder::new(std::io::Cursor::new(&with)).unwrap();
        assert_eq!(decoder.exif_metadata().unwrap().as_deref(), Some(tiff.as_slice()));
        assert_eq!(image::load_from_memory(&with).unwrap().width(), 4);
    }

    #[test]
    fn a_heic_from_a_phone_gives_its_date_and_place() {
        let path     = Path::new(env!("CARGO_MANIFEST_DIR")).join("fixtures").join("heif").join("rotada.heic");
        let metadata = read(&path).unwrap();
        assert_eq!(metadata.date_taken().as_deref(), Some("2024:05:17 10:20:30"));
        assert!(metadata.gps.iter().any(|field| field.tag == 2));
    }
}
