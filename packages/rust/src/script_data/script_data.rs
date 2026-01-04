use rust_embed::RustEmbed;
use serde::Deserialize;

use std::collections::HashMap;
use std::sync::OnceLock;

/// currently for simplicity using a single cache for all script data
static SCRIPT_DATA_CACHE: OnceLock<HashMap<String, ScriptData>> = OnceLock::new();

#[derive(RustEmbed)]
#[folder = "src/data/script_data/"]
struct ScriptAssets;

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CommonScriptAttr {
  #[allow(dead_code)]
  pub script_name: String,
  #[allow(dead_code)]
  pub script_id: u8,
  pub krama_text_arr: Vec<(String, Option<i16>)>,
  pub krama_text_arr_index: Vec<usize>,
  pub text_to_krama_map: Vec<(String, TextToKramaMap)>,
  pub typing_text_to_krama_map: Vec<(String, TextToKramaMap)>,
  pub custom_script_chars_arr: Vec<(String, Option<i16>, Option<i16>)>,
  pub list: Vec<List>,
}

/// This  will be used both for transliteration and typing.
///
/// Common struct for both `text_to_krama_map` and `typing_text_to_krama_map`
#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TextToKramaMap {
  pub next: Option<Vec<String>>,
  pub krama: Option<Vec<i16>>,
  pub fallback_list_ref: Option<i16>,
  /// only in `typing_text_to_krama_map`
  pub custom_back_ref: Option<i16>,
}

#[derive(Debug, Deserialize, Clone, PartialEq)]
#[serde(tag = "type")]
pub enum List {
  #[serde(rename = "anya")]
  Anya { krama_ref: Vec<i16> },
  #[serde(rename = "vyanjana")]
  Vyanjana { krama_ref: Vec<i16> },
  #[serde(rename = "mAtrA")]
  Matra { krama_ref: Vec<i16> },
  #[serde(rename = "svara")]
  Svara {
    krama_ref: Vec<i16>,
    #[serde(rename = "mAtrA_krama_ref")]
    matra_krama_ref: Vec<i16>,
  },
}

// for checking equiality more convenitently rather than using matches!
pub const MATRA_LIST_TYPE: List = List::Matra {
  krama_ref: Vec::new(),
};
pub const ANYA_LIST_TYPE: List = List::Anya {
  krama_ref: Vec::new(),
};
pub const VYANJANA_LIST_TYPE: List = List::Vyanjana {
  krama_ref: Vec::new(),
};
pub const SVARA_LIST_TYPE: List = List::Svara {
  krama_ref: Vec::new(),
  matra_krama_ref: Vec::new(),
};

impl List {
  pub fn get_krama_ref(&self) -> &Vec<i16> {
    match self {
      List::Anya { krama_ref }
      | List::Vyanjana { krama_ref }
      | List::Matra { krama_ref }
      | List::Svara { krama_ref, .. } => krama_ref,
    }
  }
  pub fn get_matra_krama_ref(&self) -> Option<Vec<i16>> {
    match self {
      List::Svara {
        matra_krama_ref, ..
      } => Some(matra_krama_ref.to_owned()),
      _ => None,
    }
  }
}

#[derive(Debug, Deserialize)]
#[serde(tag = "script_type")]
pub enum ScriptData {
  #[serde(rename = "brahmic")]
  Brahmic {
    #[serde(flatten)]
    common_script_attr: CommonScriptAttr,
    #[allow(dead_code)]
    schwa_property: bool,
    halant: String,
    nuqta: Option<String>,
  },
  #[serde(rename = "other")]
  Other {
    #[serde(flatten)]
    common_script_attr: CommonScriptAttr,
    #[allow(dead_code)]
    schwa_character: String,
  },
}

impl ScriptData {
  pub fn get_common_attr(&self) -> &CommonScriptAttr {
    match self {
      ScriptData::Brahmic {
        common_script_attr, ..
      }
      | ScriptData::Other {
        common_script_attr, ..
      } => &common_script_attr,
    }
  }
  fn load_all() -> HashMap<String, ScriptData> {
    let mut map = HashMap::new();

    for file in ScriptAssets::iter() {
      let name = file.as_ref();

      if !name.ends_with(".json") {
        continue;
      }

      let script_name = name.trim_end_matches(".json");

      let asset = ScriptAssets::get(name).unwrap_or_else(|| panic!("Asset `{}` missing", name));

      let json = std::str::from_utf8(asset.data.as_ref()).expect("Invalid UTF-8");

      let data = serde_json::from_str::<ScriptData>(json)
        .unwrap_or_else(|e| panic!("Parse error in {}: {}", name, e));

      map.insert(script_name.to_string(), data);
    }

    map
  }
  /// this method assumes that the script name is already normalized,
  /// if not then it will panic.
  ///
  /// Normalize script before calling this
  pub fn get_script_data(script: &str) -> &'static ScriptData {
    let cache = SCRIPT_DATA_CACHE.get_or_init(Self::load_all);

    cache
      .get(script)
      .unwrap_or_else(|| panic!("Script `{}` not found", script))
  }
}

#[cfg(test)]
mod tests {
  use super::*;
  use std::fs;
  use std::path::Path;

  #[test]
  fn all_script_data_json_files_must_parse() {
    let dir = Path::new("src/data/script_data");

    let entries = fs::read_dir(dir).expect("Failed to read script_data directory");

    for entry in entries {
      let entry = entry.expect("Failed to read directory entry");
      let path = entry.path();

      // Only test *.json files
      if path.extension().and_then(|e| e.to_str()) == Some("json") {
        let script_name = path
          .file_stem()
          .and_then(|s| s.to_str())
          .expect("Invalid filename");
        println!("{}", script_name);

        let _ = ScriptData::get_script_data(script_name);
      }
    }
  }
}
