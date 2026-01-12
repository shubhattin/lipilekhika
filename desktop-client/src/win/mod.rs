pub mod constants;
pub mod hooks;
pub mod runtime;

use std::sync::Arc;
use std::sync::mpsc::Sender;

/// Windows-specific state that extends the common AppState with platform-specific
/// functionality (e.g., notification system).
///
/// The hook procedures cannot capture closures, so we store an `Arc<WinAppState>`
/// in thread-local storage for the installing thread (see `win::hooks`).
pub struct WinAppState {
  pub app_state: Arc<crate::AppState>,
  pub tx: Sender<crate::ThreadMessage>,
}

pub fn run(
  app_state: Arc<crate::AppState>,
  tx: Sender<crate::ThreadMessage>,
) -> windows::core::Result<()> {
  runtime::run(app_state, tx)
}
