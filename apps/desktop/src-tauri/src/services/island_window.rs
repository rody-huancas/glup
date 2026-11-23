use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, Result, WebviewWindow};
#[cfg(not(windows))]
use tauri::LogicalSize;

use crate::{services::visibility, ISLAND_WINDOW_LABEL};

pub const ISLAND_OPEN_EVENT: &str = "island-open";

// Visible area at startup (the pill with its ears and hover room); must match getIslandArea('collapsed').
pub const INITIAL_AREA: IslandSize = IslandSize { width: 184.0, height: 36.0 };

#[derive(Clone, Copy, Debug, PartialEq, Deserialize, Serialize)]
pub struct IslandSize {
    pub width: f64,
    pub height: f64,
}

// Area rect in physical pixels, relative to the window's top-left corner.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct AreaRect {
    pub left: i32,
    pub top: i32,
    pub right: i32,
    pub bottom: i32,
}

pub struct IslandArea(Mutex<IslandSize>);

// The window size at startup (it never changes on purpose: only the region does).
#[derive(Default)]
pub struct IslandFrame(Mutex<Option<PhysicalSize<u32>>>);

impl Default for IslandArea {
    fn default() -> Self {
        Self(Mutex::new(INITIAL_AREA))
    }
}

pub fn center_top(window: &WebviewWindow) -> Result<()> {
    let Some(monitor) = window.primary_monitor()? else {
        return Ok(());
    };

    let size   = window.outer_size()?;
    let origin = monitor.position();
    let x      = origin.x + (monitor.size().width as i32 - size.width as i32) / 2;

    window.set_position(PhysicalPosition::new(x, origin.y))
}

// The window keeps the expanded size; only its visible and clickable area changes, anchored top center.
pub fn set_area(window: &WebviewWindow, size: IslandSize) -> Result<()> {
    apply_area(window, size)?;

    if let Ok(mut area) = window.state::<IslandArea>().0.lock() {
        *area = size;
    }

    Ok(())
}

pub fn current_area(window: &WebviewWindow) -> Option<AreaRect> {
    area_rect(window, stored_area(window)?).ok()
}

// The area last asked for (what the region should be).
pub fn stored_area(window: &WebviewWindow) -> Option<IslandSize> {
    window.state::<IslandArea>().0.lock().ok().map(|area| *area)
}

pub fn remember_frame(window: &WebviewWindow) {
    if let (Ok(size), Ok(mut frame)) = (window.outer_size(), window.state::<IslandFrame>().0.lock()) {
        *frame = Some(size);
    }
}

pub fn expected_frame(window: &WebviewWindow) -> Option<PhysicalSize<u32>> {
    window.state::<IslandFrame>().0.lock().ok().and_then(|frame| *frame)
}

// Back to a clean pill: original size, centered at the top, on top of everything, pill region.
pub fn recover(window: &WebviewWindow) {
    if let Some(frame) = expected_frame(window) {
        let _ = window.set_size(frame);
    }

    let _ = center_top(window);
    let _ = window.set_always_on_top(true);
    let _ = set_area(window, INITIAL_AREA);
}

// The same region within a pixel (rounding of the scale factor).
pub fn regions_match(a: AreaRect, b: AreaRect) -> bool {
    (a.left - b.left).abs() <= 1 && (a.top - b.top).abs() <= 1 && (a.right - b.right).abs() <= 1 && (a.bottom - b.bottom).abs() <= 1
}

// The region the system really has (None when there is none or it cannot be read).
#[cfg(windows)]
pub fn applied_region(window: &WebviewWindow) -> Option<AreaRect> {
    use windows_sys::Win32::{
        Foundation::RECT,
        Graphics::Gdi::{CreateRectRgn, DeleteObject, GetRgnBox, GetWindowRgn, NULLREGION},
    };

    let hwnd = window.hwnd().ok()?.0 as _;

    unsafe {
        let region = CreateRectRgn(0, 0, 0, 0);
        let kind   = GetWindowRgn(hwnd, region);
        let mut box_rect: RECT = std::mem::zeroed();
        let read   = GetRgnBox(region, &mut box_rect);
        DeleteObject(region);

        if kind == 0 || kind == NULLREGION as i32 || read == 0 {
            return None;
        }

        Some(AreaRect { left: box_rect.left, top: box_rect.top, right: box_rect.right, bottom: box_rect.bottom })
    }
}

#[cfg(not(windows))]
pub fn applied_region(window: &WebviewWindow) -> Option<AreaRect> {
    current_area(window)
}

// Reapplies the stored area (the watchdog uses it when the real region drifted).
pub fn reapply_area(window: &WebviewWindow) -> Result<()> {
    match stored_area(window) {
        Some(size) => apply_area(window, size),
        None => Ok(()),
    }
}

fn area_rect(window: &WebviewWindow, size: IslandSize) -> Result<AreaRect> {
    let frame  = window.outer_size()?;
    let scale  = window.scale_factor()?;
    let center = frame.width as f64 / 2.0;
    let half   = size.width * scale / 2.0;

    Ok(AreaRect {
        left   : (center - half).floor() as i32,
        top    : 0,
        right  : (center + half).ceil() as i32,
        bottom : (size.height * scale).ceil() as i32,
    })
}

#[cfg(windows)]
fn apply_area(window: &WebviewWindow, size: IslandSize) -> Result<()> {
    use windows_sys::Win32::Graphics::Gdi::{CreateRectRgn, SetWindowRgn};

    let rect = area_rect(window, size)?;
    let hwnd = window.hwnd()?.0 as _;

    // The system owns the region after SetWindowRgn, so it must not be deleted here.
    unsafe {
        let region = CreateRectRgn(rect.left, rect.top, rect.right, rect.bottom);
        SetWindowRgn(hwnd, region, 1);
    }

    Ok(())
}

#[cfg(not(windows))]
fn apply_area(window: &WebviewWindow, size: IslandSize) -> Result<()> {
    window.set_size(LogicalSize::new(size.width, size.height))?;
    center_top(window)
}

// The island never takes focus on its own; the actions panel borrows it so Esc can close it.
pub fn set_focus(window: &WebviewWindow, focused: bool) -> Result<()> {
    window.set_focusable(focused)?;

    if focused {
        window.set_focus()?;
    }

    Ok(())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IslandStatus {
    pub visible: bool,
    pub fullscreen: bool,
    pub tray_hidden: bool,
    pub area: IslandSize,
}

pub fn status(window: &WebviewWindow) -> IslandStatus {
    let flags = visibility::snapshot(window.app_handle());

    IslandStatus {
        visible     : window.is_visible().unwrap_or(false),
        fullscreen  : flags.fullscreen,
        tray_hidden : flags.user_hidden,
        area        : stored_area(window).unwrap_or(INITIAL_AREA),
    }
}

// Asks the island to expand pinned, showing it first if the user had hidden it.
pub fn request_open(app: &AppHandle) {
    visibility::show_for_user(app);
    let _ = app.emit_to(ISLAND_WINDOW_LABEL, ISLAND_OPEN_EVENT, ());
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn regions_match_within_a_pixel() {
        let area = AreaRect { left: 508, top: 0, right: 692, bottom: 36 };

        assert!(regions_match(area, AreaRect { left: 507, ..area }));
        assert!(!regions_match(area, AreaRect { right: 900, ..area }));
    }
}
