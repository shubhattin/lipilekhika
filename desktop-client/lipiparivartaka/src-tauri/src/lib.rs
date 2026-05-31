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

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command(rename_all = "snake_case")]
fn transliterate(payload: Payload) -> String {
  let from = Script::from_str(&payload.from).unwrap();
  let to = Script::from_str(&payload.to).unwrap();
  let options = payload.options.as_ref().map(|options| {
    lipilekhika::CustomOptions::try_from_map(options)
      .expect("desktop payload custom option keys must be canonical")
  });
  transliterate_impl(&payload.text, from, to, options.as_ref()).into_owned()
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
