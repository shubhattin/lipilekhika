use std::ffi::c_void;
use std::mem::size_of;
use std::sync::{Arc, Mutex, OnceLock};

use windows::core::{Error, PCWSTR};
use windows::Win32::Foundation::{COLORREF, HWND, LPARAM, LRESULT, WPARAM};
use windows::Win32::Graphics::Gdi::{
  BeginPaint, DrawTextW, EndPaint, SetBkColor, SetTextColor, DT_CENTER, DT_SINGLELINE, DT_VCENTER,
  PAINTSTRUCT,
};
use windows::Win32::System::LibraryLoader::GetModuleHandleW;
use windows::Win32::UI::WindowsAndMessaging::{
  CreateWindowExW, DefWindowProcW, DestroyWindow, GetClientRect, GetSystemMetrics,
  GetWindowLongPtrW, KillTimer, RegisterClassExW, SetLayeredWindowAttributes, SetTimer,
  SetWindowLongPtrW, ShowWindow, CREATESTRUCTW, GWLP_USERDATA, LWA_ALPHA, SM_CXSCREEN, SM_CYSCREEN,
  SW_SHOW, WM_DESTROY, WM_NCCREATE, WM_NCDESTROY, WM_PAINT, WM_TIMER, WNDCLASSEXW, WS_EX_LAYERED,
  WS_EX_TOOLWINDOW, WS_EX_TOPMOST, WS_POPUP,
};

const WINDOW_CLASS_NAME: &str = "LipilekhikaNotification";

static WINDOW_CLASS_REGISTERED: OnceLock<()> = OnceLock::new();

struct Shared {
  current_hwnd: Mutex<Option<HWND>>,
}

pub struct Notifier {
  shared: Arc<Shared>,
}

impl Default for Notifier {
  fn default() -> Self {
    Self::new()
  }
}

impl Notifier {
  pub fn new() -> Self {
    Self {
      shared: Arc::new(Shared {
        current_hwnd: Mutex::new(None),
      }),
    }
  }

  pub fn show(&self, message: &str) {
    // Best-effort UI: do not panic from hook callback.
    if ensure_class_registered().is_err() {
      return;
    }

    unsafe {
      // Hide any existing notification
      if let Ok(mut guard) = self.shared.current_hwnd.lock() {
        if let Some(hwnd) = *guard {
          let _ = KillTimer(hwnd, 1);
          let _ = DestroyWindow(hwnd);
          *guard = None;
        }
      }

      // Get screen dimensions
      let screen_width = GetSystemMetrics(SM_CXSCREEN);
      let screen_height = GetSystemMetrics(SM_CYSCREEN);

      // Calculate window position (middle-top)
      let window_width = 300;
      let window_height = 60;
      let x = (screen_width - window_width) / 2;
      let y = screen_height / 8; // Top portion of screen

      let class_name_wide = wide_null(WINDOW_CLASS_NAME);
      let title_wide = wide_null("Lipilekhika");

      let hinst = match GetModuleHandleW(None) {
        Ok(h) => h,
        Err(_) => return,
      };

      let state = Box::new(WindowState {
        message: message.to_string(),
        shared: self.shared.clone(),
      });
      let state_ptr = Box::into_raw(state) as *mut c_void;

      let hwnd = match CreateWindowExW(
        WS_EX_TOPMOST | WS_EX_LAYERED | WS_EX_TOOLWINDOW,
        PCWSTR(class_name_wide.as_ptr()),
        PCWSTR(title_wide.as_ptr()),
        WS_POPUP,
        x,
        y,
        window_width,
        window_height,
        None,
        None,
        hinst,
        Some(state_ptr),
      ) {
        Ok(hwnd) => hwnd,
        Err(_) => {
          // window proc won't run; we must free the state now.
          drop(Box::from_raw(state_ptr as *mut WindowState));
          return;
        }
      };

      if let Ok(mut guard) = self.shared.current_hwnd.lock() {
        *guard = Some(hwnd);
      }

      // Set window transparency
      let _ = SetLayeredWindowAttributes(hwnd, COLORREF(0), 220, LWA_ALPHA);

      let _ = ShowWindow(hwnd, SW_SHOW);

      // Set timer to hide window after 1500ms
      let _ = SetTimer(hwnd, 1, 1500, None);
    }
  }
}

struct WindowState {
  message: String,
  shared: Arc<Shared>,
}

fn ensure_class_registered() -> windows::core::Result<()> {
  if WINDOW_CLASS_REGISTERED.get().is_some() {
    return Ok(());
  }

  unsafe {
    let class_name_wide = wide_null(WINDOW_CLASS_NAME);
    let hinst = GetModuleHandleW(None)?;

    let mut wc = WNDCLASSEXW::default();
    wc.cbSize = size_of::<WNDCLASSEXW>() as u32;
    wc.lpfnWndProc = Some(notification_window_proc);
    wc.hInstance = hinst.into();
    wc.lpszClassName = PCWSTR(class_name_wide.as_ptr());

    if RegisterClassExW(&wc) == 0 {
      return Err(Error::from_win32());
    }

    let _ = WINDOW_CLASS_REGISTERED.set(());
  }

  Ok(())
}

fn wide_null(s: &str) -> Vec<u16> {
  s.encode_utf16().chain(std::iter::once(0)).collect()
}

unsafe fn get_window_state(hwnd: HWND) -> Option<*mut WindowState> {
  let ptr = GetWindowLongPtrW(hwnd, GWLP_USERDATA) as *mut WindowState;
  if ptr.is_null() {
    None
  } else {
    Some(ptr)
  }
}

unsafe extern "system" fn notification_window_proc(
  hwnd: HWND,
  msg: u32,
  wparam: WPARAM,
  lparam: LPARAM,
) -> LRESULT {
  match msg {
    WM_NCCREATE => {
      let cs = &*(lparam.0 as *const CREATESTRUCTW);
      let ptr = cs.lpCreateParams as isize;
      SetWindowLongPtrW(hwnd, GWLP_USERDATA, ptr);
      LRESULT(1)
    }
    WM_PAINT => {
      let mut ps = PAINTSTRUCT::default();
      let hdc = BeginPaint(hwnd, &mut ps);

      if let Some(ptr) = get_window_state(hwnd) {
        let state = &*ptr;

        let text_color = SetTextColor(hdc, COLORREF(0x00FFFFFF));
        let bk_color = SetBkColor(hdc, COLORREF(0x00000000));

        let mut rect = windows::Win32::Foundation::RECT::default();
        let _ = GetClientRect(hwnd, &mut rect);

        let mut text_buffer = state.message.encode_utf16().collect::<Vec<_>>();
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
      LRESULT(0)
    }
    WM_TIMER => {
      let _ = KillTimer(hwnd, wparam.0 as usize);
      let _ = DestroyWindow(hwnd);
      LRESULT(0)
    }
    WM_DESTROY => LRESULT(0),
    WM_NCDESTROY => {
      if let Some(ptr) = get_window_state(hwnd) {
        SetWindowLongPtrW(hwnd, GWLP_USERDATA, 0);

        let boxed = Box::from_raw(ptr);
        if let Ok(mut guard) = boxed.shared.current_hwnd.lock() {
          *guard = None;
        }
        drop(boxed);
      }
      LRESULT(0)
    }
    _ => DefWindowProcW(hwnd, msg, wparam, lparam),
  }
}
