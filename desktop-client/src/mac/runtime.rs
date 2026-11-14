use core_foundation::base::TCFType as _;
use crossbeam_channel::Sender;
use std::cell::RefCell;
use std::rc::Rc;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use core_foundation::runloop::{
  CFRunLoop, CFRunLoopRunResult, kCFRunLoopCommonModes, kCFRunLoopDefaultMode,
};
use core_graphics::event::{
  CGEventTap, CGEventTapLocation, CGEventTapOptions, CGEventTapPlacement, CGEventType,
};

use super::MacAppState;
use super::permission;
use crate::platform::HookStatus;
use crate::{ThreadMessage, ThreadMessageOrigin, ThreadMessageType};

/// How often the hook thread looks at the permission and at Secure Input
const CHECK_EVERY: Duration = Duration::from_secs(1);

/// Stores the hook's status and tells the UI and the tray when it changed (never waits on a full
/// channel: a lost "draw again" is harmless, a blocked hook thread is not)
fn set_status(state: &MacAppState, status: HookStatus) {
  if status.store(&state.app_state) {
    let _ = state.tx_ui.try_send(ThreadMessage {
      origin: ThreadMessageOrigin::KeyboardHook,
      msg: ThreadMessageType::RerenderUI,
    });
    let _ = state.tx_tray.try_send(ThreadMessage {
      origin: ThreadMessageOrigin::KeyboardHook,
      msg: ThreadMessageType::RerenderTray,
    });
  }
}

/// The hook thread: waits for the Accessibility permission, then runs the event tap until the
/// permission is taken away (and waits again). It never ends on its own.
pub fn run(
  app_state: Arc<crate::AppState>,
  tx_ui: Sender<crate::ThreadMessage>,
  tx_tray: Sender<crate::ThreadMessage>,
) -> Result<(), Box<dyn std::error::Error>> {
  let state = Arc::new(MacAppState {
    app_state,
    tx_ui,
    tx_tray,
    typed: Mutex::new(String::new()),
  });

  let mut asked = false;
  loop {
    if super::debug_log() {
      eprintln!("[hook] trusted={}", permission::is_trusted());
    }
    if !permission::is_trusted() {
      set_status(&state, HookStatus::NeedsPermission);
      // macOS's own prompt, once per start: it also puts the app in the Accessibility list
      if !asked {
        asked = true;
        permission::request();
      }
      std::thread::sleep(CHECK_EVERY);
      continue;
    }
    if run_tap(&state).is_err() {
      // allowed, but the tap would not start: try again in a while
      set_status(&state, HookStatus::Failed);
      std::thread::sleep(Duration::from_secs(3));
    }
  }
}

/// Runs the event tap until the permission goes away (or the system takes the tap away: the caller
/// makes a new one)
fn run_tap(state: &Arc<MacAppState>) -> Result<(), ()> {
  // the tap's callback runs on this thread only
  let tap_port = Rc::new(RefCell::new(None));
  let callback = super::hooks::build_event_tap_callback(Arc::clone(state), Rc::clone(&tap_port));

  let events_of_interest = vec![
    CGEventType::KeyDown,
    CGEventType::KeyUp,
    CGEventType::FlagsChanged,
    CGEventType::LeftMouseDown,
    CGEventType::RightMouseDown,
    CGEventType::OtherMouseDown,
  ];

  // The session tap sees the keyboard's keys and the keys of remote control (Screen Sharing, VNC),
  // which come in after the HID level
  let event_tap = unsafe {
    CGEventTap::new_unchecked(
      CGEventTapLocation::Session,
      CGEventTapPlacement::HeadInsertEventTap,
      CGEventTapOptions::Default,
      events_of_interest,
      callback,
    )
  }?;

  *tap_port.borrow_mut() = Some(event_tap.mach_port().clone());
  if super::debug_log() {
    eprintln!("[hook] tap created");
  }

  let loop_source = event_tap.mach_port().create_runloop_source(0)?;
  let run_loop = CFRunLoop::get_current();
  run_loop.add_source(&loop_source, unsafe { kCFRunLoopCommonModes });
  event_tap.enable();

  // The run loop serves the tap; every second it comes back here to look at the permission
  // (a tap whose permission was taken away can hold up every key of the system) and at Secure
  // Input (the tap gets no keys while it is on, the user is told).
  loop {
    let secure = permission::secure_input_on();
    set_status(
      state,
      if secure {
        HookStatus::SecureInput
      } else {
        HookStatus::Running
      },
    );
    if secure && let Ok(mut ctx) = state.app_state.typing_context.lock() {
      ctx.clear_context();
    }
    let result = CFRunLoop::run_in_mode(unsafe { kCFRunLoopDefaultMode }, CHECK_EVERY, false);
    if !permission::is_trusted() {
      break;
    }
    // the system took the tap away (its port is gone, the run loop has nothing to serve): make a
    // new one, instead of coming back here at once over and over
    if matches!(result, CFRunLoopRunResult::Finished)
      || !unsafe { CGEventTapIsEnabled(event_tap.mach_port().as_concrete_TypeRef()) }
    {
      // not straight away: a system that keeps taking taps away would make this spin
      std::thread::sleep(Duration::from_millis(500));
      break;
    }
  }

  run_loop.remove_source(&loop_source, unsafe { kCFRunLoopCommonModes });
  // the system stops sending keys through the tap, before its callback is dropped with it
  tap_port.borrow_mut().take();
  unsafe { CFMachPortInvalidate(event_tap.mach_port().as_concrete_TypeRef()) };
  drop(event_tap);
  Ok(())
}

#[link(name = "CoreFoundation", kind = "framework")]
unsafe extern "C" {
  fn CFMachPortInvalidate(port: core_foundation::mach_port::CFMachPortRef);
}

#[link(name = "CoreGraphics", kind = "framework")]
unsafe extern "C" {
  fn CGEventTapIsEnabled(tap: core_foundation::mach_port::CFMachPortRef) -> bool;
}
