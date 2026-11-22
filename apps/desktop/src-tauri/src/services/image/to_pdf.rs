use std::{fs, path::Path};

use image::metadata::Orientation;
use lopdf::{
    content::{Content, Operation},
    dictionary, Document, Object, ObjectId, Stream,
};

use super::{
    decode::{decode, has_transparency, orientation},
    ImageResult, ENCODE_ERROR, READ_ERROR,
};

// A4 in points, and the margin around each image.
pub const A4_SHORT: f32    = 595.28;
pub const A4_LONG: f32     = 841.89;
pub const PAGE_MARGIN: f32 = 24.0;

const IMAGE_NAME: &str = "Im0";

struct Embedded {
    stream: Stream,
    width: u32,
    height: u32,
    orientation: Orientation,
}

struct JpegHeader {
    width: u32,
    height: u32,
    components: u8,
}

pub struct Placement {
    pub page_width: f32,
    pub page_height: f32,
    pub matrix: [f32; 6],
}

// Unit-square mapping (U, V) = (Uu·u + Uv·v + U0, Vu·u + Vv·v + V0) for each EXIF orientation.
fn orientation_terms(orientation: Orientation) -> [f32; 6] {
    match orientation {
        Orientation::NoTransforms   => [1.0, 0.0, 0.0, 0.0, 1.0, 0.0],
        Orientation::FlipHorizontal => [-1.0, 0.0, 1.0, 0.0, 1.0, 0.0],
        Orientation::Rotate180      => [-1.0, 0.0, 1.0, 0.0, -1.0, 1.0],
        Orientation::FlipVertical   => [1.0, 0.0, 0.0, 0.0, -1.0, 1.0],
        Orientation::Rotate90FlipH  => [0.0, -1.0, 1.0, -1.0, 0.0, 1.0],
        Orientation::Rotate90       => [0.0, 1.0, 0.0, -1.0, 0.0, 1.0],
        Orientation::Rotate270FlipH => [0.0, 1.0, 0.0, 1.0, 0.0, 0.0],
        Orientation::Rotate270      => [0.0, -1.0, 1.0, 1.0, 0.0, 0.0],
    }
}

fn swaps_axes(orientation: Orientation) -> bool {
    matches!(
        orientation,
        Orientation::Rotate90 | Orientation::Rotate270 | Orientation::Rotate90FlipH | Orientation::Rotate270FlipH
    )
}

// A4 portrait or landscape following the image, with the image centered and fitted inside the margin.
pub fn place(width: u32, height: u32, orientation: Orientation) -> Placement {
    let (shown_width, shown_height) = if swaps_axes(orientation) { (height as f32, width as f32) } else { (width as f32, height as f32) };
    let (page_width, page_height)   = if shown_width > shown_height { (A4_LONG, A4_SHORT) } else { (A4_SHORT, A4_LONG) };

    let scale  = ((page_width - PAGE_MARGIN * 2.0) / shown_width).min((page_height - PAGE_MARGIN * 2.0) / shown_height);
    let box_w  = shown_width * scale;
    let box_h  = shown_height * scale;
    let x      = (page_width - box_w) / 2.0;
    let y      = (page_height - box_h) / 2.0;
    let [uu, uv, u0, vu, vv, v0] = orientation_terms(orientation);

    Placement {
        page_width,
        page_height,
        matrix: [box_w * uu, box_h * vu, box_w * uv, box_h * vv, x + box_w * u0, y + box_h * v0],
    }
}

// Reads width, height and color components from the JPEG frame header.
fn read_jpeg_header(data: &[u8]) -> Option<JpegHeader> {
    if data.get(0..2)? != [0xFF, 0xD8] {
        return None;
    }

    let mut index = 2;

    while index + 4 <= data.len() {
        if data[index] != 0xFF {
            return None;
        }

        let marker = data[index + 1];

        if marker == 0xFF {
            index += 1;
            continue;
        }

        if marker == 0x01 || (0xD0..=0xD7).contains(&marker) {
            index += 2;
            continue;
        }

        let length   = usize::from(u16::from_be_bytes([data[index + 2], data[index + 3]]));
        let is_frame = (0xC0..=0xCF).contains(&marker) && ![0xC4, 0xC8, 0xCC].contains(&marker);

        if is_frame {
            let segment = data.get(index + 4..index + 2 + length)?;

            return Some(JpegHeader {
                height     : u32::from(u16::from_be_bytes([segment[1], segment[2]])),
                width      : u32::from(u16::from_be_bytes([segment[3], segment[4]])),
                components : segment[5],
            });
        }

        index += 2 + length;
    }

    None
}

// JPGs go in as they are (DCTDecode), without re-compressing; CMYK ones are decoded like the rest.
fn embed_jpeg(data: Vec<u8>, path: &Path) -> Option<Embedded> {
    let header      = read_jpeg_header(&data)?;
    let color_space = match header.components {
        1 => "DeviceGray",
        3 => "DeviceRGB",
        _ => return None,
    };

    let dictionary = dictionary! {
        "Type"             => "XObject",
        "Subtype"          => "Image",
        "Width"            => i64::from(header.width),
        "Height"           => i64::from(header.height),
        "ColorSpace"       => color_space,
        "BitsPerComponent" => 8,
        "Filter"           => "DCTDecode",
    };

    Some(Embedded {
        stream      : Stream::new(dictionary, data),
        width       : header.width,
        height      : header.height,
        orientation : orientation(path),
    })
}

fn image_dictionary(width: u32, height: u32, color_space: &str) -> lopdf::Dictionary {
    dictionary! {
        "Type"             => "XObject",
        "Subtype"          => "Image",
        "Width"            => i64::from(width),
        "Height"           => i64::from(height),
        "ColorSpace"       => color_space,
        "BitsPerComponent" => 8,
    }
}

fn compressed(dictionary: lopdf::Dictionary, content: Vec<u8>) -> ImageResult<Stream> {
    let mut stream = Stream::new(dictionary, content);
    stream.compress().map_err(|_| ENCODE_ERROR.to_string())?;
    Ok(stream)
}

pub struct PdfBuilder {
    document: Document,
    pages_id: ObjectId,
    kids: Vec<Object>,
}

impl PdfBuilder {
    pub fn new() -> Self {
        let mut document = Document::with_version("1.7");
        let pages_id     = document.new_object_id();

        Self { document, pages_id, kids: Vec::new() }
    }

    pub fn page_count(&self) -> usize {
        self.kids.len()
    }

    // Other formats are decoded upright and stored losslessly, with their transparency as a soft mask.
    fn embed_decoded(&mut self, path: &Path) -> ImageResult<Embedded> {
        let image           = decode(path)?;
        let (width, height) = (image.width(), image.height());
        let mut dictionary  = image_dictionary(width, height, "DeviceRGB");

        if has_transparency(&image) {
            let alpha: Vec<u8> = image.to_rgba8().pixels().map(|pixel| pixel[3]).collect();
            let mask_id        = self.document.add_object(compressed(image_dictionary(width, height, "DeviceGray"), alpha)?);

            dictionary.set("SMask", mask_id);
        }

        Ok(Embedded {
            stream      : compressed(dictionary, image.to_rgb8().into_raw())?,
            width,
            height,
            orientation : Orientation::NoTransforms,
        })
    }

    pub fn add_image(&mut self, path: &Path) -> ImageResult<()> {
        let data     = fs::read(path).map_err(|_| READ_ERROR.to_string())?;
        let embedded = match embed_jpeg(data, path) {
            Some(jpeg) => jpeg,
            None       => self.embed_decoded(path)?,
        };

        let placement = place(embedded.width, embedded.height, embedded.orientation);
        let image_id  = self.document.add_object(embedded.stream);
        let matrix    = placement.matrix.iter().map(|&value| Object::Real(value)).collect::<Vec<_>>();

        let content = Content {
            operations: vec![
                Operation::new("q", vec![]),
                Operation::new("cm", matrix),
                Operation::new("Do", vec![Object::Name(IMAGE_NAME.as_bytes().to_vec())]),
                Operation::new("Q", vec![]),
            ],
        };

        let encoded    = content.encode().map_err(|_| ENCODE_ERROR.to_string())?;
        let content_id = self.document.add_object(Stream::new(dictionary! {}, encoded));

        let page_id = self.document.add_object(dictionary! {
            "Type"      => "Page",
            "Parent"    => self.pages_id,
            "MediaBox"  => vec![0.into(), 0.into(), Object::Real(placement.page_width), Object::Real(placement.page_height)],
            "Contents"  => content_id,
            "Resources" => dictionary! { "XObject" => dictionary! { IMAGE_NAME => image_id } },
        });

        self.kids.push(page_id.into());
        Ok(())
    }

    pub fn finish(mut self) -> ImageResult<Vec<u8>> {
        if self.kids.is_empty() {
            return Err(ENCODE_ERROR.to_string());
        }

        let count = self.kids.len() as i64;

        self.document.objects.insert(
            self.pages_id,
            Object::Dictionary(dictionary! { "Type" => "Pages", "Kids" => self.kids, "Count" => count }),
        );

        let catalog_id = self.document.add_object(dictionary! { "Type" => "Catalog", "Pages" => self.pages_id });
        self.document.trailer.set("Root", catalog_id);

        let mut buffer = Vec::new();
        self.document.save_to(&mut buffer).map_err(|_| ENCODE_ERROR.to_string())?;

        Ok(buffer)
    }
}
