use std::sync::OnceLock;

use super::CustomOptionMap;
use super::generated;

static CUSTOM_OPTIONS_CACHE: OnceLock<CustomOptionMap> = OnceLock::new();

pub fn get_custom_options_map() -> &'static CustomOptionMap {
  CUSTOM_OPTIONS_CACHE.get_or_init(|| {
    let bytes = generated::CUSTOM_OPTIONS_BYTES;
    bincode::deserialize(bytes).expect("bincode decode failed for custom_options")
  })
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn all_script_data_json_files_must_parse() {
    let _ = get_custom_options_map();
  }
}
