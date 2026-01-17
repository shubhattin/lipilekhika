use pyo3::prelude::*;

#[pyfunction]
pub fn default_auto_context_clear_time_ms() -> u64 {
  lipilekhika::typing::DEFAULT_AUTO_CONTEXT_CLEAR_TIME_MS
}

#[pyfunction]
pub fn default_use_native_numerals() -> bool {
  lipilekhika::typing::DEFAULT_USE_NATIVE_NUMERALS
}

#[pyfunction]
pub fn default_include_inherent_vowel() -> bool {
  lipilekhika::typing::DEFAULT_INCLUDE_INHERENT_VOWEL
}

#[pyclass]
#[derive(Clone)]
pub struct TypingContextOptions {
  #[pyo3(get, set)]
  auto_context_clear_time_ms: u64,
  #[pyo3(get, set)]
  use_native_numerals: bool,
  #[pyo3(get, set)]
  include_inherent_vowel: bool,
}

#[pymethods]
impl TypingContextOptions {
  #[new]
  #[pyo3(signature = (auto_context_clear_time_ms=None, use_native_numerals=None, include_inherent_vowel=None))]
  pub fn new(
    auto_context_clear_time_ms: Option<u64>,
    use_native_numerals: Option<bool>,
    include_inherent_vowel: Option<bool>,
  ) -> Self {
    let defaults = lipilekhika::typing::TypingContextOptions::default();
    Self {
      auto_context_clear_time_ms: auto_context_clear_time_ms
        .unwrap_or(defaults.auto_context_clear_time_ms),
      use_native_numerals: use_native_numerals.unwrap_or(defaults.use_native_numerals),
      include_inherent_vowel: include_inherent_vowel.unwrap_or(defaults.include_inherent_vowel),
    }
  }
}

impl From<TypingContextOptions> for lipilekhika::typing::TypingContextOptions {
  fn from(opts: TypingContextOptions) -> Self {
    Self {
      auto_context_clear_time_ms: opts.auto_context_clear_time_ms,
      use_native_numerals: opts.use_native_numerals,
      include_inherent_vowel: opts.include_inherent_vowel,
    }
  }
}

/// Result of processing a single key in a typing context.
#[pyclass]
#[derive(Clone)]
pub struct TypingDiff {
  /// Number of characters that should be deleted from the current input state.
  #[pyo3(get)]
  pub to_delete_chars_count: usize,
  /// Text that should be inserted into the current input state.
  #[pyo3(get)]
  pub diff_add_text: String,
}

#[pymethods]
impl TypingDiff {
  fn __repr__(&self) -> String {
    format!(
      "TypingDiff(to_delete_chars_count={}, diff_add_text={:?})",
      self.to_delete_chars_count, self.diff_add_text
    )
  }
}

/// Stateful isolated context for character-by-character input typing.
#[pyclass]
pub struct TypingContext {
  pub inner: lipilekhika::typing::TypingContext,
}

#[pymethods]
impl TypingContext {
  fn clear_context(&mut self) {
    self.inner.clear_context();
  }
  fn take_key_input(&mut self, key: &str) -> PyResult<TypingDiff> {
    self
      .inner
      .take_key_input(key)
      .map(|diff| TypingDiff {
        to_delete_chars_count: diff.to_delete_chars_count,
        diff_add_text: diff.diff_add_text,
      })
      .map_err(|e| pyo3::exceptions::PyValueError::new_err(e))
  }

  fn update_use_native_numerals(&mut self, use_native_numerals: bool) {
    self.inner.update_use_native_numerals(use_native_numerals);
  }

  fn update_include_inherent_vowel(&mut self, include_inherent_vowel: bool) {
    self
      .inner
      .update_include_inherent_vowel(include_inherent_vowel);
  }

  fn get_use_native_numerals(&self) -> bool {
    self.inner.get_use_native_numerals()
  }

  fn get_include_inherent_vowel(&self) -> bool {
    self.inner.get_include_inherent_vowel()
  }
}

#[pyfunction]
#[pyo3(signature = (typing_lang, options=None))]
pub fn create_typing_context(
  typing_lang: &str,
  options: Option<TypingContextOptions>,
) -> PyResult<TypingContext> {
  let rust_options = options.map(|o| o.into());
  lipilekhika::typing::TypingContext::new(typing_lang, rust_options)
    .map(|ctx| TypingContext { inner: ctx })
    .map_err(|e| pyo3::exceptions::PyValueError::new_err(e))
}

/// An item in the typing data map: (text, list_type, mappings).
/// - `text`: The displayed character/text in the target script.
/// - `list_type`: One of "anya", "vyanjana", "matra", "svara".
/// - `mappings`: List of input key sequences that produce this character.
pub type TypingDataMapItem = (String, String, Vec<String>);

/// Result containing typing data for a script.
#[pyclass]
#[derive(Clone)]
pub struct ScriptTypingDataMap {
  /// Mappings for common characters across scripts (from krama_text_arr).
  #[pyo3(get)]
  pub common_krama_map: Vec<TypingDataMapItem>,
  /// Mappings for script-specific characters (from custom_script_chars_arr).
  #[pyo3(get)]
  pub script_specific_krama_map: Vec<TypingDataMapItem>,
}

#[pymethods]
impl ScriptTypingDataMap {
  fn __repr__(&self) -> String {
    format!(
      "ScriptTypingDataMap(common_krama_map={} items, script_specific_krama_map={} items)",
      self.common_krama_map.len(),
      self.script_specific_krama_map.len()
    )
  }
}

/// Returns the typing data map for a script.
///
/// Args:
///     script (str): The script/language name to get the typing data map for.
///
/// Returns:
///     ScriptTypingDataMap: The typing data map for the script.
///
/// Raises:
///     ValueError: If the script name is invalid or is 'Normal' (English).
#[pyfunction]
#[pyo3(signature = (script))]
pub fn get_script_typing_data_map(script: &str) -> PyResult<ScriptTypingDataMap> {
  lipilekhika::typing::get_script_typing_data_map(script)
    .map(|data| {
      // Convert ListType enum to lowercase string
      fn list_type_to_string(lt: &lipilekhika::typing::ListType) -> String {
        match lt {
          lipilekhika::typing::ListType::Anya => "anya".to_string(),
          lipilekhika::typing::ListType::Vyanjana => "vyanjana".to_string(),
          lipilekhika::typing::ListType::Matra => "matra".to_string(),
          lipilekhika::typing::ListType::Svara => "svara".to_string(),
        }
      }

      ScriptTypingDataMap {
        common_krama_map: data
          .common_krama_map
          .into_iter()
          .map(|(text, list_type, mappings)| (text, list_type_to_string(&list_type), mappings))
          .collect(),
        script_specific_krama_map: data
          .script_specific_krama_map
          .into_iter()
          .map(|(text, list_type, mappings)| (text, list_type_to_string(&list_type), mappings))
          .collect(),
      }
    })
    .map_err(|e| pyo3::exceptions::PyValueError::new_err(e))
}
