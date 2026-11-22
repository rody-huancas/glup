use image::{
    imageops::{self, FilterType},
    ImageBuffer, Luma, Rgb, RgbImage, RgbaImage,
};

// BiRefNet works on a 1024x1024 square, normalized with the ImageNet mean and deviation.
pub const MODEL_SIDE: u32      = 1024;
pub const MEAN: [f32; 3]       = [0.485, 0.456, 0.406];
pub const STD: [f32; 3]        = [0.229, 0.224, 0.225];
pub const MASK_ERROR: &str     = "No pude separar el fondo de esta imagen";

// How much of each pixel belongs to the subject: 0 background, 1 subject.
pub type Mask = ImageBuffer<Luma<f32>, Vec<f32>>;

// The image squeezed to the model square, as planes R, G, B (1x3xHxW).
pub fn preprocess(image: &RgbImage) -> Vec<f32> {
    let resized = imageops::resize(image, MODEL_SIDE, MODEL_SIDE, FilterType::Triangle);
    let plane   = (MODEL_SIDE * MODEL_SIDE) as usize;
    let mut out = vec![0.0f32; plane * 3];

    for (index, pixel) in resized.pixels().enumerate() {
        for channel in 0..3 {
            out[channel * plane + index] = (pixel[channel] as f32 / 255.0 - MEAN[channel]) / STD[channel];
        }
    }

    out
}

fn sigmoid(value: f32) -> f32 {
    1.0 / (1.0 + (-value).exp())
}

// The model answers in logits; the mask is their sigmoid, still at the model size.
pub fn mask_from_logits(logits: &[f32], side: u32) -> Result<Mask, String> {
    let values = logits.iter().map(|value| sigmoid(*value)).collect::<Vec<_>>();
    Mask::from_raw(side, side, values).ok_or_else(|| MASK_ERROR.to_string())
}

// Back to the original size; the bilinear stretch keeps the edges soft (hair, fur, fine stems).
pub fn resize_mask(mask: &Mask, width: u32, height: u32) -> Mask {
    imageops::resize(mask, width, height, FilterType::Triangle)
}

fn to_byte(value: f32) -> u8 {
    (value.clamp(0.0, 1.0) * 255.0).round() as u8
}

// The mask becomes the alpha channel; a pixel that was already see-through stays so.
pub fn apply_mask(image: &RgbaImage, mask: &Mask) -> RgbaImage {
    let mut out = image.clone();

    for (pixel, weight) in out.pixels_mut().zip(mask.pixels()) {
        pixel[3] = to_byte(pixel[3] as f32 / 255.0 * weight[0]);
    }

    out
}

// Over plain white, for photos for documents.
pub fn on_white(image: &RgbaImage) -> RgbImage {
    RgbImage::from_fn(image.width(), image.height(), |x, y| {
        let pixel = image.get_pixel(x, y);
        let alpha = pixel[3] as f32 / 255.0;
        let blend = |channel: u8| to_byte((channel as f32 * alpha + 255.0 * (1.0 - alpha)) / 255.0);

        Rgb([blend(pixel[0]), blend(pixel[1]), blend(pixel[2])])
    })
}
