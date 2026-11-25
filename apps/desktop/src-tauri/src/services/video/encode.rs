// Runs FFmpeg as its own process (never linked into Glup), reads its progress and stops it on Cancelar.
use std::{
    ffi::OsString,
    io::{BufRead, BufReader, Read},
    path::Path,
    process::{Command, Stdio},
    sync::atomic::{AtomicBool, Ordering},
    thread,
};

use crate::services::video::{
    progress::{fraction, parse_line, ProgressLine},
    tool::MEDIA_ERROR,
};

pub const ENCODE_ERROR: &str = "No pude reducir este video";

// What FFmpeg says when Media Foundation is missing or refuses to start.
const MEDIA_SIGNS: [&str; 4] = ["mfplat", "MFStartup", "could not load", "h264_mf"];
// Only the end of what FFmpeg prints on error is kept (for the log).
const KEPT_ERROR: usize = 4096;

#[derive(Debug, PartialEq, Eq)]
pub enum Encoded {
    Done,
    // Stopped by the person; the half-written file is the caller's to delete.
    Cancelled,
}

pub struct EncodeParams<'a> {
    pub ffmpeg      : &'a Path,
    pub args        : Vec<OsString>,
    // Seconds, to turn the time made into a share.
    pub duration    : f64,
    pub cancel      : &'a AtomicBool,
    // 0 to 1.
    pub on_progress : &'a dyn Fn(f64),
}

// No console window flashing behind the island on Windows.
pub fn hide_window(command: &mut Command) {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        command.creation_flags(CREATE_NO_WINDOW);
    }
    #[cfg(not(windows))]
    let _ = command;
}

// The message for the person: the Windows one when Media Foundation is the problem.
pub fn error_for(stderr: &str) -> &'static str {
    let lower = stderr.to_ascii_lowercase();
    if MEDIA_SIGNS.iter().any(|sign| lower.contains(&sign.to_ascii_lowercase())) { MEDIA_ERROR } else { ENCODE_ERROR }
}

pub fn encode(params: EncodeParams) -> Result<Encoded, String> {
    encode_with(params, &|_| {})
}

// The same, with the command set up first (the subtitles are drawn from a file in its own folder).
pub fn encode_with(params: EncodeParams, setup: &dyn Fn(&mut Command)) -> Result<Encoded, String> {
    let mut command = Command::new(params.ffmpeg);
    command.args(&params.args).stdin(Stdio::null()).stdout(Stdio::piped()).stderr(Stdio::piped());
    hide_window(&mut command);
    setup(&mut command);

    let mut child = command.spawn().map_err(|_| ENCODE_ERROR.to_string())?;
    let stdout    = child.stdout.take().ok_or(ENCODE_ERROR)?;
    let mut error = child.stderr.take().ok_or(ENCODE_ERROR)?;

    // Read apart, so a long error never fills the pipe and blocks FFmpeg.
    let errors = thread::spawn(move || {
        let mut text = String::new();
        let _        = error.read_to_string(&mut text);
        let cut      = text.len().saturating_sub(KEPT_ERROR);
        text.get(cut..).unwrap_or_default().to_string()
    });

    let mut cancelled = false;
    for line in BufReader::new(stdout).lines().map_while(Result::ok) {
        if params.cancel.load(Ordering::SeqCst) {
            cancelled = true;
            let _ = child.kill();
            break;
        }

        match parse_line(&line) {
            ProgressLine::Time(done) => (params.on_progress)(fraction(done, params.duration)),
            ProgressLine::End        => (params.on_progress)(1.0),
            ProgressLine::Other      => {}
        }
    }

    let status = child.wait().map_err(|_| ENCODE_ERROR.to_string())?;
    let stderr = errors.join().unwrap_or_default();

    if cancelled || params.cancel.load(Ordering::SeqCst) {
        return Ok(Encoded::Cancelled);
    }
    if !status.success() {
        eprintln!("[video] ffmpeg failed: {stderr}");
        return Err(error_for(&stderr).to_string());
    }

    Ok(Encoded::Done)
}
