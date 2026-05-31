use crossbeam_channel::Sender;
use std::sync::{Arc, Mutex};

use core_foundation::runloop::{CFRunLoop, kCFRunLoopCommonModes};
use core_graphics::event::{
  CGEventTap, CGEventTapLocation, CGEventTapOptions, CGEventTapPlacement, CGEventType,
};

use super::MacAppState;

pub fn run(
  app_state: Arc<crate::AppState>,
  tx_ui: Sender<crate::ThreadMessage>,
  tx_tray: Sender<crate::ThreadMessage>,
) -> Result<(), Box<dyn std::error::Error>> {
  let mac_state = Arc::new(MacAppState {
    app_state,
    tx_ui,
    tx_tray,
  });

  let tap_port = Arc::new(Mutex::new(None));
  let callback = super::hooks::build_event_tap_callback(mac_state, Arc::clone(&tap_port));

  let events_of_interest = vec![
    CGEventType::KeyDown,
    CGEventType::KeyUp,
    CGEventType::FlagsChanged,
    CGEventType::LeftMouseDown,
    CGEventType::RightMouseDown,
    CGEventType::OtherMouseDown,
  ];

  let event_tap = unsafe {
    CGEventTap::new_unchecked(
      CGEventTapLocation::HID,
      CGEventTapPlacement::HeadInsertEventTap,
      CGEventTapOptions::Default,
      events_of_interest,
      callback,
    )
  }
  .map_err(|()| {
    std::io::Error::new(
      std::io::ErrorKind::PermissionDenied,
      "Failed to create CGEventTap. \
       Please grant Accessibility permission: \
       System Settings → Privacy & Security → Accessibility",
    )
  })?;

  if let Ok(mut guard) = tap_port.lock() {
    *guard = Some(event_tap.mach_port().clone());
  }

  let loop_source = event_tap
    .mach_port()
    .create_runloop_source(0)
    .map_err(|()| std::io::Error::other("Failed to create CGEventTap run loop source"))?;
  CFRunLoop::get_current().add_source(&loop_source, unsafe { kCFRunLoopCommonModes });
  event_tap.enable();
  CFRunLoop::run_current();

  Ok(())
}
