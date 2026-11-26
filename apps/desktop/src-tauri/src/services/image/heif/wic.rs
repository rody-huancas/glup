// Windows' own decoders (WIC, through Windows.Graphics.Imaging): HEIC with the "Extensiones de imagen
// HEIF" and "Extensiones de vídeo HEVC" from the Microsoft Store, AVIF with the "Extensión de vídeo AV1".
// Windows turns the picture upright and manages its colour to sRGB (Display P3 included).
use image::RgbaImage;

// Why Windows could not decode it.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum WicError {
    // No decoder for this format (the extension is not installed), or the codec behind it is missing.
    Missing,
    // There is a decoder, and this file is broken or unusual.
    Broken,
}

// What Windows answers when it has no decoder for the format, or one that cannot start: the extension is
// not installed (or only half: the HEIF one without HEVC, the AVIF one without AV1). Seen on machines
// without them, a GitHub runner among them. The file itself was already read by Glup's own parser, so an
// unknown format here means Windows does not know it, not that the file is broken.
pub const NO_DECODER: [(u32, &str); 5] = [
    (0x8898_2F50, "WINCODEC_ERR_COMPONENTNOTFOUND"),
    (0x8898_2F07, "WINCODEC_ERR_UNKNOWNIMAGEFORMAT"),
    (0x8898_2F8B, "WINCODEC_ERR_COMPONENTINITIALIZEFAILURE"),
    (0x8898_2F8A, "WINCODEC_ERR_INVALIDREGISTRATION"),
    (0x8004_0154, "REGDB_E_CLASSNOTREG"),
];

// The HEIF decoder without the HEVC one fails later, when the pixels are asked for, with a Media
// Foundation error (0xC00D....).
const MEDIA_FOUNDATION: u32 = 0xC00D_0000;

// A failure of Windows: a decoder is missing, or the file is broken. Pure, to be tested on any machine.
pub fn classify(code: u32) -> WicError {
    if NO_DECODER.iter().any(|(missing, _)| *missing == code) || code & 0xFFFF_0000 == MEDIA_FOUNDATION {
        WicError::Missing
    } else {
        WicError::Broken
    }
}

#[cfg(windows)]
mod engine {
    use image::RgbaImage;
    use windows::{
        Graphics::Imaging::{
            BitmapAlphaMode, BitmapDecoder, BitmapInterpolationMode, BitmapPixelFormat, BitmapTransform, ColorManagementMode, ExifOrientationMode,
        },
        Storage::Streams::{DataWriter, InMemoryRandomAccessStream},
        Win32::System::WinRT::{RoInitialize, RO_INIT_MULTITHREADED},
    };

    use super::{classify, WicError};

    // The longest side fits `fit` (for previews), keeping the proportion.
    fn scaled(width: u32, height: u32, fit: Option<u32>) -> (u32, u32) {
        match fit {
            Some(fit) if width.max(height) > fit => {
                let scale = fit as f64 / width.max(height) as f64;
                (((width as f64 * scale).round() as u32).max(1), ((height as f64 * scale).round() as u32).max(1))
            }
            _ => (width, height),
        }
    }

    pub fn decode(bytes: &[u8], fit: Option<u32>) -> Result<RgbaImage, WicError> {
        let _ = unsafe { RoInitialize(RO_INIT_MULTITHREADED) };

        let run = || -> windows::core::Result<Option<RgbaImage>> {
            let stream = InMemoryRandomAccessStream::new()?;
            let writer = DataWriter::CreateDataWriter(&stream)?;
            writer.WriteBytes(bytes)?;
            writer.StoreAsync()?.join()?;
            writer.DetachStream()?;
            stream.Seek(0)?;

            let decoder           = BitmapDecoder::CreateAsync(&stream)?.join()?;
            let (width, height)   = (decoder.PixelWidth()?, decoder.PixelHeight()?);
            let (wide, tall)      = scaled(width, height, fit);
            let transform         = BitmapTransform::new()?;
            transform.SetScaledWidth(wide)?;
            transform.SetScaledHeight(tall)?;
            transform.SetInterpolationMode(BitmapInterpolationMode::Fant)?;

            let pixels = decoder
                .GetPixelDataTransformedAsync(BitmapPixelFormat::Rgba8, BitmapAlphaMode::Straight, &transform, ExifOrientationMode::RespectExifOrientation, ColorManagementMode::ColorManageToSRgb)?
                .join()?
                .DetachPixelData()?;

            // Turned a quarter, the picture is as tall as it was wide.
            let turned       = decoder.OrientedPixelWidth()? != width;
            let (out_w, out_h) = if turned { (tall, wide) } else { (wide, tall) };
            Ok(RgbaImage::from_raw(out_w, out_h, pixels.to_vec()))
        };

        match run() {
            Ok(Some(image)) => Ok(image),
            Ok(None)        => Err(WicError::Broken),
            Err(error)      => {
                eprintln!("[glup:heif] Windows no pudo leerla: {:#010x}", error.code().0);
                Err(classify(error.code().0 as u32))
            }
        }
    }
}

// The picture upright and in sRGB; with `fit`, already small (for previews).
#[cfg(windows)]
pub fn decode(bytes: &[u8], fit: Option<u32>) -> Result<RgbaImage, WicError> {
    engine::decode(bytes, fit)
}

#[cfg(not(windows))]
pub fn decode(_: &[u8], _: Option<u32>) -> Result<RgbaImage, WicError> {
    Err(WicError::Missing)
}
