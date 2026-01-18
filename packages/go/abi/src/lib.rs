use std::collections::HashMap;
use std::ffi::{CStr, CString};
use std::os::raw::c_char;

use lipilekhika::transliterate;

#[unsafe(no_mangle)]
pub extern "C" fn add(a: i32, b: i32) -> i32 {
  a + b
}

/// Result struct for transliterate operation.
/// If `error` is null, `result` contains the transliterated text.
/// If `error` is not null, it contains the error message.
/// The caller is responsible for freeing both pointers using `free_transliterate_result`.
#[repr(C)]
pub struct TransliterateResult {
  pub result: *mut c_char,
  pub error: *mut c_char,
}

/// Transliterates text from one script to another.
///
/// # Arguments
/// * `text` - The text to transliterate (C string)
/// * `from` - Source script name (C string)
/// * `to` - Target script name (C string)
/// * `options_json` - Optional JSON string for transliteration options (null for no options)
///                    Format: {"option_name": true, "another_option": false}
///
/// # Returns
/// A `TransliterateResult` struct. The caller must call `free_transliterate_result` to free the memory.
#[unsafe(no_mangle)]
pub extern "C" fn lipi_transliterate(
  text: *const c_char,
  from: *const c_char,
  to: *const c_char,
  options_json: *const c_char,
) -> TransliterateResult {
  // Safety: We're assuming the caller passes valid C strings
  let text_rs = match unsafe { CStr::from_ptr(text) }.to_str() {
    Ok(s) => s,
    Err(_) => {
      return TransliterateResult {
        result: std::ptr::null_mut(),
        error: CString::new("Invalid UTF-8 in text parameter")
          .unwrap()
          .into_raw(),
      };
    }
  };

  let from_rs = match unsafe { CStr::from_ptr(from) }.to_str() {
    Ok(s) => s,
    Err(_) => {
      return TransliterateResult {
        result: std::ptr::null_mut(),
        error: CString::new("Invalid UTF-8 in from parameter")
          .unwrap()
          .into_raw(),
      };
    }
  };

  let to_rs = match unsafe { CStr::from_ptr(to) }.to_str() {
    Ok(s) => s,
    Err(_) => {
      return TransliterateResult {
        result: std::ptr::null_mut(),
        error: CString::new("Invalid UTF-8 in to parameter")
          .unwrap()
          .into_raw(),
      };
    }
  };

  // Parse options from JSON if provided
  let options: Option<HashMap<String, bool>> = if options_json.is_null() {
    None
  } else {
    match unsafe { CStr::from_ptr(options_json) }.to_str() {
      Ok(json_str) if !json_str.is_empty() => {
        match serde_json::from_str::<HashMap<String, bool>>(json_str) {
          Ok(opts) => Some(opts),
          Err(e) => {
            return TransliterateResult {
              result: std::ptr::null_mut(),
              error: CString::new(format!("Invalid options JSON: {}", e))
                .unwrap()
                .into_raw(),
            };
          }
        }
      }
      Ok(_) => None, // Empty string means no options
      Err(_) => {
        return TransliterateResult {
          result: std::ptr::null_mut(),
          error: CString::new("Invalid UTF-8 in options_json parameter")
            .unwrap()
            .into_raw(),
        };
      }
    }
  };

  match transliterate(text_rs, from_rs, to_rs, options.as_ref()) {
    Ok(result) => TransliterateResult {
      result: CString::new(result).unwrap().into_raw(),
      error: std::ptr::null_mut(),
    },
    Err(e) => TransliterateResult {
      result: std::ptr::null_mut(),
      error: CString::new(e).unwrap().into_raw(),
    },
  }
}

/// Frees the memory allocated by `lipi_transliterate`.
/// Must be called for every `TransliterateResult` returned.
#[unsafe(no_mangle)]
pub extern "C" fn free_transliterate_result(res: TransliterateResult) {
  if !res.result.is_null() {
    unsafe {
      drop(CString::from_raw(res.result));
    }
  }
  if !res.error.is_null() {
    unsafe {
      drop(CString::from_raw(res.error));
    }
  }
}
