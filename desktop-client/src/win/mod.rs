pub mod constants;
pub mod hooks;
pub mod notification;

use lipilekhika::typing::TypingContext;
use std::sync::atomic::AtomicBool;
use std::sync::Mutex;

/// Shared application state accessed by the Windows hook callbacks.
///
/// The hook procedures cannot capture closures, so we store an `Arc<AppState>`
/// in thread-local storage for the installing thread (see `win::hooks`).
pub struct AppState {
  pub typing_enabled: AtomicBool,
  pub typing_context: Mutex<TypingContext>,
  pub notifier: notification::Notifier,
}
