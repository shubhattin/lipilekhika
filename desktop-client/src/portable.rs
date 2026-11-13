//! The portable app (the Windows zip): a file named `portable` next to the exe.
//!
//! - The settings are saved in the `data` folder next to the exe (in the usual place when that
//!   folder can't be written, the app sits in Program Files say).
//! - The fonts in the `fonts` folder next to the exe are there for every app while it runs (the
//!   installer installs them instead), so the text typed in other apps shows. Nothing is
//!   installed: the fonts go away when the app quits.
//! - The update opens the release page, there is no installer to run.

use std::path::PathBuf;
use std::sync::OnceLock;

/// The folder of the running exe
fn exe_dir() -> Option<PathBuf> {
  std::env::current_exe()
    .ok()?
    .canonicalize()
    .ok()?
    .parent()
    .map(PathBuf::from)
}

/// Whether this is the portable app
pub fn is_portable() -> bool {
  static PORTABLE: OnceLock<bool> = OnceLock::new();
  *PORTABLE.get_or_init(|| exe_dir().is_some_and(|dir| dir.join("portable").is_file()))
}

/// The folder for the settings of the portable app, `None` when it can't be written
pub fn data_dir() -> Option<PathBuf> {
  static DATA_DIR: OnceLock<Option<PathBuf>> = OnceLock::new();
  DATA_DIR
    .get_or_init(|| {
      if !is_portable() {
        return None;
      }
      let dir = exe_dir()?.join("data");
      std::fs::create_dir_all(&dir).ok()?;
      // a folder can exist and still not take files (Program Files without admin rights)
      let probe = dir.join(".write-test");
      std::fs::write(&probe, b"").ok()?;
      let _ = std::fs::remove_file(probe);
      Some(dir)
    })
    .clone()
}

/// The fonts of the portable app, there for all apps until this is dropped (the app quits)
pub struct SessionFonts {
  #[cfg_attr(not(windows), allow(dead_code))]
  loaded: Vec<PathBuf>,
}

impl SessionFonts {
  /// Adds the fonts in the `fonts` folder next to the exe (portable app on Windows only)
  pub fn load() -> Self {
    #[cfg_attr(not(windows), allow(unused_mut))]
    let mut loaded = vec![];
    #[cfg(windows)]
    if is_portable()
      && let Some(dir) = exe_dir()
      && let Ok(entries) = std::fs::read_dir(dir.join("fonts"))
    {
      for path in entries.filter_map(Result::ok).map(|e| e.path()) {
        let is_font = path
          .extension()
          .is_some_and(|e| e.eq_ignore_ascii_case("ttf") || e.eq_ignore_ascii_case("otf"));
        if is_font && win::add_font(&path) {
          loaded.push(path);
        }
      }
      if !loaded.is_empty() {
        win::announce_font_change();
      }
    }
    Self { loaded }
  }
}

impl Drop for SessionFonts {
  fn drop(&mut self) {
    #[cfg(windows)]
    if !self.loaded.is_empty() {
      for path in &self.loaded {
        win::remove_font(path);
      }
      win::announce_font_change();
    }
  }
}

#[cfg(windows)]
mod win {
  use std::os::windows::ffi::OsStrExt as _;
  use std::path::Path;
  use windows::Win32::Foundation::{LPARAM, WPARAM};
  use windows::Win32::Graphics::Gdi::{
    AddFontResourceExW, FONT_RESOURCE_CHARACTERISTICS, RemoveFontResourceExW,
  };
  use windows::Win32::UI::WindowsAndMessaging::{
    HWND_BROADCAST, SMTO_ABORTIFHUNG, SendMessageTimeoutW, WM_FONTCHANGE,
  };
  use windows::core::PCWSTR;

  fn wide(path: &Path) -> Vec<u16> {
    path.as_os_str().encode_wide().chain([0]).collect()
  }

  /// Adds the font for this session (not only for this app: no FR_PRIVATE)
  pub fn add_font(path: &Path) -> bool {
    let path = wide(path);
    unsafe {
      AddFontResourceExW(
        PCWSTR(path.as_ptr()),
        FONT_RESOURCE_CHARACTERISTICS(0),
        None,
      ) > 0
    }
  }

  pub fn remove_font(path: &Path) {
    let path = wide(path);
    unsafe {
      let _ = RemoveFontResourceExW(
        PCWSTR(path.as_ptr()),
        FONT_RESOURCE_CHARACTERISTICS(0).0,
        None,
      );
    }
  }

  /// Tells the open apps that the fonts changed (they read the font list again)
  pub fn announce_font_change() {
    unsafe {
      let _ = SendMessageTimeoutW(
        HWND_BROADCAST,
        WM_FONTCHANGE,
        WPARAM(0),
        LPARAM(0),
        SMTO_ABORTIFHUNG,
        1000,
        None,
      );
    }
  }
}
