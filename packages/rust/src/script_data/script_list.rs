use serde::Deserialize;
use std::collections::HashMap;
use std::sync::OnceLock;

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]

pub struct ScriptListData {
  pub scripts: HashMap<String, u8>,
  pub langs: HashMap<String, u8>,
  /// all langs are mapped to a script
  pub lang_script_map: HashMap<String, String>,
  /// contains aliases which map to script
  pub script_alternates_map: HashMap<String, String>,
}

static SCRIPT_LIST_DATA_CACHE: OnceLock<ScriptListData> = OnceLock::new();

pub fn get_script_list_data() -> &'static ScriptListData {
  SCRIPT_LIST_DATA_CACHE.get_or_init(|| {
    let file_str = include_str!("../data/script_list.json");
    serde_json::from_str::<ScriptListData>(file_str).expect("JSON Parse Error")
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
      result.extend(ch.to_uppercase());
      capitalize_next = false;
    } else {
      result.extend(ch.to_lowercase());
      capitalize_next = false;
    }
  }

  result
}

pub fn get_normalized_script_name(script_name: &str) -> Option<String> {
  let data = get_script_list_data();

  let capitalized_name = capitalize_first_and_after_dash(script_name);

  // Direct script name match
  if data.scripts.contains_key(&capitalized_name) {
    return Some(capitalized_name);
  }

  // Language -> script mapping
  if data.langs.contains_key(&capitalized_name) {
    if let Some(script) = data.lang_script_map.get(&capitalized_name) {
      return Some(script.clone());
    }
  }

  // Alternate to script mapping (always use lowercase key)
  let lower_name = script_name.to_lowercase();
  if let Some(script) = data.script_alternates_map.get(&lower_name) {
    return Some(script.clone());
  }

  None
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
      Some("Devanagari".to_string())
    );

    assert_eq!(get_normalized_script_name("te"), Some("Telugu".to_string()));
    assert_eq!(
      get_normalized_script_name("tel"),
      Some("Telugu".to_string())
    );
    assert_eq!(get_normalized_script_name("tam"), Some("Tamil".to_string()));
    assert_eq!(
      get_normalized_script_name("tam-ext"),
      Some("Tamil-Extended".to_string())
    );
    assert_eq!(
      get_normalized_script_name("ben"),
      Some("Bengali".to_string())
    );
    assert_eq!(
      get_normalized_script_name("be"),
      Some("Bengali".to_string())
    );
    assert_eq!(
      get_normalized_script_name("ka"),
      Some("Kannada".to_string())
    );
    assert_eq!(
      get_normalized_script_name("kan"),
      Some("Kannada".to_string())
    );
    assert_eq!(
      get_normalized_script_name("gu"),
      Some("Gujarati".to_string())
    );
    assert_eq!(
      get_normalized_script_name("guj"),
      Some("Gujarati".to_string())
    );
    assert_eq!(
      get_normalized_script_name("mal"),
      Some("Malayalam".to_string())
    );
    assert_eq!(get_normalized_script_name("or"), Some("Odia".to_string()));
    assert_eq!(get_normalized_script_name("od"), Some("Odia".to_string()));
    assert_eq!(
      get_normalized_script_name("oriya"),
      Some("Odia".to_string())
    );
    assert_eq!(
      get_normalized_script_name("si"),
      Some("Sinhala".to_string())
    );
    assert_eq!(
      get_normalized_script_name("sinh"),
      Some("Sinhala".to_string())
    );
    assert_eq!(
      get_normalized_script_name("sin"),
      Some("Sinhala".to_string())
    );
    assert_eq!(get_normalized_script_name("en"), Some("Normal".to_string()));
    assert_eq!(
      get_normalized_script_name("rom"),
      Some("Romanized".to_string())
    );
    assert_eq!(
      get_normalized_script_name("gur"),
      Some("Gurumukhi".to_string())
    );
    assert_eq!(
      get_normalized_script_name("as"),
      Some("Assamese".to_string())
    );
  }

  #[test]
  fn test_script_acronyms_case_insensitive() {
    assert_eq!(
      get_normalized_script_name("DEV"),
      Some("Devanagari".to_string())
    );
    assert_eq!(get_normalized_script_name("Te"), Some("Telugu".to_string()));
    assert_eq!(
      get_normalized_script_name("TEL"),
      Some("Telugu".to_string())
    );
    assert_eq!(
      get_normalized_script_name("TAM-EXT"),
      Some("Tamil-Extended".to_string())
    );
  }

  #[test]
  fn test_language_acronyms() {
    assert_eq!(
      get_normalized_script_name("sa"),
      Some("Devanagari".to_string())
    );
    assert_eq!(
      get_normalized_script_name("san"),
      Some("Devanagari".to_string())
    );
    assert_eq!(
      get_normalized_script_name("hin"),
      Some("Devanagari".to_string())
    );
    assert_eq!(
      get_normalized_script_name("hi"),
      Some("Devanagari".to_string())
    );
    assert_eq!(
      get_normalized_script_name("mar"),
      Some("Devanagari".to_string())
    );
    assert_eq!(
      get_normalized_script_name("ne"),
      Some("Devanagari".to_string())
    );
    assert_eq!(
      get_normalized_script_name("nep"),
      Some("Devanagari".to_string())
    );
    assert_eq!(
      get_normalized_script_name("pun"),
      Some("Gurumukhi".to_string())
    );
  }

  #[test]
  fn test_language_acronyms_case_insensitive() {
    assert_eq!(
      get_normalized_script_name("SA"),
      Some("Devanagari".to_string())
    );
    assert_eq!(
      get_normalized_script_name("San"),
      Some("Devanagari".to_string())
    );
    assert_eq!(
      get_normalized_script_name("HIN"),
      Some("Devanagari".to_string())
    );
  }

  #[test]
  fn test_full_script_names() {
    assert_eq!(
      get_normalized_script_name("Devanagari"),
      Some("Devanagari".to_string())
    );
    assert_eq!(
      get_normalized_script_name("Telugu"),
      Some("Telugu".to_string())
    );
    assert_eq!(
      get_normalized_script_name("Tamil"),
      Some("Tamil".to_string())
    );
    assert_eq!(
      get_normalized_script_name("Tamil-Extended"),
      Some("Tamil-Extended".to_string())
    );
    assert_eq!(
      get_normalized_script_name("Bengali"),
      Some("Bengali".to_string())
    );
    assert_eq!(
      get_normalized_script_name("Kannada"),
      Some("Kannada".to_string())
    );
    assert_eq!(
      get_normalized_script_name("Gujarati"),
      Some("Gujarati".to_string())
    );
    assert_eq!(
      get_normalized_script_name("Malayalam"),
      Some("Malayalam".to_string())
    );
    assert_eq!(get_normalized_script_name("Odia"), Some("Odia".to_string()));
    assert_eq!(
      get_normalized_script_name("Sinhala"),
      Some("Sinhala".to_string())
    );
    assert_eq!(
      get_normalized_script_name("Normal"),
      Some("Normal".to_string())
    );
    assert_eq!(
      get_normalized_script_name("Romanized"),
      Some("Romanized".to_string())
    );
    assert_eq!(
      get_normalized_script_name("Gurumukhi"),
      Some("Gurumukhi".to_string())
    );
    assert_eq!(
      get_normalized_script_name("Assamese"),
      Some("Assamese".to_string())
    );
  }

  #[test]
  fn test_full_language_names() {
    assert_eq!(
      get_normalized_script_name("Sanskrit"),
      Some("Devanagari".to_string())
    );
    assert_eq!(
      get_normalized_script_name("Hindi"),
      Some("Devanagari".to_string())
    );
    assert_eq!(
      get_normalized_script_name("Marathi"),
      Some("Devanagari".to_string())
    );
    assert_eq!(
      get_normalized_script_name("Nepali"),
      Some("Devanagari".to_string())
    );
    assert_eq!(
      get_normalized_script_name("Punjabi"),
      Some("Gurumukhi".to_string())
    );
    assert_eq!(
      get_normalized_script_name("Bengali"),
      Some("Bengali".to_string())
    );
    assert_eq!(
      get_normalized_script_name("Gujarati"),
      Some("Gujarati".to_string())
    );
    assert_eq!(
      get_normalized_script_name("Kannada"),
      Some("Kannada".to_string())
    );
    assert_eq!(
      get_normalized_script_name("Malayalam"),
      Some("Malayalam".to_string())
    );
    assert_eq!(get_normalized_script_name("Odia"), Some("Odia".to_string()));
    assert_eq!(
      get_normalized_script_name("Sinhala"),
      Some("Sinhala".to_string())
    );
    assert_eq!(
      get_normalized_script_name("Tamil"),
      Some("Tamil".to_string())
    );
    assert_eq!(
      get_normalized_script_name("Telugu"),
      Some("Telugu".to_string())
    );
    assert_eq!(
      get_normalized_script_name("Assamese"),
      Some("Assamese".to_string())
    );
    assert_eq!(
      get_normalized_script_name("English"),
      Some("Normal".to_string())
    );
  }

  #[test]
  fn test_case_variations_for_scripts() {
    // Lowercase script names
    assert_eq!(
      get_normalized_script_name("devanagari"),
      Some("Devanagari".to_string())
    );
    assert_eq!(
      get_normalized_script_name("telugu"),
      Some("Telugu".to_string())
    );
    assert_eq!(
      get_normalized_script_name("tamil-extended"),
      Some("Tamil-Extended".to_string())
    );

    // Mixed case
    assert_eq!(
      get_normalized_script_name("Devanagari"),
      Some("Devanagari".to_string())
    );
    assert_eq!(
      get_normalized_script_name("DEvanagari"),
      Some("Devanagari".to_string())
    );
  }

  #[test]
  fn test_case_variations_for_languages() {
    assert_eq!(
      get_normalized_script_name("sanskrit"),
      Some("Devanagari".to_string())
    );
    assert_eq!(
      get_normalized_script_name("hindi"),
      Some("Devanagari".to_string())
    );
    assert_eq!(
      get_normalized_script_name("punjabi"),
      Some("Gurumukhi".to_string())
    );
  }

  #[test]
  fn test_invalid_inputs() {
    // Unknown acronyms
    assert_eq!(get_normalized_script_name("xyz"), None);
    assert_eq!(get_normalized_script_name("unknown"), None);
    assert_eq!(get_normalized_script_name("abc"), None);

    // Unknown script names
    assert_eq!(get_normalized_script_name("UnknownScript"), None);
    assert_eq!(get_normalized_script_name("Latin"), None);
    assert_eq!(get_normalized_script_name("Cyrillic"), None);

    // Empty string and non-alphabetic
    assert_eq!(get_normalized_script_name(""), None);
    assert_eq!(get_normalized_script_name("123"), None);
    assert_eq!(get_normalized_script_name("!@#"), None);
  }

  #[test]
  fn test_edge_cases() {
    // Acronyms with dashes
    assert_eq!(
      get_normalized_script_name("tam-ext"),
      Some("Tamil-Extended".to_string())
    );
    assert_eq!(
      get_normalized_script_name("TAM-EXT"),
      Some("Tamil-Extended".to_string())
    );
    assert_eq!(
      get_normalized_script_name("Tam-Ext"),
      Some("Tamil-Extended".to_string())
    );

    // Prioritize exact script matches over acronyms
    assert_eq!(
      get_normalized_script_name("Telugu"),
      Some("Telugu".to_string())
    );
    assert_eq!(
      get_normalized_script_name("tel"),
      Some("Telugu".to_string())
    );
  }
}
