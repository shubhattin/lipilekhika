pub mod constants;
pub mod hooks;
pub mod runtime;

use std::sync::Arc;

/// Windows-specific state that extends the common AppState with platform-specific
/// functionality (e.g., notification system).
///
/// The hook procedures cannot capture closures, so we store an `Arc<WinAppState>`
/// in thread-local storage for the installing thread (see `win::hooks`).
pub struct WinAppState {
  pub app_state: Arc<crate::AppState>,
  /// Sender for UI messages (RerenderUI, TriggerTypingNotification)
  pub tx_ui: crossbeam_channel::Sender<crate::ThreadMessage>,
  /// Sender for Tray messages (RerenderTray)
  pub tx_tray: crossbeam_channel::Sender<crate::ThreadMessage>,
}

pub fn run(
  app_state: Arc<crate::AppState>,
  tx_ui: crossbeam_channel::Sender<crate::ThreadMessage>,
  tx_tray: crossbeam_channel::Sender<crate::ThreadMessage>,
) -> windows::core::Result<()> {
  runtime::run(app_state, tx_ui, tx_tray)
}
