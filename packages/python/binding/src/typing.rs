use pyo3::prelude::*;
use pyo3::types::{PyString, PyType};

/// `True` / `False` as Python writes them
fn py_bool(value: bool) -> &'static str {
    if value { "True" } else { "False" }
}

/// The auto clear time, a whole number of milliseconds (0 to `u64::MAX`). Taken as `i128`, so that
/// a negative or too large Python `int` is a `ValueError` (not an `OverflowError`).
fn clear_time_ms(ms: i128) -> PyResult<u64> {
    u64::try_from(ms).map_err(|_| {
        pyo3::exceptions::PyValueError::new_err(format!(
            "auto_context_clear_time_ms must be 0 to {} milliseconds, got {ms}",
            u64::MAX
        ))
    })
}

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

#[pyclass(module = "lipilekhika.typing")]
#[derive(Clone)]
pub struct TypingContextOptions {
    #[pyo3(get)]
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
        auto_context_clear_time_ms: Option<i128>,
        use_native_numerals: Option<bool>,
        include_inherent_vowel: Option<bool>,
    ) -> PyResult<Self> {
        let defaults = lipilekhika::typing::TypingContextOptions::default();
        Ok(Self {
            auto_context_clear_time_ms: match auto_context_clear_time_ms {
                Some(ms) => clear_time_ms(ms)?,
                None => defaults.auto_context_clear_time_ms,
            },
            use_native_numerals: use_native_numerals.unwrap_or(defaults.use_native_numerals),
            include_inherent_vowel: include_inherent_vowel
                .unwrap_or(defaults.include_inherent_vowel),
        })
    }

    #[setter]
    fn set_auto_context_clear_time_ms(&mut self, ms: i128) -> PyResult<()> {
        self.auto_context_clear_time_ms = clear_time_ms(ms)?;
        Ok(())
    }

    fn __repr__(&self) -> String {
        format!(
            "TypingContextOptions(auto_context_clear_time_ms={}, use_native_numerals={}, include_inherent_vowel={})",
            self.auto_context_clear_time_ms,
            py_bool(self.use_native_numerals),
            py_bool(self.include_inherent_vowel)
        )
    }

    /// `pickle` / `copy`: made again from its three values
    #[allow(clippy::type_complexity)]
    fn __reduce__<'py>(
        slf: &Bound<'py, Self>,
    ) -> PyResult<(Bound<'py, PyType>, (u64, bool, bool))> {
        let options = slf.borrow();
        Ok((
            slf.get_type(),
            (
                options.auto_context_clear_time_ms,
                options.use_native_numerals,
                options.include_inherent_vowel,
            ),
        ))
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
#[pyclass(module = "lipilekhika.typing")]
#[derive(Clone)]
pub struct TypingDiff {
    /// Number of characters (code points, like `len()` of a Python `str`) that should be deleted
    /// from the end of the current input state. The JS package counts UTF-16 code units instead.
    #[pyo3(get)]
    pub to_delete_chars_count: usize,
    /// Text that should be inserted into the current input state.
    #[pyo3(get)]
    pub diff_add_text: String,
    /// Remaining internal context length (0 means context was cleared).
    #[pyo3(get)]
    pub context_length: usize,
}

#[pymethods]
impl TypingDiff {
    fn __repr__(&self, py: Python<'_>) -> PyResult<String> {
        // the text as Python writes a `str`
        let text = PyString::new(py, &self.diff_add_text).repr()?;
        Ok(format!(
            "TypingDiff(to_delete_chars_count={}, diff_add_text={}, context_length={})",
            self.to_delete_chars_count, text, self.context_length
        ))
    }
}

/// Stateful isolated context for character-by-character input typing.
///
/// It holds the state of the text being typed, so it can not be pickled or copied.
#[pyclass(module = "lipilekhika.typing")]
pub struct TypingContext {
    pub inner: lipilekhika::typing::TypingContext,
}

#[pymethods]
impl TypingContext {
    fn clear_context(&mut self) {
        self.inner.clear_context();
    }
    fn take_key_input(&mut self, key: &Bound<'_, PyString>) -> PyResult<TypingDiff> {
        // a lone surrogate is read as U+FFFD, like in the JS package
        let key = crate::py_text(key)?;
        let diff = self.inner.take_key_input(&*key);
        Ok(TypingDiff {
            to_delete_chars_count: diff.to_delete_chars_count,
            diff_add_text: diff.diff_add_text,
            context_length: diff.context_length,
        })
    }

    /// The script the context types in (a language name is resolved to its script)
    fn get_normalized_script(&self) -> String {
        self.inner.get_normalized_script().to_string()
    }

    fn __repr__(&self) -> String {
        format!(
            "TypingContext(script='{}', use_native_numerals={}, include_inherent_vowel={})",
            self.inner.get_normalized_script(),
            py_bool(self.inner.get_use_native_numerals()),
            py_bool(self.inner.get_include_inherent_vowel())
        )
    }

    fn update_use_native_numerals(&mut self, use_native_numerals: bool) {
        self.inner.update_use_native_numerals(use_native_numerals);
    }

    fn update_include_inherent_vowel(&mut self, include_inherent_vowel: bool) {
        self.inner
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
#[pyo3(signature = (typing_script, options=None))]
pub fn create_typing_context(
    typing_script: &str,
    options: Option<TypingContextOptions>,
) -> PyResult<TypingContext> {
    let script = crate::py_parse_script(typing_script, "typing_script")?;
    let rust_options = options.map(|o| o.into());
    Ok(TypingContext {
        inner: lipilekhika::typing::TypingContext::new(script, rust_options),
    })
}

/// An item in the typing data map: (text, list_type, mappings).
/// - `text`: The displayed character/text in the target script.
/// - `list_type`: One of "anya", "vyanjana", "matra", "svara".
/// - `mappings`: List of input key sequences that produce this character.
pub type TypingDataMapItem = (String, String, Vec<String>);

/// Result containing typing data for a script.
#[pyclass(module = "lipilekhika.typing")]
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
///     ValueError: If the script name is invalid.
#[pyfunction]
#[pyo3(signature = (script))]
pub fn get_script_typing_data_map(script: &str) -> PyResult<ScriptTypingDataMap> {
    let script = crate::py_parse_script(script, "script")?;

    let data = lipilekhika::typing::get_script_typing_data_map(script);

    fn list_type_to_string(lt: &lipilekhika::typing::ListType) -> String {
        match lt {
            lipilekhika::typing::ListType::Anya => "anya".to_string(),
            lipilekhika::typing::ListType::Vyanjana => "vyanjana".to_string(),
            lipilekhika::typing::ListType::Matra => "matra".to_string(),
            lipilekhika::typing::ListType::Svara => "svara".to_string(),
        }
    }

    Ok(ScriptTypingDataMap {
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
    })
}

/// An item in the krama data: (character_text, list_type).
pub type KramaDataItem = (String, String);

/// Returns the krama data for a script (character + type pairs).
///
/// Used for comparing character sets between scripts. Each script's krama array
/// has a 1:1 correspondence at the same indices, making it useful for side-by-side
/// comparison of characters across Brahmic scripts.
///
/// Args:
///     script (str): The script/language name to get krama data for.
///
/// Returns:
///     list[tuple[str, str]]: List of (character_text, list_type) tuples.
///
/// Raises:
///     ValueError: If the script name is invalid.
#[pyfunction]
#[pyo3(signature = (script))]
pub fn get_script_krama_data(script: &str) -> PyResult<Vec<KramaDataItem>> {
    let script = crate::py_parse_script(script, "script")?;

    let data = lipilekhika::typing::get_script_krama_data(script);

    fn list_type_to_string(lt: &lipilekhika::typing::ListType) -> String {
        match lt {
            lipilekhika::typing::ListType::Anya => "anya".to_string(),
            lipilekhika::typing::ListType::Vyanjana => "vyanjana".to_string(),
            lipilekhika::typing::ListType::Matra => "matra".to_string(),
            lipilekhika::typing::ListType::Svara => "svara".to_string(),
        }
    }

    Ok(data
        .into_iter()
        .map(|(text, list_type)| (text, list_type_to_string(&list_type)))
        .collect())
}
