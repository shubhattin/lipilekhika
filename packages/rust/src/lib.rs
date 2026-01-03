use std::collections::HashMap;

pub mod script_data;
pub mod transliterate;
pub mod utils;

use crate::script_data::get_normalized_script_name;
use crate::transliterate::transliterate_text;

/// Transliterates `text` from `from` to `to`.
///
/// - `from` / `to` can be script or language names/aliases (normalized via `get_normalized_script_name`)
/// - `trans_options` are the custom transliteration options (same keys as JS)
///
/// Returns the transliterated text, or an error string if script names are invalid.
pub fn transliterate(
    text: &str,
    from: &str,
    to: &str,
    trans_options: Option<&HashMap<String, bool>>,
) -> Result<String, String> {
    let normalized_from =
        get_normalized_script_name(from).ok_or_else(|| format!("Invalid script name: {}", from))?;
    let normalized_to =
        get_normalized_script_name(to).ok_or_else(|| format!("Invalid script name: {}", to))?;

    if normalized_from == normalized_to {
        return Ok(text.to_string());
    }

    let result = transliterate_text(
        text.to_string(),
        &normalized_from,
        &normalized_to,
        trans_options,
        None,
    )?;

    Ok(result.output)
}
