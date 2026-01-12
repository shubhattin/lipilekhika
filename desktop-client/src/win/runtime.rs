use std::sync::Arc;
use std::sync::mpsc::Sender;

use windows::Win32::Foundation::HINSTANCE;
use windows::Win32::System::LibraryLoader::GetModuleHandleW;
use windows::Win32::UI::WindowsAndMessaging::{
  DispatchMessageW, GetMessageW, MSG, TranslateMessage,
};

use super::WinAppState;

pub fn run(
  app_state: Arc<crate::AppState>,
  tx: Sender<crate::ThreadMessage>,
) -> windows::core::Result<()> {
  let win_state = Arc::new(WinAppState { app_state, tx });

  // The low-level hook callbacks can't capture state, so we store `Arc<WinAppState>`
  // in TLS for the installing thread.
  super::hooks::set_state_for_current_thread(win_state);

  unsafe {
    let hinst: HINSTANCE = GetModuleHandleW(None)?.into();
    let _hooks = super::hooks::HookManager::install(hinst)?;

    // Message loop to keep process alive and allow hooks to run
    let mut msg = MSG::default();
    loop {
      let ret = GetMessageW(&mut msg, None, 0, 0);
      if ret.0 == 0 {
        break; // WM_QUIT received  
      }
      if ret.0 == -1 {
        // Error occurred - could log or return error
        break;
      }
      let _ = TranslateMessage(&msg);
      DispatchMessageW(&msg);
    }
  }

  Ok(())
}
