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
