use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// This will be used both for transliteration and typing.
///
/// Common struct for both `text_to_krama_map` and `typing_text_to_krama_map`
#[derive(Debug, Deserialize, Serialize)]
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
pub enum ListJson {
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

#[derive(Debug, Deserialize, Serialize, Clone, PartialEq)]
pub enum List {
  Anya {
    krama_ref: Vec<i16>,
  },
  Vyanjana {
    krama_ref: Vec<i16>,
  },
  Matra {
    krama_ref: Vec<i16>,
  },
  Svara {
    krama_ref: Vec<i16>,
    matra_krama_ref: Vec<i16>,
  },
}

impl From<ListJson> for List {
  fn from(value: ListJson) -> Self {
    match value {
      ListJson::Anya { krama_ref } => List::Anya { krama_ref },
      ListJson::Vyanjana { krama_ref } => List::Vyanjana { krama_ref },
      ListJson::Matra { krama_ref } => List::Matra { krama_ref },
      ListJson::Svara {
        krama_ref,
        matra_krama_ref,
      } => List::Svara {
        krama_ref,
        matra_krama_ref,
      },
    }
  }
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CommonScriptAttrJson {
  #[allow(dead_code)]
  pub script_name: String,
  #[allow(dead_code)]
  pub script_id: u8,
  pub krama_text_arr: Vec<(String, Option<i16>)>,
  pub krama_text_arr_index: Vec<usize>,
  pub text_to_krama_map: Vec<(String, TextToKramaMap)>,
  pub typing_text_to_krama_map: Vec<(String, TextToKramaMap)>,
  pub custom_script_chars_arr: Vec<(String, Option<i16>, Option<i16>)>,
  pub list: Vec<ListJson>,
}

#[derive(Debug, Deserialize, Serialize)]
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

impl From<CommonScriptAttrJson> for CommonScriptAttr {
  fn from(value: CommonScriptAttrJson) -> Self {
    Self {
      script_name: value.script_name,
      script_id: value.script_id,
      krama_text_arr: value.krama_text_arr,
      krama_text_arr_index: value.krama_text_arr_index,
      text_to_krama_map: value.text_to_krama_map,
      typing_text_to_krama_map: value.typing_text_to_krama_map,
      custom_script_chars_arr: value.custom_script_chars_arr,
      list: value.list.into_iter().map(Into::into).collect(),
    }
  }
}

/// JSON representation (matches the on-disk `*.json` files).
///
/// `#[serde(flatten)]` provides a convenient shape for JSON but is not supported
/// by `bincode`, so we parse into `ScriptDataJson` and convert into `ScriptData`.
#[derive(Debug, Deserialize)]
#[serde(tag = "script_type")]
pub enum ScriptDataJson {
  #[serde(rename = "brahmic")]
  Brahmic {
    #[serde(flatten)]
    common_script_attr: CommonScriptAttrJson,
    #[allow(dead_code)]
    schwa_property: bool,
    halant: String,
    nuqta: Option<String>,
  },
  #[serde(rename = "other")]
  Other {
    #[serde(flatten)]
    common_script_attr: CommonScriptAttrJson,
    #[allow(dead_code)]
    schwa_character: String,
  },
}

#[derive(Debug, Deserialize, Serialize)]
pub enum ScriptData {
  Brahmic {
    common_script_attr: CommonScriptAttr,
    #[allow(dead_code)]
    schwa_property: bool,
    halant: String,
    nuqta: Option<String>,
  },
  Other {
    common_script_attr: CommonScriptAttr,
    #[allow(dead_code)]
    schwa_character: String,
  },
}

impl From<ScriptDataJson> for ScriptData {
  fn from(value: ScriptDataJson) -> Self {
    match value {
      ScriptDataJson::Brahmic {
        common_script_attr,
        schwa_property,
        halant,
        nuqta,
      } => ScriptData::Brahmic {
        common_script_attr: common_script_attr.into(),
        schwa_property,
        halant,
        nuqta,
      },
      ScriptDataJson::Other {
        common_script_attr,
        schwa_character,
      } => ScriptData::Other {
        common_script_attr: common_script_attr.into(),
        schwa_character,
      },
    }
  }
}

#[derive(Debug, Deserialize, Serialize, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum CustomOptionScriptTypeEnum {
  Brahmic,
  Other,
  All,
}

#[derive(Debug, Deserialize, Serialize, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum CheckInEnum {
  Input,
  Output,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
pub enum RuleJson {
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

#[derive(Debug, Deserialize, Serialize, Clone)]
pub enum Rule {
  ReplacePrevKramaKeys {
    use_replace: Option<bool>,
    prev: Vec<i16>,
    following: Vec<i16>,
    replace_with: Vec<i16>,
    check_in: Option<CheckInEnum>,
  },
  DirectReplace {
    use_replace: Option<bool>,
    to_replace: Vec<Vec<i16>>,
    replace_with: Vec<i16>,
    replace_text: Option<String>,
    check_in: Option<CheckInEnum>,
  },
}

impl From<RuleJson> for Rule {
  fn from(value: RuleJson) -> Self {
    match value {
      RuleJson::ReplacePrevKramaKeys {
        use_replace,
        prev,
        following,
        replace_with,
        check_in,
      } => Rule::ReplacePrevKramaKeys {
        use_replace,
        prev,
        following,
        replace_with,
        check_in,
      },
      RuleJson::DirectReplace {
        use_replace,
        to_replace,
        replace_with,
        replace_text,
        check_in,
      } => Rule::DirectReplace {
        use_replace,
        to_replace,
        replace_with,
        replace_text,
        check_in,
      },
    }
  }
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CustomOptionsJson {
  pub from_script_name: Option<Vec<String>>,
  pub from_script_type: Option<CustomOptionScriptTypeEnum>,
  pub to_script_name: Option<Vec<String>>,
  pub to_script_type: Option<CustomOptionScriptTypeEnum>,
  #[allow(dead_code)]
  pub check_in: CheckInEnum,
  pub rules: Vec<RuleJson>,
}

impl From<CustomOptionsJson> for CustomOptions {
  fn from(value: CustomOptionsJson) -> Self {
    Self {
      from_script_name: value.from_script_name,
      from_script_type: value.from_script_type,
      to_script_name: value.to_script_name,
      to_script_type: value.to_script_type,
      check_in: value.check_in,
      rules: value.rules.into_iter().map(Into::into).collect(),
    }
  }
}

#[derive(Debug, Deserialize, Serialize, Clone)]
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

#[allow(dead_code)]
pub type CustomOptionMapJson = IndexMap<String, CustomOptionsJson>;
pub type CustomOptionMap = IndexMap<String, CustomOptions>;

#[derive(Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct ScriptListDataJson {
  pub scripts: HashMap<String, u8>,
  pub langs: HashMap<String, u8>,
  /// all langs are mapped to a script
  pub lang_script_map: HashMap<String, String>,
  /// contains aliases which map to script
  pub script_alternates_map: HashMap<String, String>,
}
