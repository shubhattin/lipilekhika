use std::collections::HashMap;

use serde::{Deserialize, Serialize};

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
  lipilekhika::transliterate(
    &payload.text,
    &payload.from,
    &payload.to,
    payload.options.as_ref(),
  )
  .unwrap_or_else(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    .invoke_handler(tauri::generate_handler![transliterate])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
