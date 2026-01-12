#[cfg(windows)]
#[path = "win/mod.rs"]
mod win;

use std::sync::Arc;
use std::sync::mpsc::Sender;

pub fn run(
  app_state: Arc<crate::AppState>,
  tx: Sender<crate::ThreadMessage>,
) -> Result<(), Box<dyn std::error::Error>> {
  #[cfg(windows)]
  {
    return win::run(app_state, tx).map_err(|e| Box::new(e) as Box<dyn std::error::Error>);
  }

  #[cfg(not(windows))]
  {
    return Err(
      std::io::Error::new(
        std::io::ErrorKind::Unsupported,
        "lipilekhika-ui desktop client is not supported on this platform yet",
      )
      .into(),
    );
  }
}
