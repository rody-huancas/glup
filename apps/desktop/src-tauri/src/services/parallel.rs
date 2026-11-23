use std::{
    path::{Path, PathBuf},
    sync::atomic::{AtomicBool, AtomicUsize, Ordering},
    thread,
};

use rayon::{prelude::*, ThreadPoolBuilder};

pub struct ParallelParams<'a, F> {
    pub paths: &'a [PathBuf],
    pub threads: usize,
    pub cancel: &'a AtomicBool,
    pub work: F,
    // Called with the number of finished files, from the worker that just finished.
    pub on_finished: &'a (dyn Fn(usize) + Sync),
}

pub const MAX_WORKERS: usize = 8;

// Half the cores (1 to 8), so the PC stays responsive while Glup works.
pub fn worker_count() -> usize {
    thread::available_parallelism().map(|cores| cores.get() / 2).unwrap_or(1).clamp(1, MAX_WORKERS)
}

// Runs `work` on every path with at most `threads` at a time, keeping the input order in the result.
// Once cancelled, files not started yet come back as None; the ones in progress finish.
pub fn run_parallel<T, F>(params: ParallelParams<'_, F>) -> Vec<Option<T>>
where
    T: Send,
    F: Fn(&Path) -> T + Sync,
{
    let finished = AtomicUsize::new(0);

    let task = |path: &PathBuf| {
        if params.cancel.load(Ordering::SeqCst) {
            return None;
        }

        let result = (params.work)(path);
        let done   = finished.fetch_add(1, Ordering::SeqCst) + 1;

        (params.on_finished)(done);
        Some(result)
    };

    match ThreadPoolBuilder::new().num_threads(params.threads.max(1)).build() {
        Ok(pool) => pool.install(|| params.paths.par_iter().map(task).collect()),
        Err(_)   => params.paths.iter().map(task).collect(),
    }
}

#[cfg(test)]
mod tests {
    use std::{fs, time::Instant};

    use image::{DynamicImage, Rgb, RgbImage};

    use super::*;
    use crate::services::image::{compress::compress, SourceFormat};

    #[test]
    fn keeps_the_order_and_skips_after_cancel() {
        let paths: Vec<PathBuf> = (0..8).map(|index| PathBuf::from(format!("{index}"))).collect();
        let cancel              = AtomicBool::new(false);

        let results = run_parallel(ParallelParams {
            paths       : &paths,
            threads     : 1,
            cancel      : &cancel,
            work        : |path: &Path| {
                if path == Path::new("2") {
                    cancel.store(true, Ordering::SeqCst);
                }
                path.to_string_lossy().into_owned()
            },
            on_finished : &|_| {},
        });

        let done: Vec<_> = results.iter().flatten().cloned().collect();
        assert_eq!(done, vec!["0", "1", "2"]);
        assert!(results[3..].iter().all(Option::is_none));
    }

    #[test]
    fn times_reducing_twenty_photos() {
        let folder = std::env::temp_dir().join(format!("glup-parallel-bench-{}", std::process::id()));
        fs::create_dir_all(&folder).unwrap();

        let paths: Vec<PathBuf> = (0..20)
            .map(|index| {
                let path  = folder.join(format!("foto-{index:02}.jpg"));
                let image = RgbImage::from_fn(1600, 1200, |x, y| {
                    let noise = ((x * 7919 + y * 104_729 + index * 31) % 23) as u8;
                    Rgb([(x % 256) as u8 / 2 + noise, (y % 256) as u8 / 2 + noise, 90 + noise])
                });

                let mut buffer = Vec::new();
                DynamicImage::ImageRgb8(image)
                    .write_with_encoder(image::codecs::jpeg::JpegEncoder::new_with_quality(&mut buffer, 97))
                    .unwrap();
                fs::write(&path, buffer).unwrap();
                path
            })
            .collect();

        let cancel  = AtomicBool::new(false);
        let measure = |threads: usize| {
            let start   = Instant::now();
            let results = run_parallel(ParallelParams {
                paths       : &paths,
                threads,
                cancel      : &cancel,
                work        : |path: &Path| compress(path, SourceFormat::Jpeg).map(|result| result.bytes.len()),
                on_finished : &|_| {},
            });

            assert!(results.iter().all(|result| matches!(result, Some(Ok(_)))));
            start.elapsed().as_secs_f64()
        };

        let sequential = measure(1);
        let parallel   = measure(worker_count());

        println!(
            "\n[reducir peso] 20 fotos 1600x1200 · secuencial {sequential:.2} s · paralelo ({} hilos) {parallel:.2} s",
            worker_count(),
        );

        let _ = fs::remove_dir_all(&folder);
    }
}
