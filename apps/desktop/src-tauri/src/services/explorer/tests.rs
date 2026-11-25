use std::{
    path::Path,
    time::{Duration, Instant},
};

use super::{
    menu::{self, menu_keys, menu_root, menu_tools, MenuKeysParams, MenuTool},
    parse_args,
    send_to::SEND_TO_ARG,
    ExplorerRequest, Inbox, GATHER_WINDOW,
};
use crate::services::registry::{self, Root};

fn args(items: &[&str]) -> Vec<String> {
    items.iter().map(|item| item.to_string()).collect()
}

#[test]
fn reads_the_option_and_the_files_of_the_command_line() {
    let menu = parse_args(&args(&[r"C:\Glup\glup.exe", "--menu", "convert-image", r"C:\Fotos\a.jpg"]));
    assert_eq!(menu, Some(ExplorerRequest { tool: Some("convert-image".to_string()), paths: vec![r"C:\Fotos\a.jpg".to_string()] }));

    let send = parse_args(&args(&[r"C:\Glup\glup.exe", SEND_TO_ARG, r"C:\a.pdf", r"C:\Fotos\b c.png"]));
    assert_eq!(send, Some(ExplorerRequest { tool: None, paths: args(&[r"C:\a.pdf", r"C:\Fotos\b c.png"]) }));

    // A normal launch, Windows at startup, or an option without files: nothing to do.
    assert_eq!(parse_args(&args(&[r"C:\Glup\glup.exe"])), None);
    assert_eq!(parse_args(&args(&[r"C:\Glup\glup.exe", "--autostart"])), None);
    assert_eq!(parse_args(&args(&[r"C:\Glup\glup.exe", "--menu", "compress-pdf"])), None);
    assert_eq!(parse_args(&args(&[r"C:\Glup\glup.exe", "--menu", "--send-to", r"C:\a.pdf"])), None);
}

#[test]
fn files_of_one_selection_become_one_request() {
    let start     = Instant::now();
    let mut inbox = Inbox::default();
    let file      = |tool: Option<&str>, path: &str| ExplorerRequest { tool: tool.map(str::to_string), paths: vec![path.to_string()] };

    // Explorer starts one Glup per file, a few milliseconds apart.
    inbox.add(file(Some("compress-image"), "a.jpg"), start);
    inbox.add(file(Some("compress-image"), "b.jpg"), start + Duration::from_millis(40));
    inbox.add(file(Some("compress-image"), "a.jpg"), start + Duration::from_millis(60));
    inbox.add(file(Some("compress-image"), "c.jpg"), start + Duration::from_millis(300));

    // Still arriving: nothing is ready.
    assert!(!inbox.settle(start + Duration::from_millis(400)));
    assert!(inbox.take().is_empty());

    assert!(inbox.settle(start + Duration::from_millis(300) + GATHER_WINDOW));
    assert_eq!(inbox.take(), vec![ExplorerRequest { tool: Some("compress-image".to_string()), paths: args(&["a.jpg", "b.jpg", "c.jpg"]) }]);
    assert!(inbox.take().is_empty());
}

#[test]
fn another_option_or_a_later_selection_is_another_request() {
    let start     = Instant::now();
    let mut inbox = Inbox::default();
    let file      = |tool: &str, path: &str| ExplorerRequest { tool: Some(tool.to_string()), paths: vec![path.to_string()] };

    inbox.add(file("compress-pdf", "a.pdf"), start);
    inbox.add(file("merge-pdf", "b.pdf"), start + Duration::from_millis(50));
    inbox.add(file("merge-pdf", "c.pdf"), start + Duration::from_millis(50) + GATHER_WINDOW * 2);

    assert!(inbox.settle(start + Duration::from_millis(50) + GATHER_WINDOW * 3));
    let tools: Vec<_> = inbox.take().into_iter().map(|request| (request.tool.unwrap(), request.paths.len())).collect();
    assert_eq!(tools, vec![("compress-pdf".to_string(), 1), ("merge-pdf".to_string(), 1), ("merge-pdf".to_string(), 1)]);
}

#[test]
fn the_menu_comes_from_tools_json() {
    let tools = menu::catalog_tools();
    let ids: Vec<&str> = tools.iter().map(|tool| tool.id.as_str()).collect();
    assert!(ids.contains(&"convert-image"));
    assert!(ids.contains(&"compress-pdf"));
    assert!(ids.contains(&"transcribe"));
    // Only actions with a label for the menu: no screens (Limpieza) and no tool without one.
    assert!(!ids.contains(&"cleanup"));
    assert!(tools.iter().all(|tool| !tool.label.is_empty()));

    let catalog = r#"[
      { "id": "a", "kind": "action", "fileType": "pdf", "menu": "Hacer A" },
      { "id": "b", "kind": "action", "fileType": "pdf" },
      { "id": "c", "kind": "page", "page": "cleanup", "menu": "No" }
    ]"#;
    assert_eq!(menu_tools(catalog), vec![MenuTool { id: "a".to_string(), label: "Hacer A".to_string(), file_types: vec!["pdf".to_string()] }]);

    // An option for several kinds of file.
    let both = r#"[{ "id": "t", "kind": "action", "fileType": "audio", "menu": "Recortar…", "menuTypes": ["audio", "video"] }]"#;
    assert_eq!(menu_tools(both)[0].file_types, vec!["audio".to_string(), "video".to_string()]);
}

fn tool(id: &str, label: &str, file_type: &str) -> MenuTool {
    MenuTool { id: id.to_string(), label: label.to_string(), file_types: vec![file_type.to_string()] }
}

#[test]
fn trimming_is_in_the_menu_of_videos_and_audios() {
    let tools = menu::catalog_tools();
    let keys  = menu_keys(MenuKeysParams { base: "Base", exe: Path::new(r"C:\Glup.exe"), tools: &tools });
    for extension in ["mp4", "mov", "mkv", "avi", "webm", "m4v", "3gp", "wmv", "mp3", "wav"] {
        assert!(keys.iter().any(|key| key.path.contains(&format!(r".{extension}\shell\Glup\shell\")) && key.path.ends_with("-trim-media")), "{extension}");
    }
    assert!(keys.iter().any(|key| key.path.contains(r".mp4\shell\Glup\shell\") && key.path.ends_with("-extract-audio")));
    assert!(!keys.iter().any(|key| key.path.contains(r".mp3\shell\Glup\shell\") && key.path.ends_with("-extract-audio")));
}

#[test]
fn each_kind_of_file_gets_its_own_options() {
    let tools = vec![tool("convert-image", "Convertir a…", "image"), tool("iphone-to-jpg", "Pasar a JPG…", "iphone"), tool("merge-pdf", "Unir…", "pdf")];
    let exe   = Path::new(r"C:\Program Files\Glup\Glup.exe");
    let keys  = menu_keys(MenuKeysParams { base: "Base", exe, tools: &tools });
    let find  = |path: &str| keys.iter().find(|key| key.path == path).unwrap_or_else(|| panic!("no key {path}"));

    let pdf = find(r"Base\SystemFileAssociations\.pdf\shell\Glup");
    assert!(pdf.values.contains(&("MUIVerb".to_string(), "Glup".to_string())));
    assert!(pdf.values.contains(&("Icon".to_string(), r#""C:\Program Files\Glup\Glup.exe",0"#.to_string())));
    assert!(pdf.values.contains(&("SubCommands".to_string(), String::new())));
    let command = find(r"Base\SystemFileAssociations\.pdf\shell\Glup\shell\01-merge-pdf\command");
    assert_eq!(command.values, vec![(String::new(), r#""C:\Program Files\Glup\Glup.exe" --menu merge-pdf "%1""#.to_string())]);

    // A JPG has the image options, a HEIC those and the iPhone one; videos have none here.
    assert!(keys.iter().any(|key| key.path.ends_with(r".jpg\shell\Glup\shell\01-convert-image")));
    assert!(!keys.iter().any(|key| key.path.contains(r".jpg\shell\Glup\shell\02")));
    assert!(keys.iter().any(|key| key.path.ends_with(r".heic\shell\Glup\shell\02-iphone-to-jpg")));
    assert!(!keys.iter().any(|key| key.path.contains(".mp4")));
    assert!(!keys.iter().any(|key| key.path.contains(r".pdf\shell\Glup\shell\01-convert-image")));
}

#[cfg(windows)]
#[test]
fn writes_and_removes_the_menu_in_a_test_key() {
    // A key of its own under HKCU\Software, removed at the end whatever happens.
    let base = format!(r"Software\GlupPruebas-{}\Classes", std::process::id());
    let root = base.trim_end_matches(r"\Classes").to_string();
    struct Cleanup(String);
    impl Drop for Cleanup {
        fn drop(&mut self) {
            registry::delete_tree(Root::User, &self.0);
        }
    }
    let _cleanup = Cleanup(root.clone());

    let exe = Path::new(r"C:\Glup\glup.exe");
    assert!(menu::register(&base, exe));

    let pdf = menu_root(&base, "pdf");
    let verb = registry::values(Root::User, &pdf).into_iter().find(|value| value.name == "MUIVerb").and_then(|value| value.text);
    assert_eq!(verb.as_deref(), Some("Glup"));

    let options = registry::subkeys(Root::User, &format!(r"{pdf}\shell"));
    assert!(options.iter().any(|option| option.ends_with("-compress-pdf")), "{options:?}");
    let first   = options.iter().find(|option| option.ends_with("-compress-pdf")).unwrap();
    let command = registry::values(Root::User, &format!(r"{pdf}\shell\{first}\command")).into_iter().find(|value| value.name.is_empty()).and_then(|value| value.text);
    assert_eq!(command.as_deref(), Some(r#""C:\Glup\glup.exe" --menu compress-pdf "%1""#));

    // Writing again replaces it (an option taken out of tools.json would not stay).
    assert!(menu::register(&base, Path::new(r"D:\Nuevo\glup.exe")));
    let icon = registry::values(Root::User, &pdf).into_iter().find(|value| value.name == "Icon").and_then(|value| value.text);
    assert_eq!(icon.as_deref(), Some(r#""D:\Nuevo\glup.exe",0"#));

    assert!(menu::unregister(&base));
    assert!(registry::values(Root::User, &pdf).is_empty());
    assert!(registry::subkeys(Root::User, &format!(r"{base}\SystemFileAssociations\.jpg\shell")).is_empty());

    drop(_cleanup);
    assert!(registry::subkeys(Root::User, &root).is_empty());
    assert!(!registry::subkeys(Root::User, "Software").iter().any(|key| key.starts_with("GlupPruebas-")));
}

#[cfg(windows)]
#[test]
fn the_send_to_shortcut_is_a_real_shortcut() {
    use super::send_to::{shortcut_in, write_shortcut, ShortcutParams};

    let folder = std::env::temp_dir().join(format!("glup-enviar-a-{}", std::process::id()));
    let path   = shortcut_in(&folder);
    let exe    = std::env::current_exe().unwrap();

    assert!(write_shortcut(ShortcutParams { path: &path, target: &exe }));
    let bytes = std::fs::read(&path).unwrap();
    // The header of every .lnk: its size (0x4C) and the class of a shell link.
    assert_eq!(&bytes[..4], &[0x4C, 0, 0, 0]);
    assert_eq!(&bytes[4..8], &[0x01, 0x14, 0x02, 0x00]);

    std::fs::remove_dir_all(&folder).unwrap();
}

#[test]
fn the_installer_reads_the_saved_switches() {
    let folder = std::env::temp_dir().join(format!("glup-ajustes-{}", std::process::id()));
    std::fs::create_dir_all(&folder).unwrap();
    let path = folder.join("settings.json");

    std::fs::write(&path, r#"{ "explorerMenuOff": true }"#).unwrap();
    let saved = crate::services::settings::read_file(&path);
    assert!(saved.explorer_menu_off);
    assert!(!saved.send_to_off);

    // Nothing saved (a new install): both on.
    let fresh = crate::services::settings::read_file(&folder.join("no-existe.json"));
    assert!(!fresh.explorer_menu_off && !fresh.send_to_off);

    std::fs::remove_dir_all(&folder).unwrap();
}
