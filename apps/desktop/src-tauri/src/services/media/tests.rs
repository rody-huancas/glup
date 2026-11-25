// The command lines are checked as text; the real ones run on tones and test videos made by FFmpeg
// itself in a temporary folder (only when FFmpeg is here: GLUP_FFMPEG, or the one Glup downloaded).
use std::{
    ffi::OsString,
    fs,
    path::{Path, PathBuf},
    process::Command,
    sync::atomic::AtomicBool,
};

use super::{
    clock, extract_audio, extract_detail,
    extract::{can_copy, extract_args, AudioFormat, AudioQuality, ExtractArgs, ExtractOptions},
    preview::{playable, plays_codecs, wave_bars},
    probe::{parse_media, probe_media},
    serve::byte_range,
    trim, trim_detail,
    trim::{exact_codecs, keyframe_args, keyframe_before, parse_keyframes, trim_args, TrimArgs, TrimMode, EXACT_UNSUPPORTED, RANGE_ERROR},
    ExtractParams, TrimParams, TrimRequest,
};

fn text(args: &[OsString]) -> String {
    args.iter().map(|arg| arg.to_string_lossy().into_owned()).collect::<Vec<_>>().join(" ")
}

const MP4_SUMMARY: &str = "Input #0, mov,mp4,m4a,3gp,3g2,mj2, from 'viaje.mp4':
  Duration: 00:01:02.50, start: 0.000000, bitrate: 2048 kb/s
  Stream #0:0[0x1](und): Video: h264 (High) (avc1 / 0x31637661), yuv420p(progressive), 1920x1080, 1800 kb/s, 30 fps
  Stream #0:1[0x2](und): Audio: aac (LC) (mp4a / 0x6134706D), 48000 Hz, stereo, fltp, 192 kb/s";

const MP3_SUMMARY: &str = "Input #0, mp3, from 'cancion.mp3':
  Duration: 00:03:20.00, start: 0.025057, bitrate: 192 kb/s
  Stream #0:0: Audio: mp3 (mp3float), 44100 Hz, stereo, fltp, 192 kb/s
  Stream #0:1: Video: mjpeg (Baseline), yuvj420p(pc, bt470bg/unknown/unknown), 500x500, 90k tbr, 90k tbn (attached pic)";

#[test]
fn reads_what_a_file_holds() {
    let video = parse_media(MP4_SUMMARY).unwrap();
    assert_eq!((video.duration, video.has_video, video.width, video.height), (62.5, true, 1920, 1080));
    assert_eq!(video.audio_codec.as_deref(), Some("aac"));
    assert_eq!(video.video_codec.as_deref(), Some("h264"));
    assert_eq!(video.bitrate, Some(2_048_000));

    // The cover of an MP3 is not a picture to trim.
    let song = parse_media(MP3_SUMMARY).unwrap();
    assert!(!song.has_video);
    assert_eq!(song.audio_codec.as_deref(), Some("mp3"));
}

#[test]
fn copies_the_sound_when_it_already_fits_and_makes_it_again_when_not() {
    assert!(can_copy(AudioFormat::M4a, "aac"));
    assert!(can_copy(AudioFormat::Mp3, "mp3"));
    assert!(can_copy(AudioFormat::Wav, "pcm_s16le"));
    assert!(!can_copy(AudioFormat::Mp3, "aac"));
    assert!(!can_copy(AudioFormat::Wav, "aac"));

    let input  = Path::new(r"C:\v\viaje.mp4");
    let args   = |format, quality, codec| extract_args(ExtractArgs { input, output: Path::new(r"C:\v\viaje.out"), options: ExtractOptions { format, quality }, codec });

    let (copy, copied) = args(AudioFormat::M4a, AudioQuality::Normal, Some("aac"));
    assert!(copied);
    assert!(text(&copy).contains("-map 0:a:0 -vn -sn -dn -c:a copy -movflags +faststart -progress pipe:1"));

    let (mp3, copied) = args(AudioFormat::Mp3, AudioQuality::Normal, Some("aac"));
    assert!(!copied);
    assert!(text(&mp3).contains("-c:a libmp3lame -q:a 2"));
    assert!(text(&args(AudioFormat::Mp3, AudioQuality::High, Some("aac")).0).contains("-c:a libmp3lame -q:a 0"));
    assert!(text(&args(AudioFormat::M4a, AudioQuality::High, Some("opus")).0).contains("-c:a aac -b:a 256k"));
    assert!(text(&args(AudioFormat::M4a, AudioQuality::Normal, None).0).contains("-c:a aac -b:a 160k"));
    assert!(text(&args(AudioFormat::Wav, AudioQuality::High, Some("aac")).0).contains("-c:a pcm_s16le"));
    assert!(text(&mp3).ends_with(r"C:\v\viaje.out"));
}

#[test]
fn a_fast_cut_copies_and_an_exact_one_makes_it_again() {
    let base = |input: &'static str, mode, has_video| TrimArgs { input: Path::new(input), output: Path::new("out"), start: 12.0, end: 65.5, mode, has_video, video_bps: 2_048_000 };

    let fast = text(&trim_args(base("viaje.mp4", TrimMode::Fast, true)).unwrap());
    assert!(fast.starts_with("-hide_banner -nostdin -y -ss 12.000 -i viaje.mp4 -t 53.500 -map 0:v:0? -map 0:a? -map_metadata 0 -c copy -avoid_negative_ts make_zero -movflags +faststart"));

    let exact = text(&trim_args(base("viaje.mp4", TrimMode::Exact, true)).unwrap());
    assert!(exact.contains("-c:v h264_mf -b:v 2048000 -c:a aac -b:a 192k"));
    assert!(text(&trim_args(base("peli.avi", TrimMode::Exact, true)).unwrap()).contains("-c:v h264_mf -b:v 2048000 -c:a libmp3lame"));
    assert!(text(&trim_args(base("clip.webm", TrimMode::Exact, true)).unwrap()).contains("-c:v libvpx-vp9"));
    assert!(text(&trim_args(base("viejo.wmv", TrimMode::Exact, true)).unwrap()).contains("-c:v wmv2 -b:v 2048000 -c:a wmav2"));
    assert!(text(&trim_args(base("cancion.mp3", TrimMode::Exact, false)).unwrap()).contains("-c:a libmp3lame -q:a 2"));
    assert!(text(&trim_args(base("nota.wav", TrimMode::Exact, false)).unwrap()).contains("-c:a pcm_s16le"));
    assert!(text(&trim_args(base("audio.flac", TrimMode::Exact, false)).unwrap()).contains("-c:a flac"));

    // A format with no encoder here: only the fast cut. An empty stretch: nothing.
    assert_eq!(trim_args(base("voz.amr", TrimMode::Exact, false)).unwrap_err(), EXACT_UNSUPPORTED);
    assert!(trim_args(base("voz.amr", TrimMode::Fast, false)).is_ok());
    assert_eq!(trim_args(TrimArgs { end: 12.01, ..base("viaje.mp4", TrimMode::Fast, true) }).unwrap_err(), RANGE_ERROR);

    // The bitrate of an exact cut stays within reason.
    assert!(exact_codecs("mp4", true, 100).unwrap().contains(&"1000000".to_string()));
    assert!(exact_codecs("mov", true, 90_000_000).unwrap().contains(&"15000000".to_string()));
}

#[test]
fn a_fast_cut_starts_on_the_key_frame_before() {
    let keyframes = [0.0, 2.0, 4.0, 6.0, 8.0];
    assert_eq!(keyframe_before(&keyframes, 5.3), 4.0);
    assert_eq!(keyframe_before(&keyframes, 6.0), 6.0);
    assert_eq!(keyframe_before(&keyframes, 0.4), 0.0);
    assert_eq!(keyframe_before(&[], 3.0), 0.0);

    let showinfo = "[Parsed_showinfo_0 @ 0000] n:   0 pts:      0 pts_time:0       duration: 512
[Parsed_showinfo_0 @ 0000] n:   1 pts: 122880 pts_time:4       duration: 512
[Parsed_showinfo_0 @ 0000] n:   2 pts:  61440 pts_time:2.5     duration: 512
something else pts_time:99";
    assert_eq!(parse_keyframes(showinfo), vec![0.0, 2.5, 4.0]);
    assert!(text(&keyframe_args(Path::new("v.mp4"))).contains("-skip_frame nokey -i v.mp4 -map 0:v:0 -vf showinfo"));
}

#[test]
fn the_shape_of_the_sound_is_the_loudest_of_each_piece() {
    let samples: Vec<i16> = (0..1000).map(|index| if index < 500 { (index % 10) as i16 * 100 } else { -3000 }).collect();
    let bars = wave_bars(&samples, 4);
    assert_eq!(bars.len(), 4);
    assert!((bars[0] - 0.3).abs() < 0.01 && (bars[1] - 0.3).abs() < 0.01);
    assert_eq!(bars[2], 1.0);
    assert_eq!(bars[3], 1.0);
    assert_eq!(wave_bars(&[], 3), vec![0.0, 0.0, 0.0]);
    assert!(wave_bars(&[0; 10], 3).iter().all(|bar| *bar == 0.0));
    // More bars than samples still gives that many bars.
    assert_eq!(wave_bars(&[5, -10], 6).len(), 6);
}

#[test]
fn serves_the_file_in_pieces_as_the_player_asks() {
    assert_eq!(byte_range(None, 1000), Some((0, 999)));
    assert_eq!(byte_range(Some("bytes=100-"), 1000), Some((100, 999)));
    assert_eq!(byte_range(Some("bytes=100-199"), 1000), Some((100, 199)));
    assert_eq!(byte_range(Some("bytes=-100"), 1000), Some((900, 999)));
    assert_eq!(byte_range(Some("bytes=900-5000"), 1000), Some((900, 999)));
    assert_eq!(byte_range(Some("bytes=2000-"), 1000), None);
    // Never more than 4 MB at once.
    assert_eq!(byte_range(Some("bytes=0-"), 100_000_000), Some((0, 4 * 1024 * 1024 - 1)));
    assert!(playable(Path::new("a.MP4")) && playable(Path::new("b.mp3")));
    assert!(!playable(Path::new("c.mkv")) && !playable(Path::new("d.avi")) && !playable(Path::new("e.wmv")));
    // An MP4 in HEVC (phones) or with AC-3 sound is not played as it is: it gets the light copy.
    assert!(plays_codecs(Some("h264"), Some("aac")) && plays_codecs(None, Some("mp3")));
    assert!(!plays_codecs(Some("hevc"), Some("aac")) && !plays_codecs(Some("h264"), Some("ac3")));
}

#[test]
fn the_history_says_what_was_done() {
    assert_eq!(clock(62.54), "1:02.5");
    assert_eq!(clock(3725.0), "1:02:05.0");
    let request = TrimRequest { path: String::new(), start: 12.0, end: 65.5, mode: TrimMode::Fast, destination: None, task_id: None };
    assert_eq!(trim_detail(&request, 10.0), "Recorte de 0:10.0 a 1:05.5 · rápido, sin perder calidad");
    assert_eq!(extract_detail(ExtractOptions::default(), false), "Audio sacado en MP3");
    assert_eq!(extract_detail(ExtractOptions { format: AudioFormat::M4a, quality: AudioQuality::Normal }, true), "Audio sacado en M4A · sin recodificar");
}

// ---------------------------------------------------------------- with the real FFmpeg

fn real_ffmpeg() -> Option<PathBuf> {
    std::env::var_os("GLUP_FFMPEG")
        .map(PathBuf::from)
        .or_else(|| std::env::var_os("APPDATA").map(|data| PathBuf::from(data).join(r"dev.glup.desktop\tools\ffmpeg.exe")))
        .filter(|path| path.is_file())
}

fn folder(name: &str) -> PathBuf {
    let folder = std::env::temp_dir().join(format!("glup-media-tests-{}-{name}", std::process::id()));
    let _      = fs::remove_dir_all(&folder);
    fs::create_dir_all(&folder).unwrap();
    folder
}

fn make(ffmpeg: &Path, args: &[&str], output: &Path) {
    let done = Command::new(ffmpeg).args(["-hide_banner", "-loglevel", "error", "-y"]).args(args).arg(output).status().unwrap();
    assert!(done.success(), "{args:?}");
}

// A 6-second test video with a 440 Hz tone (a key frame every 2 seconds) and the same tone alone.
fn samples(ffmpeg: &Path, folder: &Path) -> (PathBuf, PathBuf) {
    let video = folder.join("prueba.mp4");
    make(ffmpeg, &["-f", "lavfi", "-i", "testsrc2=size=320x240:rate=25:duration=6", "-f", "lavfi", "-i", "sine=frequency=440:duration=6", "-c:v", "h264_mf", "-g", "50", "-c:a", "aac"], &video);
    let tone = folder.join("tono.wav");
    make(ffmpeg, &["-f", "lavfi", "-i", "sine=frequency=440:duration=4"], &tone);
    (video, tone)
}

#[test]
fn with_ffmpeg_takes_the_sound_out_of_a_video() {
    let Some(ffmpeg) = real_ffmpeg() else { return eprintln!("sin FFmpeg: se salta") };
    let place         = folder("extract");
    let (video, _)    = samples(&ffmpeg, &place);
    let cancel        = AtomicBool::new(false);

    for (format, name, copied) in [(AudioFormat::M4a, "prueba.m4a", true), (AudioFormat::Mp3, "prueba.mp3", false), (AudioFormat::Wav, "prueba.wav", false)] {
        let output = place.join(name);
        let made   = extract_audio(ExtractParams { ffmpeg: &ffmpeg, source: &video, output: &output, options: ExtractOptions { format, quality: AudioQuality::Normal }, cancel: &cancel, on_progress: &|_| {} }).unwrap().unwrap();
        assert_eq!(made.copied, copied, "{name}");
        let info = probe_media(&ffmpeg, &output).unwrap();
        assert!(!info.has_video && info.has_audio && (info.duration - 6.0).abs() < 0.3, "{name}: {info:?}");
    }
    let _ = fs::remove_dir_all(&place);
}

#[test]
fn with_ffmpeg_cuts_fast_and_exact() {
    let Some(ffmpeg) = real_ffmpeg() else { return eprintln!("sin FFmpeg: se salta") };
    let place         = folder("trim");
    let (video, tone) = samples(&ffmpeg, &place);
    let cancel        = AtomicBool::new(false);
    let cut           = |path: &Path, start: f64, end: f64, mode: TrimMode, output: &Path| {
        let request = TrimRequest { path: path.to_string_lossy().into_owned(), start, end, mode, destination: None, task_id: None };
        trim(TrimParams { ffmpeg: &ffmpeg, request: &request, output, cancel: &cancel, on_progress: &|_| {} }).unwrap().unwrap()
    };

    // The key frames are where the test video put them (every 2 s), and a fast cut starts on one.
    let bytes = Command::new(&ffmpeg).args(keyframe_args(&video)).output().unwrap();
    let keys  = parse_keyframes(&String::from_utf8_lossy(&bytes.stderr));
    assert!(keys.iter().any(|time| (time - 2.0).abs() < 0.05) && keys.iter().any(|time| (time - 4.0).abs() < 0.05), "{keys:?}");

    let fast = cut(&video, 2.5, 5.0, TrimMode::Fast, &place.join("prueba (recorte).mp4"));
    assert!((fast.start - 2.0).abs() < 0.05);
    let exact = place.join("exacto.mp4");
    cut(&video, 2.5, 5.0, TrimMode::Exact, &exact);
    let length = probe_media(&ffmpeg, &exact).unwrap().duration;
    assert!((length - 2.5).abs() < 0.2, "exacto: {length}");

    let sound = place.join("tono (recorte).wav");
    cut(&tone, 1.0, 3.0, TrimMode::Exact, &sound);
    assert!((probe_media(&ffmpeg, &sound).unwrap().duration - 2.0).abs() < 0.1);
    let _ = fs::remove_dir_all(&place);
}

#[test]
fn with_ffmpeg_draws_the_strip_of_frames_and_the_shape_of_the_sound() {
    use super::preview::{samples_of, strip_args, wave_args, STRIP_HEIGHT};

    let Some(ffmpeg) = real_ffmpeg() else { return eprintln!("sin FFmpeg: se salta") };
    let place         = folder("strip");
    let (video, tone) = samples(&ffmpeg, &place);

    let strip = Command::new(&ffmpeg).args(strip_args(&video, 8, 6.0)).output().unwrap().stdout;
    let image = image::load_from_memory(&strip).unwrap();
    assert_eq!(image.height(), STRIP_HEIGHT);
    // Eight frames of 4:3 side by side.
    assert!((image.width() as i64 - (8 * STRIP_HEIGHT * 4 / 3) as i64).abs() <= 8, "{}", image.width());

    let sound = samples_of(&Command::new(&ffmpeg).args(wave_args(&tone)).output().unwrap().stdout);
    let bars  = wave_bars(&sound, 50);
    // A steady tone: every bar about as loud as the loudest.
    assert!(bars.iter().all(|bar| *bar > 0.8), "{bars:?}");
    let _ = fs::remove_dir_all(&place);
}
