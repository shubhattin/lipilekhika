//! Low-level Windows keyboard hook for transliteration typing.
//!
//! - Toggle typing mode with Alt+X (starts disabled)
//! - Suppresses original key events while typing is enabled
//! - Feeds printable keys into TypingContext for transliteration
//! - Injects Unicode text (and backspaces) into the active window via SendInput
//! - Clears context on navigation keys, mouse clicks, and modifier shortcuts

#![cfg(windows)]

use once_cell::sync::Lazy;
use std::mem::size_of;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};

use windows::Win32::Foundation::{HINSTANCE, LPARAM, LRESULT, WPARAM};
use windows::Win32::Graphics::Gdi::{
  BeginPaint, DrawTextW, EndPaint, SetBkColor, SetTextColor, DT_CENTER, DT_SINGLELINE, DT_VCENTER,
  PAINTSTRUCT,
};
use windows::Win32::System::LibraryLoader::GetModuleHandleW;
use windows::Win32::UI::Input::KeyboardAndMouse::{
  GetAsyncKeyState, GetKeyState, GetKeyboardLayout, GetKeyboardState, MapVirtualKeyW, SendInput,
  ToUnicodeEx, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT, KEYBD_EVENT_FLAGS, KEYEVENTF_KEYUP,
  KEYEVENTF_UNICODE, MAP_VIRTUAL_KEY_TYPE, VIRTUAL_KEY, VK_BACK, VK_CAPITAL, VK_CONTROL, VK_LWIN,
  VK_MENU, VK_RWIN, VK_SHIFT,
};
use windows::Win32::UI::WindowsAndMessaging::{
  CallNextHookEx, CreateWindowExW, DefWindowProcW, DestroyWindow, DispatchMessageW, GetClientRect,
  GetMessageW, GetSystemMetrics, KillTimer, RegisterClassExW, SetLayeredWindowAttributes, SetTimer,
  SetWindowsHookExW, ShowWindow, TranslateMessage, UnhookWindowsHookEx, HC_ACTION, HHOOK,
  KBDLLHOOKSTRUCT, LLKHF_ALTDOWN, LWA_ALPHA, MSG, SM_CXSCREEN, SM_CYSCREEN, SW_SHOW,
  WH_KEYBOARD_LL, WH_MOUSE_LL, WM_DESTROY, WM_PAINT, WM_TIMER, WNDCLASSEXW, WS_EX_LAYERED,
  WS_EX_TOOLWINDOW, WS_EX_TOPMOST, WS_POPUP,
};

use lipilekhika::typing::{create_typing_context, TypingContext};

// ---- Virtual Key Constants ----

// Message types
const WM_KEYDOWN: u32 = 0x0100;
const WM_SYSKEYDOWN: u32 = 0x0104;

// KBDLLHOOKSTRUCT flags
// https://learn.microsoft.com/en-us/windows/win32/api/winuser/ns-winuser-kbdllhookstruct
const LLKHF_INJECTED_FLAG: u32 = 0x00000010;

// Mouse messages
const WM_LBUTTONDOWN: u32 = 0x0201;
const WM_RBUTTONDOWN: u32 = 0x0204;
const WM_MBUTTONDOWN: u32 = 0x0207;

// Letters
const VK_X: u32 = 0x58;

// Navigation & editing keys that should clear context
const VK_LEFT: u32 = 0x25;
const VK_UP: u32 = 0x26;
const VK_RIGHT: u32 = 0x27;
const VK_DOWN: u32 = 0x28;
const VK_HOME: u32 = 0x24;
const VK_END: u32 = 0x23;
const VK_PRIOR: u32 = 0x21; // Page Up
const VK_NEXT: u32 = 0x22; // Page Down
const VK_DELETE: u32 = 0x2E;
const VK_RETURN: u32 = 0x0D;
const VK_TAB: u32 = 0x09;
const VK_ESCAPE: u32 = 0x1B;
const VK_BACKSPACE: u32 = 0x08;

// Modifier keys (should pass through without processing)
const VK_LSHIFT: u32 = 0xA0;
const VK_RSHIFT: u32 = 0xA1;
const VK_LCONTROL: u32 = 0xA2;
const VK_RCONTROL: u32 = 0xA3;
const VK_LMENU: u32 = 0xA4; // Left Alt
const VK_RMENU: u32 = 0xA5; // Right Alt
const VK_LWIN_KEY: u32 = 0x5B;
const VK_RWIN_KEY: u32 = 0x5C;
const VK_CAPS_LOCK: u32 = 0x14; // Caps Lock (using different name to avoid conflict with VK_CAPITAL import)
const VK_NUMLOCK: u32 = 0x90;
const VK_SCROLL: u32 = 0x91; // Scroll Lock

// ---- Globals accessible from hook callback ----

/// Whether typing mode is currently enabled (toggle with Alt+X)
static TYPING_ENABLED: Lazy<Arc<AtomicBool>> = Lazy::new(|| Arc::new(AtomicBool::new(false)));

/// The typing context wrapped in a Mutex for thread-safe access from the hook callback
static TYPING_CONTEXT: Lazy<Arc<Mutex<Option<TypingContext>>>> =
  Lazy::new(|| Arc::new(Mutex::new(None)));

/// Global keyboard hook handle
static mut KEYBOARD_HOOK: Option<HHOOK> = None;

/// Global mouse hook handle
static mut MOUSE_HOOK: Option<HHOOK> = None;

/// Notification window class name
static WINDOW_CLASS_NAME: &str = "LipilekhikaNotification";

/// Notification window handle
static mut NOTIFICATION_HWND: Option<windows::Win32::Foundation::HWND> = None;

/// Current notification message
static mut NOTIFICATION_MESSAGE: Option<String> = None;

/// Whether the notification window class has been registered
static mut WINDOW_CLASS_REGISTERED: bool = false;

// ---- Helper functions ----

/// Clear the typing context
fn clear_context() {
  if let Ok(mut guard) = TYPING_CONTEXT.lock() {
    if let Some(ctx) = guard.as_mut() {
      ctx.clear_context();
    }
  }
}

/// Show a notification popup in the middle-top of the screen
fn show_notification(message: &str) {
  unsafe {
    // Hide any existing notification
    if let Some(hwnd) = NOTIFICATION_HWND {
      let _ = KillTimer(hwnd, 1);
      let _ = DestroyWindow(hwnd);
      NOTIFICATION_HWND = None;
    }

    // Store the message
    NOTIFICATION_MESSAGE = Some(message.to_string());

    // Define class name
    let class_name_wide: Vec<u16> = WINDOW_CLASS_NAME
      .encode_utf16()
      .chain(std::iter::once(0))
      .collect();

    // Register window class if not already done
    if !WINDOW_CLASS_REGISTERED {
      let mut wc = WNDCLASSEXW::default();
      wc.cbSize = std::mem::size_of::<WNDCLASSEXW>() as u32;
      wc.lpfnWndProc = Some(notification_window_proc);
      wc.hInstance = windows::Win32::System::LibraryLoader::GetModuleHandleW(None)
        .unwrap()
        .into();
      wc.lpszClassName = windows::core::PCWSTR(class_name_wide.as_ptr());

      if RegisterClassExW(&wc) == 0 {
        eprintln!("Failed to register window class");
        return;
      }

      WINDOW_CLASS_REGISTERED = true;
    }

    // Get screen dimensions
    let screen_width = GetSystemMetrics(SM_CXSCREEN);
    let screen_height = GetSystemMetrics(SM_CYSCREEN);

    // Calculate window position (middle-top)
    let window_width = 300;
    let window_height = 60;
    let x = (screen_width - window_width) / 2;
    let y = screen_height / 8; // Top quarter of screen

    // Create window
    let title_wide: Vec<u16> = "Lipilekhika"
      .encode_utf16()
      .chain(std::iter::once(0))
      .collect();

    let hwnd = CreateWindowExW(
      WS_EX_TOPMOST | WS_EX_LAYERED | WS_EX_TOOLWINDOW,
      windows::core::PCWSTR(class_name_wide.as_ptr()),
      windows::core::PCWSTR(title_wide.as_ptr()),
      WS_POPUP,
      x,
      y,
      window_width,
      window_height,
      None,
      None,
      windows::Win32::System::LibraryLoader::GetModuleHandleW(None).unwrap(),
      None,
    );

    let hwnd = match hwnd {
      Ok(hwnd) => hwnd,
      Err(_) => {
        eprintln!("Failed to create notification window");
        return;
      }
    };

    NOTIFICATION_HWND = Some(hwnd);

    // Set window transparency
    SetLayeredWindowAttributes(
      hwnd,
      windows::Win32::Foundation::COLORREF(0),
      220, // Alpha value (0-255, 255 = opaque)
      LWA_ALPHA,
    )
    .ok();

    // Show window
    let _ = ShowWindow(hwnd, SW_SHOW);

    // Set timer to hide window after 1500ms
    SetTimer(hwnd, 1, 1500, None);
  }
}

/// Window procedure for the notification window
unsafe extern "system" fn notification_window_proc(
  hwnd: windows::Win32::Foundation::HWND,
  msg: u32,
  wparam: windows::Win32::Foundation::WPARAM,
  lparam: windows::Win32::Foundation::LPARAM,
) -> windows::Win32::Foundation::LRESULT {
  match msg {
    WM_PAINT => {
      let mut ps = PAINTSTRUCT::default();
      let hdc = BeginPaint(hwnd, &mut ps);

      // Get the message from the static variable
      if let Some(ref message_str) = NOTIFICATION_MESSAGE {
        // Draw text
        let text_color = SetTextColor(hdc, windows::Win32::Foundation::COLORREF(0x00FFFFFF));
        let bk_color = SetBkColor(hdc, windows::Win32::Foundation::COLORREF(0x00000000));

        let mut rect = windows::Win32::Foundation::RECT::default();
        let _ = GetClientRect(hwnd, &mut rect);

        let mut text_buffer = message_str.encode_utf16().collect::<Vec<_>>();
        DrawTextW(
          hdc,
          &mut text_buffer,
          &mut rect,
          DT_CENTER | DT_VCENTER | DT_SINGLELINE,
        );

        SetTextColor(hdc, text_color);
        SetBkColor(hdc, bk_color);
      }

      let _ = EndPaint(hwnd, &ps);
      windows::Win32::Foundation::LRESULT(0)
    }
    WM_TIMER => {
      // Timer fired, hide and destroy the window
      let _ = KillTimer(hwnd, wparam.0 as usize);
      let _ = DestroyWindow(hwnd);
      NOTIFICATION_HWND = None;
      NOTIFICATION_MESSAGE = None;
      windows::Win32::Foundation::LRESULT(0)
    }
    WM_DESTROY => {
      NOTIFICATION_HWND = None;
      NOTIFICATION_MESSAGE = None;
      windows::Win32::Foundation::LRESULT(0)
    }
    _ => DefWindowProcW(hwnd, msg, wparam, lparam),
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
      | VK_SCROLL
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

/// Check if Shift key is currently pressed
#[allow(dead_code)]
fn is_shift_pressed() -> bool {
  unsafe { GetAsyncKeyState(VK_SHIFT.0 as i32) < 0 }
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

  let result = unsafe { ToUnicodeEx(vk, scan, &keystate, &mut buf, 0, layout) };

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
      if TYPING_ENABLED.load(Ordering::SeqCst) {
        clear_context();
      }
    }
  }

  // Always pass mouse events through
  CallNextHookEx(HHOOK::default(), code, wparam, lparam)
}

/// Low-level keyboard hook procedure
unsafe extern "system" fn low_level_keyboard_proc(
  code: i32,
  wparam: WPARAM,
  lparam: LPARAM,
) -> LRESULT {
  if code != HC_ACTION as i32 {
    return CallNextHookEx(HHOOK::default(), code, wparam, lparam);
  }

  let kb = &*(lparam.0 as *const KBDLLHOOKSTRUCT);
  let vk = kb.vkCode;
  let scan = MapVirtualKeyW(vk, MAP_VIRTUAL_KEY_TYPE(0)); // MAPVK_VK_TO_VSC = 0

  let msg = wparam.0 as u32;
  let is_keydown = msg == WM_KEYDOWN || msg == WM_SYSKEYDOWN;

  // Important: ignore injected keys (we use SendInput which would otherwise re-enter this hook).
  // If we don't do this (and if we hold locks while injecting), the hook can deadlock / stop working.
  let is_injected = (kb.flags.0 & LLKHF_INJECTED_FLAG) != 0;
  if is_injected {
    return CallNextHookEx(HHOOK::default(), code, wparam, lparam);
  }

  // ---- Handle Alt+X toggle (works regardless of typing mode) ----
  if is_keydown && vk == VK_X && (kb.flags.0 & LLKHF_ALTDOWN.0) != 0 {
    let enabled = TYPING_ENABLED.clone();
    let prev = enabled.fetch_xor(true, Ordering::SeqCst);
    let now_enabled = !prev;

    if now_enabled {
      println!("[Typing Mode: ON] - Press Alt+X to disable");
      show_notification("Typing Mode: ON");
    } else {
      println!("[Typing Mode: OFF] - Press Alt+X to enable");
      clear_context();
      show_notification("Typing Mode: OFF");
    }

    // Suppress Alt+X so it doesn't reach apps
    return LRESULT(1);
  }

  // If typing mode is disabled, pass everything through
  if !TYPING_ENABLED.load(Ordering::SeqCst) {
    return CallNextHookEx(HHOOK::default(), code, wparam, lparam);
  }

  // ---- Typing mode is enabled ----

  // 1. Always pass through modifier-only keys (Shift, Ctrl, Alt, Win, Caps Lock, etc.)
  //    These are needed for capitalization and shortcuts
  if is_modifier_key(vk) {
    return CallNextHookEx(HHOOK::default(), code, wparam, lparam);
  }

  // Only process on keydown
  if !is_keydown {
    return CallNextHookEx(HHOOK::default(), code, wparam, lparam);
  }

  // 2. Clear context and pass through for navigation/editing keys
  if is_context_clear_key(vk) {
    clear_context();
    return CallNextHookEx(HHOOK::default(), code, wparam, lparam);
  }

  // 3. Pass through shortcuts (Ctrl+anything, Win+anything, Alt+anything except Alt+X)
  //    This allows Ctrl+C, Ctrl+V, Ctrl+Z, Win+D, Alt+Tab, etc. to work
  if is_ctrl_or_win_pressed() {
    clear_context();
    return CallNextHookEx(HHOOK::default(), code, wparam, lparam);
  }

  // Alt combinations (except Alt+X which is handled above)
  if is_alt_pressed() {
    clear_context();
    return CallNextHookEx(HHOOK::default(), code, wparam, lparam);
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
        return CallNextHookEx(HHOOK::default(), code, wparam, lparam);
      }

      let key: String = first.to_string();

      // NOTE: Do NOT call SendInput while holding the context lock.
      // SendInput creates injected key events that re-enter this same hook, which can deadlock.
      let diff = {
        let mut guard = match TYPING_CONTEXT.lock() {
          Ok(g) => g,
          Err(_) => return CallNextHookEx(HHOOK::default(), code, wparam, lparam),
        };
        let Some(ctx) = guard.as_mut() else {
          return CallNextHookEx(HHOOK::default(), code, wparam, lparam);
        };
        match ctx.take_key_input(&key) {
          Ok(d) => d,
          Err(_e) => {
            ctx.clear_context();
            return CallNextHookEx(HHOOK::default(), code, wparam, lparam);
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
  CallNextHookEx(HHOOK::default(), code, wparam, lparam)
}

fn main() -> windows::core::Result<()> {
  // Create TypingContext (default: Devanagari — change as needed)
  let context = create_typing_context("Devanagari", None).expect("Failed to create typing context");
  {
    let mut guard = TYPING_CONTEXT.lock().unwrap();
    *guard = Some(context);
  }

  unsafe {
    let hinst: HINSTANCE = GetModuleHandleW(None)?.into();

    // Install keyboard hook
    let kb_hook = SetWindowsHookExW(WH_KEYBOARD_LL, Some(low_level_keyboard_proc), hinst, 0)?;
    KEYBOARD_HOOK = Some(kb_hook);

    // Install mouse hook (for clearing context on click, like onblur in web)
    let mouse_hook = SetWindowsHookExW(WH_MOUSE_LL, Some(low_level_mouse_proc), hinst, 0)?;
    MOUSE_HOOK = Some(mouse_hook);

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

    // Cleanup
    let _ = UnhookWindowsHookEx(kb_hook);
    let _ = UnhookWindowsHookEx(mouse_hook);
  }

  Ok(())
}
