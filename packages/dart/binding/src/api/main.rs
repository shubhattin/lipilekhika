use std::collections::HashMap;

/// Data structure containing script list information.
#[flutter_rust_bridge::frb(dart_metadata = ("freezed"))]
pub struct ScriptListData {
  pub scripts: Vec<String>,
  pub langs: Vec<String>,
  pub lang_script_map: HashMap<String, String>,
  pub script_alternates_map: HashMap<String, String>,
}

impl From<&lipilekhika::ScriptListData> for ScriptListData {
  fn from(data: &lipilekhika::ScriptListData) -> Self {
    Self {
      scripts: data.scripts.clone(),
      langs: data.langs.clone(),
      lang_script_map: data.lang_script_map.clone(),
      script_alternates_map: data.script_alternates_map.clone(),
    }
  }
}

/// Transliterates text from one script/language to another.
///
/// # Arguments
/// * `text` - The text to transliterate
/// * `from_script` - The script/language to transliterate from
/// * `to_script` - The script/language to transliterate to
/// * `options` - Optional custom transliteration options
///
/// # Returns
/// The transliterated text
///
/// # Errors
/// Returns an error if an invalid script name is provided
#[flutter_rust_bridge::frb(sync)]
pub fn transliterate(
  text: String,
  from_script: String,
  to_script: String,
  options: Option<HashMap<String, bool>>,
) -> Result<String, String> {
  lipilekhika::transliterate(&text, &from_script, &to_script, options.as_ref())
}

/// Preloads the script data for the given script/language.
///
/// This is useful for avoiding fetch latency in applications where
/// you want to ensure the script data is loaded before use.
#[flutter_rust_bridge::frb(sync)]
pub fn preload_script_data(script_name: String) {
  lipilekhika::preload_script_data(&script_name);
}

/// Returns the schwa deletion characteristic of the script provided.
///
/// This is the property in which an inherent vowel 'a' (अ) is added to
/// the end of vyanjana (consonant) characters.
///
/// # Returns
/// * `Some(true)` - if the script has schwa deletion
/// * `Some(false)` - if the script doesn't have schwa deletion  
/// * `None` - if the script is not a brahmic script
#[flutter_rust_bridge::frb(sync)]
pub fn get_schwa_status_for_script(script_name: String) -> Result<Option<bool>, String> {
  lipilekhika::get_schwa_status_for_script(&script_name)
}

/// Returns the list of all supported custom options for transliterations.
///
/// This function returns all available custom options for the provided
/// script pair that can be used in the transliterate function.
#[flutter_rust_bridge::frb(sync)]
pub fn get_all_options(from_script: String, to_script: String) -> Result<Vec<String>, String> {
  lipilekhika::get_all_options(&from_script, &to_script)
    .map(|options| options.into_iter().collect::<Vec<String>>())
}

/// Get the normalized script name for the given script/language.
///
/// This function maps language names to their corresponding script names
/// and validates that the provided name is a valid script/language.
#[flutter_rust_bridge::frb(sync)]
pub fn get_normalized_script_name(script_name: String) -> Option<String> {
  lipilekhika::get_normalized_script_name(&script_name)
}

/// Returns the script list data containing all script and language mappings.
#[flutter_rust_bridge::frb(sync)]
pub fn get_script_list_data() -> ScriptListData {
  ScriptListData::from(lipilekhika::get_script_list_data())
}
