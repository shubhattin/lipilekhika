use lipilekhika::typing::{TypingContext, create_typing_context};
use std::{
  sync::{Arc, Mutex, atomic::AtomicBool},
  thread,
};

mod platform;
mod ui;

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
  let _handle = thread::spawn(move || {
    // platform-specific keyboard handler thread
    if let Err(err) = platform::run(state_clone) {
      eprintln!("{err}");
      std::process::exit(1);
    }
  });
  // thread::spawn(|| {
  // });
  ui::run().unwrap();
  // handle.join().unwrap();
}
