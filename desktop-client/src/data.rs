use lipilekhika::{get_normalized_script_name, get_script_list_data};
use std::collections::HashMap;
use std::fmt;
use std::sync::OnceLock;

#[derive(Debug, Clone, PartialEq)]
pub struct ScriptDisplay {
  pub script_name: String,
  pub display_label: String,
}

impl fmt::Display for ScriptDisplay {
  fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
    write!(f, "{}", self.display_label)
  }
}

impl AsRef<str> for ScriptDisplay {
  fn as_ref(&self) -> &str {
    &self.script_name
  }
}

static SCRIPT_AVATAR_MAP: OnceLock<HashMap<String, String>> = OnceLock::new();

fn get_script_avatar_map() -> &'static HashMap<String, String> {
  SCRIPT_AVATAR_MAP.get_or_init(|| {
    let mut map = HashMap::new();
    map.insert("Devanagari".to_string(), "अ".to_string());
    map.insert("Telugu".to_string(), "అ".to_string());
    map.insert("Tamil".to_string(), "அ".to_string());
    map.insert("Tamil-Extended".to_string(), "அ".to_string());
    map.insert("Bengali".to_string(), "অ".to_string());
    map.insert("Kannada".to_string(), "ಅ".to_string());
    map.insert("Gujarati".to_string(), "અ".to_string());
    map.insert("Malayalam".to_string(), "അ".to_string());
    map.insert("Odia".to_string(), "ଅ".to_string());
    map.insert("Sinhala".to_string(), "අ".to_string());
    map.insert("Normal".to_string(), "a".to_string());
    map.insert("Romanized".to_string(), "a".to_string());
    map.insert("Gurumukhi".to_string(), "ਅ".to_string());
    map.insert("Assamese".to_string(), "অ".to_string());
    map.insert("Siddham".to_string(), "𑖀".to_string());
    map.insert("Purna-Devanagari".to_string(), "अ".to_string());
    map.insert("Brahmi".to_string(), "𑀅".to_string());
    map.insert("Granth".to_string(), "𑌅".to_string());
    map.insert("Modi".to_string(), "𑘀".to_string());
    map.insert("Sharada".to_string(), "𑆃".to_string());
    map
  })
}

pub fn get_script_avatar(script: &str) -> String {
  let normalized_script = get_normalized_script_name(script);
  match normalized_script {
    Some(script_name) => {
      let avatar_map = get_script_avatar_map();
      avatar_map
        .get(&script_name)
        .unwrap_or(&"अ".to_string())
        .clone()
    }
    None => "अ".to_string(),
  }
}
pub fn get_ordered_script_list() -> Vec<ScriptDisplay> {
  let _script_list = get_script_list_data();
  let mut scripts: Vec<(String, u8)> = _script_list.scripts.clone().into_iter().collect();

  scripts.sort_by(|a, b| a.1.cmp(&b.1));

  scripts
    .into_iter()
    .map(|(key, _)| {
      let avatar = get_script_avatar(&key);
      ScriptDisplay {
        script_name: key.clone(),
        display_label: format!("{} - {}", avatar, key),
      }
    })
    .collect()
}
