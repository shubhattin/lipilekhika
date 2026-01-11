use std::sync::Arc;

use windows::Win32::Foundation::HINSTANCE;
use windows::Win32::System::LibraryLoader::GetModuleHandleW;
use windows::Win32::UI::WindowsAndMessaging::{
  DispatchMessageW, GetMessageW, TranslateMessage, MSG,
};

use super::WinAppState;

pub fn run(app_state: Arc<crate::AppState>) -> windows::core::Result<()> {
  let win_state = Arc::new(WinAppState { app_state });

  // The low-level hook callbacks can't capture state, so we store `Arc<WinAppState>`
  // in TLS for the installing thread.
  super::hooks::set_state_for_current_thread(win_state);

  unsafe {
    let hinst: HINSTANCE = GetModuleHandleW(None)?.into();
    let _hooks = super::hooks::HookManager::install(hinst)?;

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
