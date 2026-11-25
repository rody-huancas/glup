use std::{
    fs::{self, File},
    path::{Path, PathBuf},
    thread,
    time::Duration,
};

use super::{
    catchup::{catch_up, missed, CatchUp, MissedParams, Produced, ASK_ABOVE, PRODUCED_LIMIT},
    jobs_for, loose_files, now_ms,
    queue::{Job, JobQueue, BATCH, QUEUE_LIMIT},
    rules::{summary_line, takes, tool, tool_takes, FileGroup, Filter, Original, Rule, RuleAction},
    runner::{came_out_well, options_of, result_is_there, trash_done, TrashDoneParams},
    settle::{is_partial, Facts, Known, Settler, SETTLE_MS},
    ConsiderParams,
};
use crate::services::{destination::Destination, settings::SaveMode};

const MB: u64 = 1024 * 1024;

fn sandbox(name: &str) -> PathBuf {
    let folder = std::env::temp_dir().join(format!("glup-auto-{name}-{}", std::process::id()));
    let _      = fs::remove_dir_all(&folder);
    fs::create_dir_all(&folder).unwrap();
    folder
}

fn filter(group: FileGroup) -> Filter {
    Filter { group, extensions: Vec::new(), min_mb: None }
}

fn rule(id: &str, folder: &Path, tool: &str, group: FileGroup) -> Rule {
    Rule {
        id          : id.to_string(),
        name        : format!("Regla {id}"),
        folder      : folder.to_string_lossy().into_owned(),
        filter      : filter(group),
        action      : RuleAction { tool: tool.to_string(), options: serde_json::Value::Null },
        original    : Original::Keep,
        destination : Destination::default(),
        enabled     : true,
        processed   : 0,
        last_run    : None,
        seen_until  : 0,
        needs       : None,
        held        : Vec::new(),
    }
}

#[test]
fn a_rule_takes_the_right_files_by_type_and_size() {
    assert!(takes(&filter(FileGroup::Iphone), "IMG_0001.HEIC", 10));
    assert!(!takes(&filter(FileGroup::Iphone), "foto.jpg", 10));
    assert!(takes(&filter(FileGroup::Photos), "foto.JPG", 10));
    assert!(takes(&filter(FileGroup::Pdf), "contrato.pdf", 10));
    assert!(!takes(&filter(FileGroup::Pdf), "contrato.pdf.txt", 10));
    assert!(takes(&filter(FileGroup::Videos), "viaje.mov", 10));
    assert!(takes(&filter(FileGroup::Audios), "nota.m4a", 10));
    assert!(takes(&filter(FileGroup::Any), "LEEME", 10));

    // Extensions written by hand, with or without the dot and in any case.
    let custom = Filter { group: FileGroup::Custom, extensions: vec![".PSD".to_string(), "dwg".to_string()], min_mb: None };
    assert!(takes(&custom, "plano.dwg", 1) && takes(&custom, "logo.psd", 1));
    assert!(!takes(&custom, "logo.png", 1));

    // «más grandes que 100 MB».
    let big = Filter { min_mb: Some(100.0), ..filter(FileGroup::Videos) };
    assert!(!takes(&big, "corto.mp4", 99 * MB));
    assert!(takes(&big, "largo.mp4", 100 * MB));
    assert!(takes(&big, "largo.mp4", 2_000 * MB));

    // A rule for «cualquiera» with «Pasar a JPG» only works on the photos of an iPhone.
    let to_jpg = tool("iphone-to-jpg").unwrap();
    assert!(tool_takes(to_jpg, "IMG_1.heic") && !tool_takes(to_jpg, "contrato.pdf"));
    assert!(tool_takes(tool("folder-sort").unwrap(), "lo-que-sea.xyz"));
    assert!(tool_takes(tool("transcribe").unwrap(), "clase.mp3") && tool_takes(tool("transcribe").unwrap(), "clase.mp4"));
    assert!(tool("sign-pdf").is_none());
}

#[test]
fn a_file_is_taken_only_once_it_finished_arriving() {
    let folder = sandbox("settle");
    let path   = folder.join("video.mp4");
    let facts  = |path: &Path| fs::metadata(path).ok().map(|metadata| Facts { size: metadata.len(), modified: super::arrival(&metadata) });
    let free   = |_: &Path| false;
    let mut settler = Settler::default();

    // Downloads in progress and temporary copies are never waited for.
    assert!(is_partial("video.mp4.crdownload") && is_partial("video.mp4.part") && is_partial("x.tmp") && is_partial("~$informe.docx"));
    assert!(!is_partial("video.mp4"));

    fs::write(&path, vec![1u8; 1000]).unwrap();
    settler.observe(path.clone(), facts(&path), 0);
    assert!(settler.ready(SETTLE_MS - 1, &free).is_empty());

    // It grows: the wait starts again.
    fs::write(&path, vec![1u8; 5000]).unwrap();
    settler.observe(path.clone(), facts(&path), 2000);
    assert!(settler.ready(SETTLE_MS + 1, &free).is_empty());

    // Still the same: it waits while a program holds it, and then it is ready, once.
    settler.observe(path.clone(), facts(&path), 2500);
    assert!(settler.ready(2000 + SETTLE_MS, &|_: &Path| true).is_empty());
    assert_eq!(settler.ready(2000 + SETTLE_MS, &free), vec![path.clone()]);
    assert!(settler.is_empty());

    // Gone before it settled (a browser renames its download): nothing.
    settler.observe(path.clone(), facts(&path), 9000);
    fs::remove_file(&path).unwrap();
    settler.observe(path.clone(), facts(&path), 9500);
    assert!(settler.ready(20_000, &free).is_empty());

    let _ = fs::remove_dir_all(folder);
}

#[test]
fn glup_never_takes_its_own_results() {
    let folder   = sandbox("own");
    let photo    = folder.join("IMG_1.heic");
    let result   = folder.join("IMG_1.jpg");
    let mut list = vec![rule("jpg", &folder, "iphone-to-jpg", FileGroup::Iphone), rule("ordenar", &folder, "folder-sort", FileGroup::Any)];
    let mut produced = Produced::default();
    produced.add(&result);
    let never = |_: &str| false;

    let jobs = jobs_for(ConsiderParams { rules: &mut list, produced: &produced, asking: &never, path: &photo, size: 10, arrived: 50 });
    assert_eq!(jobs, vec![Job { rule: "jpg".to_string(), path: photo.clone() }, Job { rule: "ordenar".to_string(), path: photo.clone() }]);

    // The JPG Glup just made in the same folder: no rule takes it (not even «Ordenar»), whatever its case.
    let upper = PathBuf::from(result.to_string_lossy().to_uppercase());
    assert!(jobs_for(ConsiderParams { rules: &mut list, produced: &produced, asking: &never, path: &result, size: 10, arrived: 60 }).is_empty());
    assert!(jobs_for(ConsiderParams { rules: &mut list, produced: &produced, asking: &never, path: &upper, size: 10, arrived: 60 }).is_empty());

    // Another folder, or a rule paused: nothing either.
    let elsewhere = sandbox("own-elsewhere").join("IMG_2.heic");
    assert!(jobs_for(ConsiderParams { rules: &mut list, produced: &produced, asking: &never, path: &elsewhere, size: 10, arrived: 70 }).is_empty());
    list[1].enabled = false;
    assert_eq!(jobs_for(ConsiderParams { rules: &mut list, produced: &produced, asking: &never, path: &photo, size: 10, arrived: 80 }).len(), 1);

    // Waiting for a download, the rule keeps the file for later.
    list[0].needs = Some("photos".to_string());
    assert!(jobs_for(ConsiderParams { rules: &mut list, produced: &produced, asking: &never, path: &photo, size: 10, arrived: 90 }).is_empty());
    assert_eq!(list[0].held, vec![photo.to_string_lossy().into_owned()]);
    assert_eq!(list[0].seen_until, 90);

    // Only the newest results are remembered.
    let mut many = Produced::default();
    for index in 0..PRODUCED_LIMIT + 5 {
        many.add(&folder.join(format!("{index}.jpg")));
    }
    assert!(!many.contains(&folder.join("0.jpg")) && many.contains(&folder.join(format!("{}.jpg", PRODUCED_LIMIT + 4))));
    assert_eq!(Produced::from_list(&many.list()).list().len(), PRODUCED_LIMIT);

    let _ = fs::remove_dir_all(folder);
    let _ = fs::remove_dir_all(elsewhere.parent().unwrap());
}

#[test]
fn the_queue_does_a_few_at_a_time_and_has_a_limit() {
    let mut queue = JobQueue::default();
    let job = |rule: &str, index: usize| Job { rule: rule.to_string(), path: PathBuf::from(format!("C:/d/{rule}-{index}.heic")) };

    for index in 0..6 {
        assert!(queue.push(job("a", index)));
        assert!(queue.push(job("b", index)));
    }
    assert!(!queue.push(job("a", 0)));

    // The oldest rule first, a few of its files, in order; the others keep their place.
    let (rule, files) = queue.next_batch(BATCH).unwrap();
    assert_eq!((rule.as_str(), files.len()), ("a", BATCH));
    assert_eq!(files[0], PathBuf::from("C:/d/a-0.heic"));
    assert_eq!(queue.next_batch(BATCH).unwrap().0, "b");
    assert_eq!((queue.waiting_for("a"), queue.waiting_for("b")), (2, 2));
    queue.forget("a");
    assert_eq!(queue.next_batch(BATCH).unwrap(), ("b".to_string(), vec![PathBuf::from("C:/d/b-4.heic"), PathBuf::from("C:/d/b-5.heic")]));
    assert!(queue.next_batch(BATCH).is_none() && queue.is_empty());

    // Thousands at once: only the limit waits, the rest is counted (and caught up later).
    for index in 0..QUEUE_LIMIT + 100 {
        queue.push(job("c", index));
    }
    assert_eq!((queue.waiting_for("c"), queue.dropped), (QUEUE_LIMIT, 100));
}

#[test]
fn what_arrived_with_glup_closed_is_found_and_many_are_asked_first() {
    let folder = sandbox("closed");
    fs::write(folder.join("antes.heic"), b"a").unwrap();
    fs::write(folder.join("antes-otro.heic"), b"a").unwrap();
    thread::sleep(Duration::from_millis(30));
    let closed_at = now_ms();
    thread::sleep(Duration::from_millis(30));
    fs::write(folder.join("IMG_2.heic"), b"b").unwrap();
    fs::write(folder.join("IMG_1.heic"), b"b").unwrap();
    fs::write(folder.join("nota.txt"), b"c").unwrap();
    fs::write(folder.join("IMG_3.heic.crdownload"), b"d").unwrap();
    fs::create_dir(folder.join("Glup")).unwrap();
    fs::write(folder.join("Glup").join("IMG_9.heic"), b"e").unwrap();
    // Glup's own result, made in the same folder.
    fs::write(folder.join("IMG_0.heic"), b"f").unwrap();
    let mut produced = Produced::default();
    produced.add(&folder.join("IMG_0.heic"));

    let files = loose_files(&folder);
    let found = missed(MissedParams { files: &files, filter: &filter(FileGroup::Iphone), tool: tool("iphone-to-jpg").unwrap(), since: closed_at, produced: &produced });
    let names: Vec<String> = found.iter().map(|path| path.file_name().unwrap().to_string_lossy().into_owned()).collect();
    // Only the loose HEIC that arrived after, never a download in progress, a subfolder or its own result.
    assert_eq!(names.len(), 2);
    assert!(names.contains(&"IMG_1.heic".to_string()) && names.contains(&"IMG_2.heic".to_string()));

    assert_eq!(catch_up(0), CatchUp::Nothing);
    assert_eq!(catch_up(ASK_ABOVE), CatchUp::Run);
    assert_eq!(catch_up(ASK_ABOVE + 1), CatchUp::Ask);

    let _ = fs::remove_dir_all(folder);
}

#[test]
fn the_original_goes_to_the_bin_only_when_its_result_came_out_well() {
    let folder = sandbox("trash");
    let make   = |name: &str, bytes: &[u8]| {
        let path = folder.join(name);
        File::create(&path).unwrap();
        fs::write(&path, bytes).unwrap();
        path
    };
    let good       = make("bien.heic", b"foto");
    let good_jpg   = make("bien.jpg", b"jpg");
    let empty      = make("vacio.heic", b"foto");
    let empty_jpg  = make("vacio.jpg", b"");
    let lost       = make("perdido.heic", b"foto");
    let never_made = folder.join("perdido.jpg");

    // The action said: saved, failed, or nothing new («Ya pesaba poco»).
    assert!(came_out_well(Some("bien.jpg"), None, None));
    assert!(!came_out_well(Some("x.jpg"), Some("No pude"), None));
    assert!(!came_out_well(None, None, Some("Ya pesaba poco")));
    assert!(!came_out_well(None, None, None));

    // And the result must be on disk and not empty.
    assert!(result_is_there(std::slice::from_ref(&good_jpg)));
    assert!(!result_is_there(&[]) && !result_is_there(std::slice::from_ref(&empty_jpg)) && !result_is_there(std::slice::from_ref(&never_made)));

    let done      = vec![(good.clone(), vec![good_jpg]), (empty.clone(), vec![empty_jpg]), (lost.clone(), vec![never_made])];
    let mut asked = Vec::new();
    let went      = trash_done(TrashDoneParams { done: &done, trash: &mut |path| {
        asked.push(path.to_path_buf());
        true
    } });
    assert_eq!((went, asked), (1, vec![good]));
    assert!(empty.is_file() && lost.is_file());

    let _ = fs::remove_dir_all(folder);
}

#[test]
fn a_rule_sends_its_options_and_where_to_save_as_the_panel_does() {
    let folder = sandbox("options");
    let mut convert = rule("webp", &folder, "convert-image", FileGroup::Photos);
    convert.action.options = serde_json::json!({ "format": "webp" });
    convert.destination    = Destination { mode: SaveMode::Glup, folder: None };
    let options = options_of(&convert).unwrap();
    assert_eq!(options.destination, Some(Destination { mode: SaveMode::Glup, folder: None }));
    assert!(options.format.is_some());

    let _ = fs::remove_dir_all(folder);
}

#[test]
fn the_notice_tells_it_all_at_once() {
    let jpg = tool("iphone-to-jpg").unwrap();
    assert_eq!(summary_line(jpg, 12, 0, "Descargas"), "Pasé 12 fotos de iPhone a JPG en Descargas");
    assert_eq!(summary_line(jpg, 1, 0, "Descargas"), "Pasé 1 foto de iPhone a JPG en Descargas");
    assert_eq!(summary_line(tool("folder-sort").unwrap(), 1200, 2, "Descargas"), "Ordené 1.200 archivos en Descargas · 2 no se pudieron");
    assert_eq!(summary_line(tool("compress-video").unwrap(), 0, 1, "Videos"), "En Videos, 1 no se pudo");
}

#[cfg(windows)]
#[test]
fn windows_tells_when_a_file_arrives_and_the_watcher_stops() {
    use std::sync::mpsc;

    use super::watcher::{watch, Signal};

    let folder             = sandbox("watch");
    let (sender, receiver) = mpsc::channel();
    let watcher            = watch(folder.clone(), sender).unwrap();
    fs::create_dir(folder.join("sub")).unwrap();
    fs::write(folder.join("sub").join("adentro.txt"), b"no").unwrap();
    fs::write(folder.join("llego.pdf"), b"pdf").unwrap();

    let mut told = Vec::new();
    while let Ok(signal) = receiver.recv_timeout(Duration::from_secs(2)) {
        if let Signal::Changed(path) = signal {
            told.push(path);
        }
        if told.contains(&folder.join("llego.pdf")) {
            break;
        }
    }
    assert!(told.contains(&folder.join("llego.pdf")));
    // Only its loose files: what happens inside a subfolder is not told.
    assert!(!told.contains(&folder.join("sub").join("adentro.txt")));

    drop(watcher);
    let _ = fs::remove_dir_all(folder);
}

// The tools the screen offers ("auto": true in tools.json) are exactly the ones Rust can do alone.
#[test]
fn the_catalogue_and_rust_agree_on_what_can_be_automatic() {
    let catalogue: Vec<serde_json::Value> = serde_json::from_str(include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/../src/modules/tools/constants/tools.json"))).unwrap();
    let mut marked: Vec<&str> = catalogue.iter().filter(|tool| tool["auto"] == serde_json::Value::Bool(true)).filter_map(|tool| tool["id"].as_str()).collect();
    let mut known: Vec<&str>  = super::rules::AUTO_TOOLS.iter().map(|tool| tool.id).collect();
    marked.sort_unstable();
    known.sort_unstable();
    assert_eq!(marked, known);
}

#[test]
fn only_what_arrives_counts_not_the_person_editing_a_file() {
    let folder = sandbox("known");
    let old    = folder.join("contrato.pdf");
    fs::write(&old, b"pdf").unwrap();
    let mut known = Known::default();
    known.remember(&old);

    // Saved again by the person: not an arrival. A new name (downloaded, copied, renamed) is.
    assert!(!known.is_arrival(&old, true));
    assert!(known.is_arrival(&folder.join("factura.pdf"), true));
    assert!(known.is_arrival(&folder.join("CONTRATO-2.pdf"), true));
    // Gone and back (deleted and downloaded again): it arrives again.
    assert!(!known.is_arrival(&old, false));
    assert!(known.is_arrival(&old, true));

    known.remember(&old);
    known.forget_folder(&folder);
    assert!(known.is_arrival(&old, true));

    let _ = fs::remove_dir_all(folder);
}
