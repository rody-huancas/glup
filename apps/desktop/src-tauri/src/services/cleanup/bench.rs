// Timings of Limpieza, run by hand (cargo test --lib cleanup::bench -- --ignored --nocapture):
// - the scan on this computer as it is (it only reads, nothing is deleted);
// - the cleaning of a temporary folder with thousands of test files made here, directly and to the
//   recycle bin. The test files sent to the recycle bin are taken out of it at the end.
use std::{
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
    sync::atomic::AtomicBool,
    time::{Instant, SystemTime},
};

use super::{
    browsers::{self, BrowsersParams},
    clean_files, downloads::{self, DownloadsParams},
    duplicates::{self, DuplicatesParams},
    folders, large_files::{self, LargeFilesParams},
    recycle_bin, remove_directly, to_trash_for_real, trash_one_for_real,
    temp::{self, TempParams},
    walk::{self, ParallelWalkParams},
    CategoryId, CleanFilesParams, KnownFile,
};
use crate::services::parallel::worker_count;

const DIRECT_FILES: usize = 5000;
const TRASH_FILES: usize  = 1000;
const FILE_SIZE: usize    = 4096;

fn seconds(start: Instant) -> f64 {
    start.elapsed().as_secs_f64()
}

fn bench_folder(name: &str, count: usize) -> (PathBuf, Vec<PathBuf>) {
    let folder = std::env::temp_dir().join(format!("glup-medicion-{name}-{}", std::process::id()));
    let _      = fs::remove_dir_all(&folder);
    fs::create_dir_all(&folder).unwrap();
    let data   = vec![7u8; FILE_SIZE];
    let paths  = (0..count).map(|index| {
        let path = folder.join(format!("prueba-{index:05}.tmp"));
        fs::write(&path, &data).unwrap();
        path
    }).collect();
    (folder, paths)
}

fn known_of(paths: &[PathBuf], category: CategoryId) -> HashMap<PathBuf, KnownFile> {
    paths.iter().map(|path| {
        let file = walk::current(path).unwrap();
        (path.clone(), KnownFile { category, size: file.size, modified: file.modified, created: file.created, group: None })
    }).collect()
}

// The test files of this run that went to the recycle bin, taken out of it.
fn purge_from_recycle_bin(folder: &Path) {
    let items: Vec<_> = trash::os_limited::list().unwrap_or_default().into_iter().filter(|item| item.original_parent.starts_with(folder)).collect();
    let count = items.len();
    let _     = trash::os_limited::purge_all(items);
    println!("  (saqué de la papelera los {count} archivos de prueba)");
}

#[test]
#[ignore]
fn scan_on_this_computer() {
    let cancel   = AtomicBool::new(false);
    let folders  = folders::user_folders();
    let now      = walk::millis(SystemTime::now());
    let roots    = walk::distinct_roots(folders.personal.clone());

    println!("Análisis en esta PC (solo lectura):");
    let start = Instant::now();
    let found = folders.temp.as_deref().map(|root| temp::scan(TempParams { root, now, cancel: &cancel })).unwrap_or_default();
    println!("  Temporales: {} archivos en {:.2} s", found.len(), seconds(start));

    let start = Instant::now();
    let found = folders.local_app_data.as_deref().map(|local| browsers::scan(BrowsersParams { local_app_data: local, roaming_app_data: folders.roaming_app_data.as_deref(), cancel: &cancel }).files.len()).unwrap_or(0);
    println!("  Navegadores: {found} archivos en {:.2} s", seconds(start));

    let start = Instant::now();
    let size  = recycle_bin::size().unwrap_or_default();
    let items = recycle_bin::items().len();
    println!("  Papelera: {} elementos ({items} listados) en {:.2} s", size.items, seconds(start));

    let start = Instant::now();
    let found = folders.downloads.as_deref().map(|folder| {
        let params = DownloadsParams { folder, now, cancel: &cancel };
        downloads::installers(DownloadsParams { ..params }).len() + downloads::archives(DownloadsParams { folder, now, cancel: &cancel }).len()
    }).unwrap_or(0);
    println!("  Descargas (instaladores y comprimidos): {found} archivos en {:.2} s", seconds(start));

    let start    = Instant::now();
    let personal = walk::files_in_parallel(ParallelWalkParams { roots: &roots, cancel: &cancel, personal: true });
    println!("  Recorrer tus carpetas: {} archivos en {:.2} s", personal.len(), seconds(start));

    let start  = Instant::now();
    let groups = duplicates::scan(DuplicatesParams { files: &personal, threads: worker_count(), cancel: &cancel });
    println!("  Duplicados: {} grupos en {:.2} s", groups.len(), seconds(start));

    let start = Instant::now();
    let large = large_files::scan(LargeFilesParams { files: &personal, now });
    println!("  Archivos grandes: {} en {:.2} s", large.len(), seconds(start));
}

#[test]
#[ignore]
fn cleaning_thousands_of_test_files() {
    let cancel = AtomicBool::new(false);

    println!("Limpieza de archivos de prueba ({} KB cada uno):", FILE_SIZE / 1024);

    // Temporales: deleted for good.
    let (folder, paths) = bench_folder("directo", DIRECT_FILES);
    let known           = known_of(&paths, CategoryId::Temp);
    let start           = Instant::now();
    let tally           = clean_files(CleanFilesParams { known: &known, paths: &paths, cancel: &cancel, remove: &remove_directly, to_trash: &to_trash_for_real, trash_one: &trash_one_for_real, on_progress: &|_, _| {} });
    let took            = seconds(start);
    println!("  Borrar directo {} archivos: {took:.2} s ({:.2} ms cada uno, {} borrados)", paths.len(), took * 1000.0 / paths.len() as f64, tally.removed);
    let _ = fs::remove_dir_all(&folder);

    // The person's files: to the recycle bin.
    let (folder, paths) = bench_folder("papelera", TRASH_FILES);
    let known           = known_of(&paths, CategoryId::Installers);
    let start           = Instant::now();
    let tally           = clean_files(CleanFilesParams { known: &known, paths: &paths, cancel: &cancel, remove: &remove_directly, to_trash: &to_trash_for_real, trash_one: &trash_one_for_real, on_progress: &|_, _| {} });
    let took            = seconds(start);
    println!("  A la papelera {} archivos: {took:.2} s ({:.2} ms cada uno, {} movidos)", paths.len(), took * 1000.0 / paths.len() as f64, tally.removed);
    purge_from_recycle_bin(&folder);
    let _ = fs::remove_dir_all(&folder);
}

// Why TRASH_BATCH is 200: bigger batches are only a little faster, and Cancelar is heard between them.
// (Several threads at once were not faster either: Windows writes the recycle bin one item at a time.)
#[test]
#[ignore]
fn where_the_trash_time_goes() {
    for batch in [50, 200, 1000] {
        let (folder, paths) = bench_folder(&format!("lote-{batch}"), 1000);
        let start           = Instant::now();
        for chunk in paths.chunks(batch) {
            let _ = trash::delete_all(chunk);
        }
        let took = seconds(start);
        let left = paths.iter().filter(|path| path.exists()).count();
        println!("  delete_all en lotes de {batch}: {took:.2} s para 1000 ({took:.2} ms cada uno, quedaron {left})");
        purge_from_recycle_bin(&folder);
        let _ = fs::remove_dir_all(&folder);
    }
}

