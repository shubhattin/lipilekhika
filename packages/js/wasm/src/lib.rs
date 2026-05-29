use lipilekhika::scripts::Script;
use std::collections::HashMap;
use std::str::FromStr;
use wasm_bindgen::prelude::*;

fn parse_trans_options(
    trans_options: Option<js_sys::Object>,
) -> Result<Option<HashMap<String, bool>>, JsError> {
    let Some(obj) = trans_options else {
        return Ok(None);
    };

    let entries = js_sys::Object::entries(&obj);
    let mut map = HashMap::with_capacity(entries.length() as usize);

    for i in 0..entries.length() {
        let entry = js_sys::Array::from(&entries.get(i));
        let key = entry
            .get(0)
            .as_string()
            .ok_or_else(|| JsError::new("trans_options keys must be strings"))?;
        let value = entry
            .get(1)
            .as_bool()
            .ok_or_else(|| JsError::new(&format!("trans_options[{key}] must be a boolean")))?;
        map.insert(key, value);
    }

    if map.is_empty() {
        Ok(None)
    } else {
        Ok(Some(map))
    }
}

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
    let options = parse_trans_options(trans_options)?;

    let from = Script::from_str(from)
        .map_err(|e| JsError::new(&format!("invalid source script {from:?}: {e}")))?;
    let to = Script::from_str(to)
        .map_err(|e| JsError::new(&format!("invalid target script {to:?}: {e}")))?;

    Ok(lipilekhika::transliterate(text, from, to, options.as_ref()).into_owned())
}
