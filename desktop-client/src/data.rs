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
    ScriptListEnum::Iast => "IA",
    ScriptListEnum::Itrans => "IT",
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
const STANDARD_SCHEMES: &[ScriptListEnum] = &[
  ScriptListEnum::Iast,
  ScriptListEnum::Itrans,
  ScriptListEnum::HarvardKyoto,
  ScriptListEnum::Slp1,
];

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

/// The script picker's sections, in display order
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ScriptCategory {
  Modern,
  Latin,
  Ancient,
}

impl ScriptCategory {
  pub const ALL: [ScriptCategory; 3] = [Self::Modern, Self::Latin, Self::Ancient];

  pub fn title(self) -> &'static str {
    match self {
      Self::Modern => "Modern Indian Scripts",
      Self::Latin => "Latin Scripts",
      Self::Ancient => "Ancient Scripts",
    }
  }
}

/// The scripts in the order (and sections) of the web app's script picker
pub const SCRIPT_ORDER: &[(ScriptListEnum, ScriptCategory)] = &[
  (ScriptListEnum::Devanagari, ScriptCategory::Modern),
  (ScriptListEnum::Telugu, ScriptCategory::Modern),
  (ScriptListEnum::Tamil, ScriptCategory::Modern),
  (ScriptListEnum::Bengali, ScriptCategory::Modern),
  (ScriptListEnum::Kannada, ScriptCategory::Modern),
  (ScriptListEnum::Gujarati, ScriptCategory::Modern),
  (ScriptListEnum::Malayalam, ScriptCategory::Modern),
  (ScriptListEnum::Odia, ScriptCategory::Modern),
  (ScriptListEnum::Gurumukhi, ScriptCategory::Modern),
  (ScriptListEnum::Assamese, ScriptCategory::Modern),
  (ScriptListEnum::Sinhala, ScriptCategory::Modern),
  (ScriptListEnum::TamilExtended, ScriptCategory::Modern),
  (ScriptListEnum::PurnaDevanagari, ScriptCategory::Modern),
  // latin: Lipi Lekhika's own schemes first, then the standard ones
  (ScriptListEnum::Normal, ScriptCategory::Latin),
  (ScriptListEnum::Romanized, ScriptCategory::Latin),
  (ScriptListEnum::Iast, ScriptCategory::Latin),
  (ScriptListEnum::Itrans, ScriptCategory::Latin),
  (ScriptListEnum::HarvardKyoto, ScriptCategory::Latin),
  (ScriptListEnum::Slp1, ScriptCategory::Latin),
  // ancient
  (ScriptListEnum::Brahmi, ScriptCategory::Ancient),
  (ScriptListEnum::Sharada, ScriptCategory::Ancient),
  (ScriptListEnum::Granth, ScriptCategory::Ancient),
  (ScriptListEnum::Modi, ScriptCategory::Ancient),
  (ScriptListEnum::Siddham, ScriptCategory::Ancient),
];

/// A short line under the script name in the picker; also searched
pub fn script_hint(script: ScriptListEnum) -> Option<&'static str> {
  Some(match script {
    ScriptListEnum::Devanagari => "Hindi, Sanskrit, Marathi, Nepali",
    ScriptListEnum::Gurumukhi => "Punjabi",
    ScriptListEnum::Bengali => "Bangla",
    ScriptListEnum::Odia => "Oriya",
    ScriptListEnum::TamilExtended => "Tamil with superscript marks",
    ScriptListEnum::PurnaDevanagari => "Devanagari for all Indian scripts",
    ScriptListEnum::Normal => "Plain English letters",
    ScriptListEnum::Romanized => "With diacritics",
    ScriptListEnum::Iast => "kṛṣṇa",
    ScriptListEnum::Itrans => "kRRiShNa",
    ScriptListEnum::HarvardKyoto => "kRSNa",
    ScriptListEnum::Slp1 => "kfzRa",
    _ => return None,
  })
}

/// Extra search terms that are not shown (codes and aliases)
pub fn script_keywords(script: ScriptListEnum) -> &'static [&'static str] {
  match script {
    ScriptListEnum::Devanagari => &["dev", "hi", "hin", "sa", "san", "mar", "ne", "nep"],
    ScriptListEnum::Telugu => &["te", "tel"],
    ScriptListEnum::Tamil => &["tam", "ta"],
    ScriptListEnum::TamilExtended => &["tam-ext", "ta-ext"],
    ScriptListEnum::Bengali => &["ben", "be"],
    ScriptListEnum::Kannada => &["ka", "kan"],
    ScriptListEnum::Gujarati => &["gu", "guj"],
    ScriptListEnum::Malayalam => &["mal"],
    ScriptListEnum::Odia => &["or", "od"],
    ScriptListEnum::Sinhala => &["si", "sin", "sinh", "sinhalese"],
    ScriptListEnum::Gurumukhi => &["gur", "pun", "gurmukhi"],
    ScriptListEnum::Assamese => &["as"],
    ScriptListEnum::Normal => &["en", "eng", "english", "ascii", "custom"],
    ScriptListEnum::Romanized => &["rom", "roman", "custom"],
    ScriptListEnum::HarvardKyoto => &["hk"],
    ScriptListEnum::Slp1 => &["slp"],
    ScriptListEnum::Granth => &["grantha"],
    _ => &[],
  }
}

fn norm(s: &str) -> String {
  s.chars()
    .filter(|c| !matches!(c, ' ' | '_' | '-'))
    .flat_map(char::to_lowercase)
    .collect()
}

/// Whether a picker search `query` matches the script (name, alias, hint or section)
pub fn script_matches(script: ScriptListEnum, query: &str) -> bool {
  let q = norm(query);
  if q.is_empty() {
    return true;
  }
  let name = norm(script.as_ref());
  if name.contains(&q) {
    return true;
  }
  if script_keywords(script)
    .iter()
    .any(|k| norm(k).starts_with(&q))
  {
    return true;
  }
  if script_hint(script).is_some_and(|h| norm(h).contains(&q)) {
    return true;
  }
  let category = SCRIPT_ORDER
    .iter()
    .find(|(s, _)| *s == script)
    .map(|(_, c)| *c);
  category.is_some_and(|c| norm(c.title()).starts_with(&q))
}

/// The font family the script is shown in (the bundled fonts, see `ui::fonts`)
pub fn script_font_family(script: ScriptListEnum) -> Option<&'static str> {
  Some(match script {
    ScriptListEnum::Devanagari | ScriptListEnum::PurnaDevanagari => "Noto Sans Devanagari",
    ScriptListEnum::Telugu => "Noto Sans Telugu",
    ScriptListEnum::Tamil => "Noto Sans Tamil",
    ScriptListEnum::TamilExtended => "Noto Sans Tamil",
    ScriptListEnum::Bengali | ScriptListEnum::Assamese => "Noto Sans Bengali",
    ScriptListEnum::Kannada => "Noto Sans Kannada",
    ScriptListEnum::Gujarati => "Noto Sans Gujarati",
    ScriptListEnum::Malayalam => "Noto Sans Malayalam",
    ScriptListEnum::Odia => "Noto Sans Oriya",
    ScriptListEnum::Sinhala => "Noto Sans Sinhala",
    ScriptListEnum::Gurumukhi => "Noto Sans Gurmukhi",
    ScriptListEnum::Brahmi => "Noto Sans Brahmi",
    ScriptListEnum::Granth => "Noto Sans Grantha",
    ScriptListEnum::Modi => "Noto Sans Modi",
    ScriptListEnum::Sharada => "Satisar Sharada",
    ScriptListEnum::Siddham => "Noto Sans Siddham",
    ScriptListEnum::Normal
    | ScriptListEnum::Romanized
    | ScriptListEnum::Iast
    | ScriptListEnum::Itrans
    | ScriptListEnum::HarvardKyoto
    | ScriptListEnum::Slp1 => "Noto Sans",
  })
}
