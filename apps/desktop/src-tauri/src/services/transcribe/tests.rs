use std::{
    path::{Path, PathBuf},
    sync::{atomic::AtomicBool, Arc},
    time::Instant,
};

use super::{
    audio::{decode, decode_args, seconds_of, to_samples},
    compose::{compose, duration_label, history_detail, is_noise, paragraphs, srt, srt_time, FileSegments, Segment},
    engine::{Listened, ListenParams, TranscribeSession},
    model::{estimate_seconds, Level, FAST_MODEL, PRECISE_MODEL},
    subtitles_path, SubtitleNameParams,
};

fn segment(start: u64, end: u64, text: &str) -> Segment {
    Segment { start, end, text: text.to_string() }
}

// --- Text and subtitles ---

#[test]
fn joins_segments_and_breaks_paragraphs_at_long_pauses() {
    let segments = [segment(0, 2000, " Hola a todos."), segment(2100, 4000, " Empezamos la reunión."), segment(7000, 9000, " Primer tema: el presupuesto.")];
    assert_eq!(paragraphs(&segments), "Hola a todos. Empezamos la reunión.\n\nPrimer tema: el presupuesto.");
}

#[test]
fn a_long_paragraph_ends_at_a_sentence() {
    let long = "palabra ".repeat(70);
    let segments = [segment(0, 1000, &format!("{long}.")), segment(1100, 2000, "Siguiente idea"), segment(2100, 3000, "sin punto")];
    let text = paragraphs(&segments);
    assert!(text.contains(".\n\nSiguiente idea sin punto"), "{text}");
}

#[test]
fn music_and_noise_are_not_words() {
    assert!(is_noise(" [Música] "));
    assert!(is_noise("(risas)"));
    assert!(is_noise(" ♪ ♪ "));
    assert!(!is_noise("¿Me escuchan?"));
    assert_eq!(paragraphs(&[segment(0, 1000, "[Música]"), segment(1000, 2000, "♪")]), "");
}

#[test]
fn several_files_go_under_their_names() {
    let files = [
        FileSegments { name: "nota.m4a".to_string(), segments: vec![segment(0, 1000, "Comprar pan.")] },
        FileSegments { name: "silencio.mp3".to_string(), segments: vec![segment(0, 1000, "[Silencio]")] },
        FileSegments { name: "clase.mp3".to_string(), segments: vec![segment(0, 1000, "Hoy vemos fracciones.")] },
    ];
    assert_eq!(compose(&files), "nota.m4a\n========\n\nComprar pan.\n\n\nclase.mp3\n=========\n\nHoy vemos fracciones.");
    assert_eq!(compose(&files[..1]), "Comprar pan.");
}

#[test]
fn builds_srt_cues_with_their_times() {
    assert_eq!(srt_time(3_723_456), "01:02:03,456");

    let files = [
        FileSegments { name: "a.mp3".to_string(), segments: vec![segment(0, 1500, " Hola."), segment(1500, 2000, "[Música]")] },
        FileSegments { name: "b.mp3".to_string(), segments: vec![segment(500, 1800, "Chau.")] },
    ];
    // The second file continues where the first one ended (2 s).
    assert_eq!(srt(&files), "1\n00:00:00,000 --> 00:00:01,500\nHola.\n\n2\n00:00:02,500 --> 00:00:03,800\nChau.\n\n");
}

#[test]
fn says_how_long_the_audio_was() {
    assert_eq!(duration_label(45.0), "45 s");
    assert_eq!(duration_label(200.4), "3 min 20 s");
    assert_eq!(duration_label(180.0), "3 min");
    assert_eq!(duration_label(3900.0), "1 h 05 min");
    assert_eq!(history_detail(200.0), "Audio pasado a texto · 3 min 20 s");
}

// --- Estimate, models and names ---

#[test]
fn the_estimate_grows_with_the_audio_and_the_level() {
    let fast    = estimate_seconds(Level::Fast, 300.0);
    let precise = estimate_seconds(Level::Precise, 300.0);
    assert!(fast < precise);
    assert!(estimate_seconds(Level::Fast, 600.0) > fast);
    assert!(estimate_seconds(Level::Fast, 0.0) > 0);
}

#[test]
fn each_level_has_its_pinned_model() {
    assert_eq!(Level::Fast.model().name, FAST_MODEL.name);
    assert_eq!(Level::Precise.model().name, PRECISE_MODEL.name);
    assert!(FAST_MODEL.size < PRECISE_MODEL.size);
    for model in [FAST_MODEL, PRECISE_MODEL] {
        assert!(model.fallback.is_some_and(|origin| origin.contains("/resolve/5359861c739e955e79d9a303bcbc70fb988958b1/")));
        assert_eq!(model.sha256.len(), 64);
    }
}

#[test]
fn names_the_subtitles_after_the_file() {
    let name = |sources: &[&str], taken: &[&str]| {
        let sources: Vec<PathBuf> = sources.iter().map(PathBuf::from).collect();
        let taken: Vec<PathBuf>   = taken.iter().map(PathBuf::from).collect();
        subtitles_path(SubtitleNameParams { folder: Path::new("C:/audios"), sources: &sources, stamp: "2026-11-22-2300", exists: &|path| taken.iter().any(|item| item == path) }).unwrap()
    };
    assert_eq!(name(&["C:/audios/clase.mp3"], &[]), PathBuf::from("C:/audios/clase.srt"));
    assert_eq!(name(&["C:/audios/clase.mp3"], &["C:/audios/clase.srt"]), PathBuf::from("C:/audios/clase (2).srt"));
    assert_eq!(name(&["C:/audios/a.mp3", "C:/audios/b.mp3"], &[]), PathBuf::from("C:/audios/subtitulos-2026-11-22-2300.srt"));
}

#[test]
fn reads_ffmpeg_samples() {
    let bytes: Vec<u8> = [0.5_f32, -1.0].iter().flat_map(|value| value.to_le_bytes()).chain([1, 2]).collect();
    assert_eq!(to_samples(&bytes), vec![0.5, -1.0]);
    assert_eq!(seconds_of(&vec![0.0; 32_000]), 2.0);

    let args: Vec<String> = decode_args(Path::new("C:/a b/nota.m4a")).iter().map(|arg| arg.to_string_lossy().into_owned()).collect();
    assert!(args.windows(2).any(|pair| pair == ["-ar", "16000"]) && args.windows(2).any(|pair| pair == ["-ac", "1"]));
    assert_eq!(args.last().map(String::as_str), Some("pipe:1"));
}

// --- With the real models (GLUP_WHISPER_DIR=<carpeta con los .bin y los .wav> cargo test transcribe::tests::real -- --ignored --nocapture) ---

// A 16 kHz, 16-bit mono WAV (as the Windows voice writes it) to samples.
fn wav_samples(path: &Path) -> Vec<f32> {
    let bytes = std::fs::read(path).unwrap();
    bytes[44..].chunks_exact(2).map(|pair| i16::from_le_bytes([pair[0], pair[1]]) as f32 / 32768.0).collect()
}

fn listen_file(session: &Arc<TranscribeSession>, model: &Path, wav: &Path, language: Option<&str>) -> (String, f64) {
    let samples = wav_samples(wav);
    let start   = Instant::now();
    let result  = session
        .listen(ListenParams { model, samples: &samples, language, cancel: Arc::new(AtomicBool::new(false)), on_progress: Box::new(|_| {}) })
        .unwrap();
    let Listened::Segments(segments) = result else { panic!("cancelled") };
    (paragraphs(&segments), start.elapsed().as_secs_f64())
}

#[test]
#[ignore]
fn real_whisper_understands_spanish() {
    let folder  = PathBuf::from(std::env::var("GLUP_WHISPER_DIR").unwrap());
    let session = Arc::new(TranscribeSession::default());
    let (text, _) = listen_file(&session, &folder.join("ggml-small-q5_1.bin"), &folder.join("hola.wav"), None);

    println!("{text}");
    let lower = text.to_lowercase();
    assert!(lower.contains("prueba") && lower.contains("español"), "{text}");
}

// The measurements for choosing the two levels: every model on the 5-minute meeting, text written next
// to the audio to count the errors.
#[test]
#[ignore]
fn real_whisper_compares_models() {
    let folder  = PathBuf::from(std::env::var("GLUP_WHISPER_DIR").unwrap());
    let models  = std::env::var("GLUP_WHISPER_MODELS").unwrap_or_else(|_| "ggml-small-q5_1.bin,ggml-medium-q5_0.bin,ggml-large-v3-turbo-q5_0.bin".to_string());
    let audio   = std::env::var("GLUP_WHISPER_AUDIO").unwrap_or_else(|_| "reunion-5min.wav".to_string());
    let session = Arc::new(TranscribeSession::default());

    for model in models.split(',') {
        let load            = Instant::now();
        let _               = listen_file(&session, &folder.join(model), &folder.join("hola.wav"), Some("es"));
        let loaded          = load.elapsed().as_secs_f64();
        let (text, seconds) = listen_file(&session, &folder.join(model), &folder.join(&audio), Some("es"));

        std::fs::write(folder.join(format!("{model}.txt")), &text).unwrap();
        println!("{model}: {seconds:.1} s para {audio} (carga + audio corto {loaded:.1} s)");
        session.release();
    }
}

#[test]
fn the_download_counts_only_what_is_missing() {
    use crate::services::{transcribe::{missing_bytes, Missing}, video::tool::FFMPEG_DOWNLOAD};

    let model = Level::Fast.model().size;
    assert_eq!(missing_bytes(false, false, Level::Fast), Missing { ffmpeg: FFMPEG_DOWNLOAD.size, model });
    assert_eq!(missing_bytes(true, false, Level::Fast), Missing { ffmpeg: 0, model });
    assert_eq!(missing_bytes(false, true, Level::Fast), Missing { ffmpeg: FFMPEG_DOWNLOAD.size, model: 0 });
}


// Where the time goes with a real voice note, stage by stage (and a second audio with the model
// already loaded). GLUP_WHISPER_DIR has the model, GLUP_FFMPEG the ffmpeg.exe and GLUP_WHISPER_NOTE
// the note (any format).
#[test]
#[ignore]
fn real_voice_note_stages() {
    let folder  = PathBuf::from(std::env::var("GLUP_WHISPER_DIR").unwrap());
    let ffmpeg  = PathBuf::from(std::env::var("GLUP_FFMPEG").unwrap());
    let note    = PathBuf::from(std::env::var("GLUP_WHISPER_NOTE").unwrap());
    let model   = folder.join(std::env::var("GLUP_WHISPER_MODELS").unwrap_or_else(|_| "ggml-small-q5_1.bin".to_string()));
    let session = Arc::new(TranscribeSession::default());
    let lap     = |start: Instant| start.elapsed().as_millis();

    let start   = Instant::now();
    let samples = decode(&ffmpeg, &note, &AtomicBool::new(false)).unwrap().unwrap();
    let decoded = lap(start);

    let start  = Instant::now();
    session.prepare(&model).unwrap();
    let loaded = lap(start);

    let start  = Instant::now();
    let result = session.listen(ListenParams { model: &model, samples: &samples, language: Some("es"), cancel: Arc::new(AtomicBool::new(false)), on_progress: Box::new(|_| {}) }).unwrap();
    let heard  = lap(start);
    let Listened::Segments(segments) = result else { panic!("cancelled") };

    let start    = Instant::now();
    let files    = vec![FileSegments { name: "nota".to_string(), segments }];
    let text     = compose(&files);
    let _        = srt(&files);
    let composed = lap(start);

    let start  = Instant::now();
    assert!(session.is_loaded(&model));
    session.prepare(&model).unwrap();
    let reused = lap(start);

    println!("audio {:.1} s · leer el sonido {decoded} ms · cargar el modelo {loaded} ms · escuchar {heard} ms · armar el texto {composed} ms · segundo audio, cargar {reused} ms", seconds_of(&samples));
    println!("{text}");
}


// Processor against graphics card, both levels, on the same note: GLUP_WHISPER_DIR (the models as Glup
// names them), GLUP_FFMPEG, GLUP_WHISPER_NOTE and GLUP_VOZ (target/debug/glup-voz.exe, built apart).
// cargo test transcribe::tests::real_card -- --ignored --nocapture --test-threads=1
#[test]
#[ignore]
fn real_card_against_processor() {
    let folder  = PathBuf::from(std::env::var("GLUP_WHISPER_DIR").unwrap());
    let ffmpeg  = PathBuf::from(std::env::var("GLUP_FFMPEG").unwrap());
    let note    = PathBuf::from(std::env::var("GLUP_WHISPER_NOTE").unwrap());
    let samples = decode(&ffmpeg, &note, &AtomicBool::new(false)).unwrap().unwrap();
    let scratch = std::env::temp_dir().join(format!("glup-voz-{}.f32", std::process::id()));
    let session = Arc::new(TranscribeSession::default());
    println!("tarjetas: {:?}", session.gpu_devices().unwrap());

    for name in ["whisper-small-q5_1.bin", "whisper-medium-q5_0.bin"] {
        let model = folder.join(name);
        let params = || ListenParams { model: &model, samples: &samples, language: Some("es"), cancel: Arc::new(AtomicBool::new(false)), on_progress: Box::new(|_| {}) };

        let start = Instant::now();
        session.prepare(&model).unwrap();
        let cpu_load = start.elapsed().as_secs_f64();
        let start = Instant::now();
        let Listened::Segments(cpu) = session.listen(params()).unwrap() else { panic!("cancelled") };
        let cpu_time = start.elapsed().as_secs_f64();
        session.release();

        let start = Instant::now();
        session.gpu_prepare(&model).unwrap();
        let gpu_load = start.elapsed().as_secs_f64();
        let mut times = Vec::new();
        let mut text  = String::new();
        for _ in 0..3 {
            let start = Instant::now();
            let Listened::Segments(gpu) = session.gpu_listen(&mut params(), &scratch).unwrap() else { panic!("cancelled") };
            times.push(format!("{:.1}", start.elapsed().as_secs_f64()));
            text = paragraphs(&gpu);
        }
        // The model stays on the card for the next audio, as on the processor.
        assert!(session.gpu_is_loaded(&model));

        println!("{name} · {:.1} s de audio · procesador: cargar {cpu_load:.1} s, escuchar {cpu_time:.1} s · tarjeta: cargar {gpu_load:.1} s, escuchar {} s", seconds_of(&samples), times.join(" / "));
        println!("  procesador: {}", paragraphs(&cpu));
        println!("  tarjeta:    {text}");
        session.release();
    }
}

// glup-voz dies halfway (GLUP_VOZ_CRASH_AT=50, as a broken driver): Glup is still here, the card says
// it failed, and the processor listens to the same audio. Same variables as above.
#[test]
#[ignore]
fn real_card_dies_halfway_and_the_processor_finishes() {
    std::env::set_var("GLUP_VOZ_CRASH_AT", "50");
    let folder  = PathBuf::from(std::env::var("GLUP_WHISPER_DIR").unwrap());
    let ffmpeg  = PathBuf::from(std::env::var("GLUP_FFMPEG").unwrap());
    let note    = PathBuf::from(std::env::var("GLUP_WHISPER_NOTE").unwrap());
    let samples = decode(&ffmpeg, &note, &AtomicBool::new(false)).unwrap().unwrap();
    let scratch = std::env::temp_dir().join(format!("glup-voz-crash-{}.f32", std::process::id()));
    let model   = folder.join("whisper-small-q5_1.bin");
    let session = Arc::new(TranscribeSession::default());
    let seen    = Arc::new(std::sync::Mutex::new(Vec::new()));
    let log     = seen.clone();
    let mut params = ListenParams { model: &model, samples: &samples, language: Some("es"), cancel: Arc::new(AtomicBool::new(false)), on_progress: Box::new(move |percent| log.lock().unwrap().push(percent)) };

    let failed = session.gpu_listen(&mut params, &scratch);
    std::env::remove_var("GLUP_VOZ_CRASH_AT");
    assert!(matches!(failed, Err(crate::services::transcribe::gpu::GpuFailure::Failed(_))), "{:?}", failed.err());
    assert!(!session.gpu_is_loaded(&model));
    assert!(!scratch.exists());
    println!("la tarjeta llegó a {:?} % antes de caerse", seen.lock().unwrap().last());

    let Listened::Segments(segments) = session.listen(params).unwrap() else { panic!("cancelled") };
    let text = paragraphs(&segments);
    println!("el procesador terminó: {text}");
    assert!(!text.trim().is_empty());
}
