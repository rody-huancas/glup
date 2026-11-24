// glup-voz: "Pasar audio a texto" on the graphics card (whisper.cpp with Vulkan), as a program apart
// from Glup. Glup starts it, talks to it one JSON line at a time (stdin → orders, stdout → answers)
// and, if it dies (a broken driver, no video memory left), goes on with the processor in its own
// process. The model stays loaded here while Glup keeps this program open.
//
// Orders:   {"kind":"devices"} · {"kind":"load","model":"…"} · {"kind":"listen","samples":"…","language":"es"}
//           · {"kind":"cancel"} (at any time).
// Answers:  {"kind":"devices","devices":[…]} · {"kind":"loaded"} · {"kind":"progress","percent":37}
//           · {"kind":"segments","segments":[…]} · {"kind":"cancelled"} · {"kind":"error","message":"…"}
//
// The samples come in a file of 32-bit floats (16 kHz, mono, little-endian) Glup wrote.
use std::{
    ffi::{c_void, CStr},
    io::{self, BufRead, Write},
    sync::{
        atomic::{AtomicBool, Ordering},
        mpsc, Arc, Mutex,
    },
    thread,
};

use serde::{Deserialize, Serialize};
use whisper_rs::{FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters};
use whisper_rs_sys as sys;

#[derive(Deserialize)]
#[serde(tag = "kind", rename_all = "lowercase")]
enum Order {
    Devices,
    Load { model: String },
    Listen { samples: String, language: Option<String> },
    Cancel,
}

#[derive(Serialize)]
struct Device {
    name       : String,
    integrated : bool,
    // Video memory, in bytes.
    memory     : u64,
}

#[derive(Serialize)]
struct Segment {
    start : u64,
    end   : u64,
    text  : String,
}

#[derive(Serialize)]
#[serde(tag = "kind", rename_all = "lowercase")]
enum Answer<'a> {
    Devices { devices: Vec<Device> },
    Loaded,
    Progress { percent: i32 },
    Segments { segments: Vec<Segment> },
    Cancelled,
    Error { message: &'a str },
}

// One line per answer, flushed at once (Glup reads them as they come).
fn send(out: &Mutex<io::Stdout>, answer: &Answer) {
    if let (Ok(mut out), Ok(line)) = (out.lock(), serde_json::to_string(answer)) {
        let _ = writeln!(out, "{line}");
        let _ = out.flush();
    }
}

// whisper.cpp and ggml write a lot to stderr; Glup only reads stdout. Quiet unless asked.
unsafe extern "C" fn quiet(_: sys::ggml_log_level, _: *const std::os::raw::c_char, _: *mut c_void) {}

fn text(pointer: *const std::os::raw::c_char) -> String {
    if pointer.is_null() { String::new() } else { unsafe { CStr::from_ptr(pointer) }.to_string_lossy().into_owned() }
}

// The graphics cards ggml can use with Vulkan (it prefers the dedicated ones when there are several).
fn devices() -> Vec<Device> {
    let count = unsafe { sys::ggml_backend_dev_count() };
    (0..count)
        .filter_map(|index| {
            let device = unsafe { sys::ggml_backend_dev_get(index) };
            let kind   = unsafe { sys::ggml_backend_dev_type(device) };
            let gpu    = kind == sys::ggml_backend_dev_type_GGML_BACKEND_DEVICE_TYPE_GPU;
            let igpu   = kind == sys::ggml_backend_dev_type_GGML_BACKEND_DEVICE_TYPE_IGPU;
            if !gpu && !igpu {
                return None;
            }
            let (mut free, mut total) = (0_usize, 0_usize);
            unsafe { sys::ggml_backend_dev_memory(device, &mut free, &mut total) };
            Some(Device { name: text(unsafe { sys::ggml_backend_dev_description(device) }), integrated: igpu, memory: total as u64 })
        })
        .collect()
}

unsafe extern "C" fn should_abort(data: *mut c_void) -> bool {
    !data.is_null() && unsafe { (*(data as *const AtomicBool)).load(Ordering::SeqCst) }
}

fn read_samples(path: &str) -> Option<Vec<f32>> {
    let bytes = std::fs::read(path).ok()?;
    Some(bytes.chunks_exact(4).map(|four| f32::from_le_bytes([four[0], four[1], four[2], four[3]])).collect())
}

struct ListenParams<'a> {
    context  : &'a WhisperContext,
    samples  : &'a [f32],
    language : Option<&'a str>,
    cancel   : &'a Arc<AtomicBool>,
    out      : &'a Arc<Mutex<io::Stdout>>,
}

fn listen(params: ListenParams) -> Result<Option<Vec<Segment>>, String> {
    let mut state = params.context.create_state().map_err(|error| error.to_string())?;
    let out       = params.out.clone();
    // Tests only: dies at that percent, as a broken driver would, to check Glup goes on.
    let crash_at  = std::env::var("GLUP_VOZ_CRASH_AT").ok().and_then(|value| value.parse::<i32>().ok());

    let mut full = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
    // The card does the work; a few threads feed it.
    full.set_n_threads(4);
    full.set_language(params.language.or(Some("auto")));
    full.set_translate(false);
    full.set_print_progress(false);
    full.set_print_realtime(false);
    full.set_print_special(false);
    full.set_print_timestamps(false);
    full.set_suppress_blank(true);
    full.set_progress_callback_safe(move |percent| {
        if crash_at.is_some_and(|at| percent >= at) {
            std::process::abort();
        }
        send(&out, &Answer::Progress { percent });
    });
    // As in Glup: whisper-rs 0.16's safe abort callback reads its box wrong, so the flag goes straight to C.
    unsafe {
        full.set_abort_callback(Some(should_abort));
        full.set_abort_callback_user_data(Arc::as_ptr(params.cancel) as *mut c_void);
    }

    let result = state.full(full, params.samples);
    if params.cancel.load(Ordering::SeqCst) {
        return Ok(None);
    }
    result.map_err(|error| error.to_string())?;

    Ok(Some(
        state
            .as_iter()
            .filter_map(|segment| {
                let text = segment.to_str_lossy().ok()?.into_owned();
                Some(Segment { start: segment.start_timestamp().max(0) as u64 * 10, end: segment.end_timestamp().max(0) as u64 * 10, text })
            })
            .collect(),
    ))
}

fn main() {
    if std::env::var_os("GLUP_VOZ_LOG").is_none() {
        unsafe {
            sys::ggml_log_set(Some(quiet), std::ptr::null_mut());
            sys::whisper_log_set(Some(quiet), std::ptr::null_mut());
        }
    }

    let out    = Arc::new(Mutex::new(io::stdout()));
    let cancel = Arc::new(AtomicBool::new(false));

    // Orders are read on their own thread so "cancel" arrives while it listens.
    let (orders, inbox) = mpsc::channel::<Order>();
    let flag            = cancel.clone();
    thread::spawn(move || {
        for line in io::stdin().lock().lines() {
            let Ok(line) = line else { break };
            match serde_json::from_str::<Order>(&line) {
                Ok(Order::Cancel) => flag.store(true, Ordering::SeqCst),
                Ok(order)         => {
                    if orders.send(order).is_err() {
                        break;
                    }
                }
                Err(_) => {}
            }
        }
    });

    let mut context: Option<WhisperContext> = None;

    // Until Glup closes stdin (it lets the model go, or it is closing).
    for order in inbox {
        match order {
            Order::Devices => send(&out, &Answer::Devices { devices: devices() }),
            Order::Load { model } => {
                let mut params = WhisperContextParameters::default();
                params.use_gpu(true).flash_attn(true).gpu_device(0);
                match WhisperContext::new_with_params(&model, params) {
                    Ok(loaded) => {
                        context = Some(loaded);
                        send(&out, &Answer::Loaded);
                    }
                    Err(error) => send(&out, &Answer::Error { message: &error.to_string() }),
                }
            }
            Order::Listen { samples, language } => {
                cancel.store(false, Ordering::SeqCst);
                let Some(loaded) = context.as_ref() else {
                    send(&out, &Answer::Error { message: "no model" });
                    continue;
                };
                let Some(samples) = read_samples(&samples) else {
                    send(&out, &Answer::Error { message: "no samples" });
                    continue;
                };
                match listen(ListenParams { context: loaded, samples: &samples, language: language.as_deref(), cancel: &cancel, out: &out }) {
                    Ok(Some(segments)) => send(&out, &Answer::Segments { segments }),
                    Ok(None)           => send(&out, &Answer::Cancelled),
                    Err(message)       => send(&out, &Answer::Error { message: &message }),
                }
            }
            Order::Cancel => {}
        }
    }
}
