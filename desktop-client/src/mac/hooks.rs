use crate::{ThreadMessage, ThreadMessageOrigin, ThreadMessageType};

use super::MacAppState;
use super::constants::*;
use core_foundation::base::TCFType;
use core_foundation::mach_port::{CFMachPort, CFMachPortRef};
use std::sync::Arc;
use std::sync::Mutex;
use std::sync::atomic::Ordering;

use core_graphics::event::{
  CGEvent, CGEventFlags, CGEventTapLocation, CGEventTapProxy, CGEventType, CallbackResult,
  EventField, KeyCode,
};
use core_graphics::event_source::{CGEventSource, CGEventSourceStateID};
use foreign_types::ForeignType;

/// Sentinel set on injected events' `EVENT_SOURCE_USER_DATA` field
/// so the tap callback can skip them (analogous to LLKHF_INJECTED_FLAG on Windows).
const INJECTED_EVENT_SENTINEL: i64 = 0x4C49_5049; // "LIPI"

fn clear_context(state: &MacAppState) {
  if let Ok(mut guard) = state.app_state.typing_context.lock() {
    guard.clear_context();
  }
}

fn is_modifier_key(keycode: u16) -> bool {
  matches!(
    keycode,
    VK_SHIFT
      | VK_RIGHT_SHIFT
      | VK_CONTROL
      | VK_RIGHT_CONTROL
      | VK_OPTION
      | VK_RIGHT_OPTION
      | VK_COMMAND
      | VK_RIGHT_COMMAND
      | VK_CAPS_LOCK
      | VK_FUNCTION
  )
}

fn is_context_clear_key(keycode: u16) -> bool {
  matches!(
    keycode,
    VK_DELETE
      | VK_FORWARD_DELETE
      | VK_RETURN
      | VK_TAB
      | VK_ESCAPE
      | VK_LEFT
      | VK_RIGHT
      | VK_UP
      | VK_DOWN
      | VK_HOME
      | VK_END
      | VK_PAGE_UP
      | VK_PAGE_DOWN
  )
}

// ---- Input injection helpers ----

/// Tag an event as injected so the tap callback skips it.
fn tag_injected(event: &CGEvent) {
  event.set_integer_value_field(EventField::EVENT_SOURCE_USER_DATA, INJECTED_EVENT_SENTINEL);
}

/// Post a key down+up pair for `keycode`, optionally setting the Unicode string.
fn post_key(source: CGEventSource, keycode: u16, text: Option<&str>) {
  if let Ok(down) = CGEvent::new_keyboard_event(source.clone(), keycode, true) {
    if let Some(s) = text {
      down.set_string(s);
    }
    tag_injected(&down);
    down.post(CGEventTapLocation::HID);
  }
  if let Ok(up) = CGEvent::new_keyboard_event(source, keycode, false) {
    tag_injected(&up);
    up.post(CGEventTapLocation::HID);
  }
}

/// Send a Unicode string via a single SPACE key event with the string attached.
fn send_unicode_text(s: &str) {
  let Some(source) = CGEventSource::new(CGEventSourceStateID::Private).ok() else {
    return;
  };
  post_key(source, KeyCode::SPACE, Some(s));
}

/// Send backspace key n times.
fn send_backspaces(n: usize) {
  let Some(source) = CGEventSource::new(CGEventSourceStateID::Private).ok() else {
    return;
  };

  for _ in 0..n {
    post_key(source.clone(), KeyCode::DELETE, None);
  }
}

/// Read the Unicode string from a keyboard event via CGEventKeyboardGetUnicodeString.
fn get_event_string(event: &CGEvent) -> Option<String> {
  unsafe {
    let mut buf = [0u16; 8];
    let mut len: core::ffi::c_ulong = 0;
    CGEventKeyboardGetUnicodeString(
      event.as_ptr(),
      buf.len() as core::ffi::c_ulong,
      &mut len,
      buf.as_mut_ptr(),
    );
    if len > 0 {
      Some(String::from_utf16_lossy(&buf[..len as usize]))
    } else {
      None
    }
  }
}

#[link(name = "CoreGraphics", kind = "framework")]
unsafe extern "C" {
  fn CGEventKeyboardGetUnicodeString(
    event: core_graphics::sys::CGEventRef,
    maxStringLength: core::ffi::c_ulong,
    actualStringLength: *mut core::ffi::c_ulong,
    unicodeString: *mut u16,
  );

  fn CGEventTapEnable(tap: CFMachPortRef, enable: bool);
}

// ---- Event tap callback ----

/// Build the CGEventTap callback closure.
/// Logic mirrors `win/hooks.rs` — see comments there for rationale.
pub fn build_event_tap_callback(
  state: Arc<MacAppState>,
  tap_port: Arc<Mutex<Option<CFMachPort>>>,
) -> impl Fn(CGEventTapProxy, CGEventType, &CGEvent) -> CallbackResult + 'static {
  move |_proxy, event_type, event| {
    // Handle tap-disabled events
    if matches!(
      event_type,
      CGEventType::TapDisabledByTimeout | CGEventType::TapDisabledByUserInput
    ) {
      if let Ok(guard) = tap_port.lock() {
        if let Some(port) = guard.as_ref() {
          unsafe {
            CGEventTapEnable(port.as_concrete_TypeRef(), true);
          }
        }
      }
      return CallbackResult::Keep;
    }

    // Skip our own injected events
    if event.get_integer_value_field(EventField::EVENT_SOURCE_USER_DATA) == INJECTED_EVENT_SENTINEL
    {
      return CallbackResult::Keep;
    }

    // Mouse clicks → clear context
    if matches!(
      event_type,
      CGEventType::LeftMouseDown | CGEventType::RightMouseDown | CGEventType::OtherMouseDown
    ) {
      if state.app_state.typing_enabled.load(Ordering::SeqCst) {
        clear_context(&state);
      }
      return CallbackResult::Keep;
    }

    // Only keyboard events from here
    if !matches!(
      event_type,
      CGEventType::KeyDown | CGEventType::KeyUp | CGEventType::FlagsChanged
    ) {
      return CallbackResult::Keep;
    }

    let keycode = event.get_integer_value_field(EventField::KEYBOARD_EVENT_KEYCODE) as u16;
    let flags = event.get_flags();
    let is_keydown = matches!(event_type, CGEventType::KeyDown);

    // ---- Option+X / Option+C toggle (works regardless of typing mode) ----
    if is_keydown
      && (keycode == VK_X || keycode == VK_C)
      && flags.contains(CGEventFlags::CGEventFlagAlternate)
    {
      // a xor 1 = !a
      let now_enabled = !state
        .app_state
        .typing_enabled
        .fetch_xor(true, Ordering::SeqCst);

      if !now_enabled {
        clear_context(&state);
      }

      let _ = state.tx_ui.send(ThreadMessage {
        origin: ThreadMessageOrigin::KeyboardHook,
        msg: ThreadMessageType::TriggerTypingNotification,
      });
      let _ = state.tx_ui.send(ThreadMessage {
        origin: ThreadMessageOrigin::KeyboardHook,
        msg: ThreadMessageType::RerenderUI,
      });
      let _ = state.tx_tray.send(ThreadMessage {
        origin: ThreadMessageOrigin::KeyboardHook,
        msg: ThreadMessageType::RerenderTray,
      });

      return CallbackResult::Drop;
    }

    // ---- Cmd+Esc / Ctrl+Esc → close app ----
    if is_keydown
      && keycode == VK_ESCAPE
      && flags.intersects(CGEventFlags::CGEventFlagCommand | CGEventFlags::CGEventFlagControl)
    {
      let _ = state.tx_ui.send(ThreadMessage {
        origin: ThreadMessageOrigin::KeyboardHook,
        msg: ThreadMessageType::CloseApp,
      });
      return CallbackResult::Drop;
    }

    // Typing mode disabled → pass through
    if !state.app_state.typing_enabled.load(Ordering::SeqCst) {
      return CallbackResult::Keep;
    }

    // ---- Typing mode enabled ----

    // Modifier-only keys and FlagsChanged → pass through
    if is_modifier_key(keycode) || matches!(event_type, CGEventType::FlagsChanged) {
      return CallbackResult::Keep;
    }

    // Key up → pass through
    if !is_keydown {
      return CallbackResult::Keep;
    }

    // Context-clearing keys
    if is_context_clear_key(keycode) {
      clear_context(&state);
      return CallbackResult::Keep;
    }

    // Cmd/Ctrl/Option shortcuts → pass through
    if flags.intersects(
      CGEventFlags::CGEventFlagCommand
        | CGEventFlags::CGEventFlagControl
        | CGEventFlags::CGEventFlagAlternate,
    ) {
      clear_context(&state);
      return CallbackResult::Keep;
    }

    // Convert to Unicode and process through typing context
    let Some(text) = get_event_string(event) else {
      return CallbackResult::Keep;
    };

    if text.chars().any(|ch| ch.is_control()) {
      return CallbackResult::Keep;
    }

    // Lock discipline: release mutex BEFORE injecting (SendInput/post re-enters the hook)
    let (total_delete, combined_add) = {
      let mut guard = match state.app_state.typing_context.lock() {
        Ok(g) => g,
        Err(_) => return CallbackResult::Keep,
      };

      let mut total_delete: usize = 0;
      let mut combined_add = String::new();

      for ch in text.chars() {
        let key = ch.to_string();
        let diff = guard.take_key_input(&key);
        total_delete += diff.to_delete_chars_count;
        combined_add.push_str(&diff.diff_add_text);
      }

      (total_delete, combined_add)
    };

    if total_delete > 0 {
      send_backspaces(total_delete);
    }
    if !combined_add.is_empty() {
      send_unicode_text(&combined_add);
    }

    CallbackResult::Drop
  }
}
