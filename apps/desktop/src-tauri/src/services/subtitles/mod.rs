// "Subtítulos": what is said in a video (heard as "Pasar audio a texto" does: Whisper on the card or
// the processor) made into short phrases to review, then saved as a .srt, as a track inside the video
// or drawn on its picture.
pub mod burn;
pub mod cues;

#[cfg(test)]
mod tests;

use std::{
    fs,
    path::{Path, PathBuf},
};

use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use self::{
    burn::{ass_document, burn_args, burned_extension, embed_args, fonts_conf, AssParams, BurnArgs, EmbedArgs, SubtitleMode, ASS_NAME},
    cues::{build, to_srt, Cue},
};
use crate::services::{
    actions::{run_single, ActionProgress, ActionReport, SingleJob, SingleOutput, SingleParams},
    destination::Destination,
    media::{self, probe::probe_media, serve::new_token},
    naming::OutputKind,
    progress::{self, Stage},
    text::compose::to_windows_lines,
    transcribe::{listen_files, Heard, TranscribeOptions, TranscribeRequest, SUBTITLES_EXTENSION},
    video::encode::{encode_with, EncodeParams, Encoded, ENCODE_ERROR},
};

pub const SUBTITLES_ACTION: &str = "subtitles";
pub const NO_SPEECH: &str        = "No escuché a nadie hablar en este video";
pub const SAVE_ERROR: &str       = "No pude guardar los subtítulos";
pub const BURN_ERROR: &str       = "No pude pegar los subtítulos en el video";

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListenRequest {
    pub path    : String,
    pub options : TranscribeOptions,
    pub task_id : Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SubtitlesDraft {
    pub cues      : Vec<Cue>,
    pub cancelled : bool,
}

// Preparing (the model), listening (in percent), then the phrases put together.
pub fn listen(app: &AppHandle, request: ListenRequest) -> Result<SubtitlesDraft, String> {
    let heard = listen_files(app, &TranscribeRequest { paths: vec![request.path.clone()], options: request.options, task_id: request.task_id.clone() })?;
    let Heard { files, cancelled, .. } = heard;
    if cancelled {
        return Ok(SubtitlesDraft { cues: Vec::new(), cancelled: true });
    }

    progress::emit(app, ActionProgress::at(&request.task_id, Stage::Phrasing));
    let cues = files.first().map(|file| build(&file.segments)).unwrap_or_default();
    if cues.is_empty() {
        return Err(NO_SPEECH.to_string());
    }
    Ok(SubtitlesDraft { cues, cancelled: false })
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveRequest {
    pub path        : String,
    pub cues        : Vec<Cue>,
    pub mode        : SubtitleMode,
    // «Fondo» (only when drawn on the picture).
    #[serde(default)]
    pub background  : bool,
    // "es"… the language heard, for the track's name (None: unknown).
    pub language    : Option<String>,
    pub destination : Option<Destination>,
    pub task_id     : Option<String>,
}

// A folder of its own in %TEMP% for the files FFmpeg reads, deleted when it is dropped.
struct Scratch(PathBuf);

impl Scratch {
    fn new() -> Result<Self, String> {
        let folder = std::env::temp_dir().join(format!("glup-subtitulos-{}", new_token()));
        fs::create_dir_all(&folder).map_err(|_| SAVE_ERROR.to_string())?;
        Ok(Self(folder))
    }
}

impl Drop for Scratch {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}

fn lower_extension(path: &Path) -> String {
    path.extension().map(|extension| extension.to_string_lossy().to_lowercase()).unwrap_or_default()
}

fn size_of(path: &Path) -> u64 {
    fs::metadata(path).map(|data| data.len()).unwrap_or(0)
}

struct RunParams<'a> {
    job      : &'a SingleJob<'a>,
    ffmpeg   : &'a Path,
    args     : Vec<std::ffi::OsString>,
    duration : f64,
    output   : &'a Path,
    folder   : Option<&'a Path>,
}

// FFmpeg with progress and Cancelar (in the scratch folder when there is one); the half-made file goes.
fn run_ffmpeg(params: RunParams, failure: &str) -> Result<bool, String> {
    let folder = params.folder.map(Path::to_path_buf);
    let setup  = move |command: &mut std::process::Command| {
        if let Some(folder) = &folder {
            command.current_dir(folder).env("FONTCONFIG_FILE", folder.join("fonts.conf")).env("FONTCONFIG_PATH", folder);
        }
    };
    let done = encode_with(EncodeParams { ffmpeg: params.ffmpeg, args: params.args, duration: params.duration, cancel: params.job.cancel(), on_progress: &|done| params.job.progress(done) }, &setup);
    match done {
        Ok(Encoded::Done) => Ok(true),
        Ok(Encoded::Cancelled) => {
            let _ = fs::remove_file(params.output);
            Ok(false)
        }
        Err(error) => {
            let _ = fs::remove_file(params.output);
            Err(if error == ENCODE_ERROR { failure.to_string() } else { error })
        }
    }
}

const DETAILS: [(SubtitleMode, &str); 3] = [
    (SubtitleMode::File, "Subtítulos en un archivo .srt"),
    (SubtitleMode::Embed, "Subtítulos dentro del video"),
    (SubtitleMode::Burn, "Subtítulos pegados en la imagen"),
];

pub fn detail(mode: SubtitleMode, count: usize) -> String {
    let words = DETAILS.iter().find(|(each, _)| *each == mode).map_or("Subtítulos", |(_, words)| words);
    format!("{words} · {count} frases")
}

fn save_with(app: &AppHandle, request: &SaveRequest, job: &SingleJob) -> Result<Option<SingleOutput>, String> {
    let source    = Path::new(&request.path);
    let extension = lower_extension(source);
    let srt       = to_windows_lines(&to_srt(&request.cues));
    let done      = |output: PathBuf, kind: &'static str| Some(SingleOutput { size: size_of(&output), output, kind, detail: detail(request.mode, request.cues.len()) });

    match request.mode {
        SubtitleMode::File => {
            let output = job.reserve(OutputKind::Converted { extension: SUBTITLES_EXTENSION });
            fs::write(&output, srt).map_err(|_| SAVE_ERROR.to_string())?;
            Ok(done(output, "video"))
        }
        SubtitleMode::Embed => {
            let ffmpeg  = media::ffmpeg(app)?;
            let info    = probe_media(&ffmpeg, source)?;
            let scratch = Scratch::new()?;
            let track   = scratch.0.join("subtitulos.srt");
            fs::write(&track, &srt).map_err(|_| SAVE_ERROR.to_string())?;
            let output  = job.reserve(OutputKind::Tagged { tag: "subtítulos", extension: &extension });
            let args    = embed_args(EmbedArgs { input: source, srt: &track, output: &output, extension: &extension, language: request.language.as_deref() })?;
            let saved   = run_ffmpeg(RunParams { job, ffmpeg: &ffmpeg, args, duration: info.duration, output: &output, folder: None }, SAVE_ERROR)?;
            Ok(saved.then(|| done(output, "video")).flatten())
        }
        SubtitleMode::Burn => {
            let ffmpeg  = media::ffmpeg(app)?;
            let info    = probe_media(&ffmpeg, source)?;
            let scratch = Scratch::new()?;
            let fonts   = std::env::var_os("WINDIR").map(PathBuf::from).unwrap_or_else(|| PathBuf::from(r"C:\Windows")).join("Fonts");
            fs::write(scratch.0.join(ASS_NAME), ass_document(AssParams { cues: &request.cues, width: info.width, height: info.height, background: request.background })).map_err(|_| BURN_ERROR.to_string())?;
            fs::write(scratch.0.join("fonts.conf"), fonts_conf(&fonts, &scratch.0.join("cache"))).map_err(|_| BURN_ERROR.to_string())?;
            let output  = job.reserve(OutputKind::Tagged { tag: "subtítulos", extension: burned_extension(&extension) });
            let args    = burn_args(BurnArgs { input: source, output: &output, video_bps: info.bitrate.unwrap_or(0), audio_codec: info.audio_codec.as_deref() });
            let saved   = run_ffmpeg(RunParams { job, ffmpeg: &ffmpeg, args, duration: info.duration, output: &output, folder: Some(&scratch.0) }, BURN_ERROR)?;
            Ok(saved.then(|| done(output, "video")).flatten())
        }
    }
}

// «Guardar», as a task: «Guardar en», progress and Cancelar, never over another file.
pub fn save(app: &AppHandle, request: SaveRequest) -> Result<ActionReport, String> {
    if request.cues.iter().all(|cue| cue.text.trim().is_empty()) {
        return Err(SAVE_ERROR.to_string());
    }
    run_single(SingleParams {
        app,
        action      : SUBTITLES_ACTION,
        path        : &request.path,
        destination : request.destination.clone(),
        task_id     : request.task_id.clone(),
        make        : &|job| save_with(app, &request, job),
    })
}

// For the tests: the same burning without a task (the phrases drawn into `output`).
#[cfg(test)]
pub fn burn_for_test(ffmpeg: &Path, source: &Path, cues: &[Cue], background: bool, output: &Path) -> bool {
    let info    = probe_media(ffmpeg, source).unwrap();
    let scratch = Scratch::new().unwrap();
    let fonts   = std::env::var_os("WINDIR").map(PathBuf::from).unwrap_or_default().join("Fonts");
    fs::write(scratch.0.join(ASS_NAME), ass_document(AssParams { cues, width: info.width, height: info.height, background })).unwrap();
    fs::write(scratch.0.join("fonts.conf"), fonts_conf(&fonts, &scratch.0.join("cache"))).unwrap();
    let folder = scratch.0.clone();
    let cancel = std::sync::atomic::AtomicBool::new(false);
    let args   = burn_args(BurnArgs { input: source, output, video_bps: info.bitrate.unwrap_or(0), audio_codec: info.audio_codec.as_deref() });
    matches!(
        encode_with(EncodeParams { ffmpeg, args, duration: info.duration, cancel: &cancel, on_progress: &|_| {} }, &move |command| {
            command.current_dir(&folder).env("FONTCONFIG_FILE", folder.join("fonts.conf")).env("FONTCONFIG_PATH", &folder);
        }),
        Ok(Encoded::Done)
    )
}
