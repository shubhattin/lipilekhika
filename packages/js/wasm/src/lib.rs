use std::collections::HashMap;
use wasm_bindgen::prelude::*;

/// Transliterates text from one script to another.
///
/// - `text`: The text to transliterate
/// - `from`: Source script name/alias
/// - `to`: Target script name/alias
/// - `trans_options`: Optional JSON object with transliteration options (e.g., {"option_name": true})
///
/// Returns the transliterated text or throws an error if script names are invalid.
#[wasm_bindgen]
pub fn transliterate(
  text: &str,
  from: &str,
  to: &str,
  trans_options: Option<js_sys::Object>,
) -> Result<String, JsError> {
  let options: Option<HashMap<String, bool>> = match trans_options {
    Some(obj) => {
      let mut map = HashMap::new();
      let entries = js_sys::Object::entries(&obj);
      for i in 0..entries.length() {
        let entry = js_sys::Array::from(&entries.get(i));
        if let (Some(key), Some(val)) = (entry.get(0).as_string(), entry.get(1).as_bool()) {
          map.insert(key, val);
        }
      }
      if map.is_empty() { None } else { Some(map) }
    }
    None => None,
  };

  lipilekhika::transliterate(text, from, to, options.as_ref()).map_err(|e| JsError::new(&e))
}
