// A still of each monitor, kept only in memory: it is never written to disk.
use image::RgbaImage;

use crate::services::screen_text::region::MonitorFrame;

pub const CAPTURE_ERROR: &str = "No pude ver la pantalla";

// BGRA rows from Windows to RGBA, opaque (the screen has no transparency).
pub fn bgra_to_rgba(mut pixels: Vec<u8>) -> Vec<u8> {
    for pixel in pixels.chunks_exact_mut(4) {
        pixel.swap(0, 2);
        pixel[3] = 255;
    }
    pixels
}

#[cfg(windows)]
pub fn capture(monitor: &MonitorFrame) -> Result<RgbaImage, String> {
    use windows_sys::Win32::Graphics::Gdi::{
        BitBlt, CreateCompatibleBitmap, CreateCompatibleDC, DeleteDC, DeleteObject, GetDC, GetDIBits, ReleaseDC, SelectObject, BITMAPINFO, BITMAPINFOHEADER, BI_RGB, CAPTUREBLT,
        DIB_RGB_COLORS, SRCCOPY,
    };

    let (width, height) = (monitor.width as i32, monitor.height as i32);
    let mut pixels      = vec![0u8; monitor.width as usize * monitor.height as usize * 4];

    // Glup is per-monitor DPI aware, so the screen's device context is in physical pixels.
    let copied = unsafe {
        let screen = GetDC(std::ptr::null_mut());
        let memory = CreateCompatibleDC(screen);
        let bitmap = CreateCompatibleBitmap(screen, width, height);
        let old    = SelectObject(memory, bitmap);
        let blit   = BitBlt(memory, 0, 0, width, height, screen, monitor.x, monitor.y, SRCCOPY | CAPTUREBLT);

        let mut info: BITMAPINFO = std::mem::zeroed();
        info.bmiHeader.biSize        = std::mem::size_of::<BITMAPINFOHEADER>() as u32;
        info.bmiHeader.biWidth       = width;
        // Negative: rows from the top down, as the image crate wants them.
        info.bmiHeader.biHeight      = -height;
        info.bmiHeader.biPlanes      = 1;
        info.bmiHeader.biBitCount    = 32;
        info.bmiHeader.biCompression = BI_RGB;

        SelectObject(memory, old);
        let rows = GetDIBits(memory, bitmap, 0, height as u32, pixels.as_mut_ptr().cast(), &mut info, DIB_RGB_COLORS);

        DeleteObject(bitmap);
        DeleteDC(memory);
        ReleaseDC(std::ptr::null_mut(), screen);
        blit != 0 && rows == height
    };

    if !copied {
        eprintln!("[screen-text] capture failed for {monitor:?}");
        return Err(CAPTURE_ERROR.to_string());
    }

    RgbaImage::from_raw(monitor.width, monitor.height, bgra_to_rgba(pixels)).ok_or_else(|| CAPTURE_ERROR.to_string())
}

#[cfg(not(windows))]
pub fn capture(_monitor: &MonitorFrame) -> Result<RgbaImage, String> {
    Err(CAPTURE_ERROR.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn windows_pixels_become_opaque_rgba() {
        assert_eq!(bgra_to_rgba(vec![10, 20, 30, 0, 1, 2, 3, 7]), vec![30, 20, 10, 255, 3, 2, 1, 255]);
    }
}
