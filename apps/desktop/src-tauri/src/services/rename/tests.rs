use std::{
    fs,
    path::{Path, PathBuf},
};

use super::{
    check::{name_problem, Problem},
    journal::{apply, spots, undo, unfinished, ApplyParams, RenameItem, RenameJournal, Spot},
    natural_key, plan,
    rules::{apply as rule, format_date, new_name, parse_exif_date, split_name, Case, Moment, NameParams, Rule, Side},
    Order, PlanParams, RenameRequest,
};

const DAY: Moment = Moment { year: 2026, month: 11, day: 25, hour: 14, minute: 30 };

fn name(file: &str, rules: &[Rule], index: usize) -> String {
    new_name(NameParams { file, rules, index, moment: DAY, lower_ext: false })
}

#[test]
fn every_rule_on_its_own() {
    let number = Rule::Number { text: "Viaje {n}".to_string(), digits: 3, start: 1, step: 1 };
    assert_eq!(name("IMG_4512.JPG", &[number.clone()], 0), "Viaje 001.JPG");
    assert_eq!(name("IMG_4513.JPG", &[number], 9), "Viaje 010.JPG");
    assert_eq!(rule(&Rule::Number { text: "Clase".to_string(), digits: 2, start: 10, step: 5 }, "x", 2, DAY), "Clase 20");

    assert_eq!(rule(&Rule::Replace { find: "img".to_string(), with: "Foto".to_string(), case_sensitive: false }, "IMG_1 img", 0, DAY), "Foto_1 Foto");
    assert_eq!(rule(&Rule::Replace { find: "img".to_string(), with: "Foto".to_string(), case_sensitive: true }, "IMG_1 img", 0, DAY), "IMG_1 Foto");
    assert_eq!(rule(&Rule::Replace { find: "Á".to_string(), with: "A".to_string(), case_sensitive: false }, "ánimo", 0, DAY), "Animo");

    assert_eq!(rule(&Rule::Add { text: "2026 ".to_string(), side: Side::Start }, "viaje", 0, DAY), "2026 viaje");
    assert_eq!(rule(&Rule::Add { text: " (final)".to_string(), side: Side::End }, "tesis", 0, DAY), "tesis (final)");

    assert_eq!(rule(&Rule::RemoveChars { chars: "_-".to_string() }, "mi_foto-1", 0, DAY), "mifoto1");
    assert_eq!(rule(&Rule::RemoveRange { from: 1, count: 4, from_end: false }, "IMG_4512", 0, DAY), "4512");
    assert_eq!(rule(&Rule::RemoveRange { from: 1, count: 2, from_end: true }, "foto12", 0, DAY), "foto");
    assert_eq!(rule(&Rule::RemoveRange { from: 20, count: 2, from_end: false }, "corto", 0, DAY), "corto");

    assert_eq!(rule(&Rule::Case { case: Case::Upper }, "Viaje a Cusco", 0, DAY), "VIAJE A CUSCO");
    assert_eq!(rule(&Rule::Case { case: Case::Lower }, "Viaje a Cusco", 0, DAY), "viaje a cusco");
    assert_eq!(rule(&Rule::Case { case: Case::Sentence }, "vIAJE A CUSCO", 0, DAY), "Viaje a cusco");

    assert_eq!(rule(&Rule::Date { format: "YYYY-MM-DD".to_string(), side: Side::Start, separator: " ".to_string() }, "playa", 0, DAY), "2026-11-25 playa");
    assert_eq!(format_date(DAY, "DD-MM-YYYY HH.mm"), "25-11-2026 14.30");
    assert_eq!(parse_exif_date("2024:02:29 08:05:00"), Some(Moment { year: 2024, month: 2, day: 29, hour: 8, minute: 5 }));
    assert_eq!(parse_exif_date("0000:00:00 00:00:00"), None);
}

#[test]
fn rules_combine_in_order_and_the_extension_is_never_touched() {
    let rules = [
        Rule::Replace { find: "IMG_".to_string(), with: String::new(), case_sensitive: true },
        Rule::Date { format: "YYYYMMDD".to_string(), side: Side::Start, separator: "_".to_string() },
        Rule::Case { case: Case::Upper },
    ];
    assert_eq!(name("IMG_4512.Jpg", &rules, 0), "20261125_4512.Jpg");
    assert_eq!(new_name(NameParams { file: "IMG_4512.Jpg", rules: &rules, index: 0, moment: DAY, lower_ext: true }), "20261125_4512.jpg");
    // Upper case does not reach the extension either.
    assert_eq!(name("carta.pdf", &[Rule::Case { case: Case::Upper }], 0), "CARTA.pdf");
    assert_eq!(split_name("foto.final.JPG"), ("foto.final", Some("JPG")));
    assert_eq!(split_name(".gitignore"), (".gitignore", None));
    assert_eq!(split_name("LEEME"), ("LEEME", None));
    assert!(natural_key("foto2") < natural_key("foto10"));
}

#[test]
fn problems_are_told_per_file() {
    let folder = Path::new(r"C:\Fotos");
    assert_eq!(name_problem("a:b.jpg", folder), Some(Problem::Forbidden));
    assert_eq!(name_problem("nota.", folder), Some(Problem::Forbidden));
    assert_eq!(name_problem("CON.txt", folder), Some(Problem::Reserved));
    assert_eq!(name_problem("nul", folder), Some(Problem::Reserved));
    assert_eq!(name_problem("console.txt", folder), None);
    assert_eq!(name_problem("   ", folder), Some(Problem::Empty));
    assert_eq!(name_problem(&format!("{}.jpg", "x".repeat(260)), folder), Some(Problem::TooLong));

    let request = |paths: &[&str], rules: Vec<Rule>| RenameRequest { paths: paths.iter().map(|path| path.to_string()).collect(), rules, order: Order::Given, lower_extension: false };
    let rows = |request: &RenameRequest, taken: &[&str]| {
        let moments = vec![DAY; request.paths.len()];
        let taken: Vec<String> = taken.iter().map(|path| path.to_lowercase()).collect();
        plan(PlanParams { request, moments: &moments, exists: &|path: &Path| taken.contains(&path.to_string_lossy().to_lowercase()) })
    };

    // Two files would end with the same name.
    let same = rows(&request(&[r"C:\F\a.jpg", r"C:\F\b.jpg"], vec![Rule::Number { text: "Foto".to_string(), digits: 1, start: 1, step: 0 }]), &[]);
    assert!(same.iter().all(|row| row.problem == Some(Problem::Duplicate)));
    // Another file that stays has that name.
    let exists = rows(&request(&[r"C:\F\a.jpg"], vec![Rule::Add { text: "1".to_string(), side: Side::End }]), &[r"C:\F\a1.jpg"]);
    assert_eq!(exists[0].problem, Some(Problem::Exists));
    // a ↔ b: each name is freed by the other, no problem.
    let swap = rows(&request(&[r"C:\F\a.jpg", r"C:\F\b.jpg"], vec![Rule::Replace { find: "a".to_string(), with: "TMP".to_string(), case_sensitive: true }, Rule::Replace { find: "b".to_string(), with: "a".to_string(), case_sensitive: true }, Rule::Replace { find: "TMP".to_string(), with: "b".to_string(), case_sensitive: true }]), &[r"C:\F\a.jpg", r"C:\F\b.jpg"]);
    assert_eq!(swap.iter().map(|row| (row.new.as_str(), row.problem)).collect::<Vec<_>>(), vec![("b.jpg", None), ("a.jpg", None)]);
    // Only capitals changed: its own name, not another file.
    let case = rows(&request(&[r"C:\F\Foto.JPG"], vec![Rule::Case { case: Case::Lower }]), &[r"C:\F\Foto.JPG"]);
    assert_eq!((case[0].new.as_str(), case[0].problem), ("foto.JPG", None));

    // In order of name for numbering, «foto2» before «foto10».
    let ordered = rows(&RenameRequest { order: Order::Name, ..request(&[r"C:\F\foto10.jpg", r"C:\F\foto2.jpg"], vec![Rule::Number { text: "Viaje {n}".to_string(), digits: 2, start: 1, step: 1 }]) }, &[]);
    assert_eq!(ordered.iter().map(|row| (row.old.as_str(), row.new.as_str())).collect::<Vec<_>>(), vec![("foto2.jpg", "Viaje 01.jpg"), ("foto10.jpg", "Viaje 02.jpg")]);
}

fn sandbox(name: &str) -> PathBuf {
    let folder = std::env::temp_dir().join(format!("glup-rename-{name}-{}", std::process::id()));
    let _      = fs::remove_dir_all(&folder);
    fs::create_dir_all(&folder).unwrap();
    folder
}

fn item(folder: &Path, from: &str, to: &str, index: usize) -> RenameItem {
    RenameItem { from: folder.join(from), temp: folder.join(format!("t-{index}.glup-renombrando")), to: folder.join(to) }
}

fn journal(items: Vec<RenameItem>) -> RenameJournal {
    RenameJournal { id: "1".to_string(), date: String::new(), items, spots: Vec::new(), finished: false }
}

#[test]
fn a_swap_works_and_undo_puts_every_name_back() {
    let folder  = sandbox("swap");
    let records = folder.join("registros");
    fs::write(folder.join("a.txt"), "soy a").unwrap();
    fs::write(folder.join("b.txt"), "soy b").unwrap();
    fs::write(folder.join("c.txt"), "soy c").unwrap();
    let swap = journal(vec![item(&folder, "a.txt", "b.txt", 0), item(&folder, "b.txt", "a.txt", 1), item(&folder, "c.txt", "Clase 1.txt", 2)]);

    let tally = apply(ApplyParams { folder: &records, journal: &swap, stop_after_temp: false }).unwrap();
    assert_eq!((tally.done, tally.failed.len()), (3, 0));
    assert_eq!(fs::read_to_string(folder.join("b.txt")).unwrap(), "soy a");
    assert_eq!(fs::read_to_string(folder.join("a.txt")).unwrap(), "soy b");
    assert_eq!(fs::read_to_string(folder.join("Clase 1.txt")).unwrap(), "soy c");
    assert!(unfinished(&records).is_empty());

    let done  = super::journal::load(&records, "1").unwrap();
    assert_eq!(done.spots, vec![Spot::To, Spot::To, Spot::To]);
    let back  = undo(&records, &done).unwrap();
    assert_eq!(back.restored, 3);
    assert_eq!(fs::read_to_string(folder.join("a.txt")).unwrap(), "soy a");
    assert_eq!(fs::read_to_string(folder.join("b.txt")).unwrap(), "soy b");
    assert_eq!(fs::read_to_string(folder.join("c.txt")).unwrap(), "soy c");
    assert!(!folder.join("Clase 1.txt").exists());
    let _ = fs::remove_dir_all(&folder);
}

#[test]
fn closed_halfway_it_can_still_be_undone() {
    let folder  = sandbox("crash");
    let records = folder.join("registros");
    fs::write(folder.join("a.txt"), "soy a").unwrap();
    fs::write(folder.join("b.txt"), "soy b").unwrap();
    let swap = journal(vec![item(&folder, "a.txt", "b.txt", 0), item(&folder, "b.txt", "a.txt", 1)]);

    // Glup closed after the first step: both files at their temporary names.
    apply(ApplyParams { folder: &records, journal: &swap, stop_after_temp: true }).unwrap();
    assert!(!folder.join("a.txt").exists() && !folder.join("b.txt").exists());
    let left = unfinished(&records);
    assert_eq!(left.len(), 1);
    assert_eq!(spots(&records, &left[0]), vec![Spot::Temp, Spot::Temp]);

    // And one rename got through without its line in the log.
    fs::rename(&swap.items[0].temp, &swap.items[0].to).unwrap();
    assert_eq!(spots(&records, &left[0]), vec![Spot::To, Spot::Temp]);

    let back = undo(&records, &left[0]).unwrap();
    assert_eq!(back.restored, 2);
    assert_eq!(fs::read_to_string(folder.join("a.txt")).unwrap(), "soy a");
    assert_eq!(fs::read_to_string(folder.join("b.txt")).unwrap(), "soy b");
    assert!(fs::read_dir(&folder).unwrap().flatten().all(|entry| !entry.file_name().to_string_lossy().ends_with("glup-renombrando")));
    assert!(unfinished(&records).is_empty());
    let _ = fs::remove_dir_all(&folder);
}

#[test]
fn undo_never_writes_over_a_new_file() {
    let folder  = sandbox("taken");
    let records = folder.join("registros");
    fs::write(folder.join("informe.pdf"), "viejo").unwrap();
    let rename = journal(vec![item(&folder, "informe.pdf", "Informe final.pdf", 0)]);
    apply(ApplyParams { folder: &records, journal: &rename, stop_after_temp: false }).unwrap();

    // Afterwards the person saved another «informe.pdf».
    fs::write(folder.join("informe.pdf"), "nuevo").unwrap();
    let back = undo(&records, &super::journal::load(&records, "1").unwrap()).unwrap();
    assert_eq!(back.occupied, vec!["informe.pdf".to_string()]);
    assert_eq!(fs::read_to_string(folder.join("informe.pdf")).unwrap(), "nuevo");
    assert_eq!(fs::read_to_string(folder.join("Informe final.pdf")).unwrap(), "viejo");
    let _ = fs::remove_dir_all(&folder);
}
