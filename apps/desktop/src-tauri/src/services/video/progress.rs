// FFmpeg's `-progress pipe:1` writes "key=value" lines; out_time_us says how far into the video it is.
const TIME_KEYS: [&str; 2] = ["out_time_us", "out_time_ms"];

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum ProgressLine {
    // Seconds of the video already made.
    Time(f64),
    // "progress=end": FFmpeg finished.
    End,
    Other,
}

// Both keys carry microseconds (out_time_ms is misnamed in FFmpeg); "N/A" comes before the first frame.
pub fn parse_line(line: &str) -> ProgressLine {
    let Some((key, value)) = line.trim().split_once('=') else { return ProgressLine::Other };

    if key == "progress" && value == "end" {
        return ProgressLine::End;
    }
    if TIME_KEYS.contains(&key) {
        if let Ok(micros) = value.parse::<i64>() {
            return ProgressLine::Time(micros.max(0) as f64 / 1_000_000.0);
        }
    }
    ProgressLine::Other
}

// 0 to 1 by the time made out of the whole duration.
pub fn fraction(done: f64, duration: f64) -> f64 {
    if duration <= 0.0 { 0.0 } else { (done / duration).clamp(0.0, 1.0) }
}
