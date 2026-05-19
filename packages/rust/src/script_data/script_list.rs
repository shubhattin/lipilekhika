use std::sync::OnceLock;

use crate::errors::TransliterationError;

use super::generated;
use super::schema::{List, ScriptListData};

impl List {
  pub fn get_krama_ref(&self) -> &Vec<i16> {
    match self {
      List::Anya { krama_ref }
      | List::Vyanjana { krama_ref }
      | List::Matra { krama_ref }
      | List::Svara { krama_ref, .. } => krama_ref,
    }
  }
  #[inline]
  pub fn is_svara(&self) -> bool {
    matches!(self, List::Svara { .. })
  }
  #[inline]
  pub fn is_matra(&self) -> bool {
    matches!(self, List::Matra { .. })
  }
  #[inline]
  pub fn is_vyanjana(&self) -> bool {
    matches!(self, List::Vyanjana { .. })
  }
  #[inline]
  pub fn is_anya(&self) -> bool {
    matches!(self, List::Anya { .. })
  }
}

static SCRIPT_LIST_DATA_CACHE: OnceLock<ScriptListData> = OnceLock::new();

/// Returns the script list data
pub fn get_script_list_data() -> &'static ScriptListData {
  SCRIPT_LIST_DATA_CACHE.get_or_init(|| {
    let bytes = generated::SCRIPT_LIST_BYTES;
    let data: ScriptListData =
      bincode::deserialize(bytes).expect("bincode decode failed for script_list");
    data
  })
}

fn capitalize_first_and_after_dash(input: &str) -> String {
  // Lowercase the string first, then capitalize first and after dash
  let mut result = String::with_capacity(input.len());
  let mut capitalize_next = true;

  for ch in input.chars() {
    if ch == '-' {
      capitalize_next = true;
      result.push(ch);
    } else if capitalize_next && ch.is_ascii_alphabetic() {
      // Mirror TS behavior which only uppercases a–z
      result.push(ch.to_ascii_uppercase());
      capitalize_next = false;
    } else {
      result.push(ch.to_ascii_lowercase());
      capitalize_next = false;
    }
  }

  result
}

/// Returns the normalized script/language name.
pub fn get_normalized_script_name(script_name: &str) -> Result<String, TransliterationError> {
  let data = get_script_list_data();

  let capitalized_name = capitalize_first_and_after_dash(script_name);

  // Direct script name match
  if data.scripts.contains(&capitalized_name) {
    return Ok(capitalized_name);
  }

  // Language -> script mapping
  if data.langs.contains(&capitalized_name)
    && let Some(script) = data.lang_script_map.get(&capitalized_name)
  {
    return Ok(script.clone());
  }

  // Alternate to script mapping (always use lowercase key)
  let lower_name = script_name.to_lowercase();
  if let Some(script) = data.script_alternates_map.get(&lower_name) {
    return Ok(script.clone());
  }

  Err(TransliterationError::InvalidScriptName(
    script_name.to_string(),
  ))
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_get_script_list_data_parses() {
    let data = get_script_list_data();
    assert!(!data.scripts.is_empty());
  }

  #[test]
  fn test_script_acronyms() {
    // Script acronyms
    assert_eq!(
      get_normalized_script_name("dev"),
      Ok("Devanagari".to_string())
    );

    assert_eq!(get_normalized_script_name("te"), Ok("Telugu".to_string()));
    assert_eq!(get_normalized_script_name("tel"), Ok("Telugu".to_string()));
    assert_eq!(get_normalized_script_name("tam"), Ok("Tamil".to_string()));
    assert_eq!(
      get_normalized_script_name("tam-ext"),
      Ok("Tamil-Extended".to_string())
    );
    assert_eq!(get_normalized_script_name("ben"), Ok("Bengali".to_string()));
    assert_eq!(get_normalized_script_name("be"), Ok("Bengali".to_string()));
    assert_eq!(get_normalized_script_name("ka"), Ok("Kannada".to_string()));
    assert_eq!(get_normalized_script_name("kan"), Ok("Kannada".to_string()));
    assert_eq!(get_normalized_script_name("gu"), Ok("Gujarati".to_string()));
    assert_eq!(
      get_normalized_script_name("guj"),
      Ok("Gujarati".to_string())
    );
    assert_eq!(
      get_normalized_script_name("mal"),
      Ok("Malayalam".to_string())
    );
    assert_eq!(get_normalized_script_name("or"), Ok("Odia".to_string()));
    assert_eq!(get_normalized_script_name("od"), Ok("Odia".to_string()));
    assert_eq!(get_normalized_script_name("oriya"), Ok("Odia".to_string()));
    assert_eq!(get_normalized_script_name("si"), Ok("Sinhala".to_string()));
    assert_eq!(
      get_normalized_script_name("sinh"),
      Ok("Sinhala".to_string())
    );
    assert_eq!(get_normalized_script_name("sin"), Ok("Sinhala".to_string()));
    assert_eq!(get_normalized_script_name("en"), Ok("Normal".to_string()));
    assert_eq!(
      get_normalized_script_name("rom"),
      Ok("Romanized".to_string())
    );
    assert_eq!(
      get_normalized_script_name("gur"),
      Ok("Gurumukhi".to_string())
    );
    assert_eq!(get_normalized_script_name("as"), Ok("Assamese".to_string()));
  }

  #[test]
  fn test_script_acronyms_case_insensitive() {
    assert_eq!(
      get_normalized_script_name("DEV"),
      Ok("Devanagari".to_string())
    );
    assert_eq!(get_normalized_script_name("Te"), Ok("Telugu".to_string()));
    assert_eq!(get_normalized_script_name("TEL"), Ok("Telugu".to_string()));
    assert_eq!(
      get_normalized_script_name("TAM-EXT"),
      Ok("Tamil-Extended".to_string())
    );
  }

  #[test]
  fn test_language_acronyms() {
    assert_eq!(
      get_normalized_script_name("sa"),
      Ok("Devanagari".to_string())
    );
    assert_eq!(
      get_normalized_script_name("san"),
      Ok("Devanagari".to_string())
    );
    assert_eq!(
      get_normalized_script_name("hin"),
      Ok("Devanagari".to_string())
    );
    assert_eq!(
      get_normalized_script_name("hi"),
      Ok("Devanagari".to_string())
    );
    assert_eq!(
      get_normalized_script_name("mar"),
      Ok("Devanagari".to_string())
    );
    assert_eq!(
      get_normalized_script_name("ne"),
      Ok("Devanagari".to_string())
    );
    assert_eq!(
      get_normalized_script_name("nep"),
      Ok("Devanagari".to_string())
    );
    assert_eq!(
      get_normalized_script_name("pun"),
      Ok("Gurumukhi".to_string())
    );
  }

  #[test]
  fn test_language_acronyms_case_insensitive() {
    assert_eq!(
      get_normalized_script_name("SA"),
      Ok("Devanagari".to_string())
    );
    assert_eq!(
      get_normalized_script_name("San"),
      Ok("Devanagari".to_string())
    );
    assert_eq!(
      get_normalized_script_name("HIN"),
      Ok("Devanagari".to_string())
    );
  }

  #[test]
  fn test_full_script_names() {
    assert_eq!(
      get_normalized_script_name("Devanagari"),
      Ok("Devanagari".to_string())
    );
    assert_eq!(
      get_normalized_script_name("Telugu"),
      Ok("Telugu".to_string())
    );
    assert_eq!(get_normalized_script_name("Tamil"), Ok("Tamil".to_string()));
    assert_eq!(
      get_normalized_script_name("Tamil-Extended"),
      Ok("Tamil-Extended".to_string())
    );
    assert_eq!(
      get_normalized_script_name("Bengali"),
      Ok("Bengali".to_string())
    );
    assert_eq!(
      get_normalized_script_name("Kannada"),
      Ok("Kannada".to_string())
    );
    assert_eq!(
      get_normalized_script_name("Gujarati"),
      Ok("Gujarati".to_string())
    );
    assert_eq!(
      get_normalized_script_name("Malayalam"),
      Ok("Malayalam".to_string())
    );
    assert_eq!(get_normalized_script_name("Odia"), Ok("Odia".to_string()));
    assert_eq!(
      get_normalized_script_name("Sinhala"),
      Ok("Sinhala".to_string())
    );
    assert_eq!(
      get_normalized_script_name("Normal"),
      Ok("Normal".to_string())
    );
    assert_eq!(
      get_normalized_script_name("Romanized"),
      Ok("Romanized".to_string())
    );
    assert_eq!(
      get_normalized_script_name("Gurumukhi"),
      Ok("Gurumukhi".to_string())
    );
    assert_eq!(
      get_normalized_script_name("Assamese"),
      Ok("Assamese".to_string())
    );
  }

  #[test]
  fn test_full_language_names() {
    assert_eq!(
      get_normalized_script_name("Sanskrit"),
      Ok("Devanagari".to_string())
    );
    assert_eq!(
      get_normalized_script_name("Hindi"),
      Ok("Devanagari".to_string())
    );
    assert_eq!(
      get_normalized_script_name("Marathi"),
      Ok("Devanagari".to_string())
    );
    assert_eq!(
      get_normalized_script_name("Nepali"),
      Ok("Devanagari".to_string())
    );
    assert_eq!(
      get_normalized_script_name("Punjabi"),
      Ok("Gurumukhi".to_string())
    );
    assert_eq!(
      get_normalized_script_name("Bengali"),
      Ok("Bengali".to_string())
    );
    assert_eq!(
      get_normalized_script_name("Gujarati"),
      Ok("Gujarati".to_string())
    );
    assert_eq!(
      get_normalized_script_name("Kannada"),
      Ok("Kannada".to_string())
    );
    assert_eq!(
      get_normalized_script_name("Malayalam"),
      Ok("Malayalam".to_string())
    );
    assert_eq!(get_normalized_script_name("Odia"), Ok("Odia".to_string()));
    assert_eq!(
      get_normalized_script_name("Sinhala"),
      Ok("Sinhala".to_string())
    );
    assert_eq!(get_normalized_script_name("Tamil"), Ok("Tamil".to_string()));
    assert_eq!(
      get_normalized_script_name("Telugu"),
      Ok("Telugu".to_string())
    );
    assert_eq!(
      get_normalized_script_name("Assamese"),
      Ok("Assamese".to_string())
    );
    assert_eq!(
      get_normalized_script_name("English"),
      Ok("Normal".to_string())
    );
  }

  #[test]
  fn test_case_variations_for_scripts() {
    // Lowercase script names
    assert_eq!(
      get_normalized_script_name("devanagari"),
      Ok("Devanagari".to_string())
    );
    assert_eq!(
      get_normalized_script_name("telugu"),
      Ok("Telugu".to_string())
    );
    assert_eq!(
      get_normalized_script_name("tamil-extended"),
      Ok("Tamil-Extended".to_string())
    );

    // Mixed case
    assert_eq!(
      get_normalized_script_name("Devanagari"),
      Ok("Devanagari".to_string())
    );
    assert_eq!(
      get_normalized_script_name("DEvanagari"),
      Ok("Devanagari".to_string())
    );
  }

  #[test]
  fn test_case_variations_for_languages() {
    assert_eq!(
      get_normalized_script_name("sanskrit"),
      Ok("Devanagari".to_string())
    );
    assert_eq!(
      get_normalized_script_name("hindi"),
      Ok("Devanagari".to_string())
    );
    assert_eq!(
      get_normalized_script_name("punjabi"),
      Ok("Gurumukhi".to_string())
    );
  }

  #[test]
  fn test_invalid_inputs() {
    // Unknown acronyms
    assert_eq!(
      get_normalized_script_name("xyz").unwrap_err().to_string(),
      "Invalid script name: xyz"
    );
    assert_eq!(
      get_normalized_script_name("unknown")
        .unwrap_err()
        .to_string(),
      "Invalid script name: unknown"
    );
    assert_eq!(
      get_normalized_script_name("abc").unwrap_err().to_string(),
      "Invalid script name: abc"
    );

    // Unknown script names
    assert_eq!(
      get_normalized_script_name("UnknownScript"),
      Err(TransliterationError::InvalidScriptName(
        "UnknownScript".to_string()
      ))
    );
    assert_eq!(
      get_normalized_script_name("Latin"),
      Err(TransliterationError::InvalidScriptName("Latin".to_string()))
    );
    assert_eq!(
      get_normalized_script_name("Cyrillic"),
      Err(TransliterationError::InvalidScriptName(
        "Cyrillic".to_string()
      ))
    );

    // Empty string and non-alphabetic
    assert_eq!(
      get_normalized_script_name("").unwrap_err().to_string(),
      "Invalid script name: "
    );
    assert_eq!(
      get_normalized_script_name("123").unwrap_err().to_string(),
      "Invalid script name: 123"
    );
    assert_eq!(
      get_normalized_script_name("!@#").unwrap_err().to_string(),
      "Invalid script name: !@#"
    );
  }

  #[test]
  fn test_edge_cases() {
    // Acronyms with dashes
    assert_eq!(
      get_normalized_script_name("tam-ext"),
      Ok("Tamil-Extended".to_string())
    );
    assert_eq!(
      get_normalized_script_name("TAM-EXT"),
      Ok("Tamil-Extended".to_string())
    );
    assert_eq!(
      get_normalized_script_name("Tam-Ext"),
      Ok("Tamil-Extended".to_string())
    );

    // Prioritize exact script matches over acronyms
    assert_eq!(
      get_normalized_script_name("Telugu"),
      Ok("Telugu".to_string())
    );
    assert_eq!(get_normalized_script_name("tel"), Ok("Telugu".to_string()));
  }
}
