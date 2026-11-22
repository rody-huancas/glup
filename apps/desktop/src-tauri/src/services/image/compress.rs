use std::{fs, path::Path};

use oxipng::{Options, StripChunks};

use super::{
    convert::{encode_avif, encode_jpeg, encode_png, encode_webp},
    decode::{decode, has_transparency},
    ImageResult, SourceFormat, COMPRESS_QUALITY, ENCODE_ERROR, OXIPNG_LEVEL, READ_ERROR,
};

pub const GIF_COMPRESS_ERROR: &str = "Los GIF todavía no los comprimo";

pub struct Compressed {
    pub bytes: Vec<u8>,
    pub extension: String,
}

// Lossless PNG optimization; also drops metadata chunks that do not affect the image.
pub fn optimize_png(data: &[u8]) -> ImageResult<Vec<u8>> {
    let mut options = Options::from_preset(OXIPNG_LEVEL);
    options.strip   = StripChunks::Safe;

    oxipng::optimize_from_memory(data, &options).map_err(|_| ENCODE_ERROR.to_string())
}

fn same_extension(path: &Path) -> String {
    path.extension().map(|value| value.to_string_lossy().to_lowercase()).unwrap_or_default()
}

// Keeps the format (BMP and TIFF become JPG, or PNG when transparent). Re-encoding drops EXIF data.
pub fn compress(path: &Path, source: SourceFormat) -> ImageResult<Compressed> {
    let quality = COMPRESS_QUALITY;

    match source {
        SourceFormat::Png => {
            let data = fs::read(path).map_err(|_| READ_ERROR.to_string())?;
            Ok(Compressed { bytes: optimize_png(&data)?, extension: same_extension(path) })
        }
        SourceFormat::Jpeg => Ok(Compressed { bytes: encode_jpeg(&decode(path)?, quality.jpg)?, extension: same_extension(path) }),
        SourceFormat::Webp => Ok(Compressed { bytes: encode_webp(&decode(path)?, quality.webp)?, extension: same_extension(path) }),
        SourceFormat::Avif => Ok(Compressed { bytes: encode_avif(&decode(path)?, quality.avif)?, extension: same_extension(path) }),
        SourceFormat::Bmp | SourceFormat::Tiff => {
            let image = decode(path)?;

            if has_transparency(&image) {
                Ok(Compressed { bytes: optimize_png(&encode_png(&image)?)?, extension: "png".to_string() })
            } else {
                Ok(Compressed { bytes: encode_jpeg(&image, quality.jpg)?, extension: "jpg".to_string() })
            }
        }
        SourceFormat::Gif => Err(GIF_COMPRESS_ERROR.to_string()),
    }
}
