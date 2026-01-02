use serde::Deserialize;
use std::collections::HashMap;
use std::sync::OnceLock;

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ScriptListData {
    pub scripts: HashMap<String, u8>,
    pub langs: HashMap<String, u8>,
    pub lang_script_map: HashMap<String, String>,
    pub script_alternates_map: HashMap<String, String>,
}

static SCRIPT_LIST_DATA_CACHE: OnceLock<ScriptListData> = OnceLock::new();

pub fn get_script_list_data() -> &'static ScriptListData {
    SCRIPT_LIST_DATA_CACHE.get_or_init(|| {
        let file_str = include_str!("../../src/data/script_list.json");
        serde_json::from_str::<ScriptListData>(file_str).expect("JSON Parse Error")
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_script_list_data() {
        let data = get_script_list_data();
        println!("{:?}", data);
    }
}
