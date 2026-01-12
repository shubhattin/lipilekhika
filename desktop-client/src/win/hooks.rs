use super::WinAppState;
use super::constants::*;
use std::cell::RefCell;
use std::mem::size_of;
use std::sync::Arc;
use std::sync::atomic::Ordering;

use windows::Win32::Foundation::{HINSTANCE, LPARAM, LRESULT, WPARAM};
use windows::Win32::UI::Input::KeyboardAndMouse::{
  GetAsyncKeyState, GetKeyState, GetKeyboardLayout, GetKeyboardState, INPUT, INPUT_0,
  INPUT_KEYBOARD, KEYBD_EVENT_FLAGS, KEYBDINPUT, KEYEVENTF_KEYUP, KEYEVENTF_UNICODE,
  MAP_VIRTUAL_KEY_TYPE, MapVirtualKeyW, SendInput, ToUnicodeEx, VIRTUAL_KEY, VK_BACK, VK_CAPITAL,
  VK_CONTROL, VK_LWIN, VK_MENU, VK_RWIN, VK_SHIFT,
};
use windows::Win32::UI::WindowsAndMessaging::{
  CallNextHookEx, HC_ACTION, HHOOK, KBDLLHOOKSTRUCT, LLKHF_ALTDOWN, SetWindowsHookExW,
  UnhookWindowsHookEx, WH_KEYBOARD_LL, WH_MOUSE_LL,
};

thread_local! {
  static STATE: RefCell<Option<Arc<WinAppState>>> = RefCell::new(None);
}

pub fn set_state_for_current_thread(state: Arc<WinAppState>) {
  STATE.with(|cell| {
    *cell.borrow_mut() = Some(state);
  });
}

fn with_state<R>(f: impl FnOnce(&Arc<WinAppState>) -> R) -> Option<R> {
  STATE.with(|cell| cell.borrow().as_ref().map(f))
}

pub struct HookManager {
  keyboard: HHOOK,
  mouse: HHOOK,
}

impl HookManager {
  pub unsafe fn install(hinst: HINSTANCE) -> windows::core::Result<Self> {
    unsafe {
      let keyboard = SetWindowsHookExW(
        WH_KEYBOARD_LL,
        Some(low_level_keyboard_proc),
        Some(hinst),
        0,
      )?;
      let mouse = SetWindowsHookExW(WH_MOUSE_LL, Some(low_level_mouse_proc), Some(hinst), 0)?;
      Ok(Self { keyboard, mouse })
    }
  }
}

impl Drop for HookManager {
  fn drop(&mut self) {
    unsafe {
      let _ = UnhookWindowsHookEx(self.keyboard);
      let _ = UnhookWindowsHookEx(self.mouse);
    }
  }
}

fn clear_context(state: &WinAppState) {
  if let Ok(mut guard) = state.app_state.typing_context.lock() {
    guard.clear_context();
  }
}

/// Check if a key is a modifier key (Shift, Ctrl, Alt, Win, Caps Lock, etc.)
fn is_modifier_key(vk: u32) -> bool {
  matches!(
    vk,
    VK_LSHIFT
      | VK_RSHIFT
      | VK_LCONTROL
      | VK_RCONTROL
      | VK_LMENU
      | VK_RMENU
      | VK_LWIN_KEY
      | VK_RWIN_KEY
      | VK_CAPS_LOCK
      | VK_NUMLOCK
      | super::constants::VK_SCROLL
  )
}

/// Check if a key is a context-clearing key (navigation, deletion, etc.)
fn is_context_clear_key(vk: u32) -> bool {
  matches!(
    vk,
    VK_BACKSPACE
      | VK_DELETE
      | VK_RETURN
      | VK_TAB
      | VK_ESCAPE
      | VK_LEFT
      | VK_RIGHT
      | VK_UP
      | VK_DOWN
      | VK_HOME
      | VK_END
      | VK_PRIOR
      | VK_NEXT
  )
}

/// Check if Ctrl or Win key is currently pressed (for shortcuts like Ctrl+C, Ctrl+V)
fn is_ctrl_or_win_pressed() -> bool {
  unsafe {
    // GetAsyncKeyState returns negative if key is pressed
    GetAsyncKeyState(VK_CONTROL.0 as i32) < 0
      || GetAsyncKeyState(VK_LWIN.0 as i32) < 0
      || GetAsyncKeyState(VK_RWIN.0 as i32) < 0
  }
}

/// Check if Alt key is currently pressed
fn is_alt_pressed() -> bool {
  unsafe { GetAsyncKeyState(VK_MENU.0 as i32) < 0 }
}

/// Send a Unicode string using SendInput (KEYEVENTF_UNICODE)
fn send_unicode_text(s: &str) {
  let mut inputs: Vec<INPUT> = Vec::new();

  for ch in s.encode_utf16() {
    // keydown
    let ki_down = KEYBDINPUT {
      wVk: VIRTUAL_KEY(0),
      wScan: ch,
      dwFlags: KEYEVENTF_UNICODE,
      time: 0,
      dwExtraInfo: 0,
    };
    inputs.push(INPUT {
      r#type: INPUT_KEYBOARD,
      Anonymous: INPUT_0 { ki: ki_down },
    });

    // keyup
    let ki_up = KEYBDINPUT {
      wVk: VIRTUAL_KEY(0),
      wScan: ch,
      dwFlags: KEYEVENTF_UNICODE | KEYEVENTF_KEYUP,
      time: 0,
      dwExtraInfo: 0,
    };
    inputs.push(INPUT {
      r#type: INPUT_KEYBOARD,
      Anonymous: INPUT_0 { ki: ki_up },
    });
  }

  if !inputs.is_empty() {
    unsafe {
      let _ = SendInput(&inputs, size_of::<INPUT>() as i32);
    }
  }
}

/// Send backspace key n times
fn send_backspaces(n: usize) {
  if n == 0 {
    return;
  }

  let mut inputs: Vec<INPUT> = Vec::with_capacity(n * 2);

  for _ in 0..n {
    // keydown
    let ki_down = KEYBDINPUT {
      wVk: VK_BACK,
      wScan: 0,
      dwFlags: KEYBD_EVENT_FLAGS(0),
      time: 0,
      dwExtraInfo: 0,
    };
    inputs.push(INPUT {
      r#type: INPUT_KEYBOARD,
      Anonymous: INPUT_0 { ki: ki_down },
    });

    // keyup
    let ki_up = KEYBDINPUT {
      wVk: VK_BACK,
      wScan: 0,
      dwFlags: KEYEVENTF_KEYUP,
      time: 0,
      dwExtraInfo: 0,
    };
    inputs.push(INPUT {
      r#type: INPUT_KEYBOARD,
      Anonymous: INPUT_0 { ki: ki_up },
    });
  }

  unsafe {
    let _ = SendInput(&inputs, size_of::<INPUT>() as i32);
  }
}

/// Convert a virtual key code + scan code to Unicode using ToUnicodeEx.
/// Returns Some(String) if conversion yields at least one character.
///
/// NOTE: In a low-level keyboard hook, GetKeyboardState() doesn't reliably
/// reflect the current state of modifier keys (Shift, Ctrl, Alt) or toggle
/// keys (Caps Lock). We must patch the keystate array manually using
/// GetAsyncKeyState (for pressed state) and GetKeyState (for toggle state).
fn vk_to_unicode(vk: u32, scan: u32) -> Option<String> {
  let mut keystate = [0u8; 256];

  unsafe {
    // Start with whatever GetKeyboardState gives us (may be stale for modifiers)
    let _ = GetKeyboardState(&mut keystate);

    // Patch modifier keys with their real-time pressed state
    // Helper to set the high bit (0x80) if key is currently pressed
    fn patch_pressed(keystate: &mut [u8; 256], vk: VIRTUAL_KEY) {
      unsafe {
        let state = GetAsyncKeyState(vk.0 as i32);
        if state < 0 {
          // Key is pressed - set high bit
          keystate[vk.0 as usize] |= 0x80;
        } else {
          // Key is not pressed - clear high bit
          keystate[vk.0 as usize] &= !0x80;
        }
      }
    }

    patch_pressed(&mut keystate, VK_SHIFT);
    patch_pressed(&mut keystate, VK_CONTROL);
    patch_pressed(&mut keystate, VK_MENU); // Alt

    // Caps Lock is a toggle key - check the low bit via GetKeyState
    let caps_state = GetKeyState(VK_CAPITAL.0 as i32);
    if (caps_state & 1) != 0 {
      // Caps Lock is ON - set toggle bit
      keystate[VK_CAPITAL.0 as usize] |= 0x01;
    } else {
      // Caps Lock is OFF - clear toggle bit
      keystate[VK_CAPITAL.0 as usize] &= !0x01;
    }
  }

  let mut buf = [0u16; 8];
  let layout = unsafe { GetKeyboardLayout(0) };

  let result = unsafe { ToUnicodeEx(vk, scan, &keystate, &mut buf, 0, Some(layout)) };

  if result > 0 {
    let slice = &buf[..result as usize];
    return Some(String::from_utf16_lossy(slice));
  }

  None
}

/// Low-level mouse hook procedure - clears context on any mouse click
unsafe extern "system" fn low_level_mouse_proc(
  code: i32,
  wparam: WPARAM,
  lparam: LPARAM,
) -> LRESULT {
  if code == HC_ACTION as i32 {
    let msg = wparam.0 as u32;

    // Clear context on any mouse button click (like onblur in web)
    if msg == WM_LBUTTONDOWN || msg == WM_RBUTTONDOWN || msg == WM_MBUTTONDOWN {
      let _ = with_state(|state| {
        if state.app_state.typing_enabled.load(Ordering::SeqCst) {
          clear_context(state);
        }
      });
    }
  }

  // Always pass mouse events through
  unsafe { CallNextHookEx(Some(HHOOK::default()), code, wparam, lparam) }
}

/// Low-level keyboard hook procedure
unsafe extern "system" fn low_level_keyboard_proc(
  code: i32,
  wparam: WPARAM,
  lparam: LPARAM,
) -> LRESULT {
  unsafe {
    if code != HC_ACTION as i32 {
      return CallNextHookEx(Some(HHOOK::default()), code, wparam, lparam);
    }

    let Some(result) = with_state(|state| {
      let kb = &*(lparam.0 as *const KBDLLHOOKSTRUCT);
      let vk = kb.vkCode;
      let scan = MapVirtualKeyW(vk, MAP_VIRTUAL_KEY_TYPE(0)); // MAPVK_VK_TO_VSC = 0

      let msg = wparam.0 as u32;
      let is_keydown = msg == WM_KEYDOWN || msg == WM_SYSKEYDOWN;

      // Important: ignore injected keys (we use SendInput which would otherwise re-enter this hook).
      // If we don't do this (and if we hold locks while injecting), the hook can deadlock / stop working.
      let is_injected = (kb.flags.0 & LLKHF_INJECTED_FLAG) != 0;
      if is_injected {
        return CallNextHookEx(Some(HHOOK::default()), code, wparam, lparam);
      }

      // ---- Handle Alt+X toggle (works regardless of typing mode) ----
      if is_keydown && vk == VK_X && (kb.flags.0 & LLKHF_ALTDOWN.0) != 0 {
        let prev = state
          .app_state
          .typing_enabled
          .fetch_xor(true, Ordering::SeqCst);
        // ^ a xor 1 = !a
        let now_enabled = !prev;

        if now_enabled {
          println!("[Typing Mode: ON] - Press Alt+X to disable");
        } else {
          println!("[Typing Mode: OFF] - Press Alt+X to enable");
          clear_context(state);
        }

        // Suppress Alt+X so it doesn't reach apps
        return LRESULT(1);
      }

      // If typing mode is disabled, pass everything through
      // like preventDefault in web
      if !state.app_state.typing_enabled.load(Ordering::SeqCst) {
        return CallNextHookEx(Some(HHOOK::default()), code, wparam, lparam);
      }

      // ---- Typing mode is enabled ----

      // 1. Always pass through modifier-only keys (Shift, Ctrl, Alt, Win, Caps Lock, etc.)
      //    These are needed for capitalization and shortcuts
      if is_modifier_key(vk) {
        return CallNextHookEx(Some(HHOOK::default()), code, wparam, lparam);
      }

      // Only process on keydown
      if !is_keydown {
        return CallNextHookEx(Some(HHOOK::default()), code, wparam, lparam);
      }

      // 2. Clear context and pass through for navigation/editing keys
      if is_context_clear_key(vk) {
        clear_context(state);
        return CallNextHookEx(Some(HHOOK::default()), code, wparam, lparam);
      }

      // 3. Pass through shortcuts (Ctrl+anything, Win+anything, Alt+anything except Alt+X)
      //    This allows Ctrl+C, Ctrl+V, Ctrl+Z, Win+D, Alt+Tab, etc. to work
      if is_ctrl_or_win_pressed() {
        clear_context(state);
        return CallNextHookEx(Some(HHOOK::default()), code, wparam, lparam);
      }

      // Alt combinations (except Alt+X which is handled above)
      if is_alt_pressed() {
        clear_context(state);
        return CallNextHookEx(Some(HHOOK::default()), code, wparam, lparam);
      }

      // 4. Try to convert to Unicode character and process through typing context
      if let Some(text) = vk_to_unicode(vk, scan) {
        // Normalize to a single scalar before feeding TypingContext.
        // Important: do NOT lowercase here. Uppercase characters (Shift/CapsLock)
        // are meaningful for some typing schemes (e.g. A vs a), and the JS/web
        // implementation passes the character through as-is.
        let mut chars = text.chars();
        if let Some(first) = chars.next() {
          if first.is_control() {
            return CallNextHookEx(Some(HHOOK::default()), code, wparam, lparam);
          }

          let key: String = first.to_string();

          // NOTE: Do NOT call SendInput while holding the context lock.
          // SendInput creates injected key events that re-enter this same hook, which can deadlock.
          let diff = {
            let mut guard = match state.app_state.typing_context.lock() {
              Ok(g) => g,
              Err(_) => return CallNextHookEx(Some(HHOOK::default()), code, wparam, lparam),
            };
            match guard.take_key_input(&key) {
              Ok(d) => d,
              Err(_e) => {
                guard.clear_context();
                return CallNextHookEx(Some(HHOOK::default()), code, wparam, lparam);
              }
            }
          };

          // Now inject, with the lock released.
          if diff.to_delete_chars_count > 0 {
            send_backspaces(diff.to_delete_chars_count);
          }
          if !diff.diff_add_text.is_empty() {
            send_unicode_text(&diff.diff_add_text);
          }

          // Suppress original key (we've already handled it)
          return LRESULT(1);
        }
      }

      // Not handled — pass to next hook
      CallNextHookEx(Some(HHOOK::default()), code, wparam, lparam)
    }) else {
      return CallNextHookEx(Some(HHOOK::default()), code, wparam, lparam);
    };

    result
  }
}
