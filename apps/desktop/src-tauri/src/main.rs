// A windowed program in development too: the Explorer and the start with Windows never flash a console.
// Its logs still reach the terminal of `pnpm dev` (services/dev_build.rs, attach_console).
#![windows_subsystem = "windows"]

fn main() {
    glup_lib::run()
}
