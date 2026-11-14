#[cfg(all(feature = "typing-tool", windows))]
#[path = "win/mod.rs"]
mod win;

#[cfg(all(feature = "typing-tool", target_os = "macos"))]
#[path = "mac/mod.rs"]
mod mac;

use crossbeam_channel::Sender;
use std::sync::Arc;

/// Whether this platform has the system wide typing (the keyboard hook).
///
/// On Linux the app runs without it (the UI, Lipi Parivartaka and the typing help all work), the
/// system wide typing there is the Fcitx5 plugin.
/// Lipi Parivartaka on its own (without the `typing-tool` feature) has none.
pub const SYSTEM_TYPING_SUPPORTED: bool = cfg!(all(
  feature = "typing-tool",
  any(windows, target_os = "macos")
));

/// What the system wide typing (the keyboard hook) is doing, for the UI and the tray
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
#[cfg_attr(not(target_os = "macos"), allow(dead_code))] // only macOS has more than `Running`
pub enum HookStatus {
  /// starting, or the platform has no hook
  Starting = 0,
  Running = 1,
  /// macOS: the app may not watch the keys yet (Accessibility permission)
  NeedsPermission = 2,
  /// macOS: some app holds Secure Input (a password field), no key reaches the hook
  SecureInput = 3,
  /// the hook could not start, though it is allowed to
  Failed = 4,
}

impl HookStatus {
  pub fn of(state: &crate::AppState) -> Self {
    match state.hook_status.load(std::sync::atomic::Ordering::SeqCst) {
      1 => Self::Running,
      2 => Self::NeedsPermission,
      3 => Self::SecureInput,
      4 => Self::Failed,
      _ => Self::Starting,
    }
  }

  /// Stores the status. `true`: it changed.
  #[cfg_attr(not(target_os = "macos"), allow(dead_code))]
  pub fn store(self, state: &crate::AppState) -> bool {
    state
      .hook_status
      .swap(self as u8, std::sync::atomic::Ordering::SeqCst)
      != self as u8
  }
}

#[cfg_attr(
  not(all(feature = "typing-tool", any(windows, target_os = "macos"))),
  allow(dead_code)
)]
pub fn run(
  _app_state: Arc<crate::AppState>,
  _tx_ui: Sender<crate::ThreadMessage>,
  _tx_tray: Sender<crate::ThreadMessage>,
) -> Result<(), Box<dyn std::error::Error>> {
  #[cfg(all(feature = "typing-tool", windows))]
  {
    win::run(_app_state, _tx_ui, _tx_tray).map_err(|e| Box::new(e) as Box<dyn std::error::Error>)
  }

  #[cfg(all(feature = "typing-tool", target_os = "macos"))]
  {
    mac::run(_app_state, _tx_ui, _tx_tray)
  }

  #[cfg(not(all(feature = "typing-tool", any(windows, target_os = "macos"))))]
  {
    Ok(())
  }
}

/// macOS: opens System Settings at Privacy & Security → Accessibility, where the app is allowed
/// to watch and send keys
#[cfg_attr(
  not(all(feature = "typing-tool", target_os = "macos")),
  allow(dead_code)
)]
pub fn open_permission_settings() {
  #[cfg(all(feature = "typing-tool", target_os = "macos"))]
  mac::permission::open_settings();
}

/// Starts the app again a moment after this one quits (macOS: the event tap would not start)
#[cfg_attr(not(target_os = "macos"), allow(dead_code))]
pub fn relaunch_after_quit() {
  let Ok(exe) = std::env::current_exe() else {
    return;
  };
  // the .app around the binary (…/Lipi Lekhika.app/Contents/MacOS/lipilekhika), else the binary
  let target = exe
    .ancestors()
    .nth(3)
    .filter(|p| p.extension().is_some_and(|e| e == "app"))
    .map(|p| p.to_path_buf())
    .unwrap_or(exe);
  let _ = std::process::Command::new("/bin/sh")
    .arg("-c")
    .arg("sleep 1; open \"$0\"")
    .arg(target)
    .spawn();
}

/// The toggle shortcut as the platform writes it
pub const TOGGLE_KEYS: [&str; 2] = if cfg!(target_os = "macos") {
  ["⌥X", "⌥C"]
} else {
  ["Alt+X", "Alt+C"]
};
