#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
// ^ hides console in windows release builds

use lipilekhika::Script;
use lipilekhika::typing::{
  DEFAULT_AUTO_CONTEXT_CLEAR_TIME_MS, TypingContext, TypingContextOptions,
};
use persistent_state::PersitentState;
use std::{
  str::FromStr,
  sync::{Arc, Mutex, atomic::AtomicBool},
  thread,
};

mod data;
mod persistent_state;
mod platform;
mod posthog;
mod tray;
mod ui;
mod version_check;

/// shared app state for both the platform specific hook code, UI, etc
pub struct AppState {
  pub typing_enabled: AtomicBool,
  /// both typing script and typing options are stored in the typing context
  pub typing_context: Mutex<TypingContext>,
  pub persitent_state: Mutex<PersitentState>,
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
  #[cfg_attr(not(any(windows, target_os = "macos")), allow(dead_code))]
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
  /// send from tray: open the Lipi Parivartaka window
  OpenParivartaka,
  // Close app request from hook (shortcut)
  CloseApp,
}

/// What the app opens with, from the command line
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StartupView {
  /// the typing tool window (default)
  Main,
  /// only the Lipi Parivartaka window (`--parivartaka`), as its own start menu entry did before
  Parivartaka,
  /// only the typing help (`--typing-help`, `--compare` for its Compare tab)
  TypingHelp { compare: bool },
}

fn main() {
  let has_arg = |name: &str| std::env::args().any(|a| a == name);
  let startup_view = if has_arg("--parivartaka") {
    StartupView::Parivartaka
  } else if has_arg("--typing-help") || has_arg("--compare") {
    StartupView::TypingHelp {
      compare: has_arg("--compare"),
    }
  } else {
    StartupView::Main
  };

  // Create separate channels for UI and Tray
  // Each component gets its own dedicated receiver to avoid message competition
  let (tx_ui, rx_ui) = crossbeam_channel::bounded::<ThreadMessage>(100);
  let (tx_tray, rx_tray) = crossbeam_channel::bounded::<ThreadMessage>(100);

  let persitent_state = PersitentState::read_app_config();

  let script = Script::from_str(&persitent_state.script).unwrap_or(Script::Devanagari);
  let typing_context = TypingContext::new(
    script,
    Some(TypingContextOptions {
      auto_context_clear_time_ms: DEFAULT_AUTO_CONTEXT_CLEAR_TIME_MS,
      use_native_numerals: persitent_state.native_numerals,
      include_inherent_vowel: persitent_state.inherent_vowel,
    }),
  );
  let app_state = Arc::new(AppState {
    typing_context: Mutex::new(typing_context),
    typing_enabled: AtomicBool::new(false),
    persitent_state: Mutex::new(persitent_state),
  });

  // Lipi Parivartaka (or the typing help) opened on its own, from its start menu entry, runs
  // without the keyboard hook and the tray: the typing tool may be running already, and a second
  // hook would type every key twice.
  let standalone = startup_view != StartupView::Main;

  // Start keyboard hook thread (Windows and macOS only, Linux has no system wide typing yet)
  if platform::SYSTEM_TYPING_SUPPORTED && !standalone {
    let state_clone = Arc::clone(&app_state);
    let tx_ui_clone = tx_ui.clone();
    let tx_tray_clone = tx_tray.clone();
    thread::spawn(move || {
      // platform-specific keyboard handler thread
      if let Err(err) = platform::run(state_clone, tx_ui_clone, tx_tray_clone) {
        eprintln!("{err}");
        std::process::exit(1);
      }
    });
  }

  if !standalone {
    // Start tray icon thread
    let state_clone = Arc::clone(&app_state);
    let tx_ui_clone = tx_ui.clone();
    let _handle_tray = tray::run_tray_thread(state_clone, tx_ui_clone, rx_tray);

    thread::spawn(|| {
      posthog::init_posthog();
    });
  }

  // starts the UI event loop
  ui::run(app_state, rx_ui, tx_tray, startup_view);
}
