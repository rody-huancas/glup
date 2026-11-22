use std::{
    collections::{hash_map::DefaultHasher, HashMap},
    hash::{Hash, Hasher},
    path::Path,
};

use image::{imageops::FilterType, DynamicImage, GrayImage, ImageBuffer, ImageFormat, Rgba, RgbImage};
use jpeg_decoder::{Decoder as JpegDecoder, PixelFormat};
use jpeg_encoder::{ColorType, Encoder, SamplingFactor};
use lopdf::{content::Content, Dictionary, Document, Object, ObjectId, SaveOptions, Stream};
use serde::{Deserialize, Serialize};

use crate::services::pdf::{analysis, load, PdfResult, PDF_WRITE_ERROR};

pub const TARGET_DPI: f32   = 150.0;
// "Normal" mode: the result must look like the original.
pub const JPEG_QUALITY: u8  = 82;
// pub const JPEG_QUALITY: u8  = 70;
const POINTS_PER_INCH: f32  = 72.0;
// Longest side allowed for images not found directly on a page (inside forms): A4 at 150 ppp.
// Images whose drawn size is unknown are no longer shrunk.
// const DEFAULT_LONG_SIDE: u32 = 1754;
// Only shrink when it saves a meaningful amount of pixels.
const MIN_SHRINK: f32 = 0.95;
// A new image replaces the original only if it weighs at most 90 % of it.
const MIN_SAVING: f32 = 0.9;

// Safety net: original and new image, both at GUARD_SIZE px, must differ by at most GUARD_MAX_ERROR
// (mean absolute difference per channel, 0-255). A normal recompression stays around 1-4; a black or
// color-swapped image is far above 40.
pub const GUARD_SIZE: u32       = 128;
pub const GUARD_MAX_ERROR: f32  = 10.0;
// "Al máximo" accepts the expected loss of quality 45-55 and the shrinking, still far from a black or
// color-swapped image (see the calibration test).
pub const GUARD_MAX_ERROR_STRONG: f32 = 16.0;

// The level chosen in the panel (remembered in settings.json).
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ReduceLevel {
    #[default]
    Normal,
    Maximum,
}

// How hard one pass reduces: target resolution for the drawn size, JPEG quality, whether JPEGs already
// at that quality or lower are left alone, and the safety-net threshold.
#[derive(Clone, Copy, Debug)]
pub struct ReduceProfile {
    pub dpi: f32,
    pub quality: u8,
    pub keep_low_quality: bool,
    pub max_error: f32,
    pub maximum: bool,
}

pub const NORMAL_PROFILE: ReduceProfile  = ReduceProfile { dpi: TARGET_DPI, quality: JPEG_QUALITY, keep_low_quality: true, max_error: GUARD_MAX_ERROR, maximum: false };
pub const MAXIMUM_PROFILE: ReduceProfile = ReduceProfile { dpi: 100.0, quality: 55, keep_low_quality: false, max_error: GUARD_MAX_ERROR_STRONG, maximum: true };

// "Necesito que pese menos de…": tried in this order, stopping at the first one under the limit.
pub const TARGET_STEPS: [ReduceProfile; 4] = [
    NORMAL_PROFILE,
    MAXIMUM_PROFILE,
    ReduceProfile { quality: 45, ..MAXIMUM_PROFILE },
    ReduceProfile { dpi: 80.0, quality: 45, ..MAXIMUM_PROFILE },
];

impl ReduceLevel {
    pub fn profile(self) -> ReduceProfile {
        match self {
            Self::Normal  => NORMAL_PROFILE,
            Self::Maximum => MAXIMUM_PROFILE,
        }
    }
}

// IJG luminance quantization table (quality 50), to estimate the quality of an existing JPEG.
const BASE_LUMA_TABLE: [u16; 64] = [
    16, 11, 10, 16, 24, 40, 51, 61, 12, 12, 14, 19, 26, 58, 60, 55, 14, 13, 16, 24, 40, 57, 69, 56, 14, 17, 22, 29, 51, 87, 80, 62,
    18, 22, 37, 56, 68, 109, 103, 77, 24, 35, 55, 64, 81, 104, 113, 92, 49, 64, 78, 87, 103, 121, 120, 101, 72, 92, 95, 98, 112, 100, 103, 99,
];

#[derive(Clone, Copy, PartialEq)]
enum Channels {
    Gray,
    Rgb,
    Cmyk,
}

// What reduce found: the new bytes and, if they are not lighter, the plain-language reason.
pub struct ReduceOutcome {
    pub bytes: Vec<u8>,
    pub reason: &'static str,
}

// What happened to one image.
#[derive(Clone, Copy, Debug, PartialEq)]
enum ShrinkOutcome {
    Replaced,
    Kept,
    Guarded,
}

struct EncodeParams<'a> {
    image: &'a Decoded,
    channels: Channels,
    quality: u8,
}

struct GuardParams<'a> {
    // The original at GUARD_SIZE (see guard_pixels).
    reference: &'a [u8],
    jpeg: &'a [u8],
    channels: Channels,
    max_error: f32,
}

struct ShrinkParams<'a> {
    stream: &'a mut Stream,
    // Scale the image can take and keep TARGET_DPI for its drawn size (None: not drawn on a page).
    scale: Option<f32>,
    profile: &'a ReduceProfile,
}

type Matrix = [f32; 6];

const IDENTITY: Matrix = [1.0, 0.0, 0.0, 1.0, 0.0, 0.0];

fn name_of(dictionary: &Dictionary, key: &[u8]) -> Option<Vec<u8>> {
    match dictionary.get(key).ok()? {
        Object::Name(name) => Some(name.clone()),
        Object::Array(items) if items.len() == 1 => items[0].as_name().ok().map(<[u8]>::to_vec),
        _ => None,
    }
}

// 8-bit RGB, gray or CMYK images; SMask (soft transparency) is fine, it is a separate image kept as is.
// Color-key masks, image masks and decode tweaks (except CMYK's) are left alone.
fn plain_channels(dictionary: &Dictionary) -> Option<Channels> {
    let mask = dictionary.get(b"ImageMask").and_then(Object::as_bool).unwrap_or(false);
    let bits = dictionary.get(b"BitsPerComponent").and_then(Object::as_i64).unwrap_or(0);

    if mask || bits != 8 || dictionary.has(b"Mask") || dictionary.has(b"SMaskInData") {
        return None;
    }

    let channels = match name_of(dictionary, b"ColorSpace")?.as_slice() {
        b"DeviceRGB"  => Channels::Rgb,
        b"DeviceGray" => Channels::Gray,
        b"DeviceCMYK" => Channels::Cmyk,
        _             => return None,
    };

    if channels != Channels::Cmyk && dictionary.has(b"Decode") {
        return None;
    }

    Some(channels)
}

fn is_image(object: &Object) -> bool {
    object.as_stream().is_ok_and(|stream| stream.dict.get(b"Subtype").and_then(Object::as_name).is_ok_and(|name| name == b"Image"))
}

// True when the JPEG carries an Adobe APP14 segment (the convention jpeg-encoder writes for CMYK).
fn has_adobe_marker(data: &[u8]) -> bool {
    data.windows(9).take(64 * 1024).any(|window| window[..2] == [0xFF, 0xEE] && &window[4..9] == b"Adobe")
}

// CMYK ink values (no conversion to RGB), as a 4-channel buffer; only Adobe-marked JPEGs, the convention we write back.
fn decode_cmyk(data: &[u8]) -> Option<ImageBuffer<Rgba<u8>, Vec<u8>>> {
    if !has_adobe_marker(data) {
        return None;
    }

    let mut decoder = JpegDecoder::new(data);
    let pixels      = decoder.decode().ok()?;
    let info        = decoder.info()?;

    if info.pixel_format != PixelFormat::CMYK32 {
        return None;
    }

    ImageBuffer::from_raw(u32::from(info.width), u32::from(info.height), pixels)
}

enum Decoded {
    Color(DynamicImage),
    Cmyk(ImageBuffer<Rgba<u8>, Vec<u8>>),
}

impl Decoded {
    fn size(&self) -> (u32, u32) {
        match self {
            Self::Color(image) => (image.width(), image.height()),
            Self::Cmyk(image)  => image.dimensions(),
        }
    }

    fn resize(self, width: u32, height: u32) -> Self {
        match self {
            Self::Color(image) => Self::Color(image.resize_exact(width, height, FilterType::CatmullRom)),
            Self::Cmyk(image)  => Self::Cmyk(image::imageops::resize(&image, width, height, FilterType::CatmullRom)),
        }
    }
}

fn decode(stream: &Stream, channels: Channels) -> Option<Decoded> {
    let filter = name_of(&stream.dict, b"Filter")?;
    let width  = u32::try_from(stream.dict.get(b"Width").and_then(Object::as_i64).ok()?).ok()?;
    let height = u32::try_from(stream.dict.get(b"Height").and_then(Object::as_i64).ok()?).ok()?;

    match (filter.as_slice(), channels) {
        (b"DCTDecode", Channels::Cmyk) => decode_cmyk(&stream.content).map(Decoded::Cmyk),
        (b"DCTDecode", _) => image::load_from_memory_with_format(&stream.content, ImageFormat::Jpeg).ok().map(Decoded::Color),
        // Flate with predictors (DecodeParms) is left alone.
        (b"FlateDecode", Channels::Rgb) if !stream.dict.has(b"DecodeParms") => {
            RgbImage::from_raw(width, height, stream.decompressed_content().ok()?).map(|image| Decoded::Color(DynamicImage::ImageRgb8(image)))
        }
        (b"FlateDecode", Channels::Gray) if !stream.dict.has(b"DecodeParms") => {
            GrayImage::from_raw(width, height, stream.decompressed_content().ok()?).map(|image| Decoded::Color(DynamicImage::ImageLuma8(image)))
        }
        _ => None,
    }
}

// 4:2:0 color. jpeg-encoder's optimized Huffman tables are NOT used: in 0.7.1 they produce files that
// common decoders (the one in image, PDF viewers) read as nearly black images.
fn encode_jpeg(params: EncodeParams) -> Option<Vec<u8>> {
    let EncodeParams { image, channels, quality } = params;
    let mut buffer  = Vec::new();
    let mut encoder = Encoder::new(&mut buffer, quality);
    // encoder.set_optimized_huffman_tables(true);

    let (width, height) = image.size();
    let (width, height) = (u16::try_from(width).ok()?, u16::try_from(height).ok()?);

    let result = match (image, channels) {
        (Decoded::Color(image), Channels::Gray) => encoder.encode(image.to_luma8().as_raw(), width, height, ColorType::Luma),
        (Decoded::Color(image), _) => {
            encoder.set_sampling_factor(SamplingFactor::R_4_2_0);
            encoder.encode(image.to_rgb8().as_raw(), width, height, ColorType::Rgb)
        }
        // jpeg-decoder reads Adobe CMYK as ink values and jpeg-encoder writes them back Adobe style,
        // so the stored samples (and how viewers read them) stay the same.
        (Decoded::Cmyk(image), _) => encoder.encode(image.as_raw(), width, height, ColorType::Cmyk),
    };

    result.ok()?;
    Some(buffer)
}

fn multiply(m: &Matrix, ctm: &Matrix) -> Matrix {
    [
        m[0] * ctm[0] + m[1] * ctm[2],
        m[0] * ctm[1] + m[1] * ctm[3],
        m[2] * ctm[0] + m[3] * ctm[2],
        m[2] * ctm[1] + m[3] * ctm[3],
        m[4] * ctm[0] + m[5] * ctm[2] + ctm[4],
        m[4] * ctm[1] + m[5] * ctm[3] + ctm[5],
    ]
}

fn page_xobjects(document: &Document, page_id: ObjectId) -> HashMap<Vec<u8>, ObjectId> {
    let Ok((resources, inherited)) = document.get_page_resources(page_id) else { return HashMap::new() };

    resources
        .into_iter()
        .cloned()
        .chain(inherited.into_iter().filter_map(|id| document.get_dictionary(id).ok().cloned()))
        .filter_map(|dictionary| match dictionary.get(b"XObject") {
            Ok(Object::Reference(id)) => document.get_dictionary(*id).ok().cloned(),
            Ok(Object::Dictionary(inner)) => Some(inner.clone()),
            _ => None,
        })
        .flat_map(|xobjects| xobjects.iter().filter_map(|(name, value)| value.as_reference().ok().map(|id| (name.clone(), id))).collect::<Vec<_>>())
        .collect()
}

// How big each image is actually drawn (from the page's cm and Do operators): the scale it can be
// shrunk to and still have TARGET_DPI. The biggest use wins; images only drawn inside forms are not here.
fn drawn_scales(document: &Document) -> HashMap<ObjectId, f32> {
    let mut scales = HashMap::new();

    for page_id in document.get_pages().into_values() {
        let xobjects = page_xobjects(document, page_id);
        let data = document.get_page_content(page_id);
        let Ok(content) = Content::decode(&data) else { continue };
        let mut stack = vec![IDENTITY];

        for operation in content.operations {
            match operation.operator.as_str() {
                "q" => stack.push(*stack.last().unwrap_or(&IDENTITY)),
                "Q" if stack.len() > 1 => {
                    stack.pop();
                }
                "cm" => {
                    let values: Vec<f32> = operation.operands.iter().filter_map(|value| value.as_float().ok()).collect();
                    if let (Ok(matrix), Some(top)) = (<[f32; 6]>::try_from(values), stack.last_mut()) {
                        *top = multiply(&matrix, top);
                    }
                }
                "Do" => {
                    let Some(id) = operation.operands.first().and_then(|name| name.as_name().ok()).and_then(|name| xobjects.get(name)) else { continue };
                    let Ok(image) = document.get_object(*id).and_then(Object::as_stream) else { continue };

                    let width  = image.dict.get(b"Width").and_then(Object::as_float).unwrap_or(0.0);
                    let height = image.dict.get(b"Height").and_then(Object::as_float).unwrap_or(0.0);
                    if width <= 0.0 || height <= 0.0 {
                        continue;
                    }

                    let ctm       = stack.last().unwrap_or(&IDENTITY);
                    let drawn_w   = ctm[0].hypot(ctm[1]) / POINTS_PER_INCH * TARGET_DPI;
                    let drawn_h   = ctm[2].hypot(ctm[3]) / POINTS_PER_INCH * TARGET_DPI;
                    let needed    = (drawn_w / width).max(drawn_h / height);
                    let entry     = scales.entry(*id).or_insert(0.0_f32);
                    *entry        = entry.max(needed);
                }
                _ => {}
            }
        }
    }

    scales
}

// Quality (1-100) an existing JPEG was saved with, from its luminance quantization table (IJG scaling).
pub fn estimate_jpeg_quality(data: &[u8]) -> Option<u8> {
    let mut index = 2;

    while index + 4 <= data.len() && data.get(..2) == Some(&[0xFF, 0xD8][..]) {
        if data[index] != 0xFF {
            return None;
        }

        let marker = data[index + 1];
        let length = usize::from(u16::from_be_bytes([data[index + 2], data[index + 3]]));

        if marker == 0xDB {
            let segment = data.get(index + 4..index + 2 + length)?;
            let info    = segment.first()?;
            let wide    = info >> 4 == 1;
            if info & 0x0F != 0 {
                index += 2 + length;
                continue;
            }

            let values: Vec<u32> = if wide {
                segment.get(1..129)?.chunks_exact(2).map(|pair| u32::from(u16::from_be_bytes([pair[0], pair[1]]))).collect()
            } else {
                segment.get(1..65)?.iter().map(|value| u32::from(*value)).collect()
            };

            let base: u32  = BASE_LUMA_TABLE.iter().map(|value| u32::from(*value)).sum();
            let scale      = values.iter().sum::<u32>() as f32 * 100.0 / base as f32;
            let quality    = if scale <= 100.0 { (200.0 - scale) / 2.0 } else { 5000.0 / scale };

            return Some(quality.round().clamp(1.0, 100.0) as u8);
        }

        if marker == 0xDA {
            return None;
        }

        index += 2 + length;
    }

    None
}

// The image at GUARD_SIZE x GUARD_SIZE, as raw channels (gray, RGB or CMYK).
fn guard_pixels(image: &Decoded, channels: Channels) -> Vec<u8> {
    let size = GUARD_SIZE;

    match (image, channels) {
        (Decoded::Color(image), Channels::Gray) => image.resize_exact(size, size, FilterType::Triangle).to_luma8().into_raw(),
        (Decoded::Color(image), _) => image.resize_exact(size, size, FilterType::Triangle).to_rgb8().into_raw(),
        (Decoded::Cmyk(image), _) => image::imageops::resize(image, size, size, FilterType::Triangle).into_raw(),
    }
}

pub fn mean_error(a: &[u8], b: &[u8]) -> f32 {
    if a.len() != b.len() || a.is_empty() {
        return f32::MAX;
    }

    a.iter().zip(b).map(|(x, y)| u32::from(x.abs_diff(*y))).sum::<u32>() as f32 / a.len() as f32
}

// The new JPEG read by every decoder we have: a file only one of them understands is not safe.
fn decode_candidates(jpeg: &[u8], channels: Channels) -> Vec<Option<Decoded>> {
    if channels == Channels::Cmyk {
        return vec![decode_cmyk(jpeg).map(Decoded::Cmyk)];
    }

    let by_image = image::load_from_memory_with_format(jpeg, ImageFormat::Jpeg).ok().map(Decoded::Color);

    let mut decoder = JpegDecoder::new(jpeg);
    let by_jpeg     = decoder.decode().ok().zip(decoder.info()).and_then(|(pixels, info)| {
        let (width, height) = (u32::from(info.width), u32::from(info.height));

        match info.pixel_format {
            PixelFormat::RGB24 => RgbImage::from_raw(width, height, pixels).map(DynamicImage::ImageRgb8),
            PixelFormat::L8    => GrayImage::from_raw(width, height, pixels).map(DynamicImage::ImageLuma8),
            _                  => None,
        }
    });

    vec![by_image, by_jpeg.map(Decoded::Color)]
}

// Safety net: the new image must look like the original (same small size, small mean difference)
// for every decoder; otherwise the original stays.
fn looks_the_same(params: GuardParams) -> bool {
    decode_candidates(params.jpeg, params.channels).iter().all(|candidate| {
        candidate.as_ref().is_some_and(|image| mean_error(params.reference, &guard_pixels(image, params.channels)) <= params.max_error)
    })
}

// Normal: never below 150 ppp for the drawn size, JPEG 82 (or the original's lower quality).
// Al máximo: 100 ppp (even if already below 150) and JPEG 55 whatever the original quality.
// Either way, only when it saves at least 10 % and the safety net agrees.
fn shrink(params: ShrinkParams) -> ShrinkOutcome {
    let ShrinkParams { stream, scale, profile } = params;
    let Some(channels) = plain_channels(&stream.dict) else { return ShrinkOutcome::Kept };
    let Some(image) = decode(stream, channels) else { return ShrinkOutcome::Kept };

    let is_jpeg  = name_of(&stream.dict, b"Filter").as_deref() == Some(b"DCTDecode".as_slice());
    let original = if is_jpeg { estimate_jpeg_quality(&stream.content) } else { None };
    let scale    = scale.map(|factor| factor * profile.dpi / TARGET_DPI);
    let resize   = scale.is_some_and(|factor| factor < MIN_SHRINK);

    // Already at the profile's quality or below and no smaller size needed: recompressing would only lose quality.
    if profile.keep_low_quality && original.is_some_and(|quality| quality <= profile.quality) && !resize {
        return ShrinkOutcome::Kept;
    }

    let quality = match original {
        Some(quality) if profile.keep_low_quality => quality.min(profile.quality),
        _ => profile.quality,
    };
    // let quality         = original.map_or(JPEG_QUALITY, |quality| quality.min(JPEG_QUALITY));
    let (width, height) = image.size();
    let reference       = guard_pixels(&image, channels);

    let resized = match scale {
        Some(factor) if resize => {
            let new_width  = ((width as f32 * factor).ceil() as u32).max(1);
            let new_height = ((height as f32 * factor).ceil() as u32).max(1);
            image.resize(new_width, new_height)
        }
        _ => image,
    };

    let Some(jpeg) = encode_jpeg(EncodeParams { image: &resized, channels, quality }) else { return ShrinkOutcome::Kept };

    if jpeg.len() as f32 > stream.content.len() as f32 * MIN_SAVING {
        return ShrinkOutcome::Kept;
    }

    if !looks_the_same(GuardParams { reference: &reference, jpeg: &jpeg, channels, max_error: profile.max_error }) {
        return ShrinkOutcome::Guarded;
    }

    let (new_width, new_height) = resized.size();

    stream.dict.set("Filter", "DCTDecode");
    stream.dict.set("Width", i64::from(new_width));
    stream.dict.set("Height", i64::from(new_height));
    stream.dict.remove(b"DecodeParms");
    stream.set_content(jpeg);
    stream.allows_compression = false;
    ShrinkOutcome::Replaced
}

fn stream_key(stream: &Stream) -> u64 {
    let mut entries: Vec<(Vec<u8>, String)> = stream
        .dict
        .iter()
        .filter(|(key, _)| key.as_slice() != b"Length")
        .map(|(key, value)| (key.clone(), format!("{value:?}")))
        .collect();
    entries.sort();

    let mut hasher = DefaultHasher::new();
    entries.hash(&mut hasher);
    stream.content.hash(&mut hasher);
    hasher.finish()
}

// Identical streams (fonts embedded again and again, repeated images) are kept once and shared.
fn dedupe_streams(document: &mut Document) {
    let mut first: HashMap<u64, ObjectId>          = HashMap::new();
    let mut replaced: HashMap<ObjectId, ObjectId> = HashMap::new();

    for (id, object) in &document.objects {
        let Object::Stream(stream) = object else { continue };

        match first.get(&stream_key(stream)) {
            Some(original) if document.objects.get(original).and_then(|other| other.as_stream().ok()).is_some_and(|other| other.content == stream.content) => {
                replaced.insert(*id, *original);
            }
            Some(_) => {}
            None => {
                first.insert(stream_key(stream), *id);
            }
        }
    }

    if replaced.is_empty() {
        return;
    }

    document.traverse_objects(|object| {
        if let Object::Reference(id) = object {
            if let Some(original) = replaced.get(id) {
                *id = *original;
            }
        }
    });

    replaced.keys().for_each(|id| {
        document.objects.remove(id);
    });
}

fn save_compact(document: &mut Document) -> PdfResult<Vec<u8>> {
    let options    = SaveOptions::builder().use_object_streams(true).use_xref_streams(true).build();
    let mut buffer = Vec::new();

    document.save_with_options(&mut buffer, options).map_err(|_| PDF_WRITE_ERROR.to_string())?;
    Ok(buffer)
}

// Lighter images (drawn size at 150 ppp, JPEG 82, checked by the safety net), shared duplicates,
// compressed streams, no unused objects and compact cross-references. The caller decides whether the
// result is worth saving.
pub fn reduce(path: &Path, profile: &ReduceProfile) -> PdfResult<ReduceOutcome> {
    reduce_counting(path, profile).map(|(outcome, _)| outcome)
}

// Same as reduce, plus how many images the safety net kept as they were.
fn reduce_counting(path: &Path, profile: &ReduceProfile) -> PdfResult<(ReduceOutcome, usize)> {
    let mut document = load(path)?;
    let breakdown    = analysis::analyze(&document);
    let scales       = drawn_scales(&document);
    let images       = document.objects.iter().filter(|(_, object)| is_image(object)).map(|(id, _)| *id).collect::<Vec<ObjectId>>();

    dedupe_streams(&mut document);

    let mut guarded = 0;

    for id in images {
        let scale = scales.get(&id).copied();

        if let Some(Object::Stream(stream)) = document.objects.get_mut(&id) {
            if shrink(ShrinkParams { stream, scale, profile }) == ShrinkOutcome::Guarded {
                guarded += 1;
            }
        }
    }

    if guarded > 0 {
        eprintln!("[glup] reducir peso: {guarded} imágenes conservadas por la red de seguridad");
    }

    document.compress();
    document.prune_objects();
    document.delete_zero_length_streams();

    let reason = analysis::explain(&breakdown);
    Ok((ReduceOutcome { bytes: save_compact(&mut document)?, reason }, guarded))
}

#[cfg(test)]
mod tests {
    use image::{Rgba as RgbaPixel, RgbaImage};
    use lopdf::dictionary;

    use super::*;
    use crate::services::image::to_pdf::PdfBuilder;

    // Diagnostics: GLUP_REDUCE_LEVEL is "maximum", or 0-3 for the "pese menos de" steps (Normal by default).
    fn diagnostic_profile() -> ReduceProfile {
        match std::env::var("GLUP_REDUCE_LEVEL").as_deref() {
            Ok("maximum") => MAXIMUM_PROFILE,
            Ok(step) => step.parse::<usize>().ok().and_then(|index| TARGET_STEPS.get(index).copied()).unwrap_or(NORMAL_PROFILE),
            Err(_) => NORMAL_PROFILE,
        }
    }

    // ---------- generated PDFs: nothing may come out black or different ----------

    struct Placement {
        image: usize,
        // cm matrix: width, 0, 0, height, x, y (points).
        matrix: [f32; 6],
    }

    fn photo_pixels(width: u32, height: u32, seed: u32) -> RgbImage {
        RgbImage::from_fn(width, height, |x, y| {
            let noise = ((x * 7919 + y * 104_729 + seed * 31) % 23) as u8;
            image::Rgb([((x * 255 / width) as u8).saturating_add(noise), ((y * 255 / height) as u8).saturating_add(noise), 140])
        })
    }

    fn jpeg_of(image: &RgbImage, quality: u8) -> Vec<u8> {
        let mut buffer = Vec::new();
        DynamicImage::ImageRgb8(image.clone()).write_with_encoder(image::codecs::jpeg::JpegEncoder::new_with_quality(&mut buffer, quality)).unwrap();
        buffer
    }

    fn image_stream(dictionary: Dictionary, content: Vec<u8>) -> Stream {
        let mut stream = Stream::new(dictionary, content);
        stream.allows_compression = false;
        stream
    }

    fn rgb_jpeg_stream(width: u32, height: u32, quality: u8, seed: u32) -> Stream {
        let dictionary = dictionary! {
            "Type" => "XObject", "Subtype" => "Image", "Width" => i64::from(width), "Height" => i64::from(height),
            "ColorSpace" => "DeviceRGB", "BitsPerComponent" => 8, "Filter" => "DCTDecode",
        };
        image_stream(dictionary, jpeg_of(&photo_pixels(width, height, seed), quality))
    }

    // One page per entry, each drawing its placements; returns the saved PDF.
    fn build_pdf(images: Vec<Stream>, pages: Vec<Vec<Placement>>) -> Vec<u8> {
        let mut document = Document::with_version("1.7");
        let pages_id     = document.new_object_id();
        let ids: Vec<_>  = images.into_iter().map(|stream| document.add_object(stream)).collect();

        let kids: Vec<Object> = pages
            .into_iter()
            .map(|placements| {
                let mut xobjects = Dictionary::new();
                let mut drawing  = String::new();

                for placement in &placements {
                    let name = format!("Im{}", placement.image);
                    let [a, b, c, d, e, f] = placement.matrix;
                    xobjects.set(name.clone(), ids[placement.image]);
                    drawing.push_str(&format!("q {a} {b} {c} {d} {e} {f} cm /{name} Do Q\n"));
                }

                let content = document.add_object(Stream::new(Dictionary::new(), drawing.into_bytes()));
                document
                    .add_object(dictionary! {
                        "Type" => "Page", "Parent" => pages_id, "Contents" => content,
                        "MediaBox" => vec![0.into(), 0.into(), 595.into(), 842.into()],
                        "Resources" => dictionary! { "XObject" => xobjects },
                    })
                    .into()
            })
            .collect();

        let count = kids.len() as i64;
        document.objects.insert(pages_id, Object::Dictionary(dictionary! { "Type" => "Pages", "Kids" => kids, "Count" => count }));
        let catalog = document.add_object(dictionary! { "Type" => "Catalog", "Pages" => pages_id });
        document.trailer.set("Root", catalog);

        let mut buffer = Vec::new();
        document.save_to(&mut buffer).unwrap();
        buffer
    }

    struct Reduced {
        before: Document,
        after: Document,
        guarded: usize,
    }

    fn reduce_bytes(name: &str, pdf: &[u8]) -> Reduced {
        let folder = std::env::temp_dir().join(format!("glup-reduce-safety-{}-{name}", std::process::id()));
        std::fs::create_dir_all(&folder).unwrap();

        let path              = folder.join("muestra.pdf");
        std::fs::write(&path, pdf).unwrap();
        let (outcome, guarded) = reduce_counting(&path, &NORMAL_PROFILE).unwrap();
        let _                 = std::fs::remove_dir_all(&folder);

        Reduced { before: Document::load_mem(pdf).unwrap(), after: Document::load_mem(&outcome.bytes).unwrap(), guarded }
    }

    // Every image on every page, before vs after: identical bytes, or the same picture by the safety-net
    // measure for every decoder (and never black). Returns how many images were re-encoded.
    fn assert_same_pictures(reduced: &Reduced) -> usize {
        let mut changed = 0;

        for ((_, before_page), (_, after_page)) in reduced.before.get_pages().into_iter().zip(reduced.after.get_pages()) {
            let before = page_xobjects(&reduced.before, before_page);
            let after  = page_xobjects(&reduced.after, after_page);

            for (name, id) in &before {
                let old = reduced.before.get_object(*id).unwrap().as_stream().unwrap();
                let new = reduced.after.get_object(after[name]).unwrap().as_stream().unwrap();

                if old.content == new.content {
                    continue;
                }

                changed += 1;
                let channels  = plain_channels(&old.dict).expect("only plain images may be re-encoded");
                let reference = guard_pixels(&decode(old, channels).unwrap(), channels);

                for candidate in decode_candidates(&new.content, channels) {
                    let pixels = guard_pixels(&candidate.expect("every decoder must read it"), channels);
                    let error  = mean_error(&reference, &pixels);
                    let mean   = pixels.iter().map(|value| u32::from(*value)).sum::<u32>() as f32 / pixels.len() as f32;

                    assert!(error <= GUARD_MAX_ERROR, "{} changed too much (error {error:.1})", String::from_utf8_lossy(name));
                    assert!(mean > 20.0, "{} came out black", String::from_utf8_lossy(name));
                }
            }
        }

        changed
    }

    #[test]
    fn image_reused_on_several_pages() {
        let small  = Placement { image: 0, matrix: [200.0, 0.0, 0.0, 150.0, 50.0, 600.0] };
        let pdf    = build_pdf(vec![rgb_jpeg_stream(1600, 1200, 95, 1)], vec![vec![small], vec![Placement { image: 0, matrix: [200.0, 0.0, 0.0, 150.0, 300.0, 100.0] }]]);
        let result = reduce_bytes("reused", &pdf);

        assert_eq!(assert_same_pictures(&result), 2, "drawn small at 1600 px, it must be shrunk (seen from both pages)");
        let pages: Vec<_> = result.after.get_pages().values().map(|&page| page_xobjects(&result.after, page)[b"Im0".as_slice()]).collect();
        assert_eq!(pages[0], pages[1], "both pages keep pointing to the same image");
    }

    #[test]
    fn identical_images_in_different_objects() {
        let place  = |image| Placement { image, matrix: [300.0, 0.0, 0.0, 225.0, 100.0, 400.0] };
        let pdf    = build_pdf(vec![rgb_jpeg_stream(900, 675, 95, 7), rgb_jpeg_stream(900, 675, 95, 7)], vec![vec![place(0)], vec![place(1)]]);
        let result = reduce_bytes("twins", &pdf);

        assert_same_pictures(&result);
        assert_eq!(result.guarded, 0);
    }

    #[test]
    fn jpeg_with_icc_profile_is_left_alone() {
        let profile = image_stream(dictionary! { "N" => 3 }, vec![0_u8; 256]);
        let mut pdf_images = vec![profile];
        let mut photo      = rgb_jpeg_stream(1600, 1200, 95, 3);
        photo.dict.set("ColorSpace", vec![Object::Name(b"ICCBased".to_vec()), Object::Reference((1, 0))]);
        pdf_images.push(photo);

        let pdf    = build_pdf(pdf_images, vec![vec![Placement { image: 1, matrix: [200.0, 0.0, 0.0, 150.0, 50.0, 600.0] }]]);
        let result = reduce_bytes("icc", &pdf);

        assert_eq!(assert_same_pictures(&result), 0, "ICC color spaces are not touched");
    }

    #[test]
    fn inverted_decode_array_is_left_alone() {
        let gray: Vec<u8> = (0..400 * 300).map(|index| (index % 251) as u8).collect();
        let mut stream    = Stream::new(
            dictionary! {
                "Type" => "XObject", "Subtype" => "Image", "Width" => 400, "Height" => 300, "ColorSpace" => "DeviceGray",
                "BitsPerComponent" => 8, "Decode" => vec![1.into(), 0.into()],
            },
            gray,
        );
        stream.compress().unwrap();

        let pdf    = build_pdf(vec![stream], vec![vec![Placement { image: 0, matrix: [100.0, 0.0, 0.0, 75.0, 50.0, 600.0] }]]);
        let result = reduce_bytes("decode", &pdf);

        assert_eq!(assert_same_pictures(&result), 0, "an inverted /Decode keeps its image");
    }

    #[test]
    fn cmyk_with_adobe_marker_keeps_its_look() {
        let (width, height) = (800_u16, 600_u16);
        let ink: Vec<u8>    = (0..usize::from(width) * usize::from(height))
            .flat_map(|index| [((index % 800) / 4) as u8, ((index / 800) / 3) as u8, 60, 20])
            .collect();

        let mut jpeg = Vec::new();
        Encoder::new(&mut jpeg, 95).encode(&ink, width, height, ColorType::Cmyk).unwrap();

        let stream = image_stream(
            dictionary! {
                "Type" => "XObject", "Subtype" => "Image", "Width" => i64::from(width), "Height" => i64::from(height),
                "ColorSpace" => "DeviceCMYK", "BitsPerComponent" => 8, "Filter" => "DCTDecode",
            },
            jpeg,
        );

        let pdf    = build_pdf(vec![stream], vec![vec![Placement { image: 0, matrix: [200.0, 0.0, 0.0, 150.0, 50.0, 600.0] }]]);
        let result = reduce_bytes("cmyk", &pdf);

        assert_same_pictures(&result);
    }

    #[test]
    fn low_quality_jpeg_is_not_recompressed() {
        let pdf    = build_pdf(vec![rgb_jpeg_stream(1200, 900, 40, 5)], vec![vec![Placement { image: 0, matrix: [595.0, 0.0, 0.0, 446.0, 0.0, 200.0] }]]);
        let result = reduce_bytes("low", &pdf);

        assert_eq!(assert_same_pictures(&result), 0, "a JPEG at quality 40 drawn at its size stays as it is");
    }

    #[test]
    fn estimates_jpeg_quality_from_its_tables() {
        let image = photo_pixels(256, 192, 9);

        for quality in [40_u8, 70, 82, 95] {
            let estimate = estimate_jpeg_quality(&jpeg_of(&image, quality)).unwrap();
            assert!(estimate.abs_diff(quality) <= 3, "quality {quality} estimated as {estimate}");
        }
    }

    // The safety net lets a normal recompression through and stops the broken JPEGs that caused
    // the black images (jpeg-encoder 0.7.1 with optimized Huffman tables).
    #[test]
    fn safety_net_stops_broken_recompressions() {
        let original  = Decoded::Color(DynamicImage::ImageRgb8(photo_pixels(400, 300, 2)));
        let reference = guard_pixels(&original, Channels::Rgb);
        let good      = encode_jpeg(EncodeParams { image: &original, channels: Channels::Rgb, quality: 82 }).unwrap();

        let mut broken  = Vec::new();
        let mut encoder = Encoder::new(&mut broken, 82);
        encoder.set_optimized_huffman_tables(true);
        encoder.encode(photo_pixels(400, 300, 2).as_raw(), 400, 300, ColorType::Rgb).unwrap();

        for max_error in [GUARD_MAX_ERROR, GUARD_MAX_ERROR_STRONG] {
            assert!(looks_the_same(GuardParams { reference: &reference, jpeg: &good, channels: Channels::Rgb, max_error }));
            assert!(!looks_the_same(GuardParams { reference: &reference, jpeg: &broken, channels: Channels::Rgb, max_error }));
        }
    }

    // Calibration of the strong threshold: quality 45-55 plus shrinking stays well under it, while a black
    // or color-swapped image stays well over it.
    #[test]
    fn strong_threshold_separates_loss_from_damage() {
        let original  = Decoded::Color(DynamicImage::ImageRgb8(photo_pixels(900, 600, 4)));
        let reference = guard_pixels(&original, Channels::Rgb);
        let error_of  = |image: &Decoded| mean_error(&reference, &guard_pixels(image, Channels::Rgb));

        let mut worst_loss = 0.0_f32;
        for (quality, factor) in [(55_u8, 0.66_f32), (45, 0.53), (45, 0.4)] {
            let Decoded::Color(base) = &original else { unreachable!() };
            let small = Decoded::Color(base.resize((900.0 * factor) as u32, (600.0 * factor) as u32, FilterType::CatmullRom));
            let jpeg  = encode_jpeg(EncodeParams { image: &small, channels: Channels::Rgb, quality }).unwrap();
            let back  = Decoded::Color(image::load_from_memory(&jpeg).unwrap());
            worst_loss = worst_loss.max(error_of(&back));
        }

        let black   = Decoded::Color(DynamicImage::ImageRgb8(RgbImage::new(900, 600)));
        let photo   = photo_pixels(900, 600, 4);
        let swapped = Decoded::Color(DynamicImage::ImageRgb8(RgbImage::from_fn(900, 600, |x, y| {
            let pixel = photo.get_pixel(x, y).0;
            image::Rgb([pixel[2], pixel[1], pixel[0]])
        })));

        println!("\n[umbral] pérdida esperada máx {worst_loss:.1} · negra {:.1} · colores cambiados {:.1} · umbral {GUARD_MAX_ERROR_STRONG}", error_of(&black), error_of(&swapped));
        assert!(worst_loss * 1.5 < GUARD_MAX_ERROR_STRONG);
        assert!(error_of(&black) > GUARD_MAX_ERROR_STRONG * 3.0);
        assert!(error_of(&swapped) > GUARD_MAX_ERROR_STRONG);
    }

    #[test]
    fn maximum_level_shrinks_below_150_ppp_without_damage() {
        // 1200 px drawn on 595 pt is about 145 ppp: Normal leaves it, Al máximo takes it to 100 ppp.
        let place  = Placement { image: 0, matrix: [595.0, 0.0, 0.0, 446.0, 0.0, 200.0] };
        let pdf    = build_pdf(vec![rgb_jpeg_stream(1200, 900, 60, 8)], vec![vec![place]]);
        let normal = reduce_bytes("level-normal", &pdf);
        assert_eq!(assert_same_pictures(&normal), 0);

        let folder = std::env::temp_dir().join(format!("glup-reduce-max-{}", std::process::id()));
        std::fs::create_dir_all(&folder).unwrap();
        let path = folder.join("muestra.pdf");
        std::fs::write(&path, &pdf).unwrap();

        let (outcome, guarded) = reduce_counting(&path, &MAXIMUM_PROFILE).unwrap();
        let after              = Document::load_mem(&outcome.bytes).unwrap();
        let image              = after.objects.values().filter_map(|object| object.as_stream().ok()).find(|stream| is_image(&Object::Stream((*stream).clone()))).unwrap();

        assert_eq!(guarded, 0);
        assert!(image.dict.get(b"Width").and_then(Object::as_i64).unwrap() < 1200, "Al máximo shrinks to 100 ppp");
        assert!((outcome.bytes.len() as u64) < std::fs::metadata(&path).unwrap().len());

        let _ = std::fs::remove_dir_all(&folder);
    }

    #[test]
    fn keeps_the_soft_mask_and_recompresses_the_base_image() {
        let folder = std::env::temp_dir().join(format!("glup-reduce-mask-{}", std::process::id()));
        std::fs::create_dir_all(&folder).unwrap();

        let png   = folder.join("transparente.png");
        let image = RgbaImage::from_fn(1800, 1200, |x, y| {
            let alpha = if (x / 60 + y / 60) % 2 == 0 { 255 } else { 90 };
            RgbaPixel([(x % 256) as u8, (y % 256) as u8, ((x + y) % 256) as u8, alpha])
        });
        image.save(&png).unwrap();

        let mut builder = PdfBuilder::new();
        builder.add_image(&png).unwrap();
        let source = folder.join("con-mascara.pdf");
        std::fs::write(&source, builder.finish().unwrap()).unwrap();

        let reduced  = reduce(&source, &NORMAL_PROFILE).unwrap().bytes;
        let document = Document::load_mem(&reduced).unwrap();
        let base     = document.objects.values().filter_map(|object| object.as_stream().ok()).find(|stream| stream.dict.has(b"SMask")).unwrap();

        assert_eq!(name_of(&base.dict, b"Filter").unwrap(), b"DCTDecode".to_vec());
        assert!(document.get_object(base.dict.get(b"SMask").unwrap().as_reference().unwrap()).is_ok(), "the mask must stay");

        let _ = std::fs::remove_dir_all(&folder);
    }

    #[test]
    fn cmyk_jpegs_keep_their_ink_values() {
        let (width, height) = (64_u16, 48_u16);
        let ink: Vec<u8>    = (0..usize::from(width) * usize::from(height))
            .flat_map(|index| [40, 120, ((index % usize::from(width)) * 3) as u8, 15])
            .collect();

        let mut original = Vec::new();
        Encoder::new(&mut original, 95).encode(&ink, width, height, ColorType::Cmyk).unwrap();

        let stored = decode_cmyk(&original).expect("Adobe CMYK JPEG");
        let again  = encode_jpeg(EncodeParams { image: &Decoded::Cmyk(stored.clone()), channels: Channels::Cmyk, quality: 82 }).unwrap();
        let back   = decode_cmyk(&again).unwrap();

        let total = stored.as_raw().iter().zip(back.as_raw()).map(|(a, b)| u32::from(a.abs_diff(*b))).sum::<u32>();
        let drift = total as f32 / stored.as_raw().len() as f32;
        assert!(drift < 6.0, "ink values must survive the re-encode (mean drift {drift:.1})");
        assert!(has_adobe_marker(&again));
    }

    // Diagnosis: every image drawn on each page, original vs reduced (same page, same name).
    #[test]
    #[ignore]
    fn compares_images_page_by_page() {
        let Ok(path) = std::env::var("GLUP_ANALYZE_PDF") else { return };
        let original = load(Path::new(&path)).unwrap();
        let level    = diagnostic_profile();
        let reduced  = Document::load_mem(&reduce(Path::new(&path), &level).unwrap().bytes).unwrap();

        let thumb = |document: &Document, id: ObjectId| -> Option<(DynamicImage, String)> {
            let stream = document.get_object(id).ok()?.as_stream().ok()?;
            let info   = format!(
                "{:?} {} {}x{} cs={:?} decode={} smask={}",
                id,
                String::from_utf8_lossy(&name_of(&stream.dict, b"Filter").unwrap_or_default()),
                stream.dict.get(b"Width").and_then(Object::as_i64).unwrap_or(0),
                stream.dict.get(b"Height").and_then(Object::as_i64).unwrap_or(0),
                stream.dict.get(b"ColorSpace").ok(),
                stream.dict.has(b"Decode"),
                stream.dict.has(b"SMask"),
            );
            let image = image::load_from_memory_with_format(&stream.content, ImageFormat::Jpeg).ok()?;
            Some((image.resize_exact(64, 64, FilterType::Triangle), info))
        };

        let mean = |image: &DynamicImage| image.to_rgb8().pixels().map(|pixel| u32::from(pixel[0]) + u32::from(pixel[1]) + u32::from(pixel[2])).sum::<u32>() as f32 / (64.0 * 64.0 * 3.0);

        for ((number, before_page), (_, after_page)) in original.get_pages().into_iter().zip(reduced.get_pages()) {
            let before = page_xobjects(&original, before_page);
            let after  = page_xobjects(&reduced, after_page);

            for (name, id) in &before {
                let Some(new_id) = after.get(name) else { continue };
                let (Some((a, info_a)), Some((b, info_b))) = (thumb(&original, *id), thumb(&reduced, *new_id)) else {
                    println!("p{number} {}: no se pudo comparar", String::from_utf8_lossy(name));
                    continue;
                };
                let error = a.to_rgb8().pixels().zip(b.to_rgb8().pixels()).map(|(x, y)| (0..3).map(|c| u32::from(x[c].abs_diff(y[c]))).sum::<u32>()).sum::<u32>() as f32 / (64.0 * 64.0 * 3.0);
                println!("p{number} {}: error {error:.1} brillo {:.0}->{:.0}
    antes {info_a}
    despues {info_b}", String::from_utf8_lossy(name), mean(&a), mean(&b));
            }
        }
    }

    // Before/after for the PDF in GLUP_ANALYZE_PDF (run with --ignored --nocapture); the file is only read.
    #[test]
    #[ignore]
    fn reduces_given_pdf() {
        let Ok(path) = std::env::var("GLUP_ANALYZE_PDF") else { return };
        let before   = std::fs::metadata(&path).unwrap().len();
        let level = diagnostic_profile();
        let (outcome, guarded) = reduce_counting(Path::new(&path), &level).unwrap();
        let after    = outcome.bytes.len() as u64;
        let mb       = |value: u64| value as f64 / 1_048_576.0;

        println!("\n[reducir peso] {:.2} MB → {:.2} MB ({:.0} % menos) · red de seguridad: {} · motivo si no bajara: {}", mb(before), mb(after), (1.0 - after as f64 / before as f64) * 100.0, guarded, outcome.reason);

        let source = load(Path::new(&path)).unwrap();
        let scales = drawn_scales(&source);
        let mut values: Vec<f32> = scales.values().copied().collect();
        values.sort_by(f32::total_cmp);
        println!("  escalas a 150 ppp: {} imágenes dibujadas · mín {:.2} · mediana {:.2} · máx {:.2}", values.len(), values.first().unwrap_or(&0.0), values.get(values.len() / 2).unwrap_or(&0.0), values.last().unwrap_or(&0.0));

        let reduced = Document::load_mem(&outcome.bytes).unwrap();
        let report  = analysis::analyze(&reduced);
        println!(
            "  después: imágenes {:.0} KB · fuentes {:.0} KB · contenido {:.0} KB · páginas {}",
            report.image_bytes as f64 / 1024.0,
            report.font_bytes as f64 / 1024.0,
            report.content_bytes as f64 / 1024.0,
            reduced.get_pages().len(),
        );
    }
}
