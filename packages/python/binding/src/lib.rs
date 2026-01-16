use pyo3::prelude::*;
use pyo3::types::PyDict;
use std::collections::HashMap;

/// Transliterates text from one script to another.
///
/// Args:
///     text (str): The text to transliterate.
///     from_script (str): The source script or language name/alias.
///     to_script (str): The target script or language name/alias.
///     trans_options (dict[str, bool], optional): Custom transliteration options.
///
/// Returns:
///     str: The transliterated text.
///
/// Raises:
///     ValueError: If script names are invalid.
#[pyfunction]
#[pyo3(signature = (text, from_script, to_script, trans_options=None))]
fn transliterate(
  text: &str,
  from_script: &str,
  to_script: &str,
  trans_options: Option<&Bound<'_, PyDict>>,
) -> PyResult<String> {
  let options: Option<HashMap<String, bool>> = trans_options.map(|dict| {
    dict
      .iter()
      .filter_map(|(k, v)| {
        let key = k.extract::<String>().ok()?;
        let value = v.extract::<bool>().ok()?;
        Some((key, value))
      })
      .collect()
  });

  lipilekhika::transliterate(text, from_script, to_script, options.as_ref())
    .map_err(|e| pyo3::exceptions::PyValueError::new_err(e))
}

/// Options for configuring a typing context.
#[pyclass]
#[derive(Clone)]
struct TypingContextOptions {
  /// The time in milliseconds after which the context will be cleared automatically.
  #[pyo3(get, set)]
  auto_context_clear_time_ms: u64,
  /// Use native numerals in transliteration/typing.
  #[pyo3(get, set)]
  use_native_numerals: bool,
  /// Include inherent vowels (schwa character) in transliteration/typing.
  #[pyo3(get, set)]
  include_inherent_vowel: bool,
}

#[pymethods]
impl TypingContextOptions {
  #[new]
  #[pyo3(signature = (auto_context_clear_time_ms=None, use_native_numerals=None, include_inherent_vowel=None))]
  fn new(
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
struct TypingDiff {
  /// Number of characters that should be deleted from the current input state.
  #[pyo3(get)]
  to_delete_chars_count: usize,
  /// Text that should be inserted into the current input state.
  #[pyo3(get)]
  diff_add_text: String,
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
struct TypingContext {
  inner: lipilekhika::typing::TypingContext,
}

#[pymethods]
impl TypingContext {
  /// Clears all internal state and contexts.
  fn clear_context(&mut self) {
    self.inner.clear_context();
  }

  /// Accepts character-by-character input and returns the diff relative to the previous output.
  ///
  /// Args:
  ///     key (str): The key/character input.
  ///
  /// Returns:
  ///     TypingDiff: The diff containing characters to delete and text to add.
  ///
  /// Raises:
  ///     ValueError: If there's an error processing the input.
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

  /// Updates whether native numerals should be used for subsequent typing.
  fn update_use_native_numerals(&mut self, use_native_numerals: bool) {
    self.inner.update_use_native_numerals(use_native_numerals);
  }

  /// Updates whether inherent vowels should be included for subsequent typing.
  fn update_include_inherent_vowel(&mut self, include_inherent_vowel: bool) {
    self
      .inner
      .update_include_inherent_vowel(include_inherent_vowel);
  }

  /// Returns whether native numerals are being used.
  fn get_use_native_numerals(&self) -> bool {
    self.inner.get_use_native_numerals()
  }

  /// Returns whether inherent vowels are included.
  fn get_include_inherent_vowel(&self) -> bool {
    self.inner.get_include_inherent_vowel()
  }

  /// Returns the normalized script name.
  fn get_normalized_script(&self) -> String {
    self.inner.get_normalized_script()
  }
}

/// Creates a new typing context for the given script/language.
///
/// Args:
///     typing_lang (str): The script or language name/alias.
///     options (TypingContextOptions, optional): Configuration options.
///
/// Returns:
///     TypingContext: A new typing context instance.
///
/// Raises:
///     ValueError: If the script name is invalid.
#[pyfunction]
#[pyo3(signature = (typing_lang, options=None))]
fn create_typing_context(
  typing_lang: &str,
  options: Option<TypingContextOptions>,
) -> PyResult<TypingContext> {
  let rust_options = options.map(|o| o.into());
  lipilekhika::typing::TypingContext::new(typing_lang, rust_options)
    .map(|ctx| TypingContext { inner: ctx })
    .map_err(|e| pyo3::exceptions::PyValueError::new_err(e))
}

/// Python bindings for Lipi Lekhika - a transliteration library.
#[pymodule]
fn _lipilekhika(m: &Bound<'_, PyModule>) -> PyResult<()> {
  m.add_function(wrap_pyfunction!(transliterate, m)?)?;
  m.add_function(wrap_pyfunction!(create_typing_context, m)?)?;
  m.add_class::<TypingContextOptions>()?;
  m.add_class::<TypingDiff>()?;
  m.add_class::<TypingContext>()?;
  Ok(())
}
