#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
// ^ hides console in windows release builds
// Lipi Parivartaka on its own (no `typing-tool` feature) leaves the typing tool's helpers unused
// (the linker drops them); only its modules (main window, tray, hook) are left out
#![cfg_attr(not(feature = "typing-tool"), allow(dead_code))]

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
mod portable;
mod posthog;
#[cfg(feature = "typing-tool")]
mod single_instance;
#[cfg(feature = "typing-tool")]
mod tray;
mod ui;
mod version_check;

/// shared app state for both the platform specific hook code, UI, etc
pub struct AppState {
  pub typing_enabled: AtomicBool,
  /// both typing script and typing options are stored in the typing context
  pub typing_context: Mutex<TypingContext>,
  pub persitent_state: Mutex<PersitentState>,
  /// one of the app's windows is in front: the keyboard hook leaves its keys alone (macOS; on
  /// Windows the hook asks the system)
  #[cfg_attr(not(target_os = "macos"), allow(dead_code))]
  pub app_window_active: AtomicBool,
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
  #[cfg_attr(
    not(all(feature = "typing-tool", any(windows, target_os = "macos"))),
    allow(dead_code)
  )]
  KeyboardHook,
  UI,
  Tray,
  /// a second start of the app, handed over to the running one
  OtherStart,
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
  /// only the Lipi Parivartaka window (`--parivartaka`), the typing tool stays in the tray
  Parivartaka,
  /// only the typing help (`--typing-help`, `--compare` for its Compare tab)
  TypingHelp { compare: bool },
}

fn main() {
  let has_arg = |name: &str| std::env::args().any(|a| a == name);
  // Lipi Parivartaka on its own (without the typing tool) opens straight into it
  let startup_view = if !cfg!(feature = "typing-tool") || has_arg("--parivartaka") {
    StartupView::Parivartaka
  } else if has_arg("--typing-help") || has_arg("--compare") {
    StartupView::TypingHelp {
      compare: has_arg("--compare"),
    }
  } else {
    StartupView::Main
  };

  // the app runs once: a second start only brings the running app forward
  #[cfg(feature = "typing-tool")]
  if single_instance::forward_to_running_app(startup_view) {
    return;
  }

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
    app_window_active: AtomicBool::new(false),
  });

  // Start keyboard hook thread (Windows and macOS only, Linux has no system wide typing yet).
  // The hook leaves the app's own windows alone: Lipi Parivartaka types with its own typing.
  if platform::SYSTEM_TYPING_SUPPORTED {
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

  // Start tray icon thread
  #[cfg(feature = "typing-tool")]
  let _handle_tray = tray::run_tray_thread(Arc::clone(&app_state), tx_ui.clone(), rx_tray);
  #[cfg(not(feature = "typing-tool"))]
  drop(rx_tray);

  thread::spawn(|| {
    posthog::init_posthog();
  });

  #[cfg(feature = "typing-tool")]
  single_instance::listen(tx_ui.clone());

  // the portable app's fonts, there for all apps until the app quits
  let _fonts = portable::SessionFonts::load();

  // starts the UI event loop
  ui::run(app_state, rx_ui, tx_tray, startup_view);
}
