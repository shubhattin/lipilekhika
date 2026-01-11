#![cfg(windows)]

use std::sync::atomic::AtomicBool;
use std::sync::{Arc, Mutex};

use windows::Win32::Foundation::HINSTANCE;
use windows::Win32::System::LibraryLoader::GetModuleHandleW;
use windows::Win32::UI::WindowsAndMessaging::{
  DispatchMessageW, GetMessageW, TranslateMessage, MSG,
};

use lipilekhika::typing::create_typing_context;

mod win;

fn main() -> windows::core::Result<()> {
  // Create TypingContext (default: Devanagari — change as needed)
  let context = create_typing_context("Devanagari", None).expect("Failed to create typing context");

  let state = Arc::new(win::AppState {
    typing_enabled: AtomicBool::new(false),
    typing_context: Mutex::new(context),
    notifier: win::notification::Notifier::new(),
  });

  // The low-level hook callbacks can't capture state, so we store `Arc<AppState>`
  // in TLS for the installing thread.
  win::hooks::set_state_for_current_thread(state);

  unsafe {
    let hinst: HINSTANCE = GetModuleHandleW(None)?.into();

    let _hooks = win::hooks::HookManager::install(hinst)?;

    println!("╔══════════════════════════════════════════════════════════════╗");
    println!("║                    Lipilekhika Typing Hook                   ║");
    println!("╠══════════════════════════════════════════════════════════════╣");
    println!("║  Toggle: Alt+X  (currently DISABLED)                         ║");
    println!("║  Script: Devanagari                                          ║");
    println!("║                                                              ║");
    println!("║  Press Ctrl+C in this console to exit                        ║");
    println!("╚══════════════════════════════════════════════════════════════╝");

    // Message loop to keep process alive and allow hooks to run
    let mut msg = MSG::default();
    while GetMessageW(&mut msg, None, 0, 0).into() {
      let _ = TranslateMessage(&msg);
      DispatchMessageW(&msg);
    }
  }

  Ok(())
}
