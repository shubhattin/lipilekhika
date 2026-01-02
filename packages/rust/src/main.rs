use serde::{Deserialize, Serialize};
use std::fs;

#[derive(Debug, Serialize, Deserialize)]
pub struct CommonScriptAttr {
    pub script_name: String,
    pub script_id: u8,
    pub krama_text_arr: Vec<(String, Option<i16>)>,
    pub krama_text_arr_index: Vec<i16>,
    pub text_to_krama_map: Vec<(String, TextToKramaMap)>,
    pub typing_text_to_krama_map: Vec<(String, TextToKramaMap)>,
    pub custom_script_chars_arr: Vec<(String, Option<i16>, Option<i16>)>,
}

/// This  will be used both for transliteration and typing.
///
/// Common struct for both `text_to_krama_map` and `typing_text_to_krama_map`
#[derive(Debug, Serialize, Deserialize)]
pub struct TextToKramaMap {
    pub next: Option<Vec<String>>,
    pub krama: Option<Vec<i16>>,
    pub fallback_list_ref: Option<Vec<i16>>,
    /// only in `typing_text_to_krama_map`
    pub custom_back_ref: Option<i16>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "script_type")]
pub enum ScriptData {
    #[serde(rename = "brahmic")]
    Brahmic {
        #[serde(flatten)]
        common_script_attr: CommonScriptAttr,
        schwa_property: bool,
        halant: String,
        nuqta: String,
    },
    #[serde(rename = "other")]
    Other {
        #[serde(flatten)]
        common_script_attr: CommonScriptAttr,
        schwa_property: Option<bool>,
    },
}

impl ScriptData {
    pub fn get_common_attr(&self) -> &CommonScriptAttr {
        match self {
            ScriptData::Brahmic {
                common_script_attr, ..
            } => &common_script_attr,
            ScriptData::Other {
                common_script_attr, ..
            } => &common_script_attr,
        }
    }
}

fn main() {
    let file_path = "src/data/script_data/Devanagari.json";
    let file_str = fs::read_to_string(file_path).expect("file parse failed");
    // JSON data as a string

    let data = serde_json::from_str::<ScriptData>(&file_str).expect("JSON Parse failed");

    println!("{:?}", data);
    println!("{}", data.get_common_attr().script_id)
}
