// HEIC and AVIF through FFmpeg, when Windows cannot: the same ffmpeg.exe "Reducir peso" of videos
// downloads with permission (LGPL, its own process; never inside Glup). FFmpeg 9 picks the primary
// picture and joins the tiles of a grid (iPhone photos are 512×512 tiles); Glup turns it upright and
// brings its colour to sRGB from what the container says, because FFmpeg does neither the same way
// for every file.
use std::{
    path::Path,
    process::{Command, Stdio},
};

use image::{imageops, DynamicImage, RgbImage};

use super::{
    colour,
    container::{HeifInfo, Transform},
};
use crate::services::video::encode::hide_window;

// Turns a decoded picture upright with the steps of its container, in order.
pub fn upright(image: RgbImage, transforms: &[Transform]) -> RgbImage {
    transforms.iter().fold(image, |image, transform| match transform {
        // Counter-clockwise quarters: one is three clockwise.
        Transform::Rotate(1)         => imageops::rotate270(&image),
        Transform::Rotate(2)         => imageops::rotate180(&image),
        Transform::Rotate(3)         => imageops::rotate90(&image),
        Transform::Rotate(_)         => image,
        Transform::MirrorLeftRight   => imageops::flip_horizontal(&image),
        Transform::MirrorTopBottom   => imageops::flip_vertical(&image),
    })
}

// The picture at 16 bits per channel, as FFmpeg decodes it (cropped, tiles joined, not turned).
fn decode_raw(ffmpeg: &Path, path: &Path) -> Option<DynamicImage> {
    let mut command = Command::new(ffmpeg);
    command
        .args(["-v", "error", "-noautorotate", "-i"])
        .arg(path)
        .args(["-frames:v", "1", "-c:v", "png", "-pix_fmt", "rgb48be", "-f", "image2pipe", "-"])
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    hide_window(&mut command);

    let output = command.output().ok()?;
    if !output.status.success() || output.stdout.is_empty() {
        eprintln!("[glup:heif] FFmpeg no pudo leer {}: {}", path.display(), String::from_utf8_lossy(&output.stderr).trim());
        return None;
    }
    image::load_from_memory(&output.stdout).ok()
}

pub fn decode(ffmpeg: &Path, path: &Path, info: &HeifInfo) -> Option<RgbImage> {
    let raw        = decode_raw(ffmpeg, path)?.into_rgb16();
    let (w, h)     = raw.dimensions();
    let conversion = colour::conversion(info.colour.as_ref());
    let pixels     = colour::to_srgb(raw.as_raw(), conversion.as_ref());
    Some(upright(RgbImage::from_raw(w, h, pixels)?, &info.transforms))
}
