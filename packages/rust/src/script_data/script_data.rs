use serde::Deserialize;
use std::fs;

#[derive(Debug, Deserialize)]
pub struct CommonScriptAttr {
    pub script_name: String,
    pub script_id: u8,
    pub krama_text_arr: Vec<(String, Option<i16>)>,
    pub krama_text_arr_index: Vec<i16>,
    pub text_to_krama_map: Vec<(String, TextToKramaMap)>,
    pub typing_text_to_krama_map: Vec<(String, TextToKramaMap)>,
    pub custom_script_chars_arr: Vec<(String, Option<i16>, Option<i16>)>,
    pub list: Vec<List>,
}

/// This  will be used both for transliteration and typing.
///
/// Common struct for both `text_to_krama_map` and `typing_text_to_krama_map`
#[derive(Debug, Deserialize)]
pub struct TextToKramaMap {
    pub next: Option<Vec<String>>,
    pub krama: Option<Vec<i16>>,
    pub fallback_list_ref: Option<i16>,
    /// only in `typing_text_to_krama_map`
    pub custom_back_ref: Option<i16>,
}

#[derive(Debug, Deserialize)]
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
        matra_krama_ref: Option<Vec<i16>>,
    },
}

impl List {
    pub fn get_krama_ref(&self) -> &Vec<i16> {
        match self {
            List::Anya { krama_ref }
            | List::Vyanjana { krama_ref }
            | List::Matra { krama_ref }
            | List::Svara { krama_ref, .. } => krama_ref,
        }
    }
    pub fn get_matra_krama_ref(&self) -> &Option<Vec<i16>> {
        match self {
            List::Svara {
                matra_krama_ref, ..
            } => matra_krama_ref,
            _ => &None,
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
        schwa_property: bool,
        halant: String,
        nuqta: Option<String>,
    },
    #[serde(rename = "other")]
    Other {
        #[serde(flatten)]
        common_script_attr: CommonScriptAttr,
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
    pub fn get_script_data(script: &str) -> Self {
        let file_str = fs::read_to_string(format!("src/data/script_data/{}.json", script))
            .expect("File not found");

        let data = serde_json::from_str::<ScriptData>(&file_str).expect("JSON Parse Error");

        // the program will panic if there file not or some json errors
        // this part will be ensured in tests
        return data;
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
