use lipilekhika::{transliterate as transliterate_impl, Script};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::str::FromStr;

#[derive(Serialize, Deserialize, Debug)]
struct Payload {
  text: String,
  from: String,
  to: String,
  options: Option<HashMap<String, bool>>,
}

#[derive(Debug, Serialize)]
#[serde(tag = "code", content = "details", rename_all = "snake_case")]
enum TransliterateError {
  InvalidScript { field: &'static str, value: String },
  InvalidCustomOptionKey,
}

fn parse_script(field: &'static str, value: &str) -> Result<Script, TransliterateError> {
  Script::from_str(value).map_err(|_| TransliterateError::InvalidScript {
    field,
    value: value.to_string(),
  })
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command(rename_all = "snake_case")]
fn transliterate(payload: Payload) -> Result<String, TransliterateError> {
  let from = parse_script("from", &payload.from)?;
  let to = parse_script("to", &payload.to)?;
  let options = payload
    .options
    .as_ref()
    .map(lipilekhika::CustomOptions::try_from_map)
    .transpose()
    .map_err(|_| TransliterateError::InvalidCustomOptionKey)?;
  Ok(transliterate_impl(&payload.text, from, to, options.as_ref()).into_owned())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_store::Builder::default().build())
    .invoke_handler(tauri::generate_handler![transliterate])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
