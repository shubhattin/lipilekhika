#[cfg(windows)]
#[path = "win/mod.rs"]
mod win;

#[cfg(target_os = "macos")]
#[path = "mac/mod.rs"]
mod mac;

use crossbeam_channel::Sender;
use std::sync::Arc;

pub fn run(
  _app_state: Arc<crate::AppState>,
  _tx_ui: Sender<crate::ThreadMessage>,
  _tx_tray: Sender<crate::ThreadMessage>,
) -> Result<(), Box<dyn std::error::Error>> {
  #[cfg(windows)]
  {
    win::run(_app_state, _tx_ui, _tx_tray).map_err(|e| Box::new(e) as Box<dyn std::error::Error>)
  }

  #[cfg(target_os = "macos")]
  {
    mac::run(_app_state, _tx_ui, _tx_tray)
  }

  #[cfg(not(any(windows, target_os = "macos")))]
  {
    Err(
      std::io::Error::new(
        std::io::ErrorKind::Unsupported,
        "lipilekhika-ui desktop client is not supported on this platform yet",
      )
      .into(),
    )
  }
}
