use lipilekhika::Script;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::str::FromStr;
use toml::from_str;

/// A file in the app's data directory (`<data dir>/lipilekhika/<name>`)
pub fn app_data_path(name: &str) -> PathBuf {
  let mut path = match dirs::data_dir() {
    Some(p) => p,
    None => return PathBuf::from(name), // fallback to current dir
  };
  path.push("lipilekhika");
  fs::create_dir_all(&path).ok();
  path.push(name);
  path
}

fn app_config_path() -> PathBuf {
  app_data_path("app_conf.toml")
}

fn default_theme() -> ThemePreference {
  ThemePreference::System
}

/// The colour theme picked in the app
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ThemePreference {
  /// follows the light/dark setting of the system
  System,
  Light,
  Dark,
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

  #[serde(default = "default_theme")]
  pub theme: ThemePreference,
}

impl Default for PersitentState {
  fn default() -> Self {
    PersitentState {
      script: default_script(),
      typing_status: default_true(),
      native_numerals: default_true(),
      inherent_vowel: default_false(),
      theme: default_theme(),
    }
  }
}

impl PersitentState {
  pub fn read_app_config() -> PersitentState {
    let config_path = app_config_path();

    match fs::read_to_string(&config_path) {
      Ok(content) => match from_str::<PersitentState>(&content) {
        Ok(mut config) => match Script::from_str(&config.script) {
          Ok(_) => config,
          Err(_) => {
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
