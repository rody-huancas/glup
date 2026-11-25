// Every file here is made by the tests in a temporary folder, and removed at the end.
use std::{
    cell::RefCell,
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
    sync::atomic::AtomicBool,
};

use image::{codecs::jpeg::JpegEncoder, imageops::FilterType, DynamicImage, Rgb, RgbImage};

use super::{
    grouped,
    keep::{keeper, looks_like_a_copy, preselect},
    remove_summary, scan_summary,
    same::{same_content, SameParams, EDGE_BYTES},
    similar::{alike_groups, difference_hash, distance, SIMILAR_DISTANCE},
    walk::{is_project_or_build, is_protected, skip_rules, walk, WalkParams, PROTECTED_ERROR},
    DuplicatesScan, FoundGroup, GroupFile, GroupKind,
};
use crate::services::{
    cleanup::{
        clean_files,
        tests::{temp_folder, write_bytes},
        walk::{self, FileEntry},
        CategoryId, CleanFilesParams, CleanTally, KnownFile,
    },
    tasks::TaskSummary,
};

fn entries(root: &Path) -> Vec<FileEntry> {
    let cancel = AtomicBool::new(false);
    walk(WalkParams { roots: &[root.to_path_buf()], protected: &[], threads: 2, cancel: &cancel, on_count: &|_| {} }).files
}

fn groups_of(root: &Path, min_size: u64) -> Vec<Vec<String>> {
    let cancel = AtomicBool::new(false);
    let files  = entries(root);
    let mut groups: Vec<Vec<String>> = same_content(SameParams { files: &files, min_size, threads: 2, cancel: &cancel, on_progress: &|_, _| {} })
        .into_iter()
        .map(|group| {
            let mut names: Vec<String> = group.iter().map(|file| file.path.file_name().unwrap().to_string_lossy().into_owned()).collect();
            names.sort();
            names
        })
        .collect();
    groups.sort();
    groups
}

#[test]
fn only_files_equal_byte_by_byte_go_together() {
    let root = temp_folder("repetidos-iguales");
    let size = (EDGE_BYTES * 3) as usize;
    let base: Vec<u8> = (0..size).map(|index| (index % 251) as u8).collect();

    write_bytes(&root.join("a/original.bin"), &base);
    write_bytes(&root.join("b/copia.bin"), &base);
    // Same size and same start, different at the end.
    let mut tail = base.clone();
    tail[size - 1] ^= 1;
    write_bytes(&root.join("c/otro-final.bin"), &tail);
    // Same start and same end, different in the middle: only the whole content tells.
    let mut middle = base.clone();
    middle[size / 2] ^= 1;
    write_bytes(&root.join("d/otro-medio.bin"), &middle);
    // Small copies: below 10 KB they are not looked at; empty files never.
    write_bytes(&root.join("e/chico.txt"), &[1u8; 5000]);
    write_bytes(&root.join("f/chico.txt"), &[1u8; 5000]);
    write_bytes(&root.join("g/vacio.txt"), &[]);
    write_bytes(&root.join("h/vacio.txt"), &[]);

    assert_eq!(groups_of(&root, 10 * 1024), vec![vec!["copia.bin".to_string(), "original.bin".to_string()]]);
    // With the size lowered, the small ones too (never the empty ones).
    assert_eq!(groups_of(&root, 1).len(), 2);
    let _ = fs::remove_dir_all(&root);
}

#[test]
fn hard_links_are_one_file_not_copies() {
    let root = temp_folder("repetidos-enlaces");
    let data = vec![9u8; 50_000];
    write_bytes(&root.join("a/foto.jpg"), &data);
    fs::create_dir_all(root.join("b")).unwrap();
    fs::hard_link(root.join("a/foto.jpg"), root.join("b/enlace.jpg")).unwrap();

    // The file and its link: nothing repeated.
    assert!(groups_of(&root, 1).is_empty());

    // A real copy beside them: two in the group (the file once, and its copy).
    write_bytes(&root.join("c/copia.jpg"), &data);
    let groups = groups_of(&root, 1);
    assert_eq!(groups.len(), 1);
    assert_eq!(groups[0].len(), 2);
    assert!(groups[0].contains(&"copia.jpg".to_string()));
    let _ = fs::remove_dir_all(&root);
}

fn entry(path: &str, modified: i64) -> FileEntry {
    FileEntry { path: PathBuf::from(path), size: 100, modified, created: modified }
}

#[test]
fn keeps_the_one_whose_name_is_not_a_copy() {
    for copy in ["foto (1).jpg", "foto(2).jpg", "foto - copia.jpg", "Copia de foto.jpg", "foto copy.jpg", "foto_copy.jpg", "foto - copia (2).jpg"] {
        assert!(looks_like_a_copy(Path::new(copy)), "{copy}");
    }
    for plain in ["foto.jpg", "informe (final).pdf", "copiadora.pdf", "2024 (borrador).docx"] {
        assert!(!looks_like_a_copy(Path::new(plain)), "{plain}");
    }

    // The copy is older, but its name says it is one.
    let files = [entry(r"C:\Fotos\foto (1).jpg", 1), entry(r"C:\Fotos\foto.jpg", 5)];
    assert_eq!(keeper(&files, None), 1);

    // On a tie, the one outside Descargas; then the oldest.
    let downloads = Path::new(r"C:\Users\Ana\Downloads");
    let files     = [entry(r"C:\Users\Ana\Downloads\foto.jpg", 1), entry(r"C:\Users\Ana\Pictures\foto.jpg", 9)];
    assert_eq!(keeper(&files, Some(downloads)), 1);
    let files = [entry(r"C:\Fotos\b\foto.jpg", 9), entry(r"C:\Fotos\a\foto.jpg", 3)];
    assert_eq!(keeper(&files, Some(downloads)), 1);
}

fn known_group(paths: &[PathBuf], group: u32) -> HashMap<PathBuf, KnownFile> {
    paths.iter().map(|path| {
        let file = walk::current(path).unwrap();
        (path.clone(), KnownFile { category: CategoryId::Duplicates, size: file.size, modified: file.modified, created: file.created, group: Some(group) })
    }).collect()
}

// Quitting with a "recycle bin" that just removes the file.
fn quit(known: &HashMap<PathBuf, KnownFile>, paths: &[PathBuf]) -> CleanTally {
    let cancel = AtomicBool::new(false);
    let sent   = RefCell::new(0);
    let tally  = clean_files(CleanFilesParams {
        known,
        paths,
        cancel      : &cancel,
        remove      : &|_| panic!("nada se borra directo"),
        to_trash    : &|batch: &[PathBuf]| {
            *sent.borrow_mut() += batch.len();
            batch.iter().for_each(|path| fs::remove_file(path).unwrap());
        },
        trash_one   : &|_| Ok(()),
        on_progress : &|_, _| {},
    });
    tally
}

#[test]
fn never_quits_every_copy_of_a_group() {
    let root  = temp_folder("repetidos-uno-queda");
    let paths: Vec<PathBuf> = ["a.pdf", "b.pdf", "c.pdf"].iter().map(|name| root.join(name)).collect();
    paths.iter().for_each(|path| write_bytes(path, &[3u8; 20_000]));
    let known = known_group(&paths, 1);

    // Every copy asked for: one stays anyway.
    let tally = quit(&known, &paths);
    assert_eq!(tally.removed, 2);
    assert_eq!(paths.iter().filter(|path| path.exists()).count(), 1);
    let _ = fs::remove_dir_all(&root);
}

#[test]
fn a_file_that_changed_since_the_search_is_left_alone() {
    let root  = temp_folder("repetidos-cambio");
    let paths: Vec<PathBuf> = ["a.mp4", "b.mp4", "c.mp4"].iter().map(|name| root.join(name)).collect();
    paths.iter().for_each(|path| write_bytes(path, &[5u8; 20_000]));
    let known = known_group(&paths, 1);

    // b was edited after the search: it is not the same file any more.
    write_bytes(&paths[1], &[5u8; 25_000]);
    let tally = quit(&known, &paths[1..]);
    assert_eq!((tally.removed, tally.changed), (1, 1));
    assert!(paths[1].exists());
    assert!(!paths[2].exists());
    let _ = fs::remove_dir_all(&root);
}

// A "photo" of its own: soft shapes and gradients, different for each seed.
fn picture(seed: u32) -> RgbImage {
    RgbImage::from_fn(480, 360, |x, y| {
        let (fx, fy) = (x as f32 / 480.0, y as f32 / 360.0);
        let wave     = ((fx * (3 + seed) as f32 + fy * 2.0).sin() * 0.5 + 0.5) * 255.0;
        let circle   = (((fx - 0.3 - seed as f32 * 0.1).powi(2) + (fy - 0.5).powi(2)).sqrt() < 0.2) as u8 as f32 * 120.0;
        Rgb([wave as u8, (255.0 - wave + circle).min(255.0) as u8, ((fx * 200.0) + circle) as u8])
    })
}

fn recompressed(image: &RgbImage, width: u32, quality: u8) -> DynamicImage {
    let small     = DynamicImage::ImageRgb8(image.clone()).resize(width, width, FilterType::Triangle);
    let mut bytes = Vec::new();
    small.write_with_encoder(JpegEncoder::new_with_quality(&mut bytes, quality)).unwrap();
    image::load_from_memory(&bytes).unwrap()
}

#[test]
fn the_same_photo_smaller_and_saved_again_looks_alike_another_does_not() {
    let photo   = picture(1);
    let hash    = difference_hash(&DynamicImage::ImageRgb8(photo.clone()));
    let smaller = difference_hash(&recompressed(&photo, 200, 55));
    let other   = difference_hash(&DynamicImage::ImageRgb8(picture(4)));

    assert!(distance(hash, smaller) <= SIMILAR_DISTANCE, "misma foto: {}", distance(hash, smaller));
    assert!(distance(hash, other) > SIMILAR_DISTANCE, "otra foto: {}", distance(hash, other));

    // Grouped: the two versions together, the other photo alone (so not in any group).
    assert_eq!(alike_groups(&[Some(hash), Some(other), Some(smaller), None]), vec![vec![0, 2]]);
}

#[test]
fn never_looks_inside_windows_programs_appdata_or_the_recycle_bin() {
    let protected = [PathBuf::from(r"C:\Windows"), PathBuf::from(r"C:\Program Files"), PathBuf::from(r"C:\Users\Ana\AppData")];
    assert!(is_protected(Path::new(r"C:\Windows\System32"), &protected));
    assert!(is_protected(Path::new(r"c:\program files\App"), &protected));
    assert!(is_protected(Path::new(r"C:\Users\Ana\AppData\Local\Temp"), &protected));
    assert!(is_protected(Path::new(r"D:\$Recycle.Bin\S-1-5"), &protected));
    assert!(!is_protected(Path::new(r"C:\Users\Ana\Documents"), &protected));
    assert!(!is_protected(Path::new(r"C:\Windowsito"), &protected));

    // A protected folder inside the chosen one is not entered.
    let root = temp_folder("repetidos-protegida");
    write_bytes(&root.join("fotos/a.jpg"), &[1u8; 20_000]);
    write_bytes(&root.join("programa/a.jpg"), &[1u8; 20_000]);
    let cancel = AtomicBool::new(false);
    let found  = walk(WalkParams { roots: &[root.clone()], protected: &[root.join("programa")], threads: 2, cancel: &cancel, on_count: &|_| {} });
    assert_eq!(found.files.len(), 1);
    assert_eq!(super::walk::folder_problem(&root.join("programa"), &[root.join("programa")]), Some(PROTECTED_ERROR));
    let _ = fs::remove_dir_all(&root);
}

#[cfg(windows)]
#[test]
fn files_only_in_the_cloud_are_skipped_and_counted() {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Storage::FileSystem::{SetFileAttributesW, FILE_ATTRIBUTE_NORMAL, FILE_ATTRIBUTE_OFFLINE};

    let root = temp_folder("repetidos-nube");
    write_bytes(&root.join("aqui.jpg"), &[1u8; 20_000]);
    write_bytes(&root.join("nube.jpg"), &[1u8; 20_000]);
    let wide = |path: &Path| -> Vec<u16> { path.as_os_str().encode_wide().chain(Some(0)).collect() };
    unsafe { SetFileAttributesW(wide(&root.join("nube.jpg")).as_ptr(), FILE_ATTRIBUTE_OFFLINE) };

    let cancel = AtomicBool::new(false);
    let found  = walk(WalkParams { roots: &[root.clone()], protected: &[], threads: 2, cancel: &cancel, on_count: &|_| {} });
    assert_eq!(found.files.len(), 1);
    assert_eq!(found.cloud_only, 1);

    unsafe { SetFileAttributesW(wide(&root.join("nube.jpg")).as_ptr(), FILE_ATTRIBUTE_NORMAL) };
    let _ = fs::remove_dir_all(&root);
}

#[test]
fn the_summary_says_how_many_and_how_much() {
    let group = |id: u32| FoundGroup { id, kind: GroupKind::Same, files: vec![GroupFile { path: String::new(), size: 1, modified: 0 }; 2], keep: Some(0), quit: vec![1], review: false, freeable: 1 };
    let scan  = DuplicatesScan {
        groups     : (1..=140).map(group).collect(),
        files      : 312,
        freeable   : (4.2 * 1024.0 * 1024.0 * 1024.0) as u64,
        scanned    : 45_000,
        cloud_only : 12,
        projects   : 14,
        cancelled  : false,
        summary    : TaskSummary { tone: String::new(), message: String::new(), note: None },
    };
    let summary = scan_summary(&scan);
    assert_eq!(summary.message, "Encontré 312 archivos repetidos en 140 grupos · 4,2 GB que puedes liberar");
    assert_eq!(summary.note.as_deref(), Some("Salté 14 carpetas de programas y proyectos · Salté 12 archivos que están solo en la nube"));

    let tally = CleanTally { to_trash: (4.2 * 1024.0 * 1024.0 * 1024.0) as u64, removed: 172, changed: 1, ..CleanTally::default() };
    assert_eq!(remove_summary(&tally).message, "Liberé 4,2 GB. Están en la papelera por si te arrepientes.");
    assert_eq!(remove_summary(&tally).note.as_deref(), Some("1 archivo cambió desde la búsqueda y lo dejé"));
    assert_eq!(grouped(45_000), "45.000");
    assert_eq!(grouped(999), "999");
    assert_eq!(grouped(1_230), "1.230");
}

// Run by hand (cargo test --lib duplicates::tests::time_on_this_computer -- --ignored --nocapture): the
// search on this computer's folders, as the tool does it. It only reads; nothing is quitted.
#[test]
#[ignore]
fn time_on_this_computer() {
    use std::time::Instant;

    use super::{similar::{is_photo, similar_photos, SimilarParams}, walk::protected_roots};
    use crate::services::{cleanup::folders, parallel::worker_count};

    let cancel  = AtomicBool::new(false);
    let roots   = folders::duplicate_folders();
    let threads = worker_count();
    println!("Carpetas: {roots:?} · {threads} hilos");

    let start  = Instant::now();
    let walked = walk(WalkParams { roots: &roots, protected: &protected_roots(), threads, cancel: &cancel, on_count: &|_| {} });
    println!("  Contar: {} archivos ({} solo en la nube, {} carpetas de programas y proyectos saltadas) en {:.2} s", walked.files.len(), walked.cloud_only, walked.projects, start.elapsed().as_secs_f64());

    let start    = Instant::now();
    let compared = std::sync::atomic::AtomicUsize::new(0);
    let groups   = same_content(SameParams { files: &walked.files, min_size: super::DEFAULT_MIN_SIZE, threads, cancel: &cancel, on_progress: &|_, total| { compared.fetch_max(total, std::sync::atomic::Ordering::Relaxed); } });
    let copies: usize = groups.iter().map(Vec::len).sum();
    let freeable: u64 = groups.iter().map(|group| group[0].size * (group.len() as u64 - 1)).sum();
    println!("  Comparar: {} posibles → {copies} repetidos en {} grupos ({}) en {:.2} s", compared.into_inner(), groups.len(), crate::services::history::format_size(freeable), start.elapsed().as_secs_f64());

    let downloads = folders::user_folders().downloads;
    let chosen: Vec<_> = groups.iter().map(|group| (group, preselect(group, downloads.as_deref()))).collect();
    let review        = chosen.iter().filter(|(_, pick)| pick.quit.is_empty()).count();
    let marked: usize = chosen.iter().map(|(_, pick)| pick.quit.len()).sum();
    let marked_bytes: u64 = chosen.iter().map(|(group, pick)| group[0].size * pick.quit.len() as u64).sum();
    println!("  Preselección: {marked} marcados ({}) · {review} grupos para revisar", crate::services::history::format_size(marked_bytes));

    let start  = Instant::now();
    let photos: Vec<PathBuf> = walked.files.iter().filter(|file| file.size >= super::DEFAULT_MIN_SIZE && is_photo(&file.path)).map(|file| file.path.clone()).collect();
    let alike  = similar_photos(SimilarParams { photos: &photos, threads, cancel: &cancel, on_progress: &|_, _| {} });
    println!("  Fotos parecidas: {} fotos → {} grupos en {:.2} s", photos.len(), alike.len(), start.elapsed().as_secs_f64());
}

#[test]
fn never_enters_projects_programs_builds_or_hidden_folders() {
    let root = temp_folder("repetidos-proyectos");
    let data = [4u8; 20_000];
    // Real copies of the person, in two folders of their own.
    write_bytes(&root.join("Fotos/viaje.jpg"), &data);
    write_bytes(&root.join("Respaldo/viaje.jpg"), &data);
    // The same bytes inside what must never be touched.
    write_bytes(&root.join("glup/apps/desktop/src-tauri/target/debug/viaje.jpg"), &data);
    write_bytes(&root.join("glup/package.json"), b"{}");
    write_bytes(&root.join("glup/src/viaje.jpg"), &data);
    write_bytes(&root.join("web/node_modules/lib/viaje.jpg"), &data);
    write_bytes(&root.join("Juego/juego.exe"), b"MZ");
    write_bytes(&root.join("Juego/motor.dll"), b"MZ");
    write_bytes(&root.join("Juego/viaje.jpg"), &data);
    write_bytes(&root.join("App/App.sln"), b"");
    write_bytes(&root.join("App/viaje.jpg"), &data);
    write_bytes(&root.join("Notas/.git/viaje.jpg"), &data);
    write_bytes(&root.join("Notas/.cache/viaje.jpg"), &data);
    write_bytes(&root.join("Python/__pycache__/viaje.jpg"), &data);

    let cancel = AtomicBool::new(false);
    let walked = walk(WalkParams { roots: &[root.clone()], protected: &[], threads: 2, cancel: &cancel, on_count: &|_| {} });
    let mut found: Vec<String> = walked.files.iter().map(|file| file.path.strip_prefix(&root).unwrap().to_string_lossy().replace('\\', "/")).collect();
    found.sort();
    assert_eq!(found, vec!["Fotos/viaje.jpg", "Respaldo/viaje.jpg"]);
    // glup (package.json), node_modules, Juego (.exe and DLLs), App (.sln), Notas (it has a .git) and
    // Python/__pycache__: projects, programs and builds. Hidden and dot folders are not counted.
    assert_eq!(walked.projects, 6);

    // The rules come from skip.json.
    let rules = skip_rules();
    assert!(rules.folders.iter().any(|name| name == "target"));
    assert!(is_project_or_build(&root.join("glup"), rules));
    assert!(!is_project_or_build(&root.join("Fotos"), rules));
    // An .exe alone (an installer in Descargas) does not make a program folder.
    write_bytes(&root.join("Descargas/instalador.exe"), b"MZ");
    assert!(!is_project_or_build(&root.join("Descargas"), rules));
    let _ = fs::remove_dir_all(&root);
}

#[test]
fn marks_only_the_clear_copies_and_leaves_the_rest_to_review() {
    let downloads = Path::new(r"C:\Users\Ana\Downloads");

    // In Descargas: that one goes.
    let files = [entry(r"C:\Users\Ana\Pictures\viaje.jpg", 5), entry(r"C:\Users\Ana\Downloads\viaje.jpg", 1)];
    assert_eq!(preselect(&files, Some(downloads)).quit, vec![1]);

    // With the name of a copy: that one goes.
    let files = [entry(r"C:\Users\Ana\Documents\informe.pdf", 1), entry(r"C:\Users\Ana\Documents\informe (1).pdf", 2)];
    assert_eq!(preselect(&files, Some(downloads)).quit, vec![1]);

    // Two folders of its own, plain names: nothing marked, the person decides.
    let files = [entry(r"C:\Users\Ana\Pictures\viaje.jpg", 1), entry(r"C:\Users\Ana\Documents\Respaldo\viaje.jpg", 2)];
    assert!(preselect(&files, Some(downloads)).quit.is_empty());

    // Two plain ones and a copy: only the copy.
    let files = [entry(r"C:\A\viaje.jpg", 1), entry(r"C:\B\viaje.jpg", 2), entry(r"C:\B\viaje - copia.jpg", 3)];
    assert_eq!(preselect(&files, Some(downloads)).quit, vec![2]);

    // Every one a copy (all in Descargas): all but one.
    let files = [entry(r"C:\Users\Ana\Downloads\a.zip", 1), entry(r"C:\Users\Ana\Downloads\a (1).zip", 2), entry(r"C:\Users\Ana\Downloads\a (2).zip", 3)];
    let chosen = preselect(&files, Some(downloads));
    assert_eq!(chosen.keep, 0);
    assert_eq!(chosen.quit, vec![1, 2]);
}
