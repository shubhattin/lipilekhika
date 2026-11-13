//! `Lipi Parivartaka.exe` of the portable Windows app: opens Lipi Parivartaka, which is a window
//! of Lipi Lekhika (`lipilekhika.exe --parivartaka`, next to this exe). A shortcut can't do it in
//! a zip: it keeps the full path of its target, which changes when the folder moves.
#![windows_subsystem = "windows"]

use std::process::Command;

fn main() {
  let Some(dir) = std::env::current_exe()
    .ok()
    .and_then(|exe| exe.parent().map(|dir| dir.to_path_buf()))
  else {
    return;
  };
  let app = dir.join(if cfg!(windows) {
    "lipilekhika.exe"
  } else {
    "lipilekhika"
  });
  // a running Lipi Lekhika opens the window itself, this start of it exits again
  let _ = Command::new(app)
    .arg("--parivartaka")
    .current_dir(&dir)
    .spawn();
}
