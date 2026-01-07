use serde::Deserialize;
use std::collections::HashMap;
use std::sync::OnceLock;

#[derive(Debug, Deserialize, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum CustomOptionScriptTypeEnum {
  Brahmic,
  Other,
  All,
}

#[derive(Debug, Deserialize, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum CheckInEnum {
  Input,
  Output,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(tag = "type")]
pub enum Rule {
  #[serde(rename = "replace_prev_krama_keys")]
  ReplacePrevKramaKeys {
    #[serde(default)]
    use_replace: Option<bool>,
    prev: Vec<i16>,
    following: Vec<i16>,
    replace_with: Vec<i16>,
    check_in: Option<CheckInEnum>,
  },
  #[serde(rename = "direct_replace")]
  DirectReplace {
    #[serde(default)]
    use_replace: Option<bool>,
    to_replace: Vec<Vec<i16>>,
    replace_with: Vec<i16>,
    replace_text: Option<String>,
    check_in: Option<CheckInEnum>,
  },
}
#[derive(Debug, Deserialize, Clone)]
#[serde(deny_unknown_fields)]
pub struct CustomOptions {
  pub from_script_name: Option<Vec<String>>,
  pub from_script_type: Option<CustomOptionScriptTypeEnum>,
  pub to_script_name: Option<Vec<String>>,
  pub to_script_type: Option<CustomOptionScriptTypeEnum>,
  #[allow(dead_code)]
  pub check_in: CheckInEnum,
  pub rules: Vec<Rule>,
}

pub type CustomOptionMap = HashMap<String, CustomOptions>;

static CUSTOM_OPTIONS_CACHE: OnceLock<CustomOptionMap> = OnceLock::new();

mod generated {
  include!(concat!(env!("OUT_DIR"), "/generated_custom_options.rs"));
}

pub fn get_custom_options_map() -> &'static CustomOptionMap {
  CUSTOM_OPTIONS_CACHE.get_or_init(generated::build_custom_options_map)
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn all_script_data_json_files_must_parse() {
    let _ = get_custom_options_map();
  }
}
