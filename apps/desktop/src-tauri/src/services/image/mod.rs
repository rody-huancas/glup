pub mod compress;
pub mod convert;
pub mod decode;
pub mod ico;
pub mod to_pdf;

#[cfg(test)]
mod tests;

use std::path::Path;

use serde::{Deserialize, Serialize};

pub type ImageResult<T> = Result<T, String>;

// Quality settings (0-100) and AVIF speed (0 slowest - 10 fastest).
pub const CONVERT_QUALITY: Quality  = Quality { jpg: 85, webp: 80, avif: 70 };
pub const COMPRESS_QUALITY: Quality = Quality { jpg: 80, webp: 80, avif: 60 };
pub const AVIF_SPEED: u8            = 6;
pub const OXIPNG_LEVEL: u8          = 3;

pub const READ_ERROR: &str   = "No pude leer la imagen";
pub const ENCODE_ERROR: &str = "No pude crear la imagen";

#[derive(Clone, Copy)]
pub struct Quality {
    pub jpg: u8,
    pub webp: u8,
    pub avif: u8,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum TargetFormat {
    Webp,
    Jpg,
    Png,
    Avif,
    Ico,
}

impl TargetFormat {
    pub fn extension(self) -> &'static str {
        match self {
            Self::Webp => "webp",
            Self::Jpg  => "jpg",
            Self::Png  => "png",
            Self::Avif => "avif",
            Self::Ico  => "ico",
        }
    }

    pub fn label(self) -> &'static str {
        match self {
            Self::Webp => "WebP",
            Self::Jpg  => "JPG",
            Self::Png  => "PNG",
            Self::Avif => "AVIF",
            Self::Ico  => "ICO",
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum SourceFormat {
    Png,
    Jpeg,
    Webp,
    Gif,
    Bmp,
    Tiff,
    Avif,
}

impl SourceFormat {
    pub fn from_path(path: &Path) -> Option<Self> {
        let extension = path.extension()?.to_string_lossy().to_lowercase();

        match extension.as_str() {
            "png"          => Some(Self::Png),
            "jpg" | "jpeg" => Some(Self::Jpeg),
            "webp"         => Some(Self::Webp),
            "gif"          => Some(Self::Gif),
            "bmp"          => Some(Self::Bmp),
            "tif" | "tiff" => Some(Self::Tiff),
            "avif"         => Some(Self::Avif),
            _              => None,
        }
    }

    pub fn is(self, target: TargetFormat) -> bool {
        matches!(
            (self, target),
            (Self::Webp, TargetFormat::Webp)
                | (Self::Jpeg, TargetFormat::Jpg)
                | (Self::Png, TargetFormat::Png)
                | (Self::Avif, TargetFormat::Avif)
        )
    }
}
