use lipilekhika::CustomOptions;
use lipilekhika::scripts::Script;
use wasm_bindgen::prelude::*;

fn parse_trans_options(
    trans_options: Option<js_sys::Object>,
) -> Result<Option<CustomOptions>, JsError> {
    let Some(obj) = trans_options else {
        return Ok(None);
    };

    let entries = js_sys::Object::entries(&obj);
    let mut options = CustomOptions::default();
    let mut saw_any = false;

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
        options
            .try_set(&key, value)
            .map_err(|_| JsError::new(&format!("unknown trans_options key: {key}")))?;
        saw_any = true;
    }

    if !saw_any {
        Ok(None)
    } else {
        Ok(Some(options))
    }
}

fn transliterate_by_id(
    text: &str,
    from_id: u8,
    to_id: u8,
    trans_options: Option<&CustomOptions>,
) -> Result<String, JsError> {
    let from = Script::from_id(from_id).ok_or_else(|| JsError::new("invalid source script id"))?;
    let to = Script::from_id(to_id).ok_or_else(|| JsError::new("invalid target script id"))?;

    Ok(lipilekhika::transliterate(text, from, to, trans_options).into_owned())
}

fn piece_at<'a>(joined: &'a str, offsets: &[u32], index: usize) -> Result<&'a str, JsError> {
    let start = offsets[index * 2] as usize;
    let end = offsets[index * 2 + 1] as usize;
    if !joined.is_char_boundary(start) {
        return Err(JsError::new("text offset start is not a UTF-8 char boundary"));
    }
    if !joined.is_char_boundary(end) {
        return Err(JsError::new("text offset end is not a UTF-8 char boundary"));
    }
    joined
        .get(start..end)
        .ok_or_else(|| JsError::new("invalid text offsets"))
}

/// Borrow slices from `joined` using `[start, end)` pairs in `offsets`.
fn slices_from_joined<'a>(joined: &'a str, offsets: &[u32]) -> Result<Vec<&'a str>, JsError> {
    if offsets.len() % 2 != 0 {
        return Err(JsError::new("offsets length must be a multiple of 2"));
    }

    let count = offsets.len() / 2;
    let mut out = Vec::with_capacity(count);
    for i in 0..count {
        out.push(piece_at(joined, offsets, i)?);
    }
    Ok(out)
}

fn transliterate_many_by_id(
    joined: &str,
    offsets: &[u32],
    from_id: u8,
    to_id: u8,
    trans_options: Option<&CustomOptions>,
) -> Result<Vec<String>, JsError> {
    if from_id == to_id {
        return Ok(slices_from_joined(joined, offsets)?
            .into_iter()
            .map(str::to_owned)
            .collect());
    }

    if offsets.len() % 2 != 0 {
        return Err(JsError::new("offsets length must be a multiple of 2"));
    }

    let from = Script::from_id(from_id).ok_or_else(|| JsError::new("invalid source script id"))?;
    let to = Script::from_id(to_id).ok_or_else(|| JsError::new("invalid target script id"))?;

    let count = offsets.len() / 2;
    let mut out = Vec::with_capacity(count);
    for i in 0..count {
        let piece = piece_at(joined, offsets, i)?;
        out.push(lipilekhika::transliterate(piece, from, to, trans_options).into_owned());
    }

    Ok(out)
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

/// Bulk transliterate without custom options. `offsets` is `[start0, end0, start1, end1, ...]`.
#[wasm_bindgen]
pub fn transliterate_many_no_options(
    joined_text: &str,
    offsets: &[u32],
    from_id: u8,
    to_id: u8,
) -> Result<Vec<String>, JsError> {
    transliterate_many_by_id(joined_text, offsets, from_id, to_id, None)
}

/// Bulk transliterate with custom options from a JS object.
#[wasm_bindgen]
pub fn transliterate_many_with_options(
    joined_text: &str,
    offsets: &[u32],
    from_id: u8,
    to_id: u8,
    trans_options: js_sys::Object,
) -> Result<Vec<String>, JsError> {
    let options = parse_trans_options(Some(trans_options))?;
    transliterate_many_by_id(joined_text, offsets, from_id, to_id, options.as_ref())
}
