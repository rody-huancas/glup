use std::{
    ffi::OsString,
    fs,
    path::{Path, PathBuf},
    process::Command,
    sync::{atomic::AtomicBool, Mutex},
    time::Instant,
};

use super::{
    encode::{encode, error_for, EncodeParams, Encoded, ENCODE_ERROR},
    plan::{
        estimate_bytes, ffmpeg_args, fit, plan, retry_plan, video_bitrate_for, ArgsParams, VideoGoal, VideoOptions, VideoPlan, EMAIL_BYTES, FULL_HD, HD,
        MIN_VIDEO_BPS, SD,
    },
    probe::{parse_clock, parse_probe, probe, VideoInfo},
    progress::{fraction, parse_line, ProgressLine},
    tool::{delete_in, media_foundation_in, range_header, status_in, unpack, FFMPEG_DATA_SIZE, FFMPEG_DATA_START, FFMPEG_DOWNLOAD, MEDIA_ERROR, UNPACK_ERROR},
};

const HORIZONTAL_PROBE: &str = "Input #0, mov,mp4,m4a,3gp,3g2,mj2, from 'paseo.mp4':
  Metadata:
    major_brand     : isom
  Duration: 00:01:00.00, start: 0.000000, bitrate: 16600 kb/s
  Stream #0:0[0x1](und): Video: h264 (High) (avc1 / 0x31637661), yuv420p(progressive), 1920x1080 [SAR 1:1 DAR 16:9], 16401 kb/s, 30 fps, 30 tbr, 15360 tbn (default)
  Stream #0:1[0x2](und): Audio: aac (LC) (mp4a / 0x6134706D), 48000 Hz, stereo, fltp, 192 kb/s (default)
At least one output file must be specified";

const VERTICAL_PROBE: &str = "Input #0, mov,mp4,m4a,3gp,3g2,mj2, from 'celular.mp4':
  Duration: 00:00:12.48, start: 0.000000, bitrate: 17000 kb/s
  Stream #0:0[0x1](und): Video: hevc (Main) (hvc1 / 0x31637668), yuv420p(tv), 1920x1080, 16000 kb/s, 29.97 fps, 29.97 tbr, 90k tbn (default)
      Side data:
        Display Matrix: rotation of -90.00 degrees
  Stream #0:1[0x2](und): Audio: aac (LC) (mp4a / 0x6134706D), 44100 Hz, mono, fltp, 96 kb/s (default)";

const SILENT_PROBE: &str = "Input #0, matroska,webm, from 'pantalla.webm':
  Duration: 00:02:30.50, start: 0.000000, bitrate: 900 kb/s
  Stream #0:0: Video: vp9 (Profile 0), yuv420p(tv, bt709), 1280x720, SAR 1:1 DAR 16:9, 30 fps, 30 tbr, 1k tbn (default)";

fn info(width: u32, height: u32, duration: f64) -> VideoInfo {
    VideoInfo { duration, width, height, has_audio: true }
}

fn options(goal: VideoGoal) -> VideoOptions {
    VideoOptions { goal, target_bytes: None }
}

fn texts(args: &[OsString]) -> Vec<String> {
    args.iter().map(|arg| arg.to_string_lossy().into_owned()).collect()
}

fn value_after(args: &[String], flag: &str) -> Option<String> {
    args.iter().position(|arg| arg == flag).and_then(|index| args.get(index + 1)).cloned()
}

// --- Reading what a video is ---

#[test]
fn reads_length_size_and_sound() {
    assert_eq!(parse_clock("00:01:02.50"), Some(62.5));
    assert_eq!(parse_clock("1:00:00"), Some(3600.0));
    assert_eq!(parse_clock("N/A"), None);

    assert_eq!(parse_probe(HORIZONTAL_PROBE), Some(VideoInfo { duration: 60.0, width: 1920, height: 1080, has_audio: true }));
    assert_eq!(parse_probe(SILENT_PROBE), Some(VideoInfo { duration: 150.5, width: 1280, height: 720, has_audio: false }));
}

#[test]
fn a_phone_video_turned_upright_is_taller_than_wide() {
    let video = parse_probe(VERTICAL_PROBE).unwrap();
    assert_eq!((video.width, video.height), (1080, 1920));
    assert!((video.duration - 12.48).abs() < 1e-9);
}

#[test]
fn something_without_a_video_stream_is_not_a_video() {
    assert_eq!(parse_probe("Input #0, mp3, from 'cancion.mp3':\n  Duration: 00:03:00.00\n  Stream #0:0: Audio: mp3, 44100 Hz"), None);
    assert_eq!(parse_probe("hola.txt: Invalid data found when processing input"), None);
}

// --- Picture size ---

#[test]
fn fits_the_picture_keeping_its_proportion() {
    assert_eq!(fit(1920, 1080, HD), (1280, 720));
    assert_eq!(fit(1080, 1920, HD), (720, 1280));
    assert_eq!(fit(3840, 2160, FULL_HD), (1920, 1080));
    assert_eq!(fit(1920, 1080, SD), (854, 480));
    // Odd sizes are rounded to even numbers, as H.264 needs.
    assert_eq!(fit(1921, 1081, HD), (1280, 720));
}

#[test]
fn never_makes_a_small_video_bigger() {
    assert_eq!(fit(640, 360, HD), (640, 360));
    assert_eq!(fit(360, 640, FULL_HD), (360, 640));
    assert_eq!(fit(853, 479, SD), (854, 480));
}

// --- Bitrates ---

#[test]
fn the_bitrate_comes_from_the_size_and_the_length() {
    // 25 MB in a minute, with 96 kb/s of sound: about 3,2 Mb/s of picture.
    assert_eq!(video_bitrate_for(EMAIL_BYTES, 60.0, 96_000), Some(3_189_538));
    // Twice as long, about half.
    assert_eq!(video_bitrate_for(EMAIL_BYTES, 120.0, 96_000), Some(1_546_769));
    assert_eq!(video_bitrate_for(10_000_000, 60.0, 96_000), Some(1_157_333));
    // Half an hour does not fit in 25 MB.
    assert_eq!(video_bitrate_for(EMAIL_BYTES, 1800.0, 64_000), None);
}

#[test]
fn whatsapp_is_720p_at_most_with_good_quality() {
    let plan = plan(&info(1920, 1080, 60.0), options(VideoGoal::Whatsapp));
    assert_eq!((plan.width, plan.height), (1280, 720));
    assert_eq!((plan.video_bps, plan.audio_bps), (1_800_000, 128_000));
    assert!(plan.budget.is_none() && !plan.too_long);
}

#[test]
fn the_lightest_is_480p() {
    let plan = plan(&info(1080, 1920, 60.0), options(VideoGoal::Lightest));
    assert_eq!((plan.width, plan.height), (480, 854));
    assert_eq!((plan.video_bps, plan.audio_bps), (600_000, 64_000));
}

#[test]
fn email_stays_under_25_mb_and_picks_the_picture_by_the_bitrate() {
    let short = plan(&info(1920, 1080, 60.0), options(VideoGoal::Email));
    assert_eq!((short.width, short.height), (1920, 1080));
    assert!(short.estimate < EMAIL_BYTES);

    let longer = plan(&info(1920, 1080, 150.0), options(VideoGoal::Email));
    assert_eq!((longer.width, longer.height), (1280, 720));
    assert!(longer.estimate < EMAIL_BYTES && !longer.too_long);

    // Ten minutes: lighter sound leaves room, and the picture goes down to 480p.
    let long = plan(&info(1920, 1080, 600.0), options(VideoGoal::Email));
    assert_eq!((long.width, long.height, long.audio_bps), (854, 480, 64_000));
    assert!(long.estimate < EMAIL_BYTES && !long.too_long);
}

#[test]
fn warns_when_a_video_is_too_long_for_the_size() {
    let plan = plan(&info(1920, 1080, 1800.0), options(VideoGoal::Email));
    assert!(plan.too_long);
    assert_eq!(plan.video_bps, MIN_VIDEO_BPS);
    // What it will weigh anyway, to say it before starting.
    assert_eq!(plan.estimate, estimate_bytes(MIN_VIDEO_BPS, 64_000, 1800.0));
    assert!(plan.estimate > EMAIL_BYTES);
}

#[test]
fn a_typed_size_works_like_email() {
    let plan = plan(&info(1920, 1080, 60.0), VideoOptions { goal: VideoGoal::Target, target_bytes: Some(10_000_000) });
    assert_eq!(plan.budget, Some(10_000_000));
    assert_eq!((plan.width, plan.height), (1280, 720));
    assert!(plan.estimate < 10_000_000);
}

#[test]
fn a_video_without_sound_gives_the_room_to_the_picture() {
    let silent = VideoInfo { has_audio: false, ..info(1280, 720, 60.0) };
    let plan   = plan(&silent, options(VideoGoal::Email));
    assert_eq!(plan.audio_bps, 0);
    assert_eq!(plan.video_bps, video_bitrate_for(EMAIL_BYTES, 60.0, 0).unwrap());
}

#[test]
fn retries_once_with_a_lower_bitrate_when_it_went_over() {
    let first = plan(&info(1920, 1080, 60.0), options(VideoGoal::Email));
    let next  = retry_plan(&first, 30_000_000, 60.0).unwrap();
    assert!(next.video_bps < first.video_bps);
    assert_eq!((next.width, next.height), (first.width, first.height));

    assert!(retry_plan(&first, 20_000_000, 60.0).is_none());
    assert!(retry_plan(&plan(&info(1920, 1080, 60.0), options(VideoGoal::Whatsapp)), 30_000_000, 60.0).is_none());
}

// --- FFmpeg arguments ---

fn args_for(plan: &VideoPlan, has_audio: bool) -> Vec<String> {
    texts(&ffmpeg_args(ArgsParams { input: Path::new("C:/videos/paseo.mov"), output: Path::new("C:/videos/paseo-reducido.mp4"), plan, has_audio }))
}

#[test]
fn builds_the_arguments_for_each_option() {
    for goal in [VideoGoal::Whatsapp, VideoGoal::Email, VideoGoal::Lightest, VideoGoal::Target] {
        let plan = plan(&info(1920, 1080, 60.0), VideoOptions { goal, target_bytes: Some(8_000_000) });
        let args = args_for(&plan, true);

        assert_eq!(value_after(&args, "-i").as_deref(), Some("C:/videos/paseo.mov"));
        assert_eq!(args.last().map(String::as_str), Some("C:/videos/paseo-reducido.mp4"));
        assert_eq!(value_after(&args, "-c:v").as_deref(), Some("h264_mf"));
        assert_eq!(value_after(&args, "-c:a").as_deref(), Some("aac"));
        assert_eq!(value_after(&args, "-b:v"), Some(plan.video_bps.to_string()));
        assert_eq!(value_after(&args, "-b:a"), Some(plan.audio_bps.to_string()));
        assert_eq!(value_after(&args, "-vf"), Some(format!("scale={}:{},setsar=1", plan.width, plan.height)));
        assert_eq!(value_after(&args, "-movflags").as_deref(), Some("+faststart"));
        assert_eq!(value_after(&args, "-progress").as_deref(), Some("pipe:1"));
        // Never the GPL encoder.
        assert!(!args.iter().any(|arg| arg.contains("x264")));
    }
}

#[test]
fn a_silent_video_has_no_audio_track() {
    let silent = VideoInfo { has_audio: false, ..info(1280, 720, 60.0) };
    let args   = args_for(&plan(&silent, options(VideoGoal::Whatsapp)), false);
    assert!(args.contains(&"-an".to_string()));
    assert!(!args.contains(&"-c:a".to_string()));
}

// --- Progress and errors ---

#[test]
fn reads_the_progress_lines() {
    assert_eq!(parse_line("out_time_us=15000000"), ProgressLine::Time(15.0));
    assert_eq!(parse_line("out_time_ms=30500000"), ProgressLine::Time(30.5));
    assert_eq!(parse_line("out_time_us=N/A"), ProgressLine::Other);
    assert_eq!(parse_line("progress=continue"), ProgressLine::Other);
    assert_eq!(parse_line("progress=end"), ProgressLine::End);
    assert_eq!(parse_line("frame=120"), ProgressLine::Other);

    assert_eq!(fraction(15.0, 60.0), 0.25);
    assert_eq!(fraction(61.0, 60.0), 1.0);
    assert_eq!(fraction(5.0, 0.0), 0.0);
}

#[test]
fn says_what_to_install_when_media_foundation_is_missing() {
    assert_eq!(error_for("[h264_mf @ 0x1] could not load libraries\nError while opening encoder"), MEDIA_ERROR);
    assert_eq!(error_for("MFStartup failed"), MEDIA_ERROR);
    assert_eq!(error_for("Invalid data found when processing input"), ENCODE_ERROR);

    let system = Path::new("C:/Windows/System32");
    assert!(media_foundation_in(system, |_| true));
    assert!(!media_foundation_in(system, |path| !path.ends_with("mfplat.dll")));
}

// --- The download ---

#[test]
fn asks_only_for_the_bytes_of_ffmpeg_exe() {
    assert_eq!(range_header(0), format!("bytes={FFMPEG_DATA_START}-{}", FFMPEG_DATA_START + FFMPEG_DATA_SIZE - 1));
    assert_eq!(range_header(1000), format!("bytes={}-{}", FFMPEG_DATA_START + 1000, FFMPEG_DATA_START + FFMPEG_DATA_SIZE - 1));
}

fn temp_folder(name: &str) -> PathBuf {
    let folder = std::env::temp_dir().join(format!("glup-video-tests-{}-{name}", std::process::id()));
    let _      = fs::remove_dir_all(&folder);
    fs::create_dir_all(&folder).unwrap();
    folder
}

#[test]
fn a_bad_download_is_deleted_and_nothing_is_installed() {
    let folder = temp_folder("unpack");
    fs::write(folder.join(FFMPEG_DOWNLOAD.name), b"not deflate at all").unwrap();

    assert_eq!(unpack(&folder).unwrap_err(), UNPACK_ERROR);
    assert!(!folder.join(FFMPEG_DOWNLOAD.name).exists());
    assert!(!status_in(&folder).installed);
    assert_eq!(status_in(&folder).size, FFMPEG_DATA_SIZE);

    fs::write(folder.join("ffmpeg.exe"), b"exe").unwrap();
    assert!(status_in(&folder).installed);
    delete_in(&folder).unwrap();
    assert!(!folder.join("ffmpeg.exe").exists());
    let _ = fs::remove_dir_all(&folder);
}

// --- With the real FFmpeg (GLUP_FFMPEG=<ffmpeg.exe> cargo test video -- --ignored --nocapture) ---

fn real_ffmpeg() -> PathBuf {
    PathBuf::from(std::env::var("GLUP_FFMPEG").expect("GLUP_FFMPEG"))
}

// A test pattern made by FFmpeg itself, with sound; `rotation` stores it as phones do.
fn test_video(folder: &Path, name: &str, size: &str, seconds: u32, rotation: Option<i32>) -> PathBuf {
    let ffmpeg = real_ffmpeg();
    let flat   = folder.join(format!("{name}-flat.mp4"));
    let video  = format!("testsrc2=size={size}:rate=30:duration={seconds},noise=alls=12:allf=t");
    let sound  = format!("sine=frequency=440:duration={seconds}:sample_rate=48000");

    let made = Command::new(&ffmpeg)
        .args(["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", &video, "-f", "lavfi", "-i", &sound, "-ac", "2"])
        .args(["-c:v", "h264_mf", "-b:v", "16M", "-rate_control", "cbr", "-pix_fmt", "nv12", "-c:a", "aac", "-b:a", "192k"])
        .arg(&flat)
        .status()
        .unwrap();
    assert!(made.success());

    let Some(degrees) = rotation else { return flat };
    let turned = folder.join(format!("{name}.mp4"));
    let done   = Command::new(&ffmpeg)
        .args(["-hide_banner", "-loglevel", "error", "-y", "-display_rotation:v:0", &degrees.to_string(), "-i"])
        .arg(&flat)
        .args(["-c", "copy"])
        .arg(&turned)
        .status()
        .unwrap();
    assert!(done.success());
    turned
}

fn reduce_real(source: &Path, output: &Path, options: VideoOptions) -> (VideoPlan, u64, f64, Vec<f64>) {
    let ffmpeg = real_ffmpeg();
    let info   = probe(&ffmpeg, source).unwrap();
    let plan   = plan(&info, options);
    let seen   = Mutex::new(Vec::new());
    let cancel = AtomicBool::new(false);
    let start  = Instant::now();

    let args = ffmpeg_args(ArgsParams { input: source, output, plan: &plan, has_audio: info.has_audio });
    let end  = encode(EncodeParams { ffmpeg: &ffmpeg, args, duration: info.duration, cancel: &cancel, on_progress: &|done| seen.lock().unwrap().push(done) }).unwrap();
    assert_eq!(end, Encoded::Done);

    (plan, fs::metadata(output).unwrap().len(), start.elapsed().as_secs_f64(), seen.into_inner().unwrap())
}

#[test]
#[ignore]
fn real_ffmpeg_keeps_a_vertical_video_upright() {
    let folder = temp_folder("vertical");
    let source = test_video(&folder, "vertical", "1920x1080", 6, Some(90));
    let output = folder.join("vertical-reducido.mp4");

    let (plan, size, _, seen) = reduce_real(&source, &output, options(VideoGoal::Whatsapp));
    let result                = probe(&real_ffmpeg(), &output).unwrap();

    assert_eq!((plan.width, plan.height), (720, 1280));
    assert_eq!((result.width, result.height), (720, 1280));
    assert!(result.has_audio && (result.duration - 6.0).abs() < 0.3);
    assert!(size < fs::metadata(&source).unwrap().len());
    // Progress goes forward and ends at 100 %.
    assert!(seen.windows(2).all(|pair| pair[1] >= pair[0]) && seen.last() == Some(&1.0));
    let _ = fs::remove_dir_all(&folder);
}

#[test]
#[ignore]
fn real_ffmpeg_stops_on_cancel() {
    let folder = temp_folder("cancel");
    let source = test_video(&folder, "largo", "1920x1080", 20, None);
    let output = folder.join("largo-reducido.mp4");
    let ffmpeg = real_ffmpeg();
    let info   = probe(&ffmpeg, &source).unwrap();
    let plan   = plan(&info, options(VideoGoal::Whatsapp));
    let cancel = AtomicBool::new(false);

    let args = ffmpeg_args(ArgsParams { input: &source, output: &output, plan: &plan, has_audio: true });
    let end  = encode(EncodeParams {
        ffmpeg      : &ffmpeg,
        args,
        duration    : info.duration,
        cancel      : &cancel,
        on_progress : &|done| if done > 0.1 { cancel.store(true, std::sync::atomic::Ordering::SeqCst) },
    })
    .unwrap();

    assert_eq!(end, Encoded::Cancelled);
    let _ = fs::remove_dir_all(&folder);
}

// The numbers for the summary: a one-minute 1080p video with each option.
#[test]
#[ignore]
fn real_ffmpeg_times_and_sizes_for_one_minute_1080p() {
    let folder = temp_folder("minute");
    let source = test_video(&folder, "minuto", "1920x1080", 60, None);
    let before = fs::metadata(&source).unwrap().len();
    println!("original: {:.1} MB", before as f64 / 1e6);

    let goals = [
        ("WhatsApp", VideoOptions { goal: VideoGoal::Whatsapp, target_bytes: None }),
        ("Correo", VideoOptions { goal: VideoGoal::Email, target_bytes: None }),
        ("Lo más liviano", VideoOptions { goal: VideoGoal::Lightest, target_bytes: None }),
        ("Menos de 10 MB", VideoOptions { goal: VideoGoal::Target, target_bytes: Some(10_000_000) }),
    ];

    for (name, options) in goals {
        let output                = folder.join(format!("{name}.mp4"));
        let (plan, size, took, _) = reduce_real(&source, &output, options);
        println!("{name:16} {}x{} {:5.1} s {:6.2} MB (estimado {:.2} MB)", plan.width, plan.height, took, size as f64 / 1e6, plan.estimate as f64 / 1e6);
        if let Some(budget) = plan.budget {
            assert!(size <= budget, "{name}: {size} > {budget}");
        }
    }

    let _ = fs::remove_dir_all(&folder);
}

// The real download, as Glup does it: only ffmpeg.exe's bytes out of the zip, cut halfway and resumed,
// unpacked and checked (cargo test real_download -- --ignored). About 55 MB.
#[test]
#[ignore]
fn real_download_gets_only_ffmpeg_exe() {
    use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};

    use crate::services::background::download::{download, DownloadEnd, DownloadParams};
    use super::tool::{fetch_range, ffmpeg_in};

    let folder  = temp_folder("download");
    let cancel  = AtomicBool::new(false);
    let seen    = AtomicU64::new(0);
    let halfway = FFMPEG_DATA_SIZE / 2;

    // First try: stopped halfway, as a cut connection would leave it.
    let first = download(DownloadParams {
        folder      : &folder,
        model       : &FFMPEG_DOWNLOAD,
        cancel      : &cancel,
        on_progress : &|done| if done >= halfway { cancel.store(true, Ordering::SeqCst) },
        fetch       : &fetch_range,
    })
    .unwrap();
    assert_eq!(first, DownloadEnd::Cancelled);
    assert!(status_in(&folder).partial >= halfway);

    // Second try: goes on from there.
    cancel.store(false, Ordering::SeqCst);
    let second = download(DownloadParams {
        folder      : &folder,
        model       : &FFMPEG_DOWNLOAD,
        cancel      : &cancel,
        on_progress : &|done| seen.store(done, Ordering::SeqCst),
        fetch       : &fetch_range,
    })
    .unwrap();
    assert_eq!(second, DownloadEnd::Installed);
    assert_eq!(seen.load(Ordering::SeqCst), FFMPEG_DATA_SIZE);

    unpack(&folder).unwrap();
    assert!(status_in(&folder).installed);
    assert!(ffmpeg_in(&folder).is_file());
    let _ = fs::remove_dir_all(&folder);
}
