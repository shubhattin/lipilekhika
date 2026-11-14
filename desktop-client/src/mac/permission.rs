//! The Accessibility permission the event tap needs, and Secure Input (a password field or
//! Terminal's Secure Keyboard Entry), which keeps every key away from the tap.

use core_foundation::base::TCFType;
use core_foundation::boolean::CFBoolean;
use core_foundation::dictionary::{CFDictionary, CFDictionaryRef};
use core_foundation::string::{CFString, CFStringRef};

#[link(name = "ApplicationServices", kind = "framework")]
unsafe extern "C" {
  fn AXIsProcessTrusted() -> bool;
  fn AXIsProcessTrustedWithOptions(options: CFDictionaryRef) -> bool;
  static kAXTrustedCheckOptionPrompt: CFStringRef;
}

#[link(name = "Carbon", kind = "framework")]
unsafe extern "C" {
  fn IsSecureEventInputEnabled() -> bool;
}

/// The app may watch and send keys (System Settings → Privacy & Security → Accessibility)
pub fn is_trusted() -> bool {
  unsafe { AXIsProcessTrusted() }
}

/// Asks macOS to show its own prompt for the permission. It also adds the app to the list in
/// System Settings, so the user only has to turn the switch on. macOS shows the prompt once.
pub fn request() -> bool {
  unsafe {
    let key = CFString::wrap_under_get_rule(kAXTrustedCheckOptionPrompt);
    let options = CFDictionary::from_CFType_pairs(&[(key, CFBoolean::true_value())]);
    AXIsProcessTrustedWithOptions(options.as_concrete_TypeRef())
  }
}

/// Opens System Settings at Privacy & Security → Accessibility
pub fn open_settings() {
  let _ = std::process::Command::new("open")
    .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility")
    .spawn();
}

/// Some app holds Secure Input: no key reaches the event tap until it lets go
pub fn secure_input_on() -> bool {
  unsafe { IsSecureEventInputEnabled() }
}
