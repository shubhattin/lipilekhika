use crate::{LipiError, parse_script};
use lipilekhika::typing as lt;
use std::sync::{Arc, Mutex, MutexGuard};

#[uniffi::export]
pub fn default_auto_context_clear_time_ms() -> i64 {
    lt::DEFAULT_AUTO_CONTEXT_CLEAR_TIME_MS as i64
}

#[uniffi::export]
pub fn default_use_native_numerals() -> bool {
    lt::DEFAULT_USE_NATIVE_NUMERALS
}

#[uniffi::export]
pub fn default_include_inherent_vowel() -> bool {
    lt::DEFAULT_INCLUDE_INHERENT_VOWEL
}

/// Options of a typing context
#[derive(uniffi::Record)]
pub struct TypingContextOptions {
    /// Idle time in milliseconds after which the context is cleared (`0`: after any pause).
    /// A Kotlin `Long`, so it can not be negative.
    pub auto_context_clear_time_ms: i64,
    pub use_native_numerals: bool,
    pub include_inherent_vowel: bool,
}

impl TryFrom<TypingContextOptions> for lt::TypingContextOptions {
    type Error = LipiError;

    fn try_from(opts: TypingContextOptions) -> Result<Self, LipiError> {
        let ms = u64::try_from(opts.auto_context_clear_time_ms).map_err(|_| {
            LipiError::InvalidArgument(format!(
                "autoContextClearTimeMs must be 0 or more milliseconds, got {}",
                opts.auto_context_clear_time_ms
            ))
        })?;
        Ok(Self {
            auto_context_clear_time_ms: ms,
            use_native_numerals: opts.use_native_numerals,
            include_inherent_vowel: opts.include_inherent_vowel,
        })
    }
}

/// The change one key makes to the typed text
#[derive(uniffi::Record)]
pub struct TypingDiff {
    /// Characters to delete from the end of the text, counted in code points (a character
    /// outside the BMP, eg. Brahmi `𑀓`, is 2 `Char`s of a Kotlin `String`)
    pub to_delete_chars_count: i32,
    /// Text to add after the deletion
    pub diff_add_text: String,
    /// Length of the context kept (0 after it was cleared)
    pub context_length: i32,
}

/// Typing of a script key by key (a stateful context)
#[derive(uniffi::Object)]
pub struct TypingContext {
    inner: Mutex<lt::TypingContext>,
}

impl TypingContext {
    fn ctx(&self) -> MutexGuard<'_, lt::TypingContext> {
        // the context is never left half updated by a panic, so a poisoned lock is still usable
        self.inner.lock().unwrap_or_else(|e| e.into_inner())
    }
}

fn to_i32(n: usize) -> i32 {
    i32::try_from(n).unwrap_or(i32::MAX)
}

#[uniffi::export]
impl TypingContext {
    #[uniffi::constructor]
    pub fn new(
        typing_script: String,
        options: Option<TypingContextOptions>,
    ) -> Result<Arc<Self>, LipiError> {
        let script = parse_script(&typing_script, "typing_script")?;
        let options = options
            .map(lt::TypingContextOptions::try_from)
            .transpose()?;
        Ok(Arc::new(Self {
            inner: Mutex::new(lt::TypingContext::new(script, options)),
        }))
    }

    pub fn clear_context(&self) {
        self.ctx().clear_context();
    }

    pub fn take_key_input(&self, key: String) -> TypingDiff {
        let diff = self.ctx().take_key_input(&key);
        TypingDiff {
            to_delete_chars_count: to_i32(diff.to_delete_chars_count),
            diff_add_text: diff.diff_add_text,
            context_length: to_i32(diff.context_length),
        }
    }

    pub fn update_use_native_numerals(&self, use_native_numerals: bool) {
        self.ctx().update_use_native_numerals(use_native_numerals);
    }

    pub fn update_include_inherent_vowel(&self, include_inherent_vowel: bool) {
        self.ctx()
            .update_include_inherent_vowel(include_inherent_vowel);
    }

    pub fn get_use_native_numerals(&self) -> bool {
        self.ctx().get_use_native_numerals()
    }

    pub fn get_include_inherent_vowel(&self) -> bool {
        self.ctx().get_include_inherent_vowel()
    }

    /// The script the context types in (a language name is resolved to its script)
    pub fn get_normalized_script(&self) -> String {
        self.ctx().get_normalized_script().to_string()
    }
}

/// Kind of a character in the data of a script
#[derive(uniffi::Enum)]
pub enum ListType {
    Anya,
    Vyanjana,
    Matra,
    Svara,
}

impl From<lt::ListType> for ListType {
    fn from(value: lt::ListType) -> Self {
        match value {
            lt::ListType::Anya => Self::Anya,
            lt::ListType::Vyanjana => Self::Vyanjana,
            lt::ListType::Matra => Self::Matra,
            lt::ListType::Svara => Self::Svara,
        }
    }
}

/// A character of a script and the keys that type it
#[derive(uniffi::Record)]
pub struct TypingDataMapItem {
    pub text: String,
    pub list_type: ListType,
    /// The keys, the main one first
    pub mappings: Vec<String>,
}

#[derive(uniffi::Record)]
pub struct ScriptTypingDataMap {
    /// Characters shared by the scripts (from the krama list)
    pub common_krama_map: Vec<TypingDataMapItem>,
    /// Characters of this script only
    pub script_specific_krama_map: Vec<TypingDataMapItem>,
}

fn items(list: Vec<lt::TypingDataMapItem>) -> Vec<TypingDataMapItem> {
    list.into_iter()
        .map(|(text, list_type, mappings)| TypingDataMapItem {
            text,
            list_type: list_type.into(),
            mappings,
        })
        .collect()
}

#[uniffi::export]
pub fn get_script_typing_data_map(script: String) -> Result<ScriptTypingDataMap, LipiError> {
    let script = parse_script(&script, "script")?;
    let data = lt::get_script_typing_data_map(script);
    Ok(ScriptTypingDataMap {
        common_krama_map: items(data.common_krama_map),
        script_specific_krama_map: items(data.script_specific_krama_map),
    })
}

/// A character of the krama list of a script and its kind
#[derive(uniffi::Record)]
pub struct KramaDataItem {
    pub text: String,
    pub list_type: ListType,
}

/// The krama list of a script; the lists of the scripts are index-aligned, so the same index is
/// the same character in every script.
#[uniffi::export]
pub fn get_script_krama_data(script: String) -> Result<Vec<KramaDataItem>, LipiError> {
    let script = parse_script(&script, "script")?;
    Ok(lt::get_script_krama_data(script)
        .into_iter()
        .map(|(text, list_type)| KramaDataItem {
            text,
            list_type: list_type.into(),
        })
        .collect())
}
