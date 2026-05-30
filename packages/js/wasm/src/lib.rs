use lipilekhika::HashMap;
use lipilekhika::scripts::Script;
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
            .ok_or_else(|| JsError::new("trans_options value must be a boolean"))?;
        map.insert(key, value);
    }

    if map.is_empty() {
        Ok(None)
    } else {
        Ok(Some(map))
    }
}

fn transliterate_by_id(
    text: &str,
    from_id: u8,
    to_id: u8,
    trans_options: Option<&HashMap<String, bool>>,
) -> Result<String, JsError> {
    let from = Script::from_id(from_id).ok_or_else(|| JsError::new("invalid source script id"))?;
    let to = Script::from_id(to_id).ok_or_else(|| JsError::new("invalid target script id"))?;

    Ok(lipilekhika::transliterate(text, from, to, trans_options).into_owned())
}

/// Fast path: transliterate without custom options (no JS object parsing).
#[wasm_bindgen]
pub fn transliterate_no_options(text: &str, from_id: u8, to_id: u8) -> Result<String, JsError> {
    transliterate_by_id(text, from_id, to_id, None)
}

/// Transliterate with custom options from a JS object.
#[wasm_bindgen]
pub fn transliterate_with_options(
    text: &str,
    from_id: u8,
    to_id: u8,
    trans_options: js_sys::Object,
) -> Result<String, JsError> {
    let options = parse_trans_options(Some(trans_options))?;
    transliterate_by_id(text, from_id, to_id, options.as_ref())
}
