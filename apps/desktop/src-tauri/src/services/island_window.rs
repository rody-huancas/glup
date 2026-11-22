use std::sync::Mutex;

use serde::Deserialize;
use tauri::{AppHandle, Emitter, Manager, PhysicalPosition, Result, WebviewWindow};
#[cfg(not(windows))]
use tauri::LogicalSize;

use crate::{services::visibility, ISLAND_WINDOW_LABEL};

pub const ISLAND_OPEN_EVENT: &str = "island-open";

// Visible area at startup (the pill with its ears and hover room); must match getIslandArea('collapsed').
pub const INITIAL_AREA: IslandSize = IslandSize { width: 184.0, height: 36.0 };
// pub const INITIAL_AREA: IslandSize = IslandSize { width: 152.0, height: 28.0 };
// pub const INITIAL_AREA: IslandSize = IslandSize { width: 120.0, height: 24.0 };

#[derive(Clone, Copy, Deserialize)]
pub struct IslandSize {
    pub width: f64,
    pub height: f64,
}

// Area rect in physical pixels, relative to the window's top-left corner.
#[derive(Clone, Copy)]
pub struct AreaRect {
    pub left: i32,
    pub top: i32,
    pub right: i32,
    pub bottom: i32,
}

pub struct IslandArea(Mutex<IslandSize>);

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

// Replaced by set_area: resizing and moving the window made WebView2 show stale frames (the flicker).
// pub fn resize(window: &WebviewWindow, size: IslandSize) -> Result<()> {
//     window.set_size(LogicalSize::new(size.width, size.height))?;
//     center_top(window)
// }

// The window keeps the expanded size; only its visible and clickable area changes, anchored top center.
pub fn set_area(window: &WebviewWindow, size: IslandSize) -> Result<()> {
    apply_area(window, size)?;

    if let Ok(mut area) = window.state::<IslandArea>().0.lock() {
        *area = size;
    }

    Ok(())
}

pub fn current_area(window: &WebviewWindow) -> Option<AreaRect> {
    let size = *window.state::<IslandArea>().0.lock().ok()?;
    area_rect(window, size).ok()
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

// Asks the island to expand pinned, showing it first if the user had hidden it.
pub fn request_open(app: &AppHandle) {
    visibility::show_for_user(app);
    let _ = app.emit_to(ISLAND_WINDOW_LABEL, ISLAND_OPEN_EVENT, ());
}
