//! UniFFI bindings of the lipilekhika crate for Kotlin.
//!
//! The Kotlin code generated from this crate (`uniffi-bindgen generate --library`) is the low
//! level layer; `packages/kotlin/lipilekhika` wraps it in the public Kotlin API.

use lipilekhika::ScriptListEnum;
use lipilekhika::scripts::Script;
use std::fmt;
use std::str::FromStr;

mod typing;

uniffi::setup_scaffolding!();

/// An error of the lipilekhika API (a Kotlin exception)
#[derive(Debug, uniffi::Error)]
#[uniffi(flat_error)]
pub enum LipiError {
    /// A script or language name that is not known
    InvalidScript(String),
    /// A transliteration option key that is not known
    UnknownOption(String),
    /// An argument outside its range
    InvalidArgument(String),
}

impl fmt::Display for LipiError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidScript(msg) | Self::UnknownOption(msg) | Self::InvalidArgument(msg) => {
                f.write_str(msg)
            }
        }
    }
}

/// A script/language name, exactly as JS and Rust read it (no trimming of spaces)
pub(crate) fn parse_script(name: &str, label: &str) -> Result<Script, LipiError> {
    Script::from_str(name)
        .map_err(|e| LipiError::InvalidScript(format!("invalid {label} {name:?}: {e}")))
}

/// A transliteration option and its value
#[derive(uniffi::Record)]
pub struct TransOption {
    pub key: String,
    pub value: bool,
}

/// Transliterates `text` from `from_script` to `to_script` (script or language names).
#[uniffi::export]
pub fn transliterate(
    text: String,
    from_script: String,
    to_script: String,
    options: Option<Vec<TransOption>>,
) -> Result<String, LipiError> {
    let options = options
        .map(|list| -> Result<lipilekhika::CustomOptions, LipiError> {
            let mut options = lipilekhika::CustomOptions::default();
            for TransOption { key, value } in list {
                options.try_set(&key, value).map_err(|_| {
                    LipiError::UnknownOption(format!("unknown transliteration option {key:?}"))
                })?;
            }
            Ok(options)
        })
        .transpose()?;
    let from = parse_script(&from_script, "from_script")?;
    let to = parse_script(&to_script, "to_script")?;
    if ScriptListEnum::from(from) == ScriptListEnum::from(to) {
        // a same-script pair gives the text as it is
        return Ok(text);
    }
    Ok(lipilekhika::transliterate(&text, from, to, options.as_ref()).into_owned())
}

/// Loads the data of a script ahead of its first use.
#[uniffi::export]
pub fn preload_script_data(script_name: String) -> Result<(), LipiError> {
    let script = parse_script(&script_name, "script_name")?;
    lipilekhika::preload_script_data(script);
    Ok(())
}

/// The schwa deletion property of a Brahmic script, `None` for the other scripts.
#[uniffi::export]
pub fn get_schwa_status_for_script(script_name: String) -> Result<Option<bool>, LipiError> {
    let script = parse_script(&script_name, "script_name")?;
    Ok(lipilekhika::get_schwa_status_for_script(script))
}

/// The transliteration option keys that apply from `from_script` to `to_script`.
#[uniffi::export]
pub fn get_all_options(from_script: String, to_script: String) -> Result<Vec<String>, LipiError> {
    let from = parse_script(&from_script, "from_script")?;
    let to = parse_script(&to_script, "to_script")?;
    Ok(lipilekhika::get_all_options(from, to))
}

/// The script name of a script, language or alias name (eg. `hi` → `Devanagari`).
#[uniffi::export]
pub fn get_normalized_script_name(script_name: String) -> Result<String, LipiError> {
    let script = parse_script(&script_name, "script_name")?;
    Ok(ScriptListEnum::from(script).to_string())
}

/// A key and its value, a map entry (a list of them keeps the order of the data)
#[derive(uniffi::Record)]
pub struct StringPair {
    pub key: String,
    pub value: String,
}

/// The lists of scripts, languages and aliases
#[derive(uniffi::Record)]
pub struct ScriptListData {
    pub scripts: Vec<String>,
    pub langs: Vec<String>,
    /// Every language and the script it is written in
    pub lang_script_map: Vec<StringPair>,
    /// Every alias and the script it names
    pub script_alternates_map: Vec<StringPair>,
}

fn pairs<'a>(map: impl IntoIterator<Item = (&'a String, &'a String)>) -> Vec<StringPair> {
    map.into_iter()
        .map(|(k, v)| StringPair {
            key: k.clone(),
            value: v.clone(),
        })
        .collect()
}

#[uniffi::export]
pub fn get_script_list_data() -> ScriptListData {
    let data = lipilekhika::get_script_list_data();
    ScriptListData {
        scripts: data.scripts.clone(),
        langs: data.langs.clone(),
        lang_script_map: pairs(&data.lang_script_map),
        script_alternates_map: pairs(&data.script_alternates_map),
    }
}
