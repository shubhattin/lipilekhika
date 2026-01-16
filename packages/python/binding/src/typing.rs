use pyo3::prelude::*;

/// Options for configuring a typing context.
#[pyclass]
#[derive(Clone)]
pub struct TypingContextOptions {
  /// The time in milliseconds after which the context will be cleared automatically.
  #[pyo3(get, set)]
  pub auto_context_clear_time_ms: u64,
  /// Use native numerals in transliteration/typing.
  #[pyo3(get, set)]
  pub use_native_numerals: bool,
  /// Include inherent vowels (schwa character) in transliteration/typing.
  #[pyo3(get, set)]
  pub include_inherent_vowel: bool,
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
pub fn create_typing_context(
  typing_lang: &str,
  options: Option<TypingContextOptions>,
) -> PyResult<TypingContext> {
  let rust_options = options.map(|o| o.into());
  lipilekhika::typing::TypingContext::new(typing_lang, rust_options)
    .map(|ctx| TypingContext { inner: ctx })
    .map_err(|e| pyo3::exceptions::PyValueError::new_err(e))
}

/// Default time in milliseconds after which the context will be cleared automatically.
#[pyfunction]
pub fn default_auto_context_clear_time_ms() -> u64 {
  lipilekhika::typing::DEFAULT_AUTO_CONTEXT_CLEAR_TIME_MS
}

/// Default value for using native numerals while typing.
#[pyfunction]
pub fn default_use_native_numerals() -> bool {
  lipilekhika::typing::DEFAULT_USE_NATIVE_NUMERALS
}

/// Default value for including inherent vowels while typing.
/// By default avoids schwa deletion.
#[pyfunction]
pub fn default_include_inherent_vowel() -> bool {
  lipilekhika::typing::DEFAULT_INCLUDE_INHERENT_VOWEL
}
