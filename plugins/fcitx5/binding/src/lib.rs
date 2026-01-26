//! C ABI bindings for integrating Lipilekhika typing into Fcitx5 C++ code.
//!
//! This crate is intended to be consumed from C/C++ via `cdylib`.

#![allow(unsafe_op_in_unsafe_fn)]

use core::ffi::c_void;
use std::ffi::CStr;
use std::os::raw::c_char;

type RustTypingContext = lipilekhika::typing::TypingContext;
type RustTypingContextOptions = lipilekhika::typing::TypingContextOptions;

/// Status codes returned by the C ABI.
#[repr(C)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LipiStatus {
  Ok = 0,
  NullPtr = 1,
  InvalidUtf8 = 2,
  Panic = 3,
  Error = 4,
}

/// Owned UTF-8 string allocated by Rust.
///
/// - `ptr` points to a heap allocation of **len + 1** bytes.
/// - The final byte is always `\\0` for convenience.
/// - The content may be treated as a byte slice of length `len`.
/// - Call `lipi_string_free` to free.
#[repr(C)]
#[derive(Debug, Clone, Copy)]
pub struct LipiString {
  pub ptr: *mut c_char,
  pub len: usize,
  pub cap: usize,
}

impl LipiString {
  fn null() -> Self {
    Self {
      ptr: std::ptr::null_mut(),
      len: 0,
      cap: 0,
    }
  }
}

/// Result of processing a single key in a typing context.
#[repr(C)]
#[derive(Debug, Clone, Copy)]
pub struct LipiTypingDiff {
  /// Number of Unicode scalar chars to delete from the end of the current preedit.
  pub to_delete_chars_count: usize,
  /// UTF-8 text to append to the preedit.
  pub diff_add_text: LipiString,
}

/// Options for configuring a typing context.
#[repr(C)]
#[derive(Debug, Clone, Copy)]
pub struct LipiTypingContextOptions {
  pub auto_context_clear_time_ms: u64,
  pub use_native_numerals: bool,
  pub include_inherent_vowel: bool,
}

/// Opaque handle type used by the C ABI.
///
/// Intentionally **not** `#[repr(C)]` so cbindgen will treat it as opaque.
pub struct LipiTypingContext {
  _private: *mut c_void,
}

fn alloc_lipi_string(s: String) -> LipiString {
  let mut bytes = s.into_bytes();
  bytes.push(0);
  let len = bytes.len().saturating_sub(1);
  let cap = bytes.capacity();
  let ptr = bytes.as_mut_ptr() as *mut c_char;
  std::mem::forget(bytes);
  LipiString { ptr, len, cap }
}

unsafe fn set_out_string(out: *mut LipiString, value: Option<String>) {
  if out.is_null() {
    return;
  }
  *out = match value {
    Some(s) => alloc_lipi_string(s),
    None => LipiString::null(),
  };
}

unsafe fn cstr_to_string(ptr: *const c_char) -> Result<String, LipiStatus> {
  if ptr.is_null() {
    return Err(LipiStatus::NullPtr);
  }
  CStr::from_ptr(ptr)
    .to_str()
    .map(|s| s.to_string())
    .map_err(|_| LipiStatus::InvalidUtf8)
}

unsafe fn ctx_from_ptr<'a>(ctx: *mut LipiTypingContext) -> Result<&'a mut RustTypingContext, LipiStatus> {
  if ctx.is_null() {
    return Err(LipiStatus::NullPtr);
  }
  Ok(&mut *(ctx as *mut RustTypingContext))
}

fn map_options(opts: Option<LipiTypingContextOptions>) -> RustTypingContextOptions {
  match opts {
    Some(o) => RustTypingContextOptions {
      auto_context_clear_time_ms: o.auto_context_clear_time_ms,
      use_native_numerals: o.use_native_numerals,
      include_inherent_vowel: o.include_inherent_vowel,
    },
    None => RustTypingContextOptions::default(),
  }
}

/// Frees a `LipiString` previously returned by this library.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn lipi_string_free(s: LipiString) {
  if s.ptr.is_null() {
    return;
  }
  // We always allocate len + 1 bytes, with final NUL.
  let total_len = s.len.saturating_add(1);
  let _ = Vec::<u8>::from_raw_parts(s.ptr as *mut u8, total_len, s.cap);
}

/// Writes default typing options to `out_opts`.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn lipi_typing_default_options(out_opts: *mut LipiTypingContextOptions) -> LipiStatus {
  if out_opts.is_null() {
    return LipiStatus::NullPtr;
  }
  let defaults = RustTypingContextOptions::default();
  *out_opts = LipiTypingContextOptions {
    auto_context_clear_time_ms: defaults.auto_context_clear_time_ms,
    use_native_numerals: defaults.use_native_numerals,
    include_inherent_vowel: defaults.include_inherent_vowel,
  };
  LipiStatus::Ok
}

/// Creates a new typing context.
///
/// - `typing_lang_utf8`: script/language name or alias (UTF-8, NUL-terminated)
/// - `opts`: optional; pass NULL to use Rust defaults
/// - `out_ctx`: receives an opaque context pointer on success
/// - `out_err`: receives an error message on failure (must be freed with `lipi_string_free`)
#[unsafe(no_mangle)]
pub unsafe extern "C" fn lipi_typing_context_new(
  typing_lang_utf8: *const c_char,
  opts: *const LipiTypingContextOptions,
  out_ctx: *mut *mut LipiTypingContext,
  out_err: *mut LipiString,
) -> LipiStatus {
  set_out_string(out_err, None);

  if out_ctx.is_null() {
    return LipiStatus::NullPtr;
  }

  let lang = match cstr_to_string(typing_lang_utf8) {
    Ok(s) => s,
    Err(status) => {
      set_out_string(out_err, Some(format!("{status:?}")));
      return status;
    }
  };

  let rust_opts = if opts.is_null() {
    None
  } else {
    Some(map_options(Some(*opts)))
  };

  let result = std::panic::catch_unwind(|| {
    RustTypingContext::new(&lang, rust_opts).map_err(|e| e)
  });

  match result {
    Err(_) => {
      set_out_string(out_err, Some("panic across FFI boundary".to_string()));
      LipiStatus::Panic
    }
    Ok(Err(err_msg)) => {
      set_out_string(out_err, Some(err_msg));
      LipiStatus::Error
    }
    Ok(Ok(ctx)) => {
      let boxed = Box::new(ctx);
      *out_ctx = Box::into_raw(boxed) as *mut LipiTypingContext;
      LipiStatus::Ok
    }
  }
}

/// Destroys a typing context created by `lipi_typing_context_new`.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn lipi_typing_context_free(ctx: *mut LipiTypingContext) {
  if ctx.is_null() {
    return;
  }
  drop(Box::from_raw(ctx as *mut RustTypingContext));
}

/// Clears all internal state and contexts.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn lipi_typing_context_clear(ctx: *mut LipiTypingContext) -> LipiStatus {
  let result = std::panic::catch_unwind(|| {
    let ctx = ctx_from_ptr(ctx)?;
    ctx.clear_context();
    Ok::<(), LipiStatus>(())
  });

  match result {
    Err(_) => LipiStatus::Panic,
    Ok(Err(status)) => status,
    Ok(Ok(())) => LipiStatus::Ok,
  }
}

/// Processes a single key (expects a UTF-8 string; first Unicode scalar is used).
///
/// On success writes `out_diff` and returns `LipiStatus::Ok`.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn lipi_typing_context_take_key_input(
  ctx: *mut LipiTypingContext,
  key_utf8: *const c_char,
  out_diff: *mut LipiTypingDiff,
  out_err: *mut LipiString,
) -> LipiStatus {
  set_out_string(out_err, None);

  if out_diff.is_null() {
    return LipiStatus::NullPtr;
  }

  let key = match cstr_to_string(key_utf8) {
    Ok(s) => s,
    Err(status) => {
      set_out_string(out_err, Some(format!("{status:?}")));
      return status;
    }
  };

  let result = std::panic::catch_unwind(|| {
    let ctx = ctx_from_ptr(ctx).map_err(|e| format!("{e:?}"))?;
    ctx.take_key_input(&key).map_err(|e| e)
  });

  match result {
    Err(_) => {
      set_out_string(out_err, Some("panic across FFI boundary".to_string()));
      LipiStatus::Panic
    }
    Ok(Err(err_msg)) => {
      set_out_string(out_err, Some(err_msg));
      LipiStatus::Error
    }
    Ok(Ok(diff)) => {
      *out_diff = LipiTypingDiff {
        to_delete_chars_count: diff.to_delete_chars_count,
        diff_add_text: alloc_lipi_string(diff.diff_add_text),
      };
      LipiStatus::Ok
    }
  }
}

/// Updates whether native numerals should be used for subsequent typing.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn lipi_typing_context_set_use_native_numerals(
  ctx: *mut LipiTypingContext,
  use_native_numerals: bool,
) -> LipiStatus {
  let result = std::panic::catch_unwind(|| {
    let ctx = ctx_from_ptr(ctx)?;
    ctx.update_use_native_numerals(use_native_numerals);
    Ok::<(), LipiStatus>(())
  });
  match result {
    Err(_) => LipiStatus::Panic,
    Ok(Err(status)) => status,
    Ok(Ok(())) => LipiStatus::Ok,
  }
}

/// Updates whether inherent vowels should be included for subsequent typing.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn lipi_typing_context_set_include_inherent_vowel(
  ctx: *mut LipiTypingContext,
  include_inherent_vowel: bool,
) -> LipiStatus {
  let result = std::panic::catch_unwind(|| {
    let ctx = ctx_from_ptr(ctx)?;
    ctx.update_include_inherent_vowel(include_inherent_vowel);
    Ok::<(), LipiStatus>(())
  });
  match result {
    Err(_) => LipiStatus::Panic,
    Ok(Err(status)) => status,
    Ok(Ok(())) => LipiStatus::Ok,
  }
}

