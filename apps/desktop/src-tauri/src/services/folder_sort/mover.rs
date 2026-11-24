// Moving the person's files, never overwriting anything. On the same disk it is a rename; to another one
// (a subfolder that is a link to another drive) it is a copy that is checked byte by byte before the
// original goes.
use std::{
    fs::{self, File},
    io::{self, BufReader, Read},
    path::{Path, PathBuf},
    sync::atomic::{AtomicBool, Ordering},
};

use serde::{Deserialize, Serialize};

use crate::services::{
    folder_sort::{
        filters::{SkipReason, RECENT_MS},
        plan::{millis, Plan, PlannedMove},
    },
    naming::{self, OutputKind, OutputNameParams},
};

// One file moved: where it was and where it went, and its size (to know it is the same one on undo).
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct MoveRecord {
    pub from : PathBuf,
    pub to   : PathBuf,
    pub size : u64,
}

// One line of the record, written as it happens: a folder made, a move about to start (with its exact
// destination), that move done, or that file left where it was.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Step {
    Created(PathBuf),
    Pending(MoveRecord),
    Moved(MoveRecord),
    Failed(PathBuf),
}

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct RunTally {
    pub moved     : Vec<MoveRecord>,
    // The subfolders Glup made (parents first): undo removes them only if they are left empty.
    pub created   : Vec<PathBuf>,
    // Between the preview and "Ordenar": changed, in use now or gone.
    pub changed   : Vec<(String, SkipReason)>,
    pub failed    : Vec<String>,
    pub cancelled : bool,
}

pub struct RunParams<'a> {
    pub plan       : &'a Plan,
    pub now        : i64,
    pub cancel     : &'a AtomicBool,
    pub in_use     : &'a dyn Fn(&Path) -> bool,
    // Before each file: how many went and its name.
    pub progress   : &'a mut dyn FnMut(usize, &str),
    // Each step, before and after it happens, so the record survives a closed Glup.
    pub checkpoint : &'a mut dyn FnMut(Step),
}

// ERROR_NOT_SAME_DEVICE on Windows, EXDEV elsewhere.
fn crosses_devices(error: &io::Error) -> bool {
    matches!(error.raw_os_error(), Some(17) if cfg!(windows)) || matches!(error.raw_os_error(), Some(18) if !cfg!(windows))
}

// A rename that fails if the target exists (std's rename replaces it on Windows).
#[cfg(windows)]
pub fn rename_no_replace(from: &Path, to: &Path) -> io::Result<()> {
    use std::os::windows::ffi::OsStrExt;

    use windows_sys::Win32::Storage::FileSystem::MoveFileExW;

    let wide = |path: &Path| path.as_os_str().encode_wide().chain(Some(0)).collect::<Vec<u16>>();
    let (source, target) = (wide(from), wide(to));

    // No MOVEFILE_REPLACE_EXISTING nor MOVEFILE_COPY_ALLOWED: same volume only, never over a file.
    if unsafe { MoveFileExW(source.as_ptr(), target.as_ptr(), 0) } == 0 {
        return Err(io::Error::last_os_error());
    }
    Ok(())
}

#[cfg(not(windows))]
pub fn rename_no_replace(from: &Path, to: &Path) -> io::Result<()> {
    if to.exists() {
        return Err(io::Error::from(io::ErrorKind::AlreadyExists));
    }
    fs::rename(from, to)
}

fn same_contents(a: &Path, b: &Path) -> io::Result<bool> {
    if fs::metadata(a)?.len() != fs::metadata(b)?.len() {
        return Ok(false);
    }

    let (mut left, mut right) = (BufReader::new(File::open(a)?), BufReader::new(File::open(b)?));
    let (mut one, mut two)    = (vec![0; 64 * 1024], vec![0; 64 * 1024]);

    loop {
        let read = left.read(&mut one)?;
        if read == 0 {
            return Ok(true);
        }
        right.read_exact(&mut two[..read])?;
        if one[..read] != two[..read] {
            return Ok(false);
        }
    }
}

// To another disk: a new file (never over one), checked against the original, and only then the
// original is deleted. If the check fails, the copy goes and the original stays.
pub fn copy_verified(from: &Path, to: &Path) -> io::Result<()> {
    {
        let mut source = File::open(from)?;
        let mut target = File::options().write(true).create_new(true).open(to)?;
        io::copy(&mut source, &mut target)?;
        target.sync_all()?;
        if let Ok(modified) = fs::metadata(from).and_then(|metadata| metadata.modified()) {
            let _ = target.set_modified(modified);
        }
    }

    if !same_contents(from, to).unwrap_or(false) {
        let _ = fs::remove_file(to);
        return Err(io::Error::other("the copy does not match"));
    }

    fs::remove_file(from)
}

pub fn move_file(from: &Path, to: &Path) -> io::Result<()> {
    match rename_no_replace(from, to) {
        Err(error) if crosses_devices(&error) => copy_verified(from, to),
        other                                 => other,
    }
}

// Each level that is missing is made (and remembered); one that is a file and not a folder fails.
fn ensure_folders(base: &Path, folders: &[String], created: &mut Vec<PathBuf>) -> io::Result<PathBuf> {
    let mut current = base.to_path_buf();

    for folder in folders {
        current = current.join(folder);
        if current.is_dir() {
            continue;
        }
        fs::create_dir(&current)?;
        created.push(current.clone());
    }

    Ok(current)
}

// It is still the file of the preview: there, the same size and date, not in use and not just touched.
fn still_the_same(item: &PlannedMove, now: i64, in_use: &dyn Fn(&Path) -> bool) -> Option<SkipReason> {
    let Ok(metadata) = fs::symlink_metadata(&item.source) else { return Some(SkipReason::Changed) };

    if !metadata.is_file() || metadata.len() != item.size || millis(&metadata) != item.modified {
        return Some(SkipReason::Changed);
    }
    if now - item.modified < RECENT_MS {
        return Some(SkipReason::Recent);
    }
    in_use(&item.source).then_some(SkipReason::InUse)
}

// A name free in its destination ("(2)" if taken); if someone takes it right then, the next one. Each
// try is told before it starts (`before`), with the name it will take.
fn move_into(source: &Path, folder: &Path, before: &mut dyn FnMut(&Path)) -> io::Result<PathBuf> {
    for _ in 0..3 {
        let target = naming::output_path(&OutputNameParams { folder, source, kind: OutputKind::Same }, |path| path.exists());

        before(&target);
        match move_file(source, &target) {
            Ok(())                                                   => return Ok(target),
            Err(error) if error.kind() == io::ErrorKind::AlreadyExists => continue,
            Err(error)                                               => return Err(error),
        }
    }
    Err(io::Error::from(io::ErrorKind::AlreadyExists))
}

pub fn run(params: RunParams) -> RunTally {
    let mut tally = RunTally::default();

    for (index, item) in params.plan.moves.iter().enumerate() {
        if params.cancel.load(Ordering::SeqCst) {
            tally.cancelled = true;
            break;
        }

        let name = item.source.file_name().map(|value| value.to_string_lossy().into_owned()).unwrap_or_default();
        (params.progress)(index, &name);

        if let Some(reason) = still_the_same(item, params.now, params.in_use) {
            tally.changed.push((name, reason));
            continue;
        }

        let made   = tally.created.len();
        let folder = ensure_folders(&params.plan.folder, &item.folders, &mut tally.created);
        for path in &tally.created[made..] {
            (params.checkpoint)(Step::Created(path.clone()));
        }

        let record = |to: &Path| MoveRecord { from: item.source.clone(), to: to.to_path_buf(), size: item.size };
        let moved  = folder.and_then(|folder| move_into(&item.source, &folder, &mut |target| (params.checkpoint)(Step::Pending(record(target)))));

        match moved {
            Ok(to) => {
                (params.checkpoint)(Step::Moved(record(&to)));
                tally.moved.push(record(&to));
            }
            Err(_) => {
                (params.checkpoint)(Step::Failed(item.source.clone()));
                tally.failed.push(name);
            }
        }
    }

    tally
}

#[cfg(test)]
mod tests {
    use std::time::{Duration, SystemTime, UNIX_EPOCH};

    use super::*;
    use crate::services::folder_sort::{
        classify::table,
        plan::{plan, PlanParams, SortMode},
    };

    fn sandbox(name: &str) -> PathBuf {
        let folder = std::env::temp_dir().join(format!("glup-sort-move-{name}-{}", std::process::id()));
        let _      = fs::remove_dir_all(&folder);
        fs::create_dir_all(&folder).unwrap();
        folder
    }

    fn old_file(path: &Path, contents: &[u8]) {
        fs::write(path, contents).unwrap();
        File::options().write(true).open(path).unwrap().set_modified(SystemTime::now() - Duration::from_secs(3600)).unwrap();
    }

    fn now() -> i64 {
        SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis() as i64
    }

    fn free(_: &Path) -> bool {
        false
    }

    fn sort(folder: &Path) -> RunTally {
        let plan = plan(PlanParams { folder, mode: SortMode::Type, table: table(), now: now(), in_use: &free }).unwrap();
        run(RunParams { plan: &plan, now: now(), cancel: &AtomicBool::new(false), in_use: &free, progress: &mut |_, _| {}, checkpoint: &mut |_| {} })
    }

    #[test]
    fn files_go_into_their_folders_and_a_taken_name_gets_a_number() {
        let folder = sandbox("names");
        old_file(&folder.join("contrato.pdf"), b"nuevo");
        fs::create_dir_all(folder.join("PDFs")).unwrap();
        old_file(&folder.join("PDFs").join("contrato.pdf"), b"viejo");

        let tally = sort(&folder);

        assert_eq!(tally.moved.len(), 1);
        assert_eq!(tally.moved[0].to, folder.join("PDFs").join("contrato (2).pdf"));
        assert_eq!(fs::read(folder.join("PDFs").join("contrato.pdf")).unwrap(), b"viejo");
        assert_eq!(fs::read(folder.join("PDFs").join("contrato (2).pdf")).unwrap(), b"nuevo");
        assert!(!folder.join("contrato.pdf").exists());
        // The folder was already there: it is not Glup's to remove.
        assert!(tally.created.is_empty());

        fs::remove_dir_all(&folder).unwrap();
    }

    #[test]
    fn a_rename_never_overwrites() {
        let folder = sandbox("noreplace");
        old_file(&folder.join("a.txt"), b"a");
        old_file(&folder.join("b.txt"), b"b");

        assert!(rename_no_replace(&folder.join("a.txt"), &folder.join("b.txt")).is_err());
        assert_eq!(fs::read(folder.join("b.txt")).unwrap(), b"b");
        assert_eq!(fs::read(folder.join("a.txt")).unwrap(), b"a");

        fs::remove_dir_all(&folder).unwrap();
    }

    #[test]
    fn the_copy_to_another_disk_is_checked_before_the_original_goes() {
        let folder = sandbox("copy");
        let source = folder.join("video.mp4");
        let target = folder.join("Videos-otro-disco.mp4");
        old_file(&source, &vec![7; 200_000]);

        copy_verified(&source, &target).unwrap();
        assert!(!source.exists());
        assert_eq!(fs::read(&target).unwrap(), vec![7; 200_000]);

        // Never over an existing file: the original stays.
        old_file(&source, b"otra vez");
        assert!(copy_verified(&source, &target).is_err());
        assert_eq!(fs::read(&source).unwrap(), b"otra vez");
        assert_eq!(fs::read(&target).unwrap(), vec![7; 200_000]);

        fs::remove_dir_all(&folder).unwrap();
    }

    #[test]
    fn a_file_that_changed_after_the_preview_is_left_alone() {
        let folder = sandbox("changed");
        old_file(&folder.join("informe.pdf"), b"antes");
        old_file(&folder.join("foto.jpg"), b"jpg");
        let plan = plan(PlanParams { folder: &folder, mode: SortMode::Type, table: table(), now: now(), in_use: &free }).unwrap();

        fs::write(folder.join("informe.pdf"), b"despues de revisar").unwrap();
        fs::remove_file(folder.join("foto.jpg")).unwrap();
        let tally = run(RunParams { plan: &plan, now: now(), cancel: &AtomicBool::new(false), in_use: &free, progress: &mut |_, _| {}, checkpoint: &mut |_| {} });

        assert!(tally.moved.is_empty());
        assert_eq!(tally.changed, [("foto.jpg".to_string(), SkipReason::Changed), ("informe.pdf".to_string(), SkipReason::Changed)]);
        assert!(folder.join("informe.pdf").exists());

        fs::remove_dir_all(&folder).unwrap();
    }

    #[test]
    fn cancelling_keeps_what_already_moved() {
        let folder = sandbox("cancel");
        for name in ["a.pdf", "b.pdf", "c.pdf"] {
            old_file(&folder.join(name), name.as_bytes());
        }
        let plan   = plan(PlanParams { folder: &folder, mode: SortMode::Type, table: table(), now: now(), in_use: &free }).unwrap();
        let cancel = AtomicBool::new(false);

        let tally = run(RunParams {
            plan       : &plan,
            now        : now(),
            cancel     : &cancel,
            in_use     : &free,
            progress   : &mut |index, _| if index == 1 { cancel.store(true, Ordering::SeqCst) },
            checkpoint : &mut |_| {},
        });

        // The second one was already on its way when Cancelar came; the third never started.
        assert!(tally.cancelled);
        assert_eq!(tally.moved.len(), 2);
        assert!(folder.join("c.pdf").exists());
        assert!(folder.join("PDFs").join("a.pdf").exists());

        fs::remove_dir_all(&folder).unwrap();
    }
}
