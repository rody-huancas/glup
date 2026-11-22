use tauri::{PhysicalPosition, Result, WebviewWindow};

const SCREEN_MARGIN: f64 = 24.0;

pub fn place_bottom_right(window: &WebviewWindow) -> Result<()> {
    let Some(monitor) = window.primary_monitor()? else {
        return Ok(());
    };

    let area         = monitor.work_area();
    let scale        = monitor.scale_factor();
    let logical_size = window.outer_size()?.to_logical::<f64>(window.scale_factor()?);
    let width        = (logical_size.width * scale).round() as i32;
    let height       = (logical_size.height * scale).round() as i32;
    let margin       = (SCREEN_MARGIN * scale).round() as i32;
    let x            = area.position.x + area.size.width as i32 - width - margin;
    let y            = area.position.y + area.size.height as i32 - height - margin;

    window.set_position(PhysicalPosition::new(x, y))
}
