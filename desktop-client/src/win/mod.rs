pub mod constants;
pub mod hooks;
pub mod runtime;

use crossbeam_channel::Sender;
use std::sync::Arc;

use crate::{AppState, ThreadMessage};

/// Windows-specific state that extends the common AppState with platform-specific
/// functionality (e.g., notification system).
///
/// The hook procedures cannot capture closures, so we store an `Arc<WinAppState>`
/// in thread-local storage for the installing thread (see `win::hooks`).
pub struct WinAppState {
  pub app_state: Arc<AppState>,
  /// Sender for UI messages (RerenderUI, TriggerTypingNotification)
  pub tx_ui: Sender<ThreadMessage>,
  /// Sender for Tray messages (RerenderTray)
  pub tx_tray: Sender<ThreadMessage>,
}

pub fn run(
  app_state: Arc<AppState>,
  tx_ui: Sender<ThreadMessage>,
  tx_tray: Sender<ThreadMessage>,
) -> windows::core::Result<()> {
  runtime::run(app_state, tx_ui, tx_tray)
}
