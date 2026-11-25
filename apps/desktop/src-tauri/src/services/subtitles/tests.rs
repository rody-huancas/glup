// The phrases, the .srt and the command lines as text; the real ones on a test video with a tone made
// by FFmpeg itself in a temporary folder (only when FFmpeg is here: GLUP_FFMPEG or the one downloaded).
use std::{
    ffi::OsString,
    fs,
    path::{Path, PathBuf},
    process::Command,
};

use super::{
    burn::{ass_document, burned_extension, embed_args, font_size, language_tag, track_codec, AssParams, EmbedArgs, EMBED_UNSUPPORTED},
    burn_for_test,
    cues::{build, fit, tidy, to_srt, wrap, Cue, LINE_CHARS, MAX_CHARS, MAX_MS},
    detail,
    burn::SubtitleMode,
};
use crate::services::transcribe::compose::Segment;

fn text(args: &[OsString]) -> String {
    args.iter().map(|arg| arg.to_string_lossy().into_owned()).collect::<Vec<_>>().join(" ")
}

fn segment(start: u64, end: u64, text: &str) -> Segment {
    Segment { start, end, text: text.to_string() }
}

fn cue(start: u64, end: u64, text: &str) -> Cue {
    Cue { start, end, text: text.to_string() }
}

// "00:01:02,500" (or with a period) in milliseconds.
fn parse_time(text: &str) -> Option<u64> {
    let (clock, millis) = text.trim().split_once([',', '.'])?;
    let parts: Vec<u64> = clock.split(':').map(|part| part.trim().parse().ok()).collect::<Option<_>>()?;
    let [hours, minutes, seconds] = parts[..] else { return None };
    Some(((hours * 60 + minutes) * 60 + seconds) * 1000 + format!("{millis:0<3}")[..3].parse::<u64>().ok()?)
}

// A .srt read back, as a player would (Windows or Unix lines, with or without the BOM).
fn parse_srt(text: &str) -> Vec<Cue> {
    let clean = text.trim_start_matches('\u{feff}').replace("\r\n", "\n");
    clean
        .split("\n\n")
        .filter_map(|block| {
            let mut lines  = block.lines().skip_while(|line| line.trim().is_empty());
            let _number    = lines.next()?;
            let (from, to) = lines.next()?.split_once("-->")?;
            Some(Cue { start: parse_time(from)?, end: parse_time(to)?, text: lines.collect::<Vec<_>>().join("\n") })
        })
        .collect()
}

#[test]
fn a_short_segment_is_one_phrase_in_one_line() {
    assert_eq!(build(&[segment(1000, 3000, "  Hola, ¿cómo estás? ")]), vec![cue(1000, 3000, "Hola, ¿cómo estás?")]);
    // Whisper's noise is not a phrase.
    assert!(build(&[segment(0, 2000, "[Música]"), segment(2000, 3000, "♪")]).is_empty());
}

#[test]
fn a_long_segment_is_cut_by_length_and_by_time() {
    let long  = "Hoy vamos a ver cómo se prepara una salsa de tomate casera, paso a paso, con ingredientes que tienes en la cocina y sin apuro.";
    let cues  = build(&[segment(0, 9000, long)]);
    assert!(cues.len() >= 2);
    assert!(cues.iter().all(|cue| cue.text.chars().filter(|c| *c != '\n').count() <= MAX_CHARS && cue.text.lines().count() <= 2), "{cues:?}");
    assert!(cues.iter().all(|cue| cue.text.lines().all(|line| line.chars().count() <= LINE_CHARS)));
    assert!(cues.iter().all(|cue| cue.end - cue.start <= MAX_MS));
    // The words stay in order and the time is shared from start to end without gaps.
    assert_eq!(cues.iter().map(|cue| cue.text.replace('\n', " ")).collect::<Vec<_>>().join(" "), long);
    assert_eq!((cues[0].start, cues.last().unwrap().end), (0, 9000));
    assert!(cues.windows(2).all(|pair| pair[0].end == pair[1].start));

    // Few words said slowly: cut by time even though they are short.
    let slow = build(&[segment(0, 14_000, "Uno dos tres cuatro cinco seis siete ocho")]);
    assert!(slow.len() >= 3 && slow.iter().all(|cue| cue.end - cue.start <= MAX_MS), "{slow:?}");
}

#[test]
fn lines_are_even_and_what_was_typed_is_kept_when_it_fits() {
    assert_eq!(wrap("Una frase corta"), "Una frase corta");
    let two = wrap("Esta frase tiene bastantes palabras para ir en dos líneas");
    let lines: Vec<&str> = two.lines().collect();
    assert_eq!(lines.len(), 2);
    assert!(lines[0].chars().count().abs_diff(lines[1].chars().count()) <= 10, "{two}");

    assert_eq!(fit("Primera línea\nsegunda"), "Primera línea\nsegunda");
    assert_eq!(fit("Uno\ndos\ntres"), "Uno dos tres");
    // Empty phrases go, the order is by start and nothing lasts less than a tenth.
    assert_eq!(tidy(&[cue(5000, 5000, "B"), cue(0, 900, "  "), cue(1000, 2000, "A")]), vec![cue(1000, 2000, "A"), cue(5000, 5100, "B")]);
}

#[test]
fn the_srt_is_written_and_read_back() {
    let cues = vec![cue(0, 1500, "Hola"), cue(62_500, 65_040, "Dos líneas\nen la frase")];
    let srt  = to_srt(&cues);
    assert!(srt.starts_with("1\n00:00:00,000 --> 00:00:01,500\nHola\n\n2\n00:01:02,500 --> 00:01:05,040\nDos líneas\nen la frase\n\n"));
    assert_eq!(parse_srt(&srt), cues);
    assert_eq!(parse_srt(&format!("\u{feff}{}", srt.replace('\n', "\r\n"))), cues);
}

#[test]
fn a_track_inside_the_video_is_copied_with_its_language() {
    let args = |extension: &str| embed_args(EmbedArgs { input: Path::new("v.mp4"), srt: Path::new("s.srt"), output: Path::new("o"), extension, language: Some("es") });
    let mp4  = text(&args("mp4").unwrap());
    assert!(mp4.contains("-i v.mp4 -i s.srt -map 0:v -map 0:a? -map 1:0 -c copy -c:s mov_text -disposition:s:0 default -metadata:s:s:0 language=spa -movflags +faststart"));
    assert!(text(&args("mkv").unwrap()).contains("-c:s srt"));
    assert!(text(&args("webm").unwrap()).contains("-c:s webvtt"));
    assert_eq!(args("avi").unwrap_err(), EMBED_UNSUPPORTED);
    assert_eq!((track_codec("mov"), track_codec("wmv")), (Some("mov_text"), None));
    assert_eq!((language_tag(Some("en")), language_tag(None)), (Some("eng"), None));
    assert_eq!((burned_extension("mkv"), burned_extension("avi"), burned_extension("webm")), ("mkv", "mp4", "mp4"));
}

#[test]
fn drawn_subtitles_are_white_with_a_border_at_the_bottom() {
    assert_eq!(font_size(1920, 1080), 63);
    // A vertical video: smaller, so 42 characters still fit across.
    assert_eq!(font_size(1080, 1920), 45);
    assert_eq!(font_size(160, 90), 16);

    let plain = ass_document(AssParams { cues: &[cue(1000, 2500, "Hola {\\b1}\nmundo")], width: 1280, height: 720, background: false });
    assert!(plain.contains("PlayResX: 1280\nPlayResY: 720"));
    assert!(plain.contains("Style: Glup,Arial,42,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,0,2,"));
    // Its line break kept, the override tags of the text not.
    assert!(plain.contains("Dialogue: 0,0:00:01.00,0:00:02.50,Glup,,0,0,0,,Hola (/b1)\\Nmundo"));
    let boxed = ass_document(AssParams { cues: &[cue(0, 1000, "Hola")], width: 1280, height: 720, background: true });
    assert!(boxed.contains(",&H60000000,&H80000000,-1,0,0,0,100,100,0,0,3,8,0,2,"));
}

#[test]
fn the_history_says_how_they_were_saved() {
    assert_eq!(detail(SubtitleMode::File, 12), "Subtítulos en un archivo .srt · 12 frases");
    assert_eq!(detail(SubtitleMode::Burn, 3), "Subtítulos pegados en la imagen · 3 frases");
}

// ---------------------------------------------------------------- with the real FFmpeg

fn real_ffmpeg() -> Option<PathBuf> {
    std::env::var_os("GLUP_FFMPEG")
        .map(PathBuf::from)
        .or_else(|| std::env::var_os("APPDATA").map(|data| PathBuf::from(data).join(r"dev.glup.desktop\tools\ffmpeg.exe")))
        .filter(|path| path.is_file())
}

fn folder(name: &str) -> PathBuf {
    let folder = std::env::temp_dir().join(format!("glup-subtitles-tests-{}-{name}", std::process::id()));
    let _      = fs::remove_dir_all(&folder);
    fs::create_dir_all(&folder).unwrap();
    folder
}

fn make(ffmpeg: &Path, args: &[&str], output: &Path) {
    let done = Command::new(ffmpeg).args(["-hide_banner", "-loglevel", "error", "-y"]).args(args).arg(output).status().unwrap();
    assert!(done.success(), "{args:?}");
}

// A 4-second dark test video with a tone (`extension`: mp4 or mkv).
fn sample(ffmpeg: &Path, place: &Path, extension: &str) -> PathBuf {
    let video = place.join(format!("prueba.{extension}"));
    make(ffmpeg, &["-f", "lavfi", "-i", "color=c=0x202020:size=640x360:rate=25:duration=4", "-f", "lavfi", "-i", "sine=frequency=440:duration=4", "-c:v", "h264_mf", "-c:a", "aac"], &video);
    video
}

fn summary(ffmpeg: &Path, file: &Path) -> String {
    String::from_utf8_lossy(&Command::new(ffmpeg).args(["-hide_banner", "-i"]).arg(file).output().unwrap().stderr).into_owned()
}

// The bottom middle of the frame at `second`, in gray (where the phrase is drawn).
fn bottom_brightness(ffmpeg: &Path, video: &Path, second: &str) -> f64 {
    let raw = Command::new(ffmpeg)
        .args(["-hide_banner", "-loglevel", "error", "-ss", second, "-i"])
        .arg(video)
        .args(["-frames:v", "1", "-vf", "crop=320:60:160:280", "-f", "rawvideo", "-pix_fmt", "gray", "pipe:1"])
        .output()
        .unwrap()
        .stdout;
    raw.iter().map(|value| f64::from(*value)).sum::<f64>() / raw.len().max(1) as f64
}

#[test]
fn with_ffmpeg_puts_the_track_inside_mp4_and_mkv() {
    let Some(ffmpeg) = real_ffmpeg() else { return eprintln!("sin FFmpeg: se salta") };
    let place        = folder("embed");
    let srt          = place.join("subtitulos.srt");
    fs::write(&srt, to_srt(&[cue(500, 2000, "Hola"), cue(2000, 3500, "Chau")])).unwrap();

    for (extension, codec) in [("mp4", "mov_text"), ("mkv", "subrip")] {
        let video  = sample(&ffmpeg, &place, extension);
        let output = place.join(format!("prueba (subtítulos).{extension}"));
        let args   = embed_args(EmbedArgs { input: &video, srt: &srt, output: &output, extension, language: Some("es") }).unwrap();
        assert!(Command::new(&ffmpeg).args(&args).output().unwrap().status.success());
        let seen = summary(&ffmpeg, &output);
        assert!(seen.contains(&format!("Subtitle: {codec}")) && seen.contains("(spa)"), "{seen}");
        // The picture was copied, not made again.
        assert!(seen.contains("Video: h264"));
    }
    let _ = fs::remove_dir_all(&place);
}

#[test]
fn with_ffmpeg_draws_the_phrases_on_the_picture() {
    let Some(ffmpeg) = real_ffmpeg() else { return eprintln!("sin FFmpeg: se salta") };
    let place        = folder("burn");
    let video        = sample(&ffmpeg, &place, "mp4");
    let cues         = [cue(1000, 3000, "SUBTÍTULOS DE PRUEBA")];

    let plain = place.join("plain.mp4");
    let boxed = place.join("boxed.mp4");
    assert!(burn_for_test(&ffmpeg, &video, &cues, false, &plain));
    assert!(burn_for_test(&ffmpeg, &video, &cues, true, &boxed));

    // White letters show up at the bottom while the phrase is on, and not before.
    let before = bottom_brightness(&ffmpeg, &plain, "0.4");
    let during = bottom_brightness(&ffmpeg, &plain, "2.0");
    assert!(during > before + 8.0, "sin letras: {before} → {during}");
    assert!(bottom_brightness(&ffmpeg, &boxed, "2.0") > before + 4.0);
    assert!(summary(&ffmpeg, &plain).contains("Audio: aac"));
    let _ = fs::remove_dir_all(&place);
}
