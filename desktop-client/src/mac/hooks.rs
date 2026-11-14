use crate::{ThreadMessage, ThreadMessageOrigin, ThreadMessageType};

use super::MacAppState;
use super::constants::*;
use core_foundation::base::TCFType;
use core_foundation::mach_port::{CFMachPort, CFMachPortRef};
use std::cell::RefCell;
use std::rc::Rc;
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
  if let Ok(mut typed) = state.typed.lock() {
    typed.clear();
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

/// The key code of the events that carry the new text. The text itself is set on the event; apps
/// that look at the key code see `A` (code 0), as with other tools that type text this way.
/// `LIPI_MAC_TEXT_KEYCODE` overrides it (for testing other codes in other apps).
fn text_keycode() -> u16 {
  static CODE: std::sync::OnceLock<u16> = std::sync::OnceLock::new();
  *CODE.get_or_init(|| {
    std::env::var("LIPI_MAC_TEXT_KEYCODE")
      .ok()
      .and_then(|v| v.parse().ok())
      .unwrap_or(0)
  })
}

/// At most this many UTF-16 units ride on one key event: macOS drops the rest
const MAX_UNITS_PER_EVENT: usize = 20;

/// Tag an event as injected so the tap callback skips it.
fn tag_injected(event: &CGEvent) {
  event.set_integer_value_field(EventField::EVENT_SOURCE_USER_DATA, INJECTED_EVENT_SENTINEL);
}

/// Post a key down+up pair for `keycode`, optionally with the UTF-16 text it types.
fn post_key(source: &CGEventSource, keycode: u16, text: Option<&[u16]>) -> bool {
  let Ok(down) = CGEvent::new_keyboard_event(source.clone(), keycode, true) else {
    return false;
  };
  let Ok(up) = CGEvent::new_keyboard_event(source.clone(), keycode, false) else {
    return false;
  };
  if let Some(units) = text {
    down.set_string_from_utf16_unchecked(units);
    up.set_string_from_utf16_unchecked(units);
  }
  for event in [&down, &up] {
    // no modifier rides along: a held Option would make the backspace delete a word, a held
    // Shift or Command would turn the text into a shortcut
    event.set_flags(CGEventFlags::CGEventFlagNull);
    tag_injected(event);
  }

  // at the session level, where the tap is: they pass it (skipped by their tag) like real keys
  down.post(CGEventTapLocation::Session);
  up.post(CGEventTapLocation::Session);

  true
}

/// Splits UTF-16 text into pieces of at most [`MAX_UNITS_PER_EVENT`] units, never between the
/// two halves of a surrogate pair (Brahmi, Grantha, Sharada... are outside the BMP)
fn utf16_chunks(text: &str) -> Vec<Vec<u16>> {
  let mut chunks: Vec<Vec<u16>> = vec![];
  let mut current: Vec<u16> = vec![];
  let mut buf = [0u16; 2];
  for ch in text.chars() {
    let units = ch.encode_utf16(&mut buf);
    if current.len() + units.len() > MAX_UNITS_PER_EVENT {
      chunks.push(std::mem::take(&mut current));
    }
    current.extend_from_slice(units);
  }
  if !current.is_empty() {
    chunks.push(current);
  }
  chunks
}

/// Types `s` by key events that carry the text
fn send_unicode_text(s: &str) -> bool {
  let Ok(source) = CGEventSource::new(CGEventSourceStateID::Private) else {
    return false;
  };
  let keycode = text_keycode();
  utf16_chunks(s)
    .iter()
    .all(|chunk| post_key(&source, keycode, Some(chunk)))
}

/// Send backspace key n times.
fn send_backspaces(n: usize) -> bool {
  let Ok(source) = CGEventSource::new(CGEventSourceStateID::Private) else {
    return false;
  };
  (0..n).all(|_| post_key(&source, KeyCode::DELETE, None))
}

/// How the hook takes back the end of the text it typed
#[derive(Debug, PartialEq, Eq)]
pub enum Edit {
  /// Backspace this many times, one per code point
  Backspaces(usize),
  /// Backspace over this many whole clusters and type `retype` (the part of them that stays)
  Clusters { clusters: usize, retype: String },
}

/// How to delete the last `n` code points of `typed` (the end of it is left of the caret).
///
/// Every app deletes one code point per Backspace in the scripts of the BMP (Devanagari, Tamil...).
/// In the scripts outside it (Brahmi, Grantha, Sharada, Siddham, Modi) the native Mac apps and
/// Safari delete a whole cluster (a letter with its signs), Chromium-based apps (`code_point_app`:
/// Chrome, Edge, Electron apps) still one code point.
pub fn plan_edit(typed: &str, n: usize, code_point_app: bool) -> Edit {
  use unicode_segmentation::UnicodeSegmentation as _;
  if n == 0 || code_point_app || typed.chars().count() < n {
    return Edit::Backspaces(n);
  }
  // the clusters at the end that hold the `n` code points
  let mut clusters = 0;
  let mut covered = 0;
  let mut start = typed.len();
  for (i, g) in typed.grapheme_indices(true).rev() {
    clusters += 1;
    covered += g.chars().count();
    start = i;
    if covered >= n {
      break;
    }
  }
  let touched = &typed[start..];
  if touched.chars().all(|c| (c as u32) < 0x10000) {
    return Edit::Backspaces(n);
  }
  let keep = touched.chars().count() - n;
  Edit::Clusters {
    clusters,
    retype: touched.chars().take(keep).collect(),
  }
}

/// Whether the app with `pid` is built on Chromium (Chrome, Edge, Brave, Arc, Electron apps such
/// as VS Code, Slack, Discord): they all ship a `… Helper (Renderer).app`
fn is_chromium_app(pid: i32) -> bool {
  use std::collections::HashMap;
  static SEEN: Mutex<Option<HashMap<i32, bool>>> = Mutex::new(None);
  if pid <= 0 {
    return false;
  }
  if let Ok(seen) = SEEN.lock()
    && let Some(&known) = seen.as_ref().and_then(|m| m.get(&pid))
  {
    return known;
  }
  let chromium =
    app_bundle_of(pid).is_some_and(|app| has_renderer_helper(&app.join("Contents/Frameworks"), 0));
  if let Ok(mut seen) = SEEN.lock() {
    seen.get_or_insert_with(HashMap::new).insert(pid, chromium);
  }
  chromium
}

/// The `.app` folder of the process `pid`
fn app_bundle_of(pid: i32) -> Option<std::path::PathBuf> {
  let mut buf = vec![0u8; libc::PROC_PIDPATHINFO_MAXSIZE as usize];
  let len = unsafe { libc::proc_pidpath(pid, buf.as_mut_ptr().cast(), buf.len() as u32) };
  if len <= 0 {
    return None;
  }
  buf.truncate(len as usize);
  let path = std::path::PathBuf::from(String::from_utf8(buf).ok()?);
  path
    .ancestors()
    .find(|p| p.extension().is_some_and(|e| e == "app"))
    .map(|p| p.to_path_buf())
}

fn has_renderer_helper(dir: &std::path::Path, depth: u32) -> bool {
  let Ok(entries) = std::fs::read_dir(dir) else {
    return false;
  };
  entries.flatten().any(|entry| {
    let name = entry.file_name();
    let name = name.to_string_lossy();
    name.ends_with("Helper (Renderer).app")
      || (depth < 4
        && entry.file_type().is_ok_and(|t| t.is_dir())
        && !name.ends_with(".app")
        && has_renderer_helper(&entry.path(), depth + 1))
  })
}

/// Read the Unicode string from a keyboard event via CGEventKeyboardGetUnicodeString.
fn get_event_string(event: &CGEvent) -> Option<String> {
  unsafe {
    let mut len: core::ffi::c_ulong = 0;
    CGEventKeyboardGetUnicodeString(event.as_ptr(), 0, &mut len, std::ptr::null_mut());

    if len == 0 {
      return None;
    }

    let mut buf = vec![0u16; len as usize];
    CGEventKeyboardGetUnicodeString(event.as_ptr(), len, &mut len, buf.as_mut_ptr());
    let len = len.min(buf.len() as core::ffi::c_ulong);
    buf.truncate(len as usize);

    Some(String::from_utf16_lossy(&buf))
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

  fn CGEventSourceFlagsState(state_id: i32) -> u64;
}

/// The modifiers held for a key. A keyboard's keys carry their modifiers. Remote control (Screen
/// Sharing, VNC and the like) sends Option as an event of its own and the key without the flag:
/// for keys that do not come from the hardware, the modifiers the session knows are down count
/// too, so ⌥X works from there. Keyboard keys keep only their own flags (the session's state is
/// the present one, which may be ahead of the key being handled).
fn event_modifiers(event: &CGEvent) -> CGEventFlags {
  const MODIFIERS: CGEventFlags = CGEventFlags::CGEventFlagShift
    .union(CGEventFlags::CGEventFlagControl)
    .union(CGEventFlags::CGEventFlagAlternate)
    .union(CGEventFlags::CGEventFlagCommand);
  // kCGEventSourceStateHIDSystemState: the keyboard itself
  const HID_SYSTEM_STATE: i64 = 1;
  let flags = event.get_flags();
  if event.get_integer_value_field(EventField::EVENT_SOURCE_STATE_ID) == HID_SYSTEM_STATE {
    return flags;
  }
  // kCGEventSourceStateCombinedSessionState
  let held = CGEventFlags::from_bits_truncate(unsafe { CGEventSourceFlagsState(0) });
  flags | (held & MODIFIERS)
}

// ---- Event tap callback ----

/// Build the CGEventTap callback closure.
/// Logic mirrors `win/hooks.rs` — see comments there for rationale.
pub fn build_event_tap_callback(
  state: Arc<MacAppState>,
  tap_port: Rc<RefCell<Option<CFMachPort>>>,
) -> impl Fn(CGEventTapProxy, CGEventType, &CGEvent) -> CallbackResult + 'static {
  let debug = std::env::var_os("LIPI_DEBUG_HOOK").is_some();
  move |_proxy, event_type, event| {
    if debug {
      eprintln!(
        "[hook] {:?} key={} flags={:?} user_data={:x} target_pid={} source_state={}",
        event_type,
        event.get_integer_value_field(EventField::KEYBOARD_EVENT_KEYCODE),
        event.get_flags(),
        event.get_integer_value_field(EventField::EVENT_SOURCE_USER_DATA),
        event.get_integer_value_field(EventField::EVENT_TARGET_UNIX_PROCESS_ID),
        event.get_integer_value_field(EventField::EVENT_SOURCE_STATE_ID)
      );
    }
    // Handle tap-disabled events
    if matches!(
      event_type,
      CGEventType::TapDisabledByTimeout | CGEventType::TapDisabledByUserInput
    ) {
      if let Some(port) = tap_port.borrow().as_ref() {
        unsafe {
          CGEventTapEnable(port.as_concrete_TypeRef(), true);
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

    // The app's own windows (Lipi Parivartaka has its own typing) get their keys untouched
    if state.app_state.app_window_active.load(Ordering::SeqCst) {
      return CallbackResult::Keep;
    }

    let keycode = event.get_integer_value_field(EventField::KEYBOARD_EVENT_KEYCODE) as u16;
    let flags = event_modifiers(event);
    let is_keydown = matches!(event_type, CGEventType::KeyDown);

    // ---- Option+X / Option+C toggle (works regardless of typing mode) ----
    if is_keydown
      && (keycode == VK_X || keycode == VK_C)
      && flags.contains(CGEventFlags::CGEventFlagAlternate)
      && !flags.contains(CGEventFlags::CGEventFlagCommand)
      && !flags.contains(CGEventFlags::CGEventFlagControl)
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

    // ---- Cmd+Esc / Ctrl+Esc → close app (not Cmd+Option+Esc: that is Force Quit) ----
    if is_keydown
      && keycode == VK_ESCAPE
      && flags.intersects(CGEventFlags::CGEventFlagCommand | CGEventFlags::CGEventFlagControl)
      && !flags.intersects(CGEventFlags::CGEventFlagAlternate | CGEventFlags::CGEventFlagShift)
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

    let target_pid = event.get_integer_value_field(EventField::EVENT_TARGET_UNIX_PROCESS_ID) as i32;
    let edit = match state.typed.lock() {
      Ok(mut typed) => {
        // only the scripts outside the BMP need to know the app
        let outside_bmp = total_delete > 0 && typed.chars().any(|c| (c as u32) >= 0x10000);
        let edit = plan_edit(
          &typed,
          total_delete,
          outside_bmp && is_chromium_app(target_pid),
        );
        let keep = typed.chars().count().saturating_sub(total_delete);
        let cut = typed
          .char_indices()
          .nth(keep)
          .map_or(typed.len(), |(i, _)| i);
        typed.truncate(cut);
        typed.push_str(&combined_add);
        edit
      }
      Err(_) => Edit::Backspaces(total_delete),
    };
    let (backspaces, text) = match edit {
      Edit::Backspaces(n) => (n, combined_add),
      Edit::Clusters { clusters, retype } => (clusters, retype + &combined_add),
    };
    let deleted = backspaces == 0 || send_backspaces(backspaces);
    let added = text.is_empty() || send_unicode_text(&text);

    if deleted && added {
      CallbackResult::Drop
    } else {
      CallbackResult::Keep
    }
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn chunks_keep_surrogate_pairs_whole() {
    // 15 Brahmi letters: 30 UTF-16 units, so 20 + 10
    let brahmi = "𑀓".repeat(15);
    let chunks = utf16_chunks(&brahmi);
    assert_eq!(chunks.iter().map(Vec::len).collect::<Vec<_>>(), [20, 10]);
    // an odd start: 1 + 2*n never splits a pair, the first chunk takes 19 units
    let mixed = format!("a{}", "𑀓".repeat(10));
    let chunks = utf16_chunks(&mixed);
    assert_eq!(chunks.iter().map(Vec::len).collect::<Vec<_>>(), [19, 2]);
    let joined: Vec<u16> = chunks.concat();
    assert_eq!(String::from_utf16(&joined).unwrap(), mixed);
  }

  #[test]
  fn bmp_scripts_backspace() {
    // Devanagari: one code point per Backspace in every app
    assert_eq!(plan_edit("क्", 1, false), Edit::Backspaces(1));
    assert_eq!(plan_edit("नमस्", 2, false), Edit::Backspaces(2));
    assert_eq!(plan_edit("abc", 0, false), Edit::Backspaces(0));
  }

  #[test]
  fn non_bmp_scripts_backspace_whole_clusters() {
    // Brahmi k + i: the cluster 𑀓𑁆 goes, 𑀓 is typed again (with the vowel sign after it)
    assert_eq!(
      plan_edit("x𑀓𑁆", 1, false),
      Edit::Clusters {
        clusters: 1,
        retype: "𑀓".into()
      }
    );
    // 𑀓𑁆𑀱 is two clusters (𑀓𑁆 | 𑀱): taking back 𑀱𑁆's virama leaves 𑀓𑁆 alone
    assert_eq!(
      plan_edit("𑀓𑁆𑀱𑁆", 1, false),
      Edit::Clusters {
        clusters: 1,
        retype: "𑀱".into()
      }
    );
    // two code points over two clusters
    assert_eq!(
      plan_edit("𑀓𑁆𑀱", 2, false),
      Edit::Clusters {
        clusters: 2,
        retype: "𑀓".into()
      }
    );
    // Chrome and the other Chromium apps delete one code point
    assert_eq!(plan_edit("x𑀓𑁆", 1, true), Edit::Backspaces(1));
  }

  #[test]
  fn short_text_is_one_chunk() {
    assert_eq!(utf16_chunks("नमस्ते").len(), 1);
    assert!(utf16_chunks("").is_empty());
  }
}
