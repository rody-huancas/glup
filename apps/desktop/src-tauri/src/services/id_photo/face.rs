// The face detector that comes with Windows (Windows.Media.FaceAnalysis). Nothing to download.
use image::RgbImage;

// A face found: its box in the photo's pixels.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct FaceBox {
    pub x      : f64,
    pub y      : f64,
    pub width  : f64,
    pub height : f64,
}

// The detector works better (and fast) on a picture of about this size.
pub const DETECT_SIDE: u32 = 1280;
// The box of the Windows detector already reaches the chin (seen on real portraits); a hair more, so
// a beard or the jaw line are not cut short (share of the box height).
pub const CHIN_BELOW_BOX: f64 = 0.02;

pub fn chin_of(face: FaceBox) -> f64 {
    face.y + face.height * (1.0 + CHIN_BELOW_BOX)
}

#[cfg(windows)]
pub fn detect(image: &RgbImage) -> Result<Vec<FaceBox>, String> {
    use image::{imageops::FilterType, DynamicImage};
    use windows::{
        Graphics::Imaging::{BitmapPixelFormat, SoftwareBitmap},
        Media::FaceAnalysis::FaceDetector,
        Storage::Streams::DataWriter,
        Win32::System::WinRT::{RoInitialize, RO_INIT_MULTITHREADED},
    };

    let _ = unsafe { RoInitialize(RO_INIT_MULTITHREADED) };

    let (width, height) = image.dimensions();
    let scale           = (DETECT_SIDE as f64 / width.max(height) as f64).min(1.0);
    let small           = DynamicImage::ImageRgb8(image.clone()).resize((width as f64 * scale) as u32, (height as f64 * scale) as u32, FilterType::Triangle).to_luma8();

    let run = || -> windows::core::Result<Vec<FaceBox>> {
        let writer = DataWriter::new()?;
        writer.WriteBytes(small.as_raw())?;
        let bitmap   = SoftwareBitmap::CreateCopyFromBuffer(&writer.DetachBuffer()?, BitmapPixelFormat::Gray8, small.width() as i32, small.height() as i32)?;
        let detector = FaceDetector::CreateAsync()?.join()?;
        let faces    = detector.DetectFacesAsync(&bitmap)?.join()?;

        Ok(faces
            .into_iter()
            .filter_map(|face| face.FaceBox().ok())
            .map(|bounds| FaceBox {
                x      : bounds.X as f64 / scale,
                y      : bounds.Y as f64 / scale,
                width  : bounds.Width as f64 / scale,
                height : bounds.Height as f64 / scale,
            })
            .collect())
    };

    run().map_err(|error| {
        eprintln!("[id-photo] face detector: {error}");
        super::FACE_ERROR.to_string()
    })
}

#[cfg(not(windows))]
pub fn detect(_image: &RgbImage) -> Result<Vec<FaceBox>, String> {
    Err(super::FACE_ERROR.to_string())
}
