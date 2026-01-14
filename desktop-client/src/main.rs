#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
// ^ hides console in windows release builds

use crossbeam_channel;
use lipilekhika::typing::{
  DEFAULT_AUTO_CONTEXT_CLEAR_TIME_MS, DEFAULT_INCLUDE_INHERENT_VOWEL, DEFAULT_USE_NATIVE_NUMERALS,
  TypingContext, TypingContextOptions,
};
use std::{
  sync::{Arc, Mutex, atomic::AtomicBool},
  thread,
};

mod data;
mod platform;
mod tray;
mod ui;

/// shared app state for both the platform specific hook code, UI, etc
pub struct AppState {
  pub typing_enabled: AtomicBool,
  /// both typing script and typing options are stored in the typing context
  pub typing_context: Mutex<TypingContext>,
}

/// use to pass messages between threads
/// hook -> ui + tray, ui -> tray, tray -> ui
#[derive(Debug)]
pub struct ThreadMessage {
  pub origin: ThreadMessageOrigin,
  pub msg: ThreadMessageType,
}
#[derive(Debug)]
pub enum ThreadMessageOrigin {
  KeyboardHook,
  UI,
  Tray,
}
#[derive(Debug)]
pub enum ThreadMessageType {
  /// as the values are present in `AppState` itself
  /// we only send a signal to rerender based on latest app state from the ui
  RerenderTray,
  /// message to be sent to the ui to rerender and read updated value from app state
  RerenderUI,
  /// used to display typing notification when from hook or tray in ui
  TriggerTypingNotification,
  /// send from tray
  MaximizeUI,
  // Close app request from hook (shortcut)
  CloseApp,
}

fn main() {
  // Create separate channels for UI and Tray
  // Each component gets its own dedicated receiver to avoid message competition
  // the non-mpsc model was causing some issues we are still sticking with crossbeam_channel for now
  let (tx_ui, rx_ui) = crossbeam_channel::bounded::<ThreadMessage>(100);
  let (tx_tray, rx_tray) = crossbeam_channel::bounded::<ThreadMessage>(100);

  let typing_context = TypingContext::new(
    "Devanagari",
    Some(TypingContextOptions {
      auto_context_clear_time_ms: DEFAULT_AUTO_CONTEXT_CLEAR_TIME_MS,
      use_native_numerals: DEFAULT_USE_NATIVE_NUMERALS,
      include_inherent_vowel: DEFAULT_INCLUDE_INHERENT_VOWEL,
    }),
  )
  .expect("Failed to create typing context");
  let app_state = Arc::new(AppState {
    typing_context: Mutex::new(typing_context),
    typing_enabled: AtomicBool::new(false),
  });

  // Start keyboard hook thread
  let state_clone = Arc::clone(&app_state);
  let tx_ui_clone = tx_ui.clone();
  let tx_tray_clone = tx_tray.clone();
  let _handle_hook = thread::spawn(move || {
    // platform-specific keyboard handler thread
    if let Err(err) = platform::run(state_clone, tx_ui_clone, tx_tray_clone) {
      eprintln!("{err}");
      std::process::exit(1);
    }
  });

  // Start tray icon thread
  let state_clone = Arc::clone(&app_state);
  let tx_ui_clone = tx_ui.clone();
  let _handle_tray = tray::run_tray_thread(state_clone, tx_ui_clone, rx_tray);

  // starts the UI event loop
  let state_clone = Arc::clone(&app_state);
  let tx_tray_clone = tx_tray.clone();
  ui::run(state_clone, rx_ui, tx_tray_clone).unwrap();
}
