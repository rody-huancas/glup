use std::{
    fs,
    path::{Path, PathBuf},
    sync::{atomic::{AtomicBool, Ordering}, Mutex},
};

use super::{
    progress_line, thousands, trash_block,
    known::{find, known},
    tree::{FileFound, FolderFound, Kind, Read, Tree, KEEP, PROGRAM, PROJECT},
    view_of,
    walk::{kind_of, walk, Counters, WalkParams},
    Analysis,
};

fn sandbox(name: &str) -> PathBuf {
    let folder = std::env::temp_dir().join(format!("glup-space-{name}-{}", std::process::id()));
    let _      = fs::remove_dir_all(&folder);
    fs::create_dir_all(&folder).unwrap();
    folder
}

fn file(name: &str, size: u64, kind: Kind) -> FileFound {
    FileFound { name: name.to_string(), size, kind, known: None, keep: false }
}

fn read(own: u8, files: Vec<FileFound>, folders: &[&str]) -> Read {
    Read { own, files, folders: folders.iter().map(|name| FolderFound { name: name.to_string(), known: None, keep: false }).collect() }
}

#[test]
fn the_tree_adds_up_every_folder_and_keeps_the_biggest_files() {
    let mut tree = Tree::with_root("Rody");
    let folders  = tree.add_folder(0, read(0, vec![file("nota.txt", 100, Kind::Documents)], &["Videos", "Fotos"]));
    let (videos, photos) = (folders[0], folders[1]);
    tree.add_folder(videos, read(0, vec![file("viaje.mp4", 5000, Kind::Videos), file("boda.mov", 3000, Kind::Videos)], &[]));
    tree.add_folder(photos, read(0, vec![file("a.jpg", 400, Kind::Photos), file("b.jpg", 600, Kind::Photos)], &[]));

    let root = &tree.nodes[0];
    assert_eq!((root.size, root.files), (9100, 5));
    assert_eq!(root.kinds[Kind::Videos.index()], 8000);
    assert_eq!(tree.children(0), vec![videos, photos, 1]);
    assert_eq!(tree.main_kind(photos), Kind::Photos);
    assert_eq!(tree.top_files().iter().map(|id| tree.nodes[*id as usize].size).collect::<Vec<_>>(), vec![5000, 3000, 600, 400, 100]);

    // Sent to the bin: out of every total above it.
    tree.remove(videos);
    assert_eq!((tree.nodes[0].size, tree.nodes[0].files), (1100, 3));
    assert_eq!(tree.nodes[0].kinds[Kind::Videos.index()], 0);
    assert_eq!(tree.children(0), vec![photos, 1]);
    assert_eq!(tree.top_files().len(), 3);
}

#[test]
fn only_the_twenty_biggest_files_are_kept() {
    let mut tree = Tree::with_root("x");
    tree.add_folder(0, read(0, (0..50).map(|index| file(&format!("{index}.bin"), index * 10, Kind::Other)).collect(), &[]));
    let top = tree.top_files();
    assert_eq!(top.len(), 20);
    assert_eq!(tree.nodes[top[0] as usize].size, 490);
    assert_eq!(tree.nodes[top[19] as usize].size, 300);
}

#[test]
fn every_file_has_its_kind() {
    assert_eq!(kind_of("foto.HEIC"), Kind::Photos);
    assert_eq!(kind_of("clase.mkv"), Kind::Videos);
    assert_eq!(kind_of("tesis.docx"), Kind::Documents);
    assert_eq!(kind_of("setup.exe"), Kind::Programs);
    assert_eq!(kind_of("cancion.mp3"), Kind::Other);
    assert_eq!(kind_of("LEEME"), Kind::Other);
    // Inside AppData or the programs, whatever it is: «Sistema y apps».
    assert_eq!(super::walk::kind_in("foto.jpg", true), Kind::System);
    assert_eq!(super::walk::kind_in("foto.jpg", false), Kind::Photos);
    assert_eq!(Kind::System.index(), 4);
    assert_eq!(thousands(120000), "120.000");
    assert_eq!(thousands(999), "999");
    assert_eq!(progress_line(120000, 84 * 1024 * 1024 * 1024), "Revisé 120.000 archivos · 84 GB");
}

fn analyze(root: &Path) -> Analysis {
    let analysis = Analysis {
        root      : root.to_path_buf(),
        tree      : Mutex::new(Tree::with_root("raíz")),
        counters  : Counters::default(),
        done      : AtomicBool::new(false),
        cancelled : AtomicBool::new(false),
        started   : std::time::Instant::now(),
    };
    walk(WalkParams { root, tree: &analysis.tree, counters: &analysis.counters, threads: 3, cancel: &AtomicBool::new(false) });
    analysis.done.store(true, Ordering::SeqCst);
    analysis
}

#[cfg(windows)]
fn mark_cloud_only(path: &Path) {
    use std::os::windows::ffi::OsStrExt;

    use windows_sys::Win32::Storage::FileSystem::{SetFileAttributesW, FILE_ATTRIBUTE_OFFLINE};
    let wide: Vec<u16> = path.as_os_str().encode_wide().chain(Some(0)).collect();
    assert!(unsafe { SetFileAttributesW(wide.as_ptr(), FILE_ATTRIBUTE_OFFLINE) } != 0);
}

#[cfg(windows)]
#[test]
fn links_junctions_and_cloud_files_are_not_counted_twice_nor_followed() {
    let root = sandbox("links");
    fs::create_dir_all(root.join("Fotos/viaje")).unwrap();
    fs::create_dir_all(root.join("Otra")).unwrap();
    fs::write(root.join("Fotos/viaje/playa.jpg"), vec![7u8; 300_000]).unwrap();
    fs::write(root.join("Otra/datos.bin"), vec![1u8; 100_000]).unwrap();
    // The same photo with a second name: one file on disk.
    fs::hard_link(root.join("Fotos/viaje/playa.jpg"), root.join("Otra/playa-enlace.jpg")).unwrap();
    // A junction back to Fotos: never followed (it would count Fotos twice, or loop).
    let made = std::process::Command::new("cmd").args(["/C", "mklink", "/J"]).arg(root.join("Atajo")).arg(root.join("Fotos")).output().unwrap();
    assert!(made.status.success(), "{}", String::from_utf8_lossy(&made.stdout));
    // A file only in the cloud: told apart, never opened.
    fs::write(root.join("Otra/en-la-nube.mp4"), vec![2u8; 50_000]).unwrap();
    mark_cloud_only(&root.join("Otra/en-la-nube.mp4"));

    let analysis = analyze(&root);
    let view     = view_of(&analysis, 0).unwrap();
    assert_eq!(view.totals.files, 2, "{:?}", view.totals);
    assert_eq!((view.totals.hard_links, view.totals.links, view.totals.cloud_files), (1, 1, 1));
    assert_eq!(view.totals.cloud_bytes, 50_000);
    // On disk: at least what they hold, rounded to clusters (never the 300 KB twice).
    assert!(view.folder.size >= 400_000 && view.folder.size < 700_000, "{}", view.folder.size);
    // The photo counts once, under whichever of its two names was found first.
    let mut names: Vec<&str> = view.children.iter().map(|item| item.name.as_str()).collect();
    names.sort();
    assert_eq!(names, vec!["Fotos", "Otra"]);
    assert!(["playa.jpg", "playa-enlace.jpg"].contains(&view.biggest[0].name.as_str()));
    assert_eq!(view.biggest.len(), 2);
    // The temporary folder of the tests is inside AppData: what is there is «Sistema y apps».
    assert_eq!(view.kinds.iter().map(|total| total.kind).collect::<Vec<_>>(), vec![Kind::System]);

    let _ = fs::remove_dir(root.join("Atajo"));
    let _ = fs::remove_dir_all(&root);
}

#[test]
fn each_folder_has_the_colour_of_what_weighs_most_in_it() {
    let mut tree = Tree::with_root("x");
    let folders  = tree.add_folder(0, read(0, Vec::new(), &["Mezcla", "Solo videos"]));
    tree.add_folder(folders[0], read(0, vec![file("a.mp4", 600, Kind::Videos), file("b.jpg", 300, Kind::Photos), file("c.pdf", 100, Kind::Documents)], &[]));
    tree.add_folder(folders[1], read(0, vec![file("d.mkv", 900, Kind::Videos)], &[]));

    // Videos weigh most in both, by 60 % and by 100 % (a stronger colour).
    assert_eq!((tree.main_kind(folders[0]), tree.main_kind(folders[1])), (Kind::Videos, Kind::Videos));
    assert!((tree.share(folders[0]) - 0.6).abs() < 1e-9);
    assert_eq!(tree.share(folders[1]), 1.0);
    assert_eq!(tree.main_kind(0), Kind::Videos);
    assert!((tree.share(0) - 1500.0 / 1900.0).abs() < 1e-9);
    // An empty folder: "otros", no colour.
    let empty = tree.add_folder(0, read(0, Vec::new(), &["Vacía"]))[0];
    assert_eq!((tree.main_kind(empty), tree.share(empty)), (Kind::Other, 0.0));
}

#[test]
fn known_files_and_folders_are_explained() {
    let list = known();
    let note = |name: &str, path: &str, dir: bool| find(list, name, path, dir).map(|index| (list[index].keep, list[index].note.as_str()));

    let disk = note("ext4.vhdx", r"C:\Users\Rody\AppData\Local\Docker\wsl\data\ext4.vhdx", false).unwrap();
    assert!(disk.0 && disk.1.starts_with("Disco virtual de Docker o de Linux"));
    assert!(note("pagefile.sys", r"C:\pagefile.sys", false).unwrap().0);
    assert!(note("hiberfil.sys", r"C:\hiberfil.sys", false).unwrap().1.contains("hibernación"));
    assert!(note("userdata-qemu.img", r"C:\Users\Rody\.android\avd\Pixel.avd\userdata-qemu.img", false).is_some());
    assert!(note("Pixel_7.avd", r"C:\Users\Rody\.android\avd\Pixel_7.avd", true).unwrap().0);
    assert!(note("steamapps", r"D:\Steam\steamapps", true).unwrap().0);
    assert!(note("Epic Games", r"C:\Program Files\Epic Games", true).is_some());
    assert!(note("Backup", r"C:\Users\Rody\AppData\Roaming\Apple Computer\MobileSync\Backup", true).unwrap().1.contains("iPhone"));
    // A browser cache can be emptied (with Limpieza): told, not kept.
    let cache = note("Cache", r"C:\Users\Rody\AppData\Local\Google\Chrome\User Data\Default\Cache", true).unwrap();
    assert!(!cache.0 && cache.1.contains("Limpieza"));
    // The same names somewhere else are nothing special.
    assert!(note("Cache", r"C:\Users\Rody\Documentos\Cache", true).is_none());
    assert!(note("Backup", r"C:\Users\Rody\Documentos\Backup", true).is_none());
    assert!(note("pagefile.sys", r"C:\x", true).is_none());
    assert!(note("viaje.mp4", r"C:\viaje.mp4", false).is_none());
}

#[test]
fn a_folder_with_a_project_or_a_program_anywhere_inside_stays_out_of_the_bin() {
    use super::walk::folder_marks;
    let rules = crate::services::duplicates::walk::skip_rules();

    assert_eq!(folder_marks("app", &["package.json", "index.js"], &["src"], rules), PROJECT);
    assert_eq!(folder_marks("repo", &["README.md"], &[".git"], rules), PROJECT);
    assert_eq!(folder_marks("node_modules", &[], &[], rules), PROJECT);
    assert_eq!(folder_marks("Juego", &["juego.exe", "motor.dll"], &[], rules), PROGRAM);
    assert_eq!(folder_marks("Fotos", &["a.jpg", "setup.exe"], &[], rules), 0);

    // Documentos › Trabajo › Viejo › app (a project, three levels down) and Documentos › Fotos.
    let mut tree = Tree::with_root("Rody");
    let documents = tree.add_folder(0, read(0, Vec::new(), &["Documentos"]))[0];
    let level     = tree.add_folder(documents, read(0, Vec::new(), &["Trabajo", "Fotos"]));
    let (work, photos) = (level[0], level[1]);
    let old       = tree.add_folder(work, read(0, Vec::new(), &["Viejo"]))[0];
    let app       = tree.add_folder(old, read(0, Vec::new(), &["app"]))[0];
    let source    = tree.add_folder(app, read(PROJECT, vec![file("package.json", 1, Kind::Other)], &["src"]))[0];
    tree.add_folder(photos, read(0, vec![file("a.jpg", 10, Kind::Photos)], &[]));

    assert_eq!(tree.trash_block(documents), Some("Tiene proyectos adentro"));
    assert_eq!(tree.trash_block(old), Some("Tiene proyectos adentro"));
    assert_eq!(tree.trash_block(app), Some("Es parte de un proyecto: bórralo desde el proyecto"));
    assert_eq!(tree.trash_block(source), Some("Es parte de un proyecto: bórralo desde el proyecto"));
    assert_eq!(tree.trash_block(photos), None);
    assert_eq!(tree.trash_block(0), Some("Es la carpeta que revisé"));

    // A known file that must stay (a virtual disk) keeps its folders out too; a program as well.
    let wsl = tree.add_folder(0, read(0, Vec::new(), &["wsl"]))[0];
    tree.add_folder(wsl, Read { own: 0, files: vec![FileFound { known: Some(0), keep: true, ..file("ext4.vhdx", 900, Kind::Programs) }], folders: Vec::new() });
    assert_eq!(tree.trash_block(wsl), Some("Tiene adentro archivos que no se deben borrar desde aquí"));
    let game = tree.add_folder(0, read(0, Vec::new(), &["Juego"]))[0];
    let data = tree.add_folder(game, read(PROGRAM, vec![file("juego.exe", 5, Kind::Programs)], &["datos"]))[0];
    assert_eq!(tree.trash_block(game), Some("Es de un programa: desinstálalo desde Configuración"));
    assert_eq!(tree.trash_block(data), Some("Es de un programa: desinstálalo desde Configuración"));
    let keep_folder = tree.add_folder(0, Read { own: 0, files: Vec::new(), folders: vec![FolderFound { name: "steamapps".to_string(), known: Some(6), keep: true }] })[0];
    assert_eq!(tree.nodes[keep_folder as usize].own & KEEP, KEEP);
    assert_eq!(tree.trash_block(keep_folder), Some("No se debe borrar desde aquí"));

    // Windows and the programs, by where they are.
    let root = PathBuf::from(r"C:\Users\Rody");
    assert_eq!(trash_block(&tree, photos, &root.join("Documentos\\Fotos"), &[PathBuf::from(r"C:\Users\Rody\Documentos")]), Some("Es de Windows o de un programa"));
    assert_eq!(trash_block(&tree, photos, &root.join("Documentos\\Fotos"), &[]), None);
}

// Only reads: how long the person's folder takes. `cargo test real_space -- --ignored --nocapture`
#[test]
#[ignore]
fn real_space_of_the_home_folder() {
    let home = PathBuf::from(std::env::var("USERPROFILE").unwrap());
    let analysis = analyze(&home);
    let view = view_of(&analysis, 0).unwrap();
    println!(
        "{}: {:.1} s · {} archivos · {} en disco · nube {} ({}) · sin permiso {} · enlaces {} · enlaces duros {}",
        home.display(),
        view.totals.seconds,
        thousands(view.totals.files),
        crate::services::history::format_size(view.folder.size),
        thousands(view.totals.cloud_files),
        crate::services::history::format_size(view.totals.cloud_bytes),
        view.totals.denied,
        view.totals.links,
        view.totals.hard_links,
    );
    for item in view.children.iter().take(8) {
        println!("  {} · {}", item.name, crate::services::history::format_size(item.size));
    }
}

#[test]
fn each_entry_of_a_listing_is_told_apart() {
    use super::walk::{entry_kind, EntryKind, ATTRIBUTE_DIRECTORY, ATTRIBUTE_REPARSE, TAG_MOUNT_POINT, TAG_SYMLINK};

    assert_eq!(entry_kind(ATTRIBUTE_DIRECTORY, 0), EntryKind::Folder);
    assert_eq!(entry_kind(ATTRIBUTE_DIRECTORY | ATTRIBUTE_REPARSE, TAG_MOUNT_POINT), EntryKind::Link);
    assert_eq!(entry_kind(ATTRIBUTE_REPARSE, TAG_SYMLINK), EntryKind::Link);
    // A OneDrive folder is a reparse point too, with its own tag: entered as any folder.
    assert_eq!(entry_kind(ATTRIBUTE_DIRECTORY | ATTRIBUTE_REPARSE, 0x9000_601A), EntryKind::Folder);
    // Offline (or recalled on open): only in the cloud.
    assert_eq!(entry_kind(0x1000, 0), EntryKind::Cloud);
    assert_eq!(entry_kind(0x40_0000 | ATTRIBUTE_REPARSE, 0x9000_001A), EntryKind::Cloud);
    assert_eq!(entry_kind(0x20, 0), EntryKind::File);
}
