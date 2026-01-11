mod custom_options;
mod generated;
mod schema;
mod script_data;
mod script_list;

use std::collections::HashMap;

pub use custom_options::*;
pub use schema::*;
pub use script_list::*;

/// Returns the list of all supported custom options for
/// transliterations for the provided script pair
///
/// - `from_script_name` - The script/language to transliterate from
/// - `to_script_name` - The script/language to transliterate to
///
/// Returns the list of all supported custom option keys for the provided script pair,
/// or an error string if script names are invalid.
pub fn get_all_option(from_script_name: &str, to_script_name: &str) -> Result<Vec<String>, String> {
  let normalized_from = get_normalized_script_name(from_script_name)
    .ok_or_else(|| format!("Invalid script name: {}", from_script_name))?;

  let normalized_to = get_normalized_script_name(to_script_name)
    .ok_or_else(|| format!("Invalid script name: {}", to_script_name))?;

  let from_script_data = ScriptData::get_script_data(&normalized_from);
  let to_script_data = ScriptData::get_script_data(&normalized_to);

  // Create a HashMap with all custom options set to true
  let custom_options_map = get_custom_options_map();
  let all_options_enabled: HashMap<String, bool> = custom_options_map
    .keys()
    .map(|key| (key.clone(), true))
    .collect();

  let active_options = crate::transliterate::transliterate::get_active_custom_options(
    from_script_data,
    to_script_data,
    Some(&all_options_enabled),
  );

  Ok(active_options.keys().cloned().collect())
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_get_all_option_valid_scripts() {
    let result = get_all_option("Devanagari", "Telugu");
    assert!(result.is_ok());
    // The result should be a list of option keys
    // We just verify it returns without error (could be 0 or more options)
  }

  #[test]
  fn test_get_all_option_normalized_names() {
    // Test with acronyms that should be normalized
    let result = get_all_option("dev", "tel");
    assert!(result.is_ok());
  }

  #[test]
  fn test_get_all_option_invalid_from_script() {
    let result = get_all_option("InvalidScript", "Telugu");
    assert!(result.is_err());
    assert_eq!(result.unwrap_err(), "Invalid script name: InvalidScript");
  }

  #[test]
  fn test_get_all_option_invalid_to_script() {
    let result = get_all_option("Devanagari", "InvalidScript");
    assert!(result.is_err());
    assert_eq!(result.unwrap_err(), "Invalid script name: InvalidScript");
  }
}
