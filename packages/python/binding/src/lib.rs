use pyo3::prelude::*;
use pyo3::types::PyDict;
use std::collections::HashMap;

mod typing;

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

#[pyfunction]
#[pyo3(signature = (script_name))]
fn preload_script_data(script_name: &str) {
  lipilekhika::preload_script_data(script_name);
}

#[pyfunction]
#[pyo3(signature = (script_name))]
fn get_schwa_status_for_script(script_name: &str) -> PyResult<bool> {
  lipilekhika::get_schwa_status_for_script(script_name)
    .map(|status| status.unwrap_or(false))
    .map_err(|e| pyo3::exceptions::PyValueError::new_err(e))
}

#[pyfunction]
#[pyo3(signature = (from_script, to_script))]
fn get_all_options(from_script: &str, to_script: &str) -> PyResult<Vec<String>> {
  lipilekhika::get_all_options(from_script, to_script)
    .map(|options| options.into_iter().collect::<Vec<String>>())
    .map_err(|e| pyo3::exceptions::PyValueError::new_err(e))
}

#[pyfunction]
#[pyo3(signature = (script_name))]
fn get_normalized_script_name(script_name: &str) -> PyResult<String> {
  lipilekhika::get_normalized_script_name(script_name).ok_or_else(|| {
    pyo3::exceptions::PyValueError::new_err(format!("Invalid script name: {}", script_name))
  })
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
  scripts: HashMap<String, u8>,
  #[pyo3(get)]
  langs: HashMap<String, u8>,
  #[pyo3(get)]
  lang_script_map: HashMap<String, String>,
  #[pyo3(get)]
  script_alternates_map: HashMap<String, String>,
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
      lang_script_map: data.lang_script_map.clone(),
      script_alternates_map: data.script_alternates_map.clone(),
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
