use crossbeam_channel::Sender;
use std::sync::Arc;

use core_foundation::runloop::CFRunLoop;
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

  let callback = super::hooks::build_event_tap_callback(mac_state);

  let events_of_interest = vec![
    CGEventType::KeyDown,
    CGEventType::KeyUp,
    CGEventType::FlagsChanged,
    CGEventType::LeftMouseDown,
    CGEventType::RightMouseDown,
    CGEventType::OtherMouseDown,
  ];

  CGEventTap::with_enabled(
    CGEventTapLocation::HID,
    CGEventTapPlacement::HeadInsertEventTap,
    CGEventTapOptions::Default,
    events_of_interest,
    callback,
    || CFRunLoop::run_current(),
  )
  .map_err(|()| {
    std::io::Error::new(
      std::io::ErrorKind::PermissionDenied,
      "Failed to create CGEventTap. \
       Please grant Accessibility permission: \
       System Settings → Privacy & Security → Accessibility",
    )
  })?;

  Ok(())
}
