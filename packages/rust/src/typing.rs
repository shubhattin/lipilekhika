use std::collections::HashMap;
use std::time::{Duration, Instant};

use crate::script_data::{List, ScriptData, get_normalized_script_name};
use crate::transliterate::transliterate::{
  TransliterationFnOptions, resolve_transliteration_rules, transliterate_text_core,
};

/// Default time in milliseconds after which the context will be cleared automatically.
pub const DEFAULT_AUTO_CONTEXT_CLEAR_TIME_MS: u64 = 4500;
/// Default value for using native numerals while typing.
pub const DEFAULT_USE_NATIVE_NUMERALS: bool = true;
/// Default value for including inherent vowels while typing.
/// By default avoids schwa deletion.
pub const DEFAULT_INCLUDE_INHERENT_VOWEL: bool = false;

/// Options for configuring a typing context.
#[derive(Debug, Clone)]
pub struct TypingContextOptions {
  /// The time in milliseconds after which the context will be cleared automatically.
  /// Defaults to [`DEFAULT_AUTO_CONTEXT_CLEAR_TIME_MS`].
  pub auto_context_clear_time_ms: u64,
  /// Use native numerals in transliteration/typing.
  /// Defaults to `DEFAULT_USE_NATIVE_NUMERALS`
  pub use_native_numerals: bool,
  /// Include inherent vowels (schwa character) in transliteration/typing.
  ///
  /// - `true`: `k` -> `क` (Eg. Hindi, Bengali, Gujarati, etc.)
  /// - `false`: `k` -> `क्` (Default behavior in transliteration. Eg. Sanskrit, Telugu, Tamil, Kannada, etc.)
  ///
  /// Defaults to `DEFAULT_INCLUDE_INHERENT_VOWEL`
  pub include_inherent_vowel: bool,
}

impl Default for TypingContextOptions {
  fn default() -> Self {
    Self {
      auto_context_clear_time_ms: DEFAULT_AUTO_CONTEXT_CLEAR_TIME_MS,
      use_native_numerals: DEFAULT_USE_NATIVE_NUMERALS,
      include_inherent_vowel: DEFAULT_INCLUDE_INHERENT_VOWEL,
    }
  }
}

/// Result of processing a single key in a typing context.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TypingDiff {
  /// Number of characters that should be deleted from the current "app" input state.
  pub to_delete_chars_count: usize,
  /// Text that should be inserted into the current "app" input state.
  pub diff_add_text: String,
}

/// Stateful isolated context for character-by-character input typing.
///
/// synchronous and uses Rust's internal script data cache.
#[derive(Debug)]
pub struct TypingContext {
  normalized_typing_lang: String,

  use_native_numerals: bool,
  include_inherent_vowel: bool,

  curr_input: String,
  curr_output: String,

  auto_context_clear_time: Duration,
  last_time: Option<Instant>,

  from_script_data: &'static ScriptData,
  to_script_data: &'static ScriptData,
  trans_options: HashMap<String, bool>,
  custom_rules: Vec<crate::script_data::Rule>,
}

impl TypingContext {
  /// Creates a new typing context for the given script/language.
  ///
  /// - `typing_lang` can be a script or language name/alias (normalized via `get_normalized_script_name`).
  /// - `options` configures timing and inherent vowel / numeral behavior.
  pub fn new(typing_lang: &str, options: Option<TypingContextOptions>) -> Result<Self, String> {
    let opts = options.unwrap_or_default();

    let normalized_typing_lang = get_normalized_script_name(typing_lang)
      .ok_or_else(|| format!("Invalid script name: {}", typing_lang))?;

    let from_script_data = ScriptData::get_script_data("Normal");
    let to_script_data = ScriptData::get_script_data(&normalized_typing_lang);

    let resolved = resolve_transliteration_rules(from_script_data, to_script_data, None);

    Ok(Self {
      normalized_typing_lang,
      use_native_numerals: opts.use_native_numerals,
      include_inherent_vowel: opts.include_inherent_vowel,
      curr_input: String::new(),
      curr_output: String::new(),
      auto_context_clear_time: Duration::from_millis(opts.auto_context_clear_time_ms),
      last_time: None,
      from_script_data,
      to_script_data,
      trans_options: resolved.trans_options,
      custom_rules: resolved.custom_rules,
    })
  }

  /// Clears all internal state and contexts.
  pub fn clear_context(&mut self) {
    self.last_time = None;
    self.curr_input.clear();
    self.curr_output.clear();
  }

  /// Internal helper to build transliteration options for typing mode.
  fn build_translit_options(&self) -> TransliterationFnOptions {
    TransliterationFnOptions {
      typing_mode: true,
      use_native_numerals: self.use_native_numerals,
      include_inherent_vowel: self.include_inherent_vowel,
    }
  }

  /// Accepts character-by-character input and returns the diff relative to the previous output.
  pub fn take_key_input(&mut self, key: &str) -> Result<TypingDiff, String> {
    // If key is empty, nothing to do.
    let Some(ch) = key.chars().next() else {
      return Ok(TypingDiff {
        to_delete_chars_count: 0,
        diff_add_text: String::new(),
      });
    };

    let now = Instant::now();
    if let Some(last) = self.last_time {
      if now.duration_since(last) > self.auto_context_clear_time {
        self.clear_context();
      }
    }

    self.curr_input.push(ch);
    let prev_output = self.curr_output.clone();

    let result = transliterate_text_core(
      self.curr_input.clone(),
      "Normal",
      &self.normalized_typing_lang,
      self.from_script_data,
      self.to_script_data,
      &self.trans_options,
      &self.custom_rules,
      Some(self.build_translit_options()),
    )?;

    let context_length = result.context_length;
    let output = result.output;

    if context_length > 0 {
      self.curr_output = output.clone();
    } else if context_length == 0 {
      self.clear_context();
    }

    // Calculate the diff between previous and current output, by common prefix length.
    let (to_delete_chars_count, diff_add_text) = compute_diff(&prev_output, &output);

    self.last_time = Some(Instant::now());

    Ok(TypingDiff {
      to_delete_chars_count,
      diff_add_text,
    })
  }

  /// Updates whether native numerals should be used for subsequent typing.
  pub fn update_use_native_numerals(&mut self, use_native_numerals: bool) {
    self.use_native_numerals = use_native_numerals;
  }

  /// Updates whether inherent vowels should be included for subsequent typing.
  pub fn update_include_inherent_vowel(&mut self, include_inherent_vowel: bool) {
    self.include_inherent_vowel = include_inherent_vowel;
  }

  pub fn get_use_native_numerals(&self) -> bool {
    self.use_native_numerals
  }

  pub fn get_include_inherent_vowel(&self) -> bool {
    self.include_inherent_vowel
  }

  /// returns normalized script name
  pub fn get_normalized_script(&self) -> String {
    self.normalized_typing_lang.clone()
  }
}

/// Compute the character-wise diff between previous and current outputs.
///
/// Returns `(to_delete_chars_count, diff_add_text)`.
fn compute_diff(prev_output: &str, output: &str) -> (usize, String) {
  let mut common_chars = 0usize;

  for (a, b) in prev_output.chars().zip(output.chars()) {
    if a != b {
      break;
    }
    common_chars += 1;
  }

  let to_delete_chars_count = prev_output.chars().count().saturating_sub(common_chars);
  let diff_add_text: String = output.chars().skip(common_chars).collect();

  (to_delete_chars_count, diff_add_text)
}

/// Helper used in tests to emulate per-key typing and accumulate the final output.
///
pub fn emulate_typing(
  text: &str,
  typing_lang: &str,
  options: Option<TypingContextOptions>,
) -> Result<String, String> {
  let mut ctx = TypingContext::new(typing_lang, options)?;
  let mut result = String::new();

  for ch in text.chars() {
    let diff = ctx.take_key_input(&ch.to_string())?;

    if diff.to_delete_chars_count > 0 {
      truncate_last_chars(&mut result, diff.to_delete_chars_count);
    }

    result.push_str(&diff.diff_add_text);
  }

  Ok(result)
}

/// Truncate the last `n` characters from a UTF-8 string (character-wise, not bytes).
fn truncate_last_chars(s: &mut String, n: usize) {
  for _ in 0..n {
    if let Some((idx, _)) = s.char_indices().rev().next() {
      s.truncate(idx);
    } else {
      break;
    }
  }
}

/// Type of a character in a script's list.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum ListType {
  Anya,
  Vyanjana,
  Matra,
  Svara,
}

impl ListType {
  /// Converts a List variant to its ListType.
  fn from_list(list: &List) -> Self {
    match list {
      List::Anya { .. } => ListType::Anya,
      List::Vyanjana { .. } => ListType::Vyanjana,
      List::Matra { .. } => ListType::Matra,
      List::Svara { .. } => ListType::Svara,
    }
  }
}

/// An item in the typing data map containing the text, its type, and associated input mappings.
pub type TypingDataMapItem = (String, ListType, Vec<String>);

/// Result of [`get_script_typing_data_map`] containing typing data for a script.
#[derive(Debug)]
pub struct ScriptTypingDataMap {
  /// Mappings for common characters across scripts (from krama_text_arr).
  pub common_krama_map: Vec<TypingDataMapItem>,
  /// Mappings for script-specific characters (from custom_script_chars_arr).
  /// Duplicate key mappings are handled in the common_krama_map.
  pub script_specific_krama_map: Vec<TypingDataMapItem>,
}

/// Returns the typing data map for a script.
///
/// - `script` - The script/language name to get the typing data map for.
///
/// Returns the typing data map for the script, containing mappings for
/// both common characters and script-specific characters.
///
/// Returns an error if the script name is invalid or is 'Normal' (English).
pub fn get_script_typing_data_map(script: &str) -> Result<ScriptTypingDataMap, String> {
  let normalized_typing_lang =
    get_normalized_script_name(script).ok_or_else(|| format!("Invalid script name: {}", script))?;

  if normalized_typing_lang == "Normal" {
    return Err(format!("Invalid script name: {}", script));
  }

  let script_data = ScriptData::get_script_data(&normalized_typing_lang);
  let common_attr = script_data.get_common_attr();

  /// Merges items that end up with the same displayed text (and type),
  /// and keeps mappings unique.
  fn merge_duplicate_text_mappings(items: Vec<TypingDataMapItem>) -> Vec<TypingDataMapItem> {
    use std::collections::{HashMap, HashSet};

    let mut key_to_index: HashMap<(String, ListType), usize> = HashMap::new();
    let mut mapping_sets: Vec<HashSet<String>> = Vec::new();
    let mut out: Vec<TypingDataMapItem> = Vec::new();

    for (text, list_type, mappings) in items {
      let key = (text.clone(), list_type.clone());

      if let Some(&existing_index) = key_to_index.get(&key) {
        // Merge into existing item
        let set = &mut mapping_sets[existing_index];
        let target_mappings = &mut out[existing_index].2;
        for m in mappings {
          if set.insert(m.clone()) {
            target_mappings.push(m);
          }
        }
      } else {
        // New item
        let mut set = HashSet::new();
        let mut uniq = Vec::new();
        for m in mappings {
          if set.insert(m.clone()) {
            uniq.push(m);
          }
        }
        key_to_index.insert(key, out.len());
        out.push((text, list_type, uniq));
        mapping_sets.push(set);
      }
    }

    // Drop items that have no typing mappings
    out
      .into_iter()
      .filter(|(_, _, mappings)| !mappings.is_empty())
      .collect()
  }

  // Initialize common_krama_map from krama_text_arr
  let mut common_krama_map: Vec<TypingDataMapItem> = common_attr
    .krama_text_arr
    .iter()
    .map(|(text, list_index)| {
      let list_type = list_index
        .and_then(|idx| common_attr.list.get(idx as usize))
        .map(ListType::from_list)
        .unwrap_or(ListType::Anya);
      (text.clone(), list_type, Vec::new())
    })
    .collect();

  // Initialize script_specific_krama_map from custom_script_chars_arr
  let mut script_specific_krama_map: Vec<TypingDataMapItem> = common_attr
    .custom_script_chars_arr
    .iter()
    .map(|(text, list_index, _)| {
      let list_type = list_index
        .and_then(|idx| common_attr.list.get(idx as usize))
        .map(ListType::from_list)
        .unwrap_or(ListType::Anya);
      (text.clone(), list_type, Vec::new())
    })
    .collect();

  // Populate mappings from typing_text_to_krama_map
  for (normal_text_map, item) in &common_attr.typing_text_to_krama_map {
    if normal_text_map.is_empty() {
      continue;
    }

    if let Some(custom_back_ref) = item.custom_back_ref {
      // Add to script_specific_krama_map
      if let Some(entry) = script_specific_krama_map.get_mut(custom_back_ref as usize) {
        entry.2.push(normal_text_map.clone());
      }
    } else if let Some(ref krama) = item.krama {
      // Ignore entries with length > 1 (intermediate typing states)
      if krama.len() == 1 {
        let krama_index = krama[0];
        if krama_index >= 0 {
          if let Some(entry) = common_krama_map.get_mut(krama_index as usize) {
            entry.2.push(normal_text_map.clone());
          }
        }
      }
    }
  }

  // Merge duplicates
  common_krama_map = merge_duplicate_text_mappings(common_krama_map);
  script_specific_krama_map = merge_duplicate_text_mappings(script_specific_krama_map);

  Ok(ScriptTypingDataMap {
    common_krama_map,
    script_specific_krama_map,
  })
}

#[cfg(test)]
mod tests {
  use super::*;

  use crate::transliterate::helpers::VEDIC_SVARAS;
  use serde::Deserialize;
  use std::fs;
  use std::fs::OpenOptions;
  use std::io::Write;
  use std::path::{Path, PathBuf};

  /// For transliteration auto tests, `index` can be string or number in YAML.
  fn de_index<'de, D>(deserializer: D) -> Result<String, D::Error>
  where
    D: serde::Deserializer<'de>,
  {
    struct IndexVisitor;

    impl serde::de::Visitor<'_> for IndexVisitor {
      type Value = String;

      fn expecting(&self, formatter: &mut std::fmt::Formatter) -> std::fmt::Result {
        formatter.write_str("a yaml index (number or string)")
      }

      fn visit_i64<E>(self, v: i64) -> Result<Self::Value, E>
      where
        E: serde::de::Error,
      {
        Ok(v.to_string())
      }

      fn visit_u64<E>(self, v: u64) -> Result<Self::Value, E>
      where
        E: serde::de::Error,
      {
        Ok(v.to_string())
      }

      fn visit_f64<E>(self, v: f64) -> Result<Self::Value, E>
      where
        E: serde::de::Error,
      {
        Ok(v.to_string())
      }

      fn visit_str<E>(self, v: &str) -> Result<Self::Value, E>
      where
        E: serde::de::Error,
      {
        Ok(v.to_string())
      }

      fn visit_string<E>(self, v: String) -> Result<Self::Value, E>
      where
        E: serde::de::Error,
      {
        Ok(v)
      }
    }

    deserializer.deserialize_any(IndexVisitor)
  }

  /// Schema matching transliteration YAML test data used in emulate-typing tests.
  #[derive(Debug, Deserialize)]
  struct TransliterationTestCase {
    #[serde(deserialize_with = "de_index")]
    #[allow(dead_code)]
    index: String,
    from: String,
    to: String,
    input: String,
    output: String,
    #[serde(default)]
    #[allow(dead_code)]
    options: Option<std::collections::HashMap<String, bool>>,
    #[serde(default)]
    #[allow(dead_code)]
    reversible: Option<bool>,
    #[serde(default)]
    todo: Option<bool>,
  }

  fn transliteration_test_data_root() -> PathBuf {
    // `packages/rust` -> `../../test_data/transliteration`
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    manifest_dir
      .join("..")
      .join("..")
      .join("test_data")
      .join("transliteration")
  }

  #[test]
  fn emulate_typing_auto_transliteration_yaml() {
    use serde_yaml_ng as yaml;

    let root = transliteration_test_data_root();
    let input_dirs = [root.join("auto-nor-brahmic"), root.join("auto-nor-other")];

    // Basic reporting counters
    let mut total_emulations: usize = 0;
    let mut auto_vedic_skipped: usize = 0;

    for folder in &input_dirs {
      let entries = fs::read_dir(folder)
        .unwrap_or_else(|e| panic!("Failed listing YAML files in `{}`: {e}", folder.display()));

      for entry in entries {
        let entry = entry.expect("Failed to read directory entry");
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("yaml") {
          continue;
        }

        let yaml_text = fs::read_to_string(&path)
          .unwrap_or_else(|e| panic!("Failed reading YAML file `{}`: {e}", path.display()));
        let cases: Vec<TransliterationTestCase> = yaml::from_str(&yaml_text)
          .unwrap_or_else(|e| panic!("Failed parsing YAML file `{}`: {e}", path.display()));

        let file_name = path
          .file_name()
          .and_then(|n| n.to_str())
          .unwrap_or("<unknown>")
          .to_string();

        for case in cases {
          if case.todo.unwrap_or(false) {
            continue;
          }
          if case.from != "Normal" || case.to == "Normal" {
            continue;
          }

          let input = &case.input;
          total_emulations += 1;
          let result = emulate_typing(input, &case.to, None)
            .unwrap_or_else(|e| panic!("emulate_typing error for {}: {}", path.display(), e));

          let error_message = format!(
            "Emulate Typing failed:\n  From: {}\n  To: {}\n  Input: \"{}\"\n  Expected: \"{}\"\n  Actual: \"{}\"",
            case.from, case.to, case.input, case.output, result
          );

          if file_name.starts_with("auto")
            && case.to == "Tamil-Extended"
            && VEDIC_SVARAS.iter().any(|sv| result.contains(*sv))
          {
            auto_vedic_skipped += 1;
            continue;
          }

          assert_eq!(result, case.output, "{}", error_message);
        }
      }
    }

    let passed = total_emulations.saturating_sub(auto_vedic_skipped);
    let summary = format!(
      "Emulate Typing (auto transliteration): total_emulations={}, auto_vedic_skipped={}, passed={}",
      total_emulations, auto_vedic_skipped, passed
    );
    println!("{}", summary);

    // Also write summary to a log file so it's visible even when tests succeed.
    let _ = std::fs::create_dir_all("test_log");
    if let Ok(mut file) = OpenOptions::new()
      .create(true)
      .write(true)
      .truncate(true)
      .open("test_log/typing_auto_emulate_log.txt")
    {
      let _ = writeln!(file, "{}", summary);
    }
  }

  /// Typed view of typing options from YAML.
  #[derive(Debug, Deserialize, Default)]
  struct TypingOptionsYaml {
    #[serde(rename = "useNativeNumerals")]
    #[serde(default)]
    use_native_numerals: Option<bool>,

    #[serde(rename = "includeInherentVowel")]
    #[serde(default)]
    include_inherent_vowel: Option<bool>,

    #[serde(rename = "autoContextTClearTimeMs")]
    #[serde(default)]
    auto_context_clear_time_ms: Option<u64>,
  }

  /// Schema for typing-mode YAML tests (`test_data/typing`).
  #[derive(Debug, Deserialize)]
  struct TypingTestCase {
    index: i64,
    text: String,
    output: String,
    script: String,
    #[serde(default)]
    preserve_check: bool,
    #[serde(default)]
    todo: bool,
    #[serde(default)]
    options: Option<TypingOptionsYaml>,
  }

  fn typing_test_data_root() -> PathBuf {
    // `packages/rust` -> `../../test_data/typing`
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    manifest_dir
      .join("..")
      .join("..")
      .join("test_data")
      .join("typing")
  }

  fn list_yaml_files_typing(dir: &Path, out: &mut Vec<PathBuf>) -> std::io::Result<()> {
    for entry in fs::read_dir(dir)? {
      let entry = entry?;
      let path = entry.path();
      if path.is_dir() {
        if path
          .file_name()
          .and_then(|n| n.to_str())
          .is_some_and(|n| n == "context")
        {
          continue;
        }
        list_yaml_files_typing(&path, out)?;
      } else if path.extension().and_then(|e| e.to_str()) == Some("yaml") {
        out.push(path);
      }
    }
    Ok(())
  }

  fn build_typing_options(opts: &Option<TypingOptionsYaml>) -> Option<TypingContextOptions> {
    let some_opts = match opts {
      None => return None,
      Some(o) => o,
    };

    let mut rust_opts = TypingContextOptions::default();
    if let Some(v) = some_opts.use_native_numerals {
      rust_opts.use_native_numerals = v;
    }
    if let Some(v) = some_opts.include_inherent_vowel {
      rust_opts.include_inherent_vowel = v;
    }
    if let Some(v) = some_opts.auto_context_clear_time_ms {
      rust_opts.auto_context_clear_time_ms = v;
    }

    Some(rust_opts)
  }

  #[test]
  fn typing_mode_yaml_tests() {
    use serde_yaml_ng as yaml;

    let root = typing_test_data_root();
    let mut files: Vec<PathBuf> = Vec::new();
    list_yaml_files_typing(&root, &mut files)
      .unwrap_or_else(|e| panic!("Failed listing YAML files in `{}`: {e}", root.display()));
    files.sort();

    assert!(
      !files.is_empty(),
      "No YAML typing test files found in `{}`",
      root.display()
    );

    // Basic reporting counters
    let mut total_emulations: usize = 0;
    let mut preserve_checks: usize = 0;

    for file in files {
      let yaml_text = fs::read_to_string(&file)
        .unwrap_or_else(|e| panic!("Failed reading YAML file `{}`: {e}", file.display()));
      let cases: Vec<TypingTestCase> = yaml::from_str(&yaml_text)
        .unwrap_or_else(|e| panic!("Failed parsing YAML file `{}`: {e}", file.display()));

      for case in cases {
        if case.todo {
          continue;
        }

        let opts = build_typing_options(&case.options);
        total_emulations += 1;
        let result = emulate_typing(&case.text, &case.script, opts.clone()).unwrap_or_else(|e| {
          panic!(
            "emulate_typing error in `{}` index {}: {}",
            file.display(),
            case.index,
            e
          )
        });

        assert_eq!(
          result,
          case.output,
          "Typing Mode failed in `{}` index {} (script {}): input {:?}",
          file.display(),
          case.index,
          case.script,
          case.text
        );

        if case.preserve_check {
          preserve_checks += 1;
          // Transliterate back to Normal with `all_to_normal:preserve_specific_chars`
          let mut trans_options = std::collections::HashMap::new();
          trans_options.insert("all_to_normal:preserve_specific_chars".to_string(), true);

          let preserved =
            crate::transliterate(&result, &case.script, "Normal", Some(&trans_options))
              .unwrap_or_else(|e| {
                panic!(
                  "transliterate (preserve check) error in `{}` index {}: {}",
                  file.display(),
                  case.index,
                  e
                )
              });

          assert_eq!(
            preserved,
            case.text,
            "Preserve check failed in `{}` index {} (script {}): input {:?}",
            file.display(),
            case.index,
            case.script,
            case.text
          );
        }
      }
    }

    let summary = format!(
      "Typing Mode: total_emulations={}, preserve_checks={}, passed={}",
      total_emulations, preserve_checks, total_emulations
    );
    println!("{}", summary);

    // Also write summary to a log file so it's visible even when tests succeed.
    let _ = std::fs::create_dir_all("test_log");
    if let Ok(mut file) = OpenOptions::new()
      .create(true)
      .write(true)
      .truncate(true)
      .open("test_log/typing_mode_log.txt")
    {
      let _ = writeln!(file, "{}", summary);
    }
  }

  #[test]
  fn test_get_script_typing_data_map_valid_script() {
    let result = get_script_typing_data_map("Devanagari");
    assert!(result.is_ok());
    let data = result.unwrap();

    // Should have some entries in both maps
    assert!(!data.common_krama_map.is_empty());

    // Verify structure: each item should be (text, type, mappings)
    for (text, _list_type, _mappings) in &data.common_krama_map {
      assert!(!text.is_empty());
    }
  }

  #[test]
  fn test_get_script_typing_data_map_normalized_names() {
    // Test with acronym that should be normalized
    let result = get_script_typing_data_map("dev");
    assert!(result.is_ok());
  }

  #[test]
  fn test_get_script_typing_data_map_invalid_script() {
    let result = get_script_typing_data_map("InvalidScript");
    assert!(result.is_err());
    assert_eq!(result.unwrap_err(), "Invalid script name: InvalidScript");
  }

  #[test]
  fn test_get_script_typing_data_map_normal_script() {
    // Should reject Normal/English
    let result = get_script_typing_data_map("Normal");
    assert!(result.is_err());
    assert_eq!(result.unwrap_err(), "Invalid script name: Normal");
  }

  #[test]
  fn test_get_script_typing_data_map_mappings_populated() {
    let result = get_script_typing_data_map("Telugu");
    assert!(result.is_ok());
    let data = result.unwrap();

    // At least some entries should have mappings populated
    let has_mappings = data
      .common_krama_map
      .iter()
      .any(|(_, _, mappings)| !mappings.is_empty());

    assert!(
      has_mappings,
      "Expected at least some characters to have typing mappings"
    );
  }
}
