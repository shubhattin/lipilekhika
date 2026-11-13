//! Lipi Parivartaka's saved settings and text, its presets and the descriptions of the
//! transliteration options (from the web app's `tools/presets.ts` and `CustomOptions.svelte`).

use crate::persistent_state::app_data_path;
use lipilekhika::ScriptListEnum;
use lipilekhika::typing::{DEFAULT_INCLUDE_INHERENT_VOWEL, DEFAULT_USE_NATIVE_NUMERALS};
use serde::{Deserialize, Serialize};
use std::fs;
use std::str::FromStr;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Preset {
  None,
  TscPortal,
}

impl Preset {
  pub const ALL: [Preset; 2] = [Preset::None, Preset::TscPortal];

  pub fn label(self) -> &'static str {
    match self {
      Preset::None => "None",
      Preset::TscPortal => "The Sanskrit Channel",
    }
  }

  pub fn description(self) -> &'static str {
    match self {
      Preset::None => "No default transliteration options",
      Preset::TscPortal => {
        "Default transliteration options used in The Sanskrit Channel Projects Portal"
      }
    }
  }

  fn direct_rules(self) -> &'static [&'static str] {
    match self {
      Preset::None => &[],
      Preset::TscPortal => &[
        "all_to_normal:remove_virAma_and_double_virAma",
        "all_to_normal:replace_avagraha_with_a",
        "all_to_normal:replace_pancham_varga_varna_with_n",
        "all_to_sinhala:use_conjunct_enabling_halant",
      ],
    }
  }

  /// (rule, from, to): applied only for that pair of scripts
  fn conditional_rules(self) -> Vec<(&'static str, ScriptListEnum, ScriptListEnum)> {
    match self {
      Preset::None => vec![],
      // the scripts in which the pancham varga varna is written with an anusvAra
      Preset::TscPortal => [ScriptListEnum::Telugu, ScriptListEnum::Kannada]
        .into_iter()
        .map(|to| {
          (
            "brahmic_to_brahmic:replace_pancham_varga_varna_with_anusvAra",
            ScriptListEnum::Devanagari,
            to,
          )
        })
        .collect(),
    }
  }

  /// The options the preset turns on, out of the `available` ones for `from` → `to`
  pub fn options(
    self,
    available: &[String],
    from: ScriptListEnum,
    to: ScriptListEnum,
  ) -> Vec<(String, bool)> {
    available
      .iter()
      .map(|option| {
        let on = self.direct_rules().contains(&option.as_str())
          || self
            .conditional_rules()
            .iter()
            .any(|(rule, f, t)| *rule == option && *f == from && *t == to);
        (option.clone(), on)
      })
      .collect()
  }
}

/// (name, description) of a transliteration option
pub fn option_description(option: &str) -> Option<(&'static str, &'static str)> {
  Some(match option {
    "all_to_normal:preserve_specific_chars" => (
      "Preserve Specific Characters",
      "Preserves script-specific characters when converting to Normal script. Can be useful for studying script specific characters.",
    ),
    "all_to_normal:remove_virAma_and_double_virAma" => (
      "Remove Virāma and Double Virāma",
      "Removes virāma (।) and pūrṇa virāma (॥) punctuation from Normal/Romanized output.",
    ),
    "all_to_normal:replace_avagraha_with_a" => (
      "Replace Avagraha with a",
      "Replaces avagraha (ऽ) with 'a' in Normal/Romanized output.",
    ),
    "all_to_sinhala:use_conjunct_enabling_halant" => (
      "Use Conjunct Enabling Halant",
      "Uses conjunct-enabling halant (්‍) for Sinhala output to properly form conjunct consonants.",
    ),
    "all_to_normal:replace_pancham_varga_varna_with_n" => (
      "Replace Pancham Varga Varna with n",
      "Replaces ङ (G) and ञ (J) with 'n' for more natural output.",
    ),
    "brahmic_to_brahmic:replace_pancham_varga_varna_with_anusvAra" => (
      "Replace Pancham Varga Varna with Anusvāra",
      "Replaces 5th varga consonants (ङ्, ञ्, ण्, न्, म्) with anusvāra (ं) when followed by consonants of the same varga.",
    ),
    "normal_to_all:use_typing_chars" => (
      "Use Typing Characters",
      "Enables typing mode characters including duplicate alternatives and script-specific characters, the same as realtime typing.",
    ),
    "normal_to_brahmic:include_inherent_vowel" => (
      "Include Inherent Vowel",
      "Keeps the inherent vowel (schwa) at the end of a word instead of adding a halant: kamal → कमल (default कमल्).",
    ),
    "normal_to_brahmic:keep_ascii_numerals" => (
      "Keep ASCII Numerals",
      "Keeps ASCII digits (0-9) as they are instead of writing them as the native numerals of the script.",
    ),
    _ => return None,
  })
}

fn default_from() -> String {
  "Devanagari".into()
}
fn default_to() -> String {
  "Romanized".into()
}
fn default_preset() -> Preset {
  Preset::None
}
fn default_native_numerals() -> bool {
  DEFAULT_USE_NATIVE_NUMERALS
}
fn default_inherent_vowel() -> bool {
  DEFAULT_INCLUDE_INHERENT_VOWEL
}
fn default_true() -> bool {
  true
}

/// What Lipi Parivartaka remembers between runs (`parivartaka_conf.toml`)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParivartakaSettings {
  #[serde(default = "default_from")]
  pub from: String,
  #[serde(default = "default_to")]
  pub to: String,
  #[serde(default = "default_preset")]
  pub preset: Preset,
  #[serde(default = "default_native_numerals")]
  pub use_native_numerals: bool,
  #[serde(default = "default_inherent_vowel")]
  pub include_inherent_vowel: bool,
  #[serde(default = "default_true")]
  pub typing_enabled: bool,
  #[serde(default = "default_true")]
  pub auto_convert: bool,
}

impl Default for ParivartakaSettings {
  fn default() -> Self {
    toml::from_str("").expect("all fields have defaults")
  }
}

const SETTINGS_FILE: &str = "parivartaka_conf.toml";
const TEXT_FILE: &str = "parivartaka_text.txt";

impl ParivartakaSettings {
  pub fn load() -> Self {
    fs::read_to_string(app_data_path(SETTINGS_FILE))
      .ok()
      .and_then(|s| toml::from_str(&s).ok())
      .unwrap_or_default()
  }

  pub fn save(&self) {
    if let Ok(s) = toml::to_string_pretty(self) {
      let _ = fs::write(app_data_path(SETTINGS_FILE), s);
    }
  }

  pub fn from_script(&self) -> ScriptListEnum {
    ScriptListEnum::from_str(&self.from).unwrap_or(ScriptListEnum::Devanagari)
  }

  pub fn to_script(&self) -> ScriptListEnum {
    ScriptListEnum::from_str(&self.to).unwrap_or(ScriptListEnum::Romanized)
  }
}

/// The source text kept from the last run
pub fn load_saved_text() -> Option<String> {
  fs::read_to_string(app_data_path(TEXT_FILE))
    .ok()
    .filter(|s| !s.is_empty())
}

pub fn save_text(text: &str) -> std::io::Result<()> {
  let path = app_data_path(TEXT_FILE);
  if text.is_empty() {
    match fs::remove_file(path) {
      Err(e) if e.kind() != std::io::ErrorKind::NotFound => Err(e),
      _ => Ok(()),
    }
  } else {
    fs::write(path, text)
  }
}

/// Larger files are refused: every change transliterates the whole text again
pub const MAX_TEXT_FILE_BYTES: u64 = 10 * 1024 * 1024;

/// Reads a .txt file as UTF-8 text (a leading BOM is dropped)
pub fn read_text_file(path: &std::path::Path) -> Result<String, String> {
  let name = path
    .file_name()
    .map(|n| n.to_string_lossy().to_string())
    .unwrap_or_else(|| "the file".into());
  let meta = fs::metadata(path).map_err(|_| format!("Couldn't read {name}"))?;
  if meta.len() > MAX_TEXT_FILE_BYTES {
    return Err(format!(
      "{name} is too large ({:.1} MB, at most 10 MB)",
      meta.len() as f64 / 1024. / 1024.
    ));
  }
  let bytes = fs::read(path).map_err(|_| format!("Couldn't read {name}"))?;
  // a NUL never appears in text, but early in nearly every binary file (images, .docx, .pdf)
  if bytes.iter().take(8000).any(|b| *b == 0) {
    return Err(format!("{name} doesn't look like a plain text file"));
  }
  let text = String::from_utf8(bytes).map_err(|_| format!("{name} is not UTF-8 text"))?;
  Ok(
    text
      .strip_prefix('\u{feff}')
      .map(str::to_string)
      .unwrap_or(text),
  )
}

/// `lipilekhika-source-devanagari.txt`, `lipilekhika-output-romanized.txt`
pub fn text_file_name(source: bool, script: ScriptListEnum) -> String {
  let mut slug = String::new();
  for c in script.as_ref().to_lowercase().chars() {
    if c.is_ascii_alphanumeric() {
      slug.push(c);
    } else if !slug.ends_with('-') {
      slug.push('-');
    }
  }
  format!(
    "lipilekhika-{}-{}.txt",
    if source { "source" } else { "output" },
    slug.trim_matches('-')
  )
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn file_names() {
    assert_eq!(
      text_file_name(true, ScriptListEnum::Devanagari),
      "lipilekhika-source-devanagari.txt"
    );
    assert_eq!(
      text_file_name(false, ScriptListEnum::HarvardKyoto),
      "lipilekhika-output-harvard-kyoto.txt"
    );
  }

  #[test]
  fn preset_options() {
    let available = vec![
      "all_to_normal:replace_avagraha_with_a".to_string(),
      "brahmic_to_brahmic:replace_pancham_varga_varna_with_anusvAra".to_string(),
    ];
    let opts = Preset::TscPortal.options(
      &available,
      ScriptListEnum::Devanagari,
      ScriptListEnum::Telugu,
    );
    assert!(opts.iter().all(|(_, on)| *on));
    let opts = Preset::None.options(
      &available,
      ScriptListEnum::Devanagari,
      ScriptListEnum::Telugu,
    );
    assert!(opts.iter().all(|(_, on)| !*on));
  }

  #[test]
  fn defaults() {
    let s = ParivartakaSettings::default();
    assert_eq!(s.from_script(), ScriptListEnum::Devanagari);
    assert_eq!(s.to_script(), ScriptListEnum::Romanized);
    assert!(s.auto_convert);
  }
}
