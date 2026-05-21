use lipilekhika::{Script, ScriptListEnum, get_script_list_data};
use std::collections::HashMap;
use std::fmt;
use std::str::FromStr;
use std::sync::OnceLock;

/// Resolves a script name or alias to its canonical display name (e.g. `"dev"` → `"Devanagari"`).
pub fn normalize_script_name(script: &str) -> Option<String> {
  Script::from_str(script)
    .ok()
    .map(|script| ScriptListEnum::from(script).to_string())
}

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
    HashMap::from([
      ("Devanagari".to_string(), "अ".to_string()),
      ("Telugu".to_string(), "అ".to_string()),
      ("Tamil".to_string(), "அ".to_string()),
      ("Tamil-Extended".to_string(), "அ".to_string()),
      ("Bengali".to_string(), "অ".to_string()),
      ("Kannada".to_string(), "ಅ".to_string()),
      ("Gujarati".to_string(), "અ".to_string()),
      ("Malayalam".to_string(), "അ".to_string()),
      ("Odia".to_string(), "ଅ".to_string()),
      ("Sinhala".to_string(), "අ".to_string()),
      ("Normal".to_string(), "a".to_string()),
      ("Romanized".to_string(), "ā".to_string()),
      ("Gurumukhi".to_string(), "ਅ".to_string()),
      ("Assamese".to_string(), "অ".to_string()),
      ("Siddham".to_string(), "𑖀".to_string()),
      ("Purna-Devanagari".to_string(), "अ".to_string()),
      ("Brahmi".to_string(), "𑀅".to_string()),
      ("Granth".to_string(), "𑌅".to_string()),
      ("Modi".to_string(), "𑘀".to_string()),
      ("Sharada".to_string(), "𑆃".to_string()),
    ])
  })
}

pub fn get_script_avatar(script: &str) -> String {
  match normalize_script_name(script) {
    Some(script_name) => {
      let avatar_map = get_script_avatar_map();
      avatar_map
        .get(&script_name)
        .cloned()
        .unwrap_or_else(|| "अ".to_string())
    }
    None => "अ".to_string(),
  }
}

pub fn get_ordered_script_list() -> Vec<ScriptDisplay> {
  let script_list = get_script_list_data();

  script_list
    .scripts
    .iter()
    .map(|script_name| {
      let avatar = get_script_avatar(script_name);
      ScriptDisplay {
        script_name: script_name.clone(),
        display_label: format!("{} - {}", avatar, script_name),
      }
    })
    .collect()
}
