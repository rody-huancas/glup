// The OCR that comes with Windows (Windows.Media.Ocr): nothing to download. Other systems have none yet.
use image::{imageops::FilterType, DynamicImage, RgbaImage};

pub const NO_LANGUAGE: &str = "Tu Windows no tiene instalado el reconocimiento de texto. Agrégalo en Configuración › Hora e idioma › Idioma, en las opciones del español.";
pub const OCR_ERROR: &str   = "No pude leer el texto de esta imagen";
#[cfg(not(windows))]
pub const UNSUPPORTED: &str = "Sacar texto solo funciona en Windows por ahora";

// Scales the image down so its longest side fits the engine's limit, keeping the proportion.
pub fn fit_for_engine(image: RgbaImage, max_side: u32) -> RgbaImage {
    let (width, height) = image.dimensions();
    if width.max(height) <= max_side || max_side == 0 {
        return image;
    }

    let scale = max_side as f64 / width.max(height) as f64;
    let size  = |side: u32| ((side as f64 * scale).round() as u32).clamp(1, max_side);
    DynamicImage::ImageRgba8(image).resize_exact(size(width), size(height), FilterType::Triangle).to_rgba8()
}

// Transparent parts become white (as on paper), then the bytes go in the order Windows wants (BGRA).
pub fn to_bgra_on_white(image: &RgbaImage) -> Vec<u8> {
    image
        .pixels()
        .flat_map(|pixel| {
            let [red, green, blue, alpha] = pixel.0;
            let over = |channel: u8| ((channel as u16 * alpha as u16 + 255 * (255 - alpha as u16)) / 255) as u8;
            [over(blue), over(green), over(red), 255]
        })
        .collect()
}

#[cfg(windows)]
mod engine {
    use windows::{
        core::HSTRING,
        Globalization::Language,
        Graphics::Imaging::{BitmapPixelFormat, SoftwareBitmap},
        Media::Ocr::OcrEngine,
        Storage::Streams::DataWriter,
        System::UserProfile::GlobalizationPreferences,
        Win32::System::WinRT::{RoInitialize, RO_INIT_MULTITHREADED},
    };

    use super::{fit_for_engine, to_bgra_on_white, NO_LANGUAGE, OCR_ERROR};
    use crate::services::text::{
        compose::{join_lines, LineBox},
        language::choose_language,
    };

    fn init() {
        // Each worker thread joins the Windows Runtime once; a second call just says it already did.
        let _ = unsafe { RoInitialize(RO_INIT_MULTITHREADED) };
    }

    fn available_languages() -> Vec<String> {
        init();
        OcrEngine::AvailableRecognizerLanguages()
            .map(|list| list.into_iter().filter_map(|language| language.LanguageTag().ok().map(|tag| tag.to_string())).collect())
            .unwrap_or_default()
    }

    fn preferred_languages() -> Vec<String> {
        GlobalizationPreferences::Languages().map(|list| list.into_iter().map(|tag| tag.to_string()).collect()).unwrap_or_default()
    }

    pub fn language() -> Option<String> {
        choose_language(&preferred_languages(), &available_languages())
    }

    fn line_box(line: &windows::Media::Ocr::OcrLine) -> Option<LineBox> {
        let text          = line.Text().ok()?.to_string();
        let boxes: Vec<_> = line.Words().ok()?.into_iter().filter_map(|word| word.BoundingRect().ok()).collect();
        let top           = boxes.iter().map(|rect| rect.Y).fold(f32::MAX, f32::min);
        let bottom        = boxes.iter().map(|rect| rect.Y + rect.Height).fold(0.0_f32, f32::max);
        Some(LineBox { text, top: if boxes.is_empty() { 0.0 } else { top }, height: (bottom - top).max(0.0) })
    }

    // Reads the text of an image; lines in reading order, paragraphs where the gaps say so.
    pub fn recognize(image: image::RgbaImage) -> Result<String, String> {
        init();
        let tag    = language().ok_or_else(|| NO_LANGUAGE.to_string())?;
        let engine = Language::CreateLanguage(&HSTRING::from(tag)).and_then(|language| OcrEngine::TryCreateFromLanguage(&language)).map_err(|_| NO_LANGUAGE.to_string())?;

        let max             = OcrEngine::MaxImageDimension().unwrap_or(10_000);
        let image           = fit_for_engine(image, max);
        let (width, height) = image.dimensions();

        let read = || -> windows::core::Result<String> {
            let writer = DataWriter::new()?;
            writer.WriteBytes(&to_bgra_on_white(&image))?;
            let bitmap = SoftwareBitmap::CreateCopyFromBuffer(&writer.DetachBuffer()?, BitmapPixelFormat::Bgra8, width as i32, height as i32)?;
            let result = engine.RecognizeAsync(&bitmap)?.join()?;
            let lines: Vec<LineBox> = result.Lines()?.into_iter().filter_map(|line| line_box(&line)).collect();
            Ok(join_lines(&lines))
        };

        read().map_err(|error| {
            eprintln!("[text] ocr failed: {error}");
            OCR_ERROR.to_string()
        })
    }
}

#[cfg(windows)]
pub use engine::{language, recognize};

#[cfg(not(windows))]
pub fn language() -> Option<String> {
    None
}

#[cfg(not(windows))]
pub fn recognize(_image: RgbaImage) -> Result<String, String> {
    Err(UNSUPPORTED.to_string())
}
