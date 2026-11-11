use lipilekhika::ScriptListEnum;
use lipilekhika::scripts::Script;
use pyo3::prelude::*;
use pyo3::types::{PyDict, PyString};
use std::borrow::Cow;
use std::str::FromStr;

mod typing;

/// A script/language name, exactly as JS and Rust read it (no trimming of spaces)
pub(crate) fn py_parse_script(name: &str, label: &str) -> PyResult<Script> {
    Script::from_str(name).map_err(|e| {
        pyo3::exceptions::PyValueError::new_err(format!("invalid {label} {name:?}: {e}"))
    })
}

/// The text of a Python `str`. A lone surrogate (which a Rust string can not hold) is read as
/// U+FFFD, like the JS package does, instead of raising `UnicodeEncodeError`: the text is read as
/// UTF-16 (as a JS string is), so a high + low surrogate pair is the character it encodes.
pub(crate) fn py_text<'a>(text: &'a Bound<'_, PyString>) -> PyResult<Cow<'a, str>> {
    if let Ok(s) = text.to_str() {
        return Ok(Cow::Borrowed(s));
    }
    let utf16 = text.call_method1("encode", ("utf-16-le", "surrogatepass"))?;
    let well_formed = utf16.call_method1("decode", ("utf-16-le", "replace"))?;
    Ok(Cow::Owned(well_formed.extract::<String>()?))
}

#[pyfunction]
#[pyo3(signature = (text, from_script, to_script, trans_options=None))]
fn transliterate<'py>(
    py: Python<'py>,
    text: &Bound<'py, PyString>,
    from_script: &str,
    to_script: &str,
    trans_options: Option<&Bound<'_, PyDict>>,
) -> PyResult<Bound<'py, PyString>> {
    let options = trans_options
        .map(|dict| -> PyResult<lipilekhika::CustomOptions> {
            let mut options = lipilekhika::CustomOptions::default();
            for (k, v) in dict.iter() {
                let key = k.extract::<String>()?;
                let value = v.extract::<bool>()?;
                options.try_set(&key, value).map_err(|_| {
                    pyo3::exceptions::PyValueError::new_err(format!(
                        "unknown trans_options key {key:?}"
                    ))
                })?;
            }
            Ok(options)
        })
        .transpose()?;

    let from = py_parse_script(from_script, "from_script")?;
    let to = py_parse_script(to_script, "to_script")?;

    // a same-script pair returns the text as it is (with a lone surrogate too, like the JS
    // package), nothing is transliterated
    if ScriptListEnum::from(from) == ScriptListEnum::from(to) {
        return Ok(text.clone());
    }

    let text = py_text(text)?;
    let text: &str = &text;
    // other Python threads run meanwhile (a long text takes a while)
    let output =
        py.detach(|| lipilekhika::transliterate(text, from, to, options.as_ref()).into_owned());
    Ok(PyString::new(py, &output))
}

#[pyfunction]
#[pyo3(signature = (script_name))]
fn preload_script_data(script_name: &str) -> PyResult<()> {
    let script = py_parse_script(script_name, "script_name")?;
    lipilekhika::preload_script_data(script);
    Ok(())
}

#[pyfunction]
#[pyo3(signature = (script_name))]
fn get_schwa_status_for_script(script_name: &str) -> PyResult<Option<bool>> {
    let script = py_parse_script(script_name, "script_name")?;
    // None for Normal and Romanized, which have no schwa
    Ok(lipilekhika::get_schwa_status_for_script(script))
}

#[pyfunction]
#[pyo3(signature = (from_script, to_script))]
fn get_all_options(from_script: &str, to_script: &str) -> PyResult<Vec<String>> {
    let from = py_parse_script(from_script, "from_script")?;
    let to = py_parse_script(to_script, "to_script")?;
    Ok(lipilekhika::get_all_options(from, to))
}

#[pyfunction]
#[pyo3(signature = (script_name))]
fn get_normalized_script_name(script_name: &str) -> PyResult<String> {
    let script = py_parse_script(script_name, "script_name")?;
    let normalized: ScriptListEnum = script.into();
    Ok(normalized.to_string())
}

#[pyfunction]
#[pyo3(signature = ())]
fn get_script_list_data() -> PyScriptListData {
    PyScriptListData::from(lipilekhika::get_script_list_data())
}

#[pyclass(module = "lipilekhika")]
#[derive(Clone)]
struct PyScriptListData {
    #[pyo3(get)]
    scripts: Vec<String>,
    #[pyo3(get)]
    langs: Vec<String>,
    /// In the order of the Rust data (a `dict` keeps it)
    lang_script_map: Vec<(String, String)>,
    script_alternates_map: Vec<(String, String)>,
}

/// A `dict` with the pairs in their order (a Rust `HashMap` would give a random order)
fn ordered_dict<'py>(py: Python<'py>, pairs: &[(String, String)]) -> PyResult<Bound<'py, PyDict>> {
    let dict = PyDict::new(py);
    for (k, v) in pairs {
        dict.set_item(k, v)?;
    }
    Ok(dict)
}

#[pymethods]
impl PyScriptListData {
    #[getter]
    fn lang_script_map<'py>(&self, py: Python<'py>) -> PyResult<Bound<'py, PyDict>> {
        ordered_dict(py, &self.lang_script_map)
    }

    #[getter]
    fn script_alternates_map<'py>(&self, py: Python<'py>) -> PyResult<Bound<'py, PyDict>> {
        ordered_dict(py, &self.script_alternates_map)
    }

    fn __repr__(&self) -> String {
        format!(
            "PyScriptListData(scripts={}, langs={}, lang_script_map={}, script_alternates_map={})",
            self.scripts.len(),
            self.langs.len(),
            self.lang_script_map.len(),
            self.script_alternates_map.len()
        )
    }
}

impl From<&lipilekhika::ScriptListData> for PyScriptListData {
    fn from(data: &lipilekhika::ScriptListData) -> Self {
        Self {
            scripts: data.scripts.clone(),
            langs: data.langs.clone(),
            lang_script_map: data
                .lang_script_map
                .iter()
                .map(|(k, v)| (k.clone(), v.clone()))
                .collect(),
            script_alternates_map: data
                .script_alternates_map
                .iter()
                .map(|(k, v)| (k.clone(), v.clone()))
                .collect(),
        }
    }
}

/// Python bindings to be exported
#[pymodule]
fn _lipilekhika(m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(transliterate, m)?)?;
    m.add_function(wrap_pyfunction!(preload_script_data, m)?)?;
    m.add_function(wrap_pyfunction!(get_schwa_status_for_script, m)?)?;
    m.add_function(wrap_pyfunction!(get_all_options, m)?)?;
    m.add_function(wrap_pyfunction!(get_normalized_script_name, m)?)?;
    m.add_function(wrap_pyfunction!(get_script_list_data, m)?)?;
    m.add_class::<PyScriptListData>()?;
    // typing module
    m.add_class::<typing::TypingContextOptions>()?;
    m.add_class::<typing::TypingDiff>()?;
    m.add_class::<typing::TypingContext>()?;
    m.add_function(wrap_pyfunction!(typing::create_typing_context, m)?)?;
    m.add_function(wrap_pyfunction!(
        typing::default_auto_context_clear_time_ms,
        m
    )?)?;
    m.add_function(wrap_pyfunction!(typing::default_use_native_numerals, m)?)?;
    m.add_function(wrap_pyfunction!(typing::default_include_inherent_vowel, m)?)?;
    m.add_class::<typing::ScriptTypingDataMap>()?;
    m.add_function(wrap_pyfunction!(typing::get_script_typing_data_map, m)?)?;
    m.add_function(wrap_pyfunction!(typing::get_script_krama_data, m)?)?;
    Ok(())
}
