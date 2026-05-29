use std::sync::OnceLock;

use super::generated;
use super::schema::{List, ScriptListData};

impl List {
    pub fn get_krama_ref(&self) -> &Vec<i16> {
        match self {
            List::Anya { krama_ref }
            | List::Vyanjana { krama_ref }
            | List::Matra { krama_ref }
            | List::Svara { krama_ref, .. } => krama_ref,
        }
    }
    #[inline]
    pub fn is_svara(&self) -> bool {
        matches!(self, List::Svara { .. })
    }
    #[inline]
    pub fn is_matra(&self) -> bool {
        matches!(self, List::Matra { .. })
    }
    #[inline]
    pub fn is_vyanjana(&self) -> bool {
        matches!(self, List::Vyanjana { .. })
    }
    #[inline]
    pub fn is_anya(&self) -> bool {
        matches!(self, List::Anya { .. })
    }
}

static SCRIPT_LIST_DATA_CACHE: OnceLock<ScriptListData> = OnceLock::new();

/// Returns the script list data
pub fn get_script_list_data() -> &'static ScriptListData {
    SCRIPT_LIST_DATA_CACHE.get_or_init(|| {
        let bytes = generated::SCRIPT_LIST_BYTES;
        let data: ScriptListData =
            bincode::deserialize(bytes).expect("bincode decode failed for script_list");
        data
    })
}
#[cfg(test)]
mod tests {
    use super::*;
    use crate::scripts::{Script, ScriptListEnum};
    use std::str::FromStr;

    /// User-facing script/language strings (from `Script`) → internal `ScriptListEnum`.
    fn resolve(s: &str) -> Result<ScriptListEnum, <Script as FromStr>::Err> {
        Script::from_str(s).map(Into::into)
    }

    #[test]
    fn test_get_script_list_data_parses() {
        let data = get_script_list_data();
        assert!(!data.scripts.is_empty());
    }

    #[test]
    fn test_script_acronyms() {
        assert_eq!(resolve("dev"), Ok(ScriptListEnum::Devanagari));
        assert_eq!(resolve("te"), Ok(ScriptListEnum::Telugu));
        assert_eq!(resolve("tel"), Ok(ScriptListEnum::Telugu));
        assert_eq!(resolve("tam"), Ok(ScriptListEnum::Tamil));
        assert_eq!(resolve("tam-ext"), Ok(ScriptListEnum::TamilExtended));
        assert_eq!(resolve("ben"), Ok(ScriptListEnum::Bengali));
        assert_eq!(resolve("be"), Ok(ScriptListEnum::Bengali));
        assert_eq!(resolve("ka"), Ok(ScriptListEnum::Kannada));
        assert_eq!(resolve("kan"), Ok(ScriptListEnum::Kannada));
        assert_eq!(resolve("gu"), Ok(ScriptListEnum::Gujarati));
        assert_eq!(resolve("guj"), Ok(ScriptListEnum::Gujarati));
        assert_eq!(resolve("mal"), Ok(ScriptListEnum::Malayalam));
        assert_eq!(resolve("or"), Ok(ScriptListEnum::Odia));
        assert_eq!(resolve("od"), Ok(ScriptListEnum::Odia));
        assert_eq!(resolve("oriya"), Ok(ScriptListEnum::Odia));
        assert_eq!(resolve("si"), Ok(ScriptListEnum::Sinhala));
        assert_eq!(resolve("sinh"), Ok(ScriptListEnum::Sinhala));
        assert_eq!(resolve("sin"), Ok(ScriptListEnum::Sinhala));
        assert_eq!(resolve("en"), Ok(ScriptListEnum::Normal));
        assert_eq!(resolve("rom"), Ok(ScriptListEnum::Romanized));
        assert_eq!(resolve("gur"), Ok(ScriptListEnum::Gurumukhi));
        assert_eq!(resolve("as"), Ok(ScriptListEnum::Assamese));
    }

    #[test]
    fn test_script_acronyms_case_insensitive() {
        assert_eq!(resolve("DEV"), Ok(ScriptListEnum::Devanagari));
        assert_eq!(resolve("Te"), Ok(ScriptListEnum::Telugu));
        assert_eq!(resolve("TEL"), Ok(ScriptListEnum::Telugu));
        assert_eq!(resolve("TAM-EXT"), Ok(ScriptListEnum::TamilExtended));
    }

    #[test]
    fn test_language_acronyms() {
        assert_eq!(resolve("sa"), Ok(ScriptListEnum::Devanagari));
        assert_eq!(resolve("san"), Ok(ScriptListEnum::Devanagari));
        assert_eq!(resolve("hin"), Ok(ScriptListEnum::Devanagari));
        assert_eq!(resolve("hi"), Ok(ScriptListEnum::Devanagari));
        assert_eq!(resolve("mar"), Ok(ScriptListEnum::Devanagari));
        assert_eq!(resolve("ne"), Ok(ScriptListEnum::Devanagari));
        assert_eq!(resolve("nep"), Ok(ScriptListEnum::Devanagari));
        assert_eq!(resolve("pun"), Ok(ScriptListEnum::Gurumukhi));
    }

    #[test]
    fn test_language_acronyms_case_insensitive() {
        assert_eq!(resolve("SA"), Ok(ScriptListEnum::Devanagari));
        assert_eq!(resolve("San"), Ok(ScriptListEnum::Devanagari));
        assert_eq!(resolve("HIN"), Ok(ScriptListEnum::Devanagari));
    }

    #[test]
    fn test_full_script_names() {
        assert_eq!(resolve("Devanagari"), Ok(ScriptListEnum::Devanagari));
        assert_eq!(resolve("Telugu"), Ok(ScriptListEnum::Telugu));
        assert_eq!(resolve("Tamil"), Ok(ScriptListEnum::Tamil));
        assert_eq!(resolve("Tamil-Extended"), Ok(ScriptListEnum::TamilExtended));
        assert_eq!(resolve("Bengali"), Ok(ScriptListEnum::Bengali));
        assert_eq!(resolve("Kannada"), Ok(ScriptListEnum::Kannada));
        assert_eq!(resolve("Gujarati"), Ok(ScriptListEnum::Gujarati));
        assert_eq!(resolve("Malayalam"), Ok(ScriptListEnum::Malayalam));
        assert_eq!(resolve("Odia"), Ok(ScriptListEnum::Odia));
        assert_eq!(resolve("Sinhala"), Ok(ScriptListEnum::Sinhala));
        assert_eq!(resolve("Normal"), Ok(ScriptListEnum::Normal));
        assert_eq!(resolve("Romanized"), Ok(ScriptListEnum::Romanized));
        assert_eq!(resolve("Gurumukhi"), Ok(ScriptListEnum::Gurumukhi));
        assert_eq!(resolve("Assamese"), Ok(ScriptListEnum::Assamese));
    }

    #[test]
    fn test_full_language_names() {
        assert_eq!(resolve("Sanskrit"), Ok(ScriptListEnum::Devanagari));
        assert_eq!(resolve("Hindi"), Ok(ScriptListEnum::Devanagari));
        assert_eq!(resolve("Marathi"), Ok(ScriptListEnum::Devanagari));
        assert_eq!(resolve("Nepali"), Ok(ScriptListEnum::Devanagari));
        assert_eq!(resolve("Punjabi"), Ok(ScriptListEnum::Gurumukhi));
        assert_eq!(resolve("Bengali"), Ok(ScriptListEnum::Bengali));
        assert_eq!(resolve("Gujarati"), Ok(ScriptListEnum::Gujarati));
        assert_eq!(resolve("Kannada"), Ok(ScriptListEnum::Kannada));
        assert_eq!(resolve("Malayalam"), Ok(ScriptListEnum::Malayalam));
        assert_eq!(resolve("Odia"), Ok(ScriptListEnum::Odia));
        assert_eq!(resolve("Sinhala"), Ok(ScriptListEnum::Sinhala));
        assert_eq!(resolve("Tamil"), Ok(ScriptListEnum::Tamil));
        assert_eq!(resolve("Telugu"), Ok(ScriptListEnum::Telugu));
        assert_eq!(resolve("Assamese"), Ok(ScriptListEnum::Assamese));
        assert_eq!(resolve("English"), Ok(ScriptListEnum::Normal));
    }

    #[test]
    fn test_case_variations_for_scripts() {
        assert_eq!(resolve("devanagari"), Ok(ScriptListEnum::Devanagari));
        assert_eq!(resolve("telugu"), Ok(ScriptListEnum::Telugu));
        assert_eq!(resolve("tamil-extended"), Ok(ScriptListEnum::TamilExtended));
        assert_eq!(resolve("Devanagari"), Ok(ScriptListEnum::Devanagari));
        assert_eq!(resolve("DEvanagari"), Ok(ScriptListEnum::Devanagari));
    }

    #[test]
    fn test_case_variations_for_languages() {
        assert_eq!(resolve("sanskrit"), Ok(ScriptListEnum::Devanagari));
        assert_eq!(resolve("hindi"), Ok(ScriptListEnum::Devanagari));
        assert_eq!(resolve("punjabi"), Ok(ScriptListEnum::Gurumukhi));
    }

    #[test]
    fn test_invalid_inputs() {
        for bad in [
            "xyz",
            "unknown",
            "abc",
            "UnknownScript",
            "Latin",
            "Cyrillic",
            "",
            "123",
            "!@#",
        ] {
            assert!(resolve(bad).is_err(), "expected parse failure for `{bad}`");
        }
    }

    #[test]
    fn test_edge_cases() {
        assert_eq!(resolve("tam-ext"), Ok(ScriptListEnum::TamilExtended));
        assert_eq!(resolve("TAM-EXT"), Ok(ScriptListEnum::TamilExtended));
        assert_eq!(resolve("Tam-Ext"), Ok(ScriptListEnum::TamilExtended));
        assert_eq!(resolve("Telugu"), Ok(ScriptListEnum::Telugu));
        assert_eq!(resolve("tel"), Ok(ScriptListEnum::Telugu));
    }
}
