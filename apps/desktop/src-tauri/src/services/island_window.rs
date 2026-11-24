use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, Monitor, PhysicalPosition, PhysicalSize, Result, WebviewWindow};
#[cfg(not(windows))]
use tauri::LogicalSize;

use crate::{services::visibility, ISLAND_WINDOW_LABEL};

pub const ISLAND_OPEN_EVENT: &str   = "island-open";
pub const ISLAND_TOGGLE_EVENT: &str = "island-toggle";

// Visible area at startup, on top in the middle (the pill with its ears and hover room); must match
// dockRegion(placeIsland(DEFAULT_DOCK), 'collapsed') in the webview.
pub const INITIAL_AREA: IslandRect = IslandRect { x: 508.0, y: 0.0, width: 184.0, height: 36.0 };

// A rectangle in CSS pixels: the visible area within the window, or the window within a work area.
#[derive(Clone, Copy, Debug, PartialEq, Deserialize, Serialize)]
pub struct IslandRect {
    pub x      : f64,
    pub y      : f64,
    pub width  : f64,
    pub height : f64,
}

// Area rect in physical pixels, relative to the window's top-left corner.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct AreaRect {
    pub left: i32,
    pub top: i32,
    pub right: i32,
    pub bottom: i32,
}

// A rectangle in physical pixels of the desktop.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
pub struct ScreenRect {
    pub x      : i32,
    pub y      : i32,
    pub width  : u32,
    pub height : u32,
}

// A monitor for the island: all of it and its work area (without the taskbar), in physical pixels.
#[derive(Clone, Debug, PartialEq, Serialize)]
pub struct IslandScreen {
    pub id      : String,
    pub primary : bool,
    pub scale   : f64,
    pub bounds  : ScreenRect,
    pub work    : ScreenRect,
}

fn clickable_by_default() -> bool {
    true
}

// How an area becomes the window's region: not clickable (hidden at rest), the region is empty and the
// window takes no clicks nor drags at all; round (the resting bubble), it is the circle inside the rect.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct AreaShape {
    pub clickable : bool,
    pub round     : bool,
}

pub const PLAIN_AREA: AreaShape = AreaShape { clickable: true, round: false };

// Where the webview wants the window: a rect of a screen's work area, and the resting area within the
// window (what a reset goes back to). Hidden (modo oculto), that area is only where the cursor reveals
// Glup: it takes no clicks. The bubble's is round.
#[derive(Clone, Debug, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FrameRequest {
    pub screen         : String,
    pub rect           : IslandRect,
    pub pill           : IslandRect,
    #[serde(default = "clickable_by_default")]
    pub pill_clickable : bool,
    #[serde(default)]
    pub pill_round     : bool,
}

// The window as last placed, in physical pixels, with its resting area.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct FrameState {
    pub position : PhysicalPosition<i32>,
    pub size     : PhysicalSize<u32>,
    pub pill     : IslandRect,
    pub shape    : AreaShape,
}

// The area of the island: what the cursor tracker watches and, when clickable, the window's region.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct AreaState {
    pub rect  : IslandRect,
    pub shape : AreaShape,
}

pub struct IslandArea(Mutex<AreaState>);

// The window's place and size: set by the webview for the island's dock (only the region changes
// between states), checked by the watchdogs.
#[derive(Default)]
pub struct IslandFrame(Mutex<Option<FrameState>>);

impl Default for IslandArea {
    fn default() -> Self {
        Self(Mutex::new(AreaState { rect: INITIAL_AREA, shape: PLAIN_AREA }))
    }
}

fn screen_rect(position: PhysicalPosition<i32>, size: PhysicalSize<u32>) -> ScreenRect {
    ScreenRect { x: position.x, y: position.y, width: size.width, height: size.height }
}

fn to_screen(monitor: &Monitor, primary: Option<&Monitor>) -> IslandScreen {
    let work = monitor.work_area();

    IslandScreen {
        id      : monitor.name().cloned().unwrap_or_default(),
        primary : primary.is_some_and(|main| main.name() == monitor.name()),
        scale   : monitor.scale_factor(),
        bounds  : screen_rect(*monitor.position(), *monitor.size()),
        work    : screen_rect(work.position, work.size),
    }
}

// Every monitor, for the island's dock (the webview decides where it goes).
pub fn screens(app: &AppHandle) -> Vec<IslandScreen> {
    let primary = app.primary_monitor().ok().flatten();
    app.available_monitors().map(|monitors| monitors.iter().map(|monitor| to_screen(monitor, primary.as_ref())).collect()).unwrap_or_default()
}

// A rect of a work area (CSS pixels) on the desktop (physical pixels), with that screen's scale.
pub fn frame_on(work: ScreenRect, scale: f64, rect: IslandRect) -> (PhysicalPosition<i32>, PhysicalSize<u32>) {
    let x      = work.x + (rect.x * scale).round() as i32;
    let y      = work.y + (rect.y * scale).round() as i32;
    let width  = (rect.width * scale).round().max(1.0) as u32;
    let height = (rect.height * scale).round().max(1.0) as u32;
    (PhysicalPosition::new(x, y), PhysicalSize::new(width, height))
}

// Position first: landing on a monitor with another scale resizes the window, so the exact size goes after
// it (and the position again, in case the resize moved it).
fn place(window: &WebviewWindow, frame: &FrameState) -> Result<()> {
    window.set_position(frame.position)?;
    window.set_size(frame.size)?;
    window.set_position(frame.position)
}

// Puts the window where the island's dock needs it; a screen that is gone gives way to the main one.
pub fn set_frame(window: &WebviewWindow, request: FrameRequest) -> Result<()> {
    let app     = window.app_handle();
    let all     = screens(app);
    let Some(screen) = all.iter().find(|screen| screen.id == request.screen).or_else(|| all.iter().find(|screen| screen.primary)).or(all.first()) else {
        return Ok(());
    };

    let (position, size) = frame_on(screen.work, screen.scale, request.rect);
    let shape            = AreaShape { clickable: request.pill_clickable, round: request.pill_round };
    let frame            = FrameState { position, size, pill: request.pill, shape };
    let same_place       = expected_frame(window).is_some_and(|current| current.position == position && current.size == size);
    let already_there    = window.outer_position().is_ok_and(|now| now == position) && window.outer_size().is_ok_and(|now| now == size);

    // A bubble dragged within its screen keeps the window (only its resting area changes): moving it
    // again on every step would only make it flicker.
    if !(same_place && already_there) {
        place(window, &frame)?;
    }
    if let Ok(mut current) = window.state::<IslandFrame>().0.lock() {
        *current = Some(frame);
    }
    Ok(())
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

// The window keeps its frame; only its visible and clickable area changes.
pub fn set_area(window: &WebviewWindow, rect: IslandRect, shape: AreaShape) -> Result<()> {
    let state = AreaState { rect, shape };
    apply_area(window, state)?;

    if let Ok(mut area) = window.state::<IslandArea>().0.lock() {
        *area = state;
    }

    Ok(())
}

pub fn current_area(window: &WebviewWindow) -> Option<AreaRect> {
    let scale = window.scale_factor().ok()?;
    Some(area_rect(stored_area(window)?, scale))
}

// The area last asked for (what the cursor tracker watches).
pub fn stored_area(window: &WebviewWindow) -> Option<IslandRect> {
    stored_state(window).map(|area| area.rect)
}

pub fn stored_state(window: &WebviewWindow) -> Option<AreaState> {
    window.state::<IslandArea>().0.lock().ok().map(|area| *area)
}

// The startup frame (top center of the main screen) until the webview places the island at its dock.
pub fn remember_frame(window: &WebviewWindow) {
    if let (Ok(position), Ok(size), Ok(mut frame)) = (window.outer_position(), window.outer_size(), window.state::<IslandFrame>().0.lock()) {
        *frame = Some(FrameState { position, size, pill: INITIAL_AREA, shape: PLAIN_AREA });
    }
}

pub fn expected_frame(window: &WebviewWindow) -> Option<FrameState> {
    window.state::<IslandFrame>().0.lock().ok().and_then(|frame| *frame)
}

// Back to the frame last placed (the startup one until the webview places it).
pub fn reapply_frame(window: &WebviewWindow) -> Result<()> {
    match expected_frame(window) {
        Some(frame) => place(window, &frame),
        None        => center_top(window),
    }
}

// Back to a clean pill: its frame, on top of everything, pill region.
pub fn recover(window: &WebviewWindow) {
    let _ = reapply_frame(window);
    let _ = window.set_always_on_top(true);
    let (pill, shape) = expected_frame(window).map_or((INITIAL_AREA, PLAIN_AREA), |frame| (frame.pill, frame.shape));
    let _             = set_area(window, pill, shape);
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
    match stored_state(window) {
        Some(state) => apply_area(window, state),
        None        => Ok(()),
    }
}

// A visible area (CSS pixels of the window) in physical pixels, rounded outward.
pub fn area_rect(rect: IslandRect, scale: f64) -> AreaRect {
    AreaRect {
        left   : (rect.x * scale).floor() as i32,
        top    : (rect.y * scale).floor() as i32,
        right  : ((rect.x + rect.width) * scale).ceil() as i32,
        bottom : ((rect.y + rect.height) * scale).ceil() as i32,
    }
}

#[cfg(windows)]
fn apply_area(window: &WebviewWindow, state: AreaState) -> Result<()> {
    use windows_sys::Win32::Graphics::Gdi::{CreateEllipticRgn, CreateRectRgn, SetWindowRgn};

    let area = if state.shape.clickable { area_rect(state.rect, window.scale_factor()?) } else { AreaRect { left: 0, top: 0, right: 0, bottom: 0 } };
    let hwnd = window.hwnd()?.0 as _;

    // The system owns the region after SetWindowRgn, so it must not be deleted here. An empty one leaves
    // nothing of the window to click or drag onto; an elliptic one, only the circle (its box is still the
    // rect, so the watchdog compares it the same way).
    unsafe {
        let region = if state.shape.round && state.shape.clickable {
            CreateEllipticRgn(area.left, area.top, area.right + 1, area.bottom + 1)
        } else {
            CreateRectRgn(area.left, area.top, area.right, area.bottom)
        };
        SetWindowRgn(hwnd, region, 1);
    }

    Ok(())
}

#[cfg(not(windows))]
fn apply_area(window: &WebviewWindow, state: AreaState) -> Result<()> {
    window.set_size(LogicalSize::new(state.rect.width.max(1.0), state.rect.height.max(1.0)))
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
    pub capturing: bool,
    pub area: IslandRect,
}

pub fn status(window: &WebviewWindow) -> IslandStatus {
    let flags = visibility::snapshot(window.app_handle());

    IslandStatus {
        visible     : window.is_visible().unwrap_or(false),
        fullscreen  : flags.fullscreen,
        tray_hidden : flags.user_hidden,
        capturing   : flags.capturing,
        area        : stored_area(window).unwrap_or(INITIAL_AREA),
    }
}

// Asks the island to expand pinned, showing it first if the user had hidden it.
pub fn request_open(app: &AppHandle) {
    visibility::show_for_user(app);
    let _ = app.emit_to(ISLAND_WINDOW_LABEL, ISLAND_OPEN_EVENT, ());
}

// Its shortcut: opens the panel when closed (hidden or not), closes it when open.
pub fn request_toggle(app: &AppHandle) {
    visibility::show_for_user(app);
    let _ = app.emit_to(ISLAND_WINDOW_LABEL, ISLAND_TOGGLE_EVENT, ());
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

    #[test]
    fn the_visible_area_grows_with_the_scale_and_rounds_outward() {
        assert_eq!(area_rect(INITIAL_AREA, 1.0), AreaRect { left: 508, top: 0, right: 692, bottom: 36 });
        assert_eq!(area_rect(INITIAL_AREA, 1.25), AreaRect { left: 635, top: 0, right: 865, bottom: 45 });
        assert_eq!(area_rect(IslandRect { x: 0.5, y: 10.2, width: 10.0, height: 10.0 }, 1.5), AreaRect { left: 0, top: 15, right: 16, bottom: 31 });
    }

    #[test]
    fn a_frame_lands_on_its_screen_with_that_screen_scale() {
        // A 2560 x 1440 at 150 % on the left of the main one, the taskbar not on it.
        let work  = ScreenRect { x: -2560, y: 0, width: 2560, height: 1440 };
        let frame = IslandRect { x: 853.33, y: 0.0, width: 1200.0, height: 720.0 };

        let (position, size) = frame_on(work, 1.5, frame);
        assert_eq!((position.x, position.y), (-2560 + 1280, 0));
        assert_eq!((size.width, size.height), (1800, 1080));
    }

    #[test]
    fn a_frame_on_a_bottom_edge_sits_on_the_work_area() {
        // The taskbar takes the last 40 px of a 1920 x 1080 main screen.
        let work             = ScreenRect { x: 0, y: 0, width: 1920, height: 1040 };
        let (position, size) = frame_on(work, 1.0, IslandRect { x: 360.0, y: 320.0, width: 1200.0, height: 720.0 });

        assert_eq!(position.y + size.height as i32, 1040);
    }
}
