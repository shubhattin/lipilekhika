use lipilekhika::HashMap;
use lipilekhika::ScriptListEnum;
use lipilekhika::scripts::Script;
use pyo3::prelude::*;
use pyo3::types::PyDict;
use std::collections::HashMap as StdHashMap;
use std::str::FromStr;

mod typing;

fn py_parse_script(name: &str, label: &str) -> PyResult<Script> {
    Script::from_str(name.trim()).map_err(|e| {
        pyo3::exceptions::PyValueError::new_err(format!("invalid {label} {name:?}: {e}"))
    })
}

#[pyfunction]
#[pyo3(signature = (text, from_script, to_script, trans_options=None))]
fn transliterate(
    text: &str,
    from_script: &str,
    to_script: &str,
    trans_options: Option<&Bound<'_, PyDict>>,
) -> PyResult<String> {
    let options: Option<HashMap<String, bool>> = trans_options.map(|dict| {
        dict.iter()
            .filter_map(|(k, v)| {
                let key = k.extract::<String>().ok()?;
                let value = v.extract::<bool>().ok()?;
                Some((key, value))
            })
            .collect()
    });

    let from = py_parse_script(from_script, "from_script")?;
    let to = py_parse_script(to_script, "to_script")?;

    Ok(lipilekhika::transliterate(text, from, to, options.as_ref()).into_owned())
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
fn get_schwa_status_for_script(script_name: &str) -> PyResult<bool> {
    let script = py_parse_script(script_name, "script_name")?;
    Ok(lipilekhika::get_schwa_status_for_script(script).unwrap_or(false))
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

#[pyclass]
#[derive(Clone)]
struct PyScriptListData {
    #[pyo3(get)]
    scripts: Vec<String>,
    #[pyo3(get)]
    langs: Vec<String>,
    #[pyo3(get)]
    lang_script_map: StdHashMap<String, String>,
    #[pyo3(get)]
    script_alternates_map: StdHashMap<String, String>,
}

#[pymethods]
impl PyScriptListData {
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
