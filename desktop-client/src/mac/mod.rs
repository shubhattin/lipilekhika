pub mod constants;
pub mod hooks;
pub mod runtime;

use crossbeam_channel::Sender;
use std::sync::Arc;

use crate::{AppState, ThreadMessage};

/// macOS-specific state bundling app state with message channels.
/// Mirrors `WinAppState` in `win/mod.rs`.
pub struct MacAppState {
  pub app_state: Arc<AppState>,
  pub tx_ui: Sender<ThreadMessage>,
  pub tx_tray: Sender<ThreadMessage>,
}

pub fn run(
  app_state: Arc<AppState>,
  tx_ui: Sender<ThreadMessage>,
  tx_tray: Sender<ThreadMessage>,
) -> Result<(), Box<dyn std::error::Error>> {
  runtime::run(app_state, tx_ui, tx_tray)
}
