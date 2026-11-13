//! What GPUI does not offer for its windows, done with the platform's own calls (Windows only;
//! elsewhere these do nothing).

use gpui_kit::Window;

/// The system's handle of `window`, to pass to [`set_owner`]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct NativeHandle(#[allow(dead_code)] isize);

#[cfg(windows)]
mod imp {
  use super::NativeHandle;
  use gpui_kit::Window;
  use raw_window_handle::RawWindowHandle;
  use windows::Win32::Foundation::HWND;
  use windows::Win32::Graphics::Dwm::{
    DWMWA_WINDOW_CORNER_PREFERENCE, DWMWCP_ROUND, DwmSetWindowAttribute,
  };
  use windows::Win32::UI::WindowsAndMessaging::{GWLP_HWNDPARENT, SetWindowLongPtrW};

  pub fn handle_of(window: &Window) -> Option<NativeHandle> {
    match raw_window_handle::HasWindowHandle::window_handle(window)
      .ok()?
      .as_raw()
    {
      RawWindowHandle::Win32(h) => Some(NativeHandle(h.hwnd.get())),
      _ => None,
    }
  }

  fn hwnd(window: &Window) -> Option<HWND> {
    handle_of(window).map(|h| HWND(h.0 as _))
  }

  pub fn set_owner(window: &Window, owner: Option<NativeHandle>) {
    let Some(hwnd) = hwnd(window) else { return };
    unsafe {
      SetWindowLongPtrW(hwnd, GWLP_HWNDPARENT, owner.map_or(0, |o| o.0));
    }
  }

  pub fn round_corners(window: &Window) {
    let Some(hwnd) = hwnd(window) else { return };
    let preference = DWMWCP_ROUND;
    unsafe {
      let _ = DwmSetWindowAttribute(
        hwnd,
        DWMWA_WINDOW_CORNER_PREFERENCE,
        &preference as *const _ as *const _,
        std::mem::size_of_val(&preference) as u32,
      );
    }
  }
}

#[cfg(not(windows))]
mod imp {
  use super::NativeHandle;
  use gpui_kit::Window;

  pub fn handle_of(_: &Window) -> Option<NativeHandle> {
    None
  }
  pub fn set_owner(_: &Window, _: Option<NativeHandle>) {}
  pub fn round_corners(_: &Window) {}
}

/// The system's handle of `window`
pub fn handle_of(window: &Window) -> Option<NativeHandle> {
  imp::handle_of(window)
}

/// Makes `window` belong to `owner` (`None`: to no window). An owned window stays above its owner
/// and minimizes with it. On Linux GPUI does this itself for floating windows.
pub fn set_owner(window: &Window, owner: Option<NativeHandle>) {
  imp::set_owner(window, owner)
}

/// Lets the system round the window's corners (Windows 11; Windows 10 has square windows)
pub fn round_corners(window: &Window) {
  imp::round_corners(window)
}
