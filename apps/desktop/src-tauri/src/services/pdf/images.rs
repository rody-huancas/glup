// "Sacar imágenes": the pictures embedded in a PDF, as they are. JPEG streams are copied byte for
// byte; the rest are decoded once and written as PNG (lossless). Nothing is recompressed with loss.
use std::{collections::HashSet, io::Cursor};

use image::{DynamicImage, GrayImage, ImageFormat, RgbImage, RgbaImage};
use lopdf::{Dictionary, Document, Object, ObjectId, Stream};

pub const IMAGES_SUFFIX: &str = "imagenes-originales";
pub const IMAGE_STEM: &str    = "img";
pub const NO_IMAGES: &str     = "Este PDF no trae fotos adentro";

// Smaller than this on a side: an icon, a bullet or a decoration.
pub const MIN_SIDE: i64 = 64;

const MAX_DEPTH: usize = 8;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ExtractedImage {
    pub bytes     : Vec<u8>,
    pub extension : &'static str,
}

fn resolve<'a>(document: &'a Document, object: &'a Object) -> &'a Object {
    document.dereference(object).map(|(_, value)| value).unwrap_or(object)
}

fn dictionary_of<'a>(document: &'a Document, object: Option<&'a Object>) -> Option<&'a Dictionary> {
    object.map(|value| resolve(document, value)).and_then(|value| value.as_dict().ok())
}

fn integer(document: &Document, dictionary: &Dictionary, key: &[u8]) -> Option<i64> {
    dictionary.get(key).ok().map(|value| resolve(document, value)).and_then(|value| value.as_i64().ok())
}

fn filters(document: &Document, dictionary: &Dictionary) -> Vec<Vec<u8>> {
    match dictionary.get(b"Filter").ok().map(|value| resolve(document, value)) {
        Some(Object::Name(name))   => vec![name.clone()],
        Some(Object::Array(items)) => items.iter().filter_map(|item| resolve(document, item).as_name().ok().map(<[u8]>::to_vec)).collect(),
        _                          => Vec::new(),
    }
}

fn is_image(stream: &Stream) -> bool {
    stream.dict.get(b"Subtype").and_then(Object::as_name).is_ok_and(|name| name == b"Image")
}

// Image XObjects used by the pages, in page order and once each, looking inside forms too.
// Soft masks and stencil masks are part of another image, not pictures of their own.
pub fn image_ids(document: &Document) -> Vec<ObjectId> {
    let mut found = Vec::new();
    let mut seen  = HashSet::new();

    for page_id in document.get_pages().into_values() {
        let Ok(page) = document.get_dictionary(page_id) else { continue };
        let resources = page.get(b"Resources").ok();
        collect(document, resources, &mut found, &mut seen, 0);
    }

    found
}

fn collect(document: &Document, resources: Option<&Object>, found: &mut Vec<ObjectId>, seen: &mut HashSet<ObjectId>, depth: usize) {
    if depth > MAX_DEPTH {
        return;
    }
    let Some(xobjects) = dictionary_of(document, resources).and_then(|resources| dictionary_of(document, resources.get(b"XObject").ok())) else {
        return;
    };

    for (_, value) in xobjects.iter() {
        let Ok(id) = value.as_reference() else { continue };
        if !seen.insert(id) {
            continue;
        }

        let Ok(Object::Stream(stream)) = document.get_object(id) else { continue };
        let subtype = stream.dict.get(b"Subtype").and_then(Object::as_name).ok();

        match subtype {
            Some(b"Image") if !stream.dict.get(b"ImageMask").and_then(Object::as_bool).unwrap_or(false) => found.push(id),
            Some(b"Form") => collect(document, stream.dict.get(b"Resources").ok(), found, seen, depth + 1),
            _ => {}
        }
    }
}

// Samples of `bits` bits each, one row at a time (rows start on a byte).
fn unpack(data: &[u8], bits: u8, width: usize, rows: usize, channels: usize) -> Option<Vec<u8>> {
    if bits == 8 {
        return (data.len() >= width * rows * channels).then(|| data[..width * rows * channels].to_vec());
    }

    let per_row = (width * channels * bits as usize).div_ceil(8);
    if data.len() < per_row * rows {
        return None;
    }

    let mask    = (1_u16 << bits) - 1;
    let mut out = Vec::with_capacity(width * rows * channels);
    for row in data.chunks(per_row).take(rows) {
        for sample in 0..width * channels {
            let bit   = sample * bits as usize;
            let byte  = row[bit / 8] as u16;
            let shift = 8 - bits as usize - bit % 8;
            out.push(((byte >> shift) & mask) as u8);
        }
    }
    Some(out)
}

// Spreads 1, 2 or 4 bit gray samples over 0..255.
fn stretch(samples: Vec<u8>, bits: u8) -> Vec<u8> {
    let top = (1_u16 << bits) - 1;
    samples.into_iter().map(|sample| (u16::from(sample) * 255 / top) as u8).collect()
}

enum Space {
    Gray,
    Rgb,
    Cmyk,
    Indexed { base: Box<Space>, palette: Vec<u8> },
}

impl Space {
    fn channels(&self) -> usize {
        match self {
            Space::Gray | Space::Indexed { .. } => 1,
            Space::Rgb                          => 3,
            Space::Cmyk                         => 4,
        }
    }
}

fn space_of(document: &Document, object: Option<&Object>) -> Option<Space> {
    match object.map(|value| resolve(document, value))? {
        Object::Name(name) => match name.as_slice() {
            b"DeviceGray" | b"CalGray" | b"G" => Some(Space::Gray),
            b"DeviceRGB" | b"CalRGB" | b"RGB" => Some(Space::Rgb),
            b"DeviceCMYK" | b"CMYK"           => Some(Space::Cmyk),
            _                                 => None,
        },
        Object::Array(items) => {
            let kind = items.first().map(|item| resolve(document, item)).and_then(|item| item.as_name().ok())?;
            match kind {
                b"ICCBased" => {
                    let profile = resolve(document, items.get(1)?).as_stream().ok()?;
                    match integer(document, &profile.dict, b"N")? {
                        1 => Some(Space::Gray),
                        3 => Some(Space::Rgb),
                        4 => Some(Space::Cmyk),
                        _ => None,
                    }
                }
                b"CalGray" => Some(Space::Gray),
                b"CalRGB"  => Some(Space::Rgb),
                b"Indexed" | b"I" => {
                    let base    = space_of(document, items.get(1))?;
                    let palette = match resolve(document, items.get(3)?) {
                        Object::String(bytes, _) => bytes.clone(),
                        Object::Stream(stream)   => stream.decompressed_content().unwrap_or_else(|_| stream.content.clone()),
                        _                        => return None,
                    };
                    Some(Space::Indexed { base: Box::new(base), palette })
                }
                _ => None,
            }
        }
        _ => None,
    }
}

fn to_rgb(space: &Space, samples: &[u8]) -> Vec<u8> {
    match space {
        Space::Gray => samples.iter().flat_map(|&value| [value, value, value]).collect(),
        Space::Rgb  => samples.to_vec(),
        Space::Cmyk => samples
            .chunks_exact(4)
            .flat_map(|pixel| {
                let k = 255 - u16::from(pixel[3]);
                pixel[..3].iter().map(|&value| ((255 - u16::from(value)) * k / 255) as u8).collect::<Vec<_>>()
            })
            .collect(),
        Space::Indexed { base, palette } => {
            let size  = base.channels();
            let entry = |index: u8| -> Vec<u8> {
                let start = index as usize * size;
                palette.get(start..start + size).map(<[u8]>::to_vec).unwrap_or_else(|| vec![0; size])
            };
            let colors: Vec<u8> = samples.iter().flat_map(|&index| entry(index)).collect();
            to_rgb(base, &colors)
        }
    }
}

fn png(image: DynamicImage) -> Option<Vec<u8>> {
    let mut bytes = Vec::new();
    image.write_to(&mut Cursor::new(&mut bytes), ImageFormat::Png).ok()?;
    Some(bytes)
}

// The soft mask as alpha, when it matches the image size and is plain 8-bit gray.
fn alpha_of(document: &Document, stream: &Stream, width: u32, height: u32) -> Option<Vec<u8>> {
    let mask = resolve(document, stream.dict.get(b"SMask").ok()?).as_stream().ok()?;
    let same = integer(document, &mask.dict, b"Width") == Some(width.into()) && integer(document, &mask.dict, b"Height") == Some(height.into());
    if !same || integer(document, &mask.dict, b"BitsPerComponent").unwrap_or(8) != 8 || !filters(document, &mask.dict).iter().all(|name| name == b"FlateDecode") {
        return None;
    }

    let data = if filters(document, &mask.dict).is_empty() { mask.content.clone() } else { mask.decompressed_content().ok()? };
    (data.len() >= (width * height) as usize).then(|| data[..(width * height) as usize].to_vec())
}

fn decode_raw(document: &Document, stream: &Stream, width: u32, height: u32) -> Option<Vec<u8>> {
    let bits  = integer(document, &stream.dict, b"BitsPerComponent").unwrap_or(8);
    let space = space_of(document, stream.dict.get(b"ColorSpace").ok())?;
    if !matches!(bits, 1 | 2 | 4 | 8) {
        return None;
    }

    let data    = if filters(document, &stream.dict).is_empty() { stream.content.clone() } else { stream.decompressed_content().ok()? };
    let samples = unpack(&data, bits as u8, width as usize, height as usize, space.channels())?;

    // Gray with fewer bits is spread over 0..255; palette indexes stay as they are.
    let samples = if bits < 8 && matches!(space, Space::Gray) { stretch(samples, bits as u8) } else { samples };

    if matches!(space, Space::Gray) {
        return png(DynamicImage::ImageLuma8(GrayImage::from_raw(width, height, samples)?));
    }

    let rgb = to_rgb(&space, &samples);
    if rgb.len() < (width * height * 3) as usize {
        return None;
    }

    match alpha_of(document, stream, width, height) {
        Some(alpha) => {
            let pixels = rgb.chunks_exact(3).zip(alpha).flat_map(|(color, alpha)| [color[0], color[1], color[2], alpha]).collect();
            png(DynamicImage::ImageRgba8(RgbaImage::from_raw(width, height, pixels)?))
        }
        None => png(DynamicImage::ImageRgb8(RgbImage::from_raw(width, height, rgb)?)),
    }
}

// One image: JPEG as it is, anything decodable as PNG. None for small, broken or unsupported ones
// (JPEG 2000, fax and JBIG2 encodings).
pub fn export(document: &Document, id: ObjectId) -> Option<ExtractedImage> {
    let stream = document.get_object(id).ok()?.as_stream().ok()?;
    if !is_image(stream) {
        return None;
    }

    let width  = integer(document, &stream.dict, b"Width")?;
    let height = integer(document, &stream.dict, b"Height")?;
    if width < MIN_SIDE || height < MIN_SIDE {
        return None;
    }

    let names = filters(document, &stream.dict);
    if names.len() == 1 && names[0] == b"DCTDecode" {
        return Some(ExtractedImage { bytes: stream.content.clone(), extension: "jpg" });
    }
    if names.iter().any(|name| matches!(name.as_slice(), b"DCTDecode" | b"JPXDecode" | b"CCITTFaxDecode" | b"JBIG2Decode")) {
        return None;
    }

    let bytes = decode_raw(document, stream, u32::try_from(width).ok()?, u32::try_from(height).ok()?)?;
    Some(ExtractedImage { bytes, extension: "png" })
}

// Every picture worth keeping, in page order; the same picture used twice comes out once.
pub fn extract(document: &Document) -> Vec<ExtractedImage> {
    let mut hashes = HashSet::new();

    image_ids(document)
        .into_iter()
        .filter_map(|id| export(document, id))
        .filter(|image| hashes.insert(blake3::hash(&image.bytes)))
        .collect()
}

// "contrato-img-01.jpg": two digits at least, more when there are more images.
pub fn image_name(stem: &str, index: usize, total: usize, extension: &str) -> String {
    let digits = total.to_string().len().max(2);
    format!("{stem}-{IMAGE_STEM}-{index:0digits$}.{extension}")
}
