use lipilekhika::typing::{create_typing_context, TypingContext};
use std::{
  sync::{atomic::AtomicBool, Arc, Mutex},
  thread,
};

mod platform;

/// shared app state for both the platform specific hook code, UI, etc
pub struct AppState {
  pub typing_enabled: AtomicBool,
  /// both typing script and typing options are stored in the typing context
  pub typing_context: Mutex<TypingContext>,
}

fn main() {
  let typing_context =
    create_typing_context("Devanagari", None).expect("Failed to create typing context");
  let app_state = Arc::new(AppState {
    typing_context: Mutex::new(typing_context),
    typing_enabled: AtomicBool::new(false),
  });

  let state_clone = Arc::clone(&app_state);
  let handle = thread::spawn(move || {
    if let Err(err) = platform::run(state_clone) {
      eprintln!("{err}");
      std::process::exit(1);
    }
  });
  handle.join().unwrap();
}
