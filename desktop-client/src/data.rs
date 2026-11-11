use lipilekhika::{Script, ScriptListEnum, get_script_list_data};
use std::fmt;
use std::str::FromStr;

/// Resolves a script name or alias to its canonical [`ScriptListEnum`].
pub fn normalize_script(script: impl AsRef<str>) -> Option<ScriptListEnum> {
  Script::from_str(script.as_ref())
    .ok()
    .map(ScriptListEnum::from)
}

pub fn script_list_to_typing_script(script: ScriptListEnum) -> Script {
  Script::from_str(script.as_ref()).expect("ScriptListEnum canonical name is a valid Script")
}

pub fn script_from_normalized_name(name: &str) -> Option<ScriptListEnum> {
  ScriptListEnum::from_str(name).ok()
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ScriptDisplay {
  pub script_name: ScriptListEnum,
  pub display_label: String,
}

impl fmt::Display for ScriptDisplay {
  fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
    write!(f, "{}", self.display_label)
  }
}

pub fn get_script_avatar(script: ScriptListEnum) -> &'static str {
  match script {
    ScriptListEnum::Devanagari => "अ",
    ScriptListEnum::Telugu => "అ",
    ScriptListEnum::Tamil => "அ",
    ScriptListEnum::TamilExtended => "அ",
    ScriptListEnum::Bengali => "অ",
    ScriptListEnum::Kannada => "ಅ",
    ScriptListEnum::Gujarati => "અ",
    ScriptListEnum::Malayalam => "അ",
    ScriptListEnum::Odia => "ଅ",
    ScriptListEnum::Sinhala => "අ",
    ScriptListEnum::Normal => "a",
    ScriptListEnum::Romanized => "ā",
    ScriptListEnum::HarvardKyoto => "HK",
    ScriptListEnum::Slp1 => "SL",
    ScriptListEnum::Gurumukhi => "ਅ",
    ScriptListEnum::Assamese => "অ",
    ScriptListEnum::Siddham => "𑖀",
    ScriptListEnum::PurnaDevanagari => "अ",
    ScriptListEnum::Brahmi => "𑀅",
    ScriptListEnum::Granth => "𑌅",
    ScriptListEnum::Modi => "𑘀",
    ScriptListEnum::Sharada => "𑆃",
  }
}

/// The standard romanization schemes, listed after Romanized (before the ancient scripts)
const STANDARD_SCHEMES: &[ScriptListEnum] = &[ScriptListEnum::HarvardKyoto, ScriptListEnum::Slp1];

pub fn get_ordered_script_list() -> Vec<ScriptDisplay> {
  let script_list = get_script_list_data();

  let mut scripts: Vec<ScriptListEnum> = script_list
    .scripts
    .iter()
    .map(|script_name| {
      normalize_script(script_name)
        .unwrap_or_else(|| panic!("unsupported script name in script list: {script_name}"))
    })
    .filter(|script| !STANDARD_SCHEMES.contains(script))
    .collect();
  let after_romanized = scripts
    .iter()
    .position(|script| *script == ScriptListEnum::Romanized)
    .map_or(scripts.len(), |i| i + 1);
  scripts.splice(
    after_romanized..after_romanized,
    STANDARD_SCHEMES.iter().copied(),
  );

  scripts
    .into_iter()
    .map(|script| ScriptDisplay {
      script_name: script,
      display_label: format!("{} - {}", get_script_avatar(script), script),
    })
    .collect()
}
