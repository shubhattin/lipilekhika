use lipilekhika::get_normalized_script_name;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use toml::from_str;

fn app_config_path() -> PathBuf {
  let mut path = match dirs::data_dir() {
    Some(p) => p,
    None => return PathBuf::from("app_conf.toml"), // fallback to current dir
  };
  path.push("lipilekhika");
  fs::create_dir_all(&path).ok();
  path.push("app_conf.toml");
  // unique anonymous identifier
  path
}

fn default_true() -> bool {
  true
}
fn default_false() -> bool {
  false
}

fn default_script() -> String {
  "Devanagari".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PersitentState {
  #[serde(default = "default_script")]
  pub script: String,

  #[serde(default = "default_true")]
  pub typing_status: bool,

  #[serde(default = "default_true")]
  pub native_numerals: bool,

  #[serde(default = "default_false")]
  pub inherent_vowel: bool,
}

impl Default for PersitentState {
  fn default() -> Self {
    PersitentState {
      script: default_script(),
      typing_status: default_true(),
      native_numerals: default_true(),
      inherent_vowel: default_false(),
    }
  }
}

impl PersitentState {
  pub fn read_app_config() -> PersitentState {
    let config_path = app_config_path();

    match fs::read_to_string(&config_path) {
      Ok(content) => match from_str::<PersitentState>(&content) {
        Ok(mut config) => match get_normalized_script_name(&config.script) {
          Some(_) => config,
          None => {
            config.script = default_script();
            config
          }
        },
        Err(_) => PersitentState::default(),
      },
      Err(_) => PersitentState::default(),
    }
  }

  pub fn save_app_config(&self) -> Result<(), String> {
    let config_path = app_config_path();

    let toml_string =
      toml::to_string_pretty(self).map_err(|e| format!("Failed to serialize config: {}", e))?;

    fs::write(&config_path, toml_string)
      .map_err(|e| format!("Failed to write config to {:?}: {}", config_path, e))?;

    Ok(())
  }
}
