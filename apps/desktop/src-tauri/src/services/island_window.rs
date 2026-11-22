use serde::Deserialize;
use tauri::{LogicalSize, PhysicalPosition, Result, WebviewWindow};

#[derive(Clone, Copy, Deserialize)]
pub struct IslandSize {
    pub width: f64,
    pub height: f64,
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

pub fn resize(window: &WebviewWindow, size: IslandSize) -> Result<()> {
    window.set_size(LogicalSize::new(size.width, size.height))?;
    center_top(window)
}
