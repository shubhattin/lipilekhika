//! Per-key typing emulation: stateful [`TypingContext`], diffs for incremental UI updates,
//! and script typing-data helpers. Enable the crate `std` feature for idle auto-clear via
//! `std::time`; otherwise clear context explicitly.

use crate::custom_options::CustomOptions;
use crate::scripts::{Script, ScriptListEnum};
use alloc::string::{String, ToString};
use alloc::vec::Vec;
use hashbrown::{HashMap, HashSet};
use serde::{Deserialize, Serialize};

#[cfg(feature = "std")]
use std::time::Instant;

use crate::script_data::{List, ScriptData};
use crate::transliterate::transliterate::{
    TransliterateScratch, TransliterationFnOptions, TransliterationOutput,
    resolve_transliteration_rules, transliterate_text_core_with,
};

/// Default time in milliseconds after which the context will be cleared automatically.
pub const DEFAULT_AUTO_CONTEXT_CLEAR_TIME_MS: u64 = 4500;

/// Typing keeps the input of the current context and transliterates all of it on every key. The
/// context is cleared at a space or punctuation, but a long run of letters would keep growing.
/// Once the context input is `CONTEXT_TRIM_LENGTH` keys (chars) long, its start is committed,
/// keeping about the last `CONTEXT_KEEP_LENGTH` (see [`TypingContext::commit_context_start`]).
/// Counted in chars, like the TS (code points) and Go (runes) versions, so all of them commit at
/// the same keys.
const CONTEXT_TRIM_LENGTH: usize = 64;
const CONTEXT_KEEP_LENGTH: usize = 32;
/// Number of split points tried for one commit
const CONTEXT_TRIM_TRIES: usize = 4;
/// Default value for using native numerals while typing.
pub const DEFAULT_USE_NATIVE_NUMERALS: bool = true;
/// Default value for including inherent vowels while typing.
/// By default avoids schwa deletion.
pub const DEFAULT_INCLUDE_INHERENT_VOWEL: bool = false;

/// Options for configuring a typing context.
#[derive(Debug, Clone)]
pub struct TypingContextOptions {
    /// The time in milliseconds after which the context will be cleared automatically.
    /// `0` clears it after any pause. Defaults to [`DEFAULT_AUTO_CONTEXT_CLEAR_TIME_MS`].
    pub auto_context_clear_time_ms: u64,
    /// Use native numerals in transliteration/typing.
    /// Defaults to `DEFAULT_USE_NATIVE_NUMERALS`
    pub use_native_numerals: bool,
    /// Include inherent vowels (schwa character) in transliteration/typing.
    ///
    /// - `true`: `k` -> `क` (Eg. Hindi, Bengali, Gujarati, etc.)
    /// - `false`: `k` -> `क्` (Default behavior in transliteration. Eg. Sanskrit, Telugu, Tamil, Kannada, etc.)
    ///
    /// Defaults to `DEFAULT_INCLUDE_INHERENT_VOWEL`
    pub include_inherent_vowel: bool,
}

impl Default for TypingContextOptions {
    fn default() -> Self {
        Self {
            auto_context_clear_time_ms: DEFAULT_AUTO_CONTEXT_CLEAR_TIME_MS,
            use_native_numerals: DEFAULT_USE_NATIVE_NUMERALS,
            include_inherent_vowel: DEFAULT_INCLUDE_INHERENT_VOWEL,
        }
    }
}

/// Result of processing a single key in a typing context.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TypingDiff {
    /// Number of characters that should be deleted from the current "app" input state.
    ///
    /// Counted in `char`s (code points). A UTF-16 based consumer (JS, Dart, ...) has to convert
    /// it, as a char outside the BMP (eg. Brahmi `𑀓`) is 2 UTF-16 code units.
    pub to_delete_chars_count: usize,
    /// Text that should be inserted into the current "app" input state.
    pub diff_add_text: String,
    /// Can be used to determine if the context should be cleared
    pub context_length: usize,
}

/// Stateful isolated context for character-by-character input typing.
///
/// With the `std` feature, idle time between keys (via `std::time`) can auto-clear the
/// context per [`TypingContextOptions::auto_context_clear_time_ms`]; without `std`, call
/// [`Self::clear_context`] yourself.
#[derive(Debug)]
pub struct TypingContext {
    typing_script: ScriptListEnum,

    use_native_numerals: bool,
    include_inherent_vowel: bool,

    curr_input: String,
    curr_output: String,
    /// context length returned for the last key (0 after a clear)
    curr_context_length: usize,
    /// `curr_input` length at which [`Self::commit_context_start`] is tried next
    next_trim_length: usize,
    /// `curr_input` length in chars (keys)
    curr_input_length: usize,

    #[cfg(feature = "std")]
    auto_context_clear_time_ms: u64,
    #[cfg(feature = "std")]
    last_time: Option<Instant>,

    from_script_data: &'static ScriptData,
    to_script_data: &'static ScriptData,
    trans_options: CustomOptions,
    custom_rules: Vec<&'static crate::script_data::Rule>,
    /// Buffers reused across keys; after each key `scratch.out` holds a spare output
    /// allocation (the previous output, swapped out of `curr_output`), so steady-state
    /// typing allocates only the returned diff text.
    scratch: TransliterateScratch,
}

impl TypingContext {
    /// Creates a new typing context for the given script/language.
    pub fn new(typing_script: Script, options: Option<TypingContextOptions>) -> Self {
        let opts = options.unwrap_or_default();
        let typing_script: ScriptListEnum = typing_script.into();

        let from_script_data = ScriptData::get_script_data(&ScriptListEnum::Normal);
        let to_script_data = ScriptData::get_script_data(&typing_script);

        let resolved = resolve_transliteration_rules(from_script_data, to_script_data, None);

        Self {
            typing_script,
            use_native_numerals: opts.use_native_numerals,
            include_inherent_vowel: opts.include_inherent_vowel,
            curr_input: String::new(),
            curr_output: String::new(),
            curr_context_length: 0,
            next_trim_length: CONTEXT_TRIM_LENGTH,
            curr_input_length: 0,
            #[cfg(feature = "std")]
            auto_context_clear_time_ms: opts.auto_context_clear_time_ms,
            #[cfg(feature = "std")]
            last_time: None,
            from_script_data,
            to_script_data,
            trans_options: resolved.trans_options,
            custom_rules: resolved.custom_rules,
            scratch: TransliterateScratch::default(),
        }
    }

    /// Clears all internal state and contexts.
    pub fn clear_context(&mut self) {
        #[cfg(feature = "std")]
        {
            self.last_time = None;
        }
        self.curr_input.clear();
        self.curr_output.clear();
        self.curr_context_length = 0;
        self.next_trim_length = CONTEXT_TRIM_LENGTH;
        self.curr_input_length = 0;
    }

    /// Transliterates `input` (the context input or a part of it) in typing mode.
    ///
    /// `at_text_end`: the input is at the end of the typed text. Else (the head of a long
    /// context, see `commit_context_start`) the inherent vowel option does not apply, it is only
    /// for the last vyanjana of the text (`kkk` is क्क्क, its head `kk` on its own would be क्क).
    fn transliterate_input(&mut self, input: &str, at_text_end: bool) -> TransliterationOutput {
        let mut translit_options = self.build_translit_options();
        translit_options.include_inherent_vowel &= at_text_end;
        transliterate_text_core_with(
            input,
            &ScriptListEnum::Normal,
            &self.typing_script,
            self.from_script_data,
            self.to_script_data,
            &self.trans_options,
            &self.custom_rules,
            Some(translit_options),
            &mut self.scratch,
        )
    }

    /// Commits the start of a long context, so that a long run of letters does not make each
    /// key slower (quadratic time). The input is split into a head and about the last
    /// `CONTEXT_KEEP_LENGTH` of it, the split is only used when it does not change anything:
    /// the head and the tail transliterated on their own give the current output, and the tail
    /// keeps the whole context. The head's output is then final, the context continues with
    /// the tail.
    fn commit_context_start(&mut self) {
        let input = core::mem::take(&mut self.curr_input);
        // start of the last `CONTEXT_KEEP_LENGTH` chars, each try moves one char back
        let splits = input
            .char_indices()
            .rev()
            .skip(CONTEXT_KEEP_LENGTH - 1)
            .take(CONTEXT_TRIM_TRIES)
            .map(|(i, _)| i);
        for (tries, split) in splits.enumerate() {
            if split == 0 {
                break;
            }
            let tail = self.transliterate_input(&input[split..], true);
            if !tail.output.is_empty()
                && tail.context_length == self.curr_context_length
                && self.curr_output.ends_with(tail.output.as_str())
            {
                let head = self.transliterate_input(&input[..split], false);
                if head.output.len() + tail.output.len() == self.curr_output.len()
                    && self.curr_output.starts_with(head.output.as_str())
                {
                    self.curr_input = String::from(&input[split..]);
                    self.curr_input_length = CONTEXT_KEEP_LENGTH + tries;
                    self.curr_output = tail.output;
                    self.next_trim_length = CONTEXT_TRIM_LENGTH;
                    return;
                }
            }
        }
        // no split point found, try again after some more keys
        self.next_trim_length = self.curr_input_length + CONTEXT_KEEP_LENGTH;
        self.curr_input = input;
    }

    /// Internal helper to build transliteration options for typing mode.
    fn build_translit_options(&self) -> TransliterationFnOptions {
        TransliterationFnOptions {
            typing_mode: true,
            use_native_numerals: self.use_native_numerals,
            include_inherent_vowel: self.include_inherent_vowel,
        }
    }

    /// Accepts character-by-character input and returns the diff relative to the previous output.
    pub fn take_key_input<T: AsRef<str>>(&mut self, key: T) -> TypingDiff {
        let key = key.as_ref();
        // an empty key changes nothing (not even the idle timer)
        let Some(ch) = key.chars().next() else {
            return TypingDiff {
                to_delete_chars_count: 0,
                diff_add_text: String::new(),
                context_length: self.curr_context_length,
            };
        };

        self.take_key_input_char(ch)
    }

    /// Process one character of typing input.
    ///
    /// When the `std` feature is enabled, the context is cleared automatically if the
    /// elapsed time since the previous key exceeds
    /// [`TypingContextOptions::auto_context_clear_time_ms`].
    ///
    /// Without the `std` feature, there is no automatic time-based context clearing; call
    /// [`Self::clear_context`] yourself when the session should reset.
    pub fn take_key_input_char(&mut self, ch: char) -> TypingDiff {
        #[cfg(feature = "std")]
        let now = Instant::now();
        #[cfg(feature = "std")]
        if let Some(last) = self.last_time
            // whole milliseconds, like JS `Date.now()`, so that `0` behaves the same
            && now.duration_since(last).as_millis() > u128::from(self.auto_context_clear_time_ms)
        {
            self.clear_context();
        }

        self.curr_input.push(ch);
        self.curr_input_length += 1;
        let input = core::mem::take(&mut self.curr_input);
        let result = self.transliterate_input(&input, true);
        self.curr_input = input;

        let context_length = result.context_length;
        let output = result.output;

        // Calculate the diff between previous and current output, by common prefix length.
        let (to_delete_chars_count, diff_add_text) = compute_diff(&self.curr_output, &output);

        if context_length > 0 {
            // keep the new output; the old allocation becomes next key's output buffer
            self.scratch.out = core::mem::replace(&mut self.curr_output, output);
            self.curr_context_length = context_length;
            if self.curr_input_length >= self.next_trim_length {
                self.commit_context_start();
            }
        } else {
            // reuse the new output's allocation for the next key
            self.scratch.out = output;
            self.clear_context();
        }

        #[cfg(feature = "std")]
        {
            self.last_time = Some(now);
        }

        TypingDiff {
            to_delete_chars_count,
            diff_add_text,
            context_length,
        }
    }

    /// Updates whether native numerals should be used for subsequent typing.
    pub fn update_use_native_numerals(&mut self, use_native_numerals: bool) {
        self.use_native_numerals = use_native_numerals;
    }

    /// Updates whether inherent vowels should be included for subsequent typing.
    pub fn update_include_inherent_vowel(&mut self, include_inherent_vowel: bool) {
        self.include_inherent_vowel = include_inherent_vowel;
    }

    pub fn get_use_native_numerals(&self) -> bool {
        self.use_native_numerals
    }

    pub fn get_include_inherent_vowel(&self) -> bool {
        self.include_inherent_vowel
    }

    /// Returns the normalized script name for this typing context.
    pub fn get_normalized_script(&self) -> &str {
        self.to_script_data.script_name.as_str()
    }
}

/// Compute the character-wise diff between previous and current outputs.
///
/// Returns `(to_delete_chars_count, diff_add_text)`.
fn compute_diff(prev_output: &str, output: &str) -> (usize, String) {
    // Single pass: compute common prefix length in bytes using chars
    let common_bytes: usize = prev_output
        .chars()
        .zip(output.chars())
        .take_while(|(a, b)| a == b)
        .map(|(a, _)| a.len_utf8())
        .sum();

    let to_delete_chars_count = prev_output[common_bytes..].chars().count();
    let diff_add_text = output[common_bytes..].to_string();

    (to_delete_chars_count, diff_add_text)
}

/// Helper used in tests to emulate per-key typing and accumulate the final output.
///
pub fn emulate_typing(
    text: impl AsRef<str>,
    typing_lang: Script,
    options: Option<TypingContextOptions>,
) -> String {
    let text = text.as_ref();
    let mut ctx = TypingContext::new(typing_lang, options);
    let mut result = String::new();

    for ch in text.chars() {
        let diff = ctx.take_key_input_char(ch);

        if diff.to_delete_chars_count > 0 {
            truncate_last_chars(&mut result, diff.to_delete_chars_count);
        }

        result.push_str(&diff.diff_add_text);
    }

    result
}

/// Truncate the last `n` characters from a UTF-8 string (character-wise, not bytes).
/// Iterates from the end for O(n) instead of O(string_length).
fn truncate_last_chars(s: &mut String, n: usize) {
    if n == 0 {
        return;
    }
    // Walk backwards n chars to find the byte boundary
    let new_byte_len = s
        .char_indices()
        .rev()
        .nth(n - 1)
        .map(|(byte_pos, _)| byte_pos)
        .unwrap_or(0);
    s.truncate(new_byte_len);
}

/// Type of a character in a script's list.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ListType {
    Anya,
    Vyanjana,
    Matra,
    Svara,
}

impl ListType {
    /// Converts a List variant to its ListType.
    fn from_list(list: &List) -> Self {
        match list {
            List::Anya { .. } => ListType::Anya,
            List::Vyanjana { .. } => ListType::Vyanjana,
            List::Matra { .. } => ListType::Matra,
            List::Svara { .. } => ListType::Svara,
        }
    }
}

/// An item in the typing data map containing the text, its type, and associated input mappings.
pub type TypingDataMapItem = (String, ListType, Vec<String>);

/// Result of [`get_script_typing_data_map`] containing typing data for a script.
#[derive(Debug)]
pub struct ScriptTypingDataMap {
    /// Mappings for common characters across scripts (from krama_text_arr).
    pub common_krama_map: Vec<TypingDataMapItem>,
    /// Mappings for script-specific characters (from custom_script_chars_arr).
    /// Duplicate key mappings are handled in the common_krama_map.
    pub script_specific_krama_map: Vec<TypingDataMapItem>,
}

/// Returns the typing data map for a script.
///
/// - `script` - The script/language name to get the typing data map for.
///
/// Returns the typing data map for the script, containing mappings for
/// both common characters and script-specific characters.
///
/// Returns an error if the script name is invalid or is 'Normal' (English).
pub fn get_script_typing_data_map(typing_script: Script) -> ScriptTypingDataMap {
    let typing_script: ScriptListEnum = typing_script.into();

    let script_data = ScriptData::get_script_data(&typing_script);

    /// Merges items that end up with the same displayed text (and type),
    /// and keeps mappings unique.
    fn merge_duplicate_text_mappings(items: Vec<TypingDataMapItem>) -> Vec<TypingDataMapItem> {
        let mut key_to_index: HashMap<(String, ListType), usize> = HashMap::new();
        let mut mapping_sets: Vec<HashSet<String>> = Vec::new();
        let mut out: Vec<TypingDataMapItem> = Vec::new();

        for (text, list_type, mappings) in items {
            let key = (text.clone(), list_type.clone());

            if let Some(&existing_index) = key_to_index.get(&key) {
                // Merge into existing item
                let set = &mut mapping_sets[existing_index];
                let target_mappings = &mut out[existing_index].2;
                for m in mappings {
                    if set.insert(m.clone()) {
                        target_mappings.push(m);
                    }
                }
            } else {
                // New item
                let mut set = HashSet::new();
                let mut uniq = Vec::new();
                for m in mappings {
                    if set.insert(m.clone()) {
                        uniq.push(m);
                    }
                }
                key_to_index.insert(key, out.len());
                out.push((text, list_type, uniq));
                mapping_sets.push(set);
            }
        }

        // Drop items that have no typing mappings
        out.into_iter()
            .filter(|(_, _, mappings)| !mappings.is_empty())
            .collect()
    }

    // Initialize common_krama_map from krama_text_arr
    let mut common_krama_map: Vec<TypingDataMapItem> = script_data
        .krama_text_arr
        .iter()
        .map(|(text, list_index)| {
            let list_type = list_index
                .and_then(|idx| script_data.list.get(idx as usize))
                .map(ListType::from_list)
                .unwrap_or(ListType::Anya);
            (text.clone(), list_type, Vec::new())
        })
        .collect();

    // Initialize script_specific_krama_map from custom_script_chars_arr
    let mut script_specific_krama_map: Vec<TypingDataMapItem> = script_data
        .custom_script_chars_arr
        .iter()
        .map(|(text, list_index, _)| {
            let list_type = list_index
                .and_then(|idx| script_data.list.get(idx as usize))
                .map(ListType::from_list)
                .unwrap_or(ListType::Anya);
            (text.clone(), list_type, Vec::new())
        })
        .collect();

    // A key without a krama in the typing map is read from the Normal krama (Step 2 of the
    // transliteration), the first index of its text wins
    let normal_script_data = ScriptData::get_script_data(&ScriptListEnum::Normal);
    let mut normal_krama_index: Vec<(&str, usize)> = Vec::new();
    {
        let mut seen: HashSet<&str> = HashSet::new();
        for (i, (text, _)) in normal_script_data.krama_text_arr.iter().enumerate() {
            if !text.is_empty() && seen.insert(text.as_str()) {
                normal_krama_index.push((text.as_str(), i));
            }
        }
    }
    let krama_index_of_normal_text = |text: &str| -> Option<usize> {
        normal_krama_index
            .iter()
            .find(|(t, _)| *t == text)
            .map(|(_, i)| *i)
    };
    let mut typing_map_texts: HashSet<&str> = HashSet::new();

    // Populate mappings from typing_text_to_krama_map
    for (normal_text_map, item) in &script_data.typing_text_to_krama_map {
        typing_map_texts.insert(normal_text_map.as_str());
        if normal_text_map.is_empty() {
            continue;
        }

        if item.custom_back_ref.is_none() && item.krama.as_ref().is_none_or(|k| k.is_empty()) {
            // a prefix of longer keys which is a character too (`sh` -> श, the start of `shh`)
            if let Some(krama_index) = krama_index_of_normal_text(normal_text_map)
                && let Some(entry) = common_krama_map.get_mut(krama_index)
            {
                entry.2.push(normal_text_map.clone());
            }
            continue;
        }

        if let Some(custom_back_ref) = item.custom_back_ref {
            // Add to script_specific_krama_map
            if let Some(entry) = script_specific_krama_map.get_mut(custom_back_ref as usize) {
                entry.2.push(normal_text_map.clone());
            }
        } else if let Some(ref krama) = item.krama {
            // Ignore entries with length > 1 (intermediate typing states)
            if krama.len() == 1 {
                let krama_index = krama[0];
                if krama_index >= 0
                    && let Some(entry) = common_krama_map.get_mut(krama_index as usize)
                {
                    entry.2.push(normal_text_map.clone());
                }
            }
        }
    }

    // the keys which are not in the typing map at all (`m` -> म), read by their code point
    for (text, krama_index) in &normal_krama_index {
        if typing_map_texts.contains(text) || text.chars().count() != 1 {
            continue;
        }
        if let Some(entry) = common_krama_map.get_mut(*krama_index) {
            entry.2.push(text.to_string());
        }
    }

    // Merge duplicates
    // A key whose character this script lacks falls back to an empty text (`.a1` to the
    // a1 mAtrA, which is the empty a mAtrA in Devanagari), nothing to show for it
    common_krama_map = merge_duplicate_text_mappings(common_krama_map)
        .into_iter()
        .filter(|(text, _, _)| !text.is_empty())
        .collect();
    // the context clearing `q` has no text
    script_specific_krama_map = merge_duplicate_text_mappings(script_specific_krama_map)
        .into_iter()
        .filter(|(text, _, _)| !text.is_empty())
        .collect();

    ScriptTypingDataMap {
        common_krama_map,
        script_specific_krama_map,
    }
}

/// Type alias for krama data items used in script comparison.
/// Each item is (character_text, list_type).
pub type KramaDataItem = (String, ListType);

/// Returns the krama data for a script (character + type pairs).
///
/// Used for comparing character sets between scripts. Each script's krama array
/// has a 1:1 correspondence at the same indices, making it useful for side-by-side
/// comparison of characters across Brahmic scripts.
///
/// - `script` - The script/language name to get krama data for.
///
/// Returns an error if the script name is invalid or is 'Normal' (English).
pub fn get_script_krama_data(script: Script) -> Vec<KramaDataItem> {
    let normalized: ScriptListEnum = script.into();

    let script_data = ScriptData::get_script_data(&normalized);

    script_data
        .krama_text_arr
        .iter()
        .map(|(text, list_idx)| {
            let list_type = list_idx
                .and_then(|idx| script_data.list.get(idx as usize))
                .map(ListType::from_list)
                .unwrap_or(ListType::Anya);
            (text.clone(), list_type)
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    use crate::scripts::Script;
    use crate::transliterate::helpers::VEDIC_SVARAS;
    use alloc::format;
    use hashbrown::HashMap;
    use serde::Deserialize;
    use std::fs;
    use std::fs::OpenOptions;
    use std::io::Write;
    use std::path::{Path, PathBuf};
    use std::println;
    use std::str::FromStr;

    fn assert_send_sync<T: Send + Sync>() {}

    #[test]
    fn public_typing_types_are_send_sync() {
        assert_send_sync::<TypingContext>();
        assert_send_sync::<TypingContextOptions>();
        assert_send_sync::<TypingDiff>();
        assert_send_sync::<ScriptTypingDataMap>();
    }

    /// For transliteration auto tests, `index` can be string or number in YAML.
    fn de_index<'de, D>(deserializer: D) -> Result<String, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        struct IndexVisitor;

        impl serde::de::Visitor<'_> for IndexVisitor {
            type Value = String;

            fn expecting(&self, formatter: &mut std::fmt::Formatter) -> std::fmt::Result {
                formatter.write_str("a yaml index (number or string)")
            }

            fn visit_i64<E>(self, v: i64) -> Result<Self::Value, E>
            where
                E: serde::de::Error,
            {
                Ok(v.to_string())
            }

            fn visit_u64<E>(self, v: u64) -> Result<Self::Value, E>
            where
                E: serde::de::Error,
            {
                Ok(v.to_string())
            }

            fn visit_f64<E>(self, v: f64) -> Result<Self::Value, E>
            where
                E: serde::de::Error,
            {
                Ok(v.to_string())
            }

            fn visit_str<E>(self, v: &str) -> Result<Self::Value, E>
            where
                E: serde::de::Error,
            {
                Ok(v.to_string())
            }

            fn visit_string<E>(self, v: String) -> Result<Self::Value, E>
            where
                E: serde::de::Error,
            {
                Ok(v)
            }
        }

        deserializer.deserialize_any(IndexVisitor)
    }

    /// Schema matching transliteration YAML test data used in emulate-typing tests.
    #[derive(Debug, Deserialize)]
    struct TransliterationTestCase {
        #[serde(deserialize_with = "de_index")]
        #[allow(dead_code)]
        index: String,
        from: String,
        to: String,
        input: String,
        output: String,
        #[serde(default)]
        #[allow(dead_code)]
        options: Option<HashMap<String, bool>>,
        #[serde(default)]
        #[allow(dead_code)]
        reversible: Option<bool>,
        #[serde(default)]
        todo: Option<bool>,
    }

    fn transliteration_test_data_root() -> PathBuf {
        // `packages/rust` -> `../../test_data/transliteration`
        let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        manifest_dir
            .join("..")
            .join("..")
            .join("test_data")
            .join("transliteration")
    }

    #[test]
    fn emulate_typing_auto_transliteration_yaml() {
        use serde_yaml_ng as yaml;

        let root = transliteration_test_data_root();
        let input_dirs = [root.join("auto-nor-brahmic"), root.join("auto-nor-other")];

        // Basic reporting counters
        let mut total_emulations: usize = 0;
        let mut auto_vedic_skipped: usize = 0;

        for folder in &input_dirs {
            let entries = fs::read_dir(folder).unwrap_or_else(|e| {
                panic!("Failed listing YAML files in `{}`: {e}", folder.display())
            });

            for entry in entries {
                let entry = entry.expect("Failed to read directory entry");
                let path = entry.path();
                if path.extension().and_then(|e| e.to_str()) != Some("yaml") {
                    continue;
                }

                let yaml_text = fs::read_to_string(&path).unwrap_or_else(|e| {
                    panic!("Failed reading YAML file `{}`: {e}", path.display())
                });
                let cases: Vec<TransliterationTestCase> = yaml::from_str(&yaml_text)
                    .unwrap_or_else(|e| {
                        panic!("Failed parsing YAML file `{}`: {e}", path.display())
                    });

                let file_name = path
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("<unknown>")
                    .to_string();

                for case in cases {
                    if case.todo.unwrap_or(false) {
                        continue;
                    }
                    if case.from != "Normal" || case.to == "Normal" {
                        continue;
                    }

                    let input = &case.input;
                    total_emulations += 1;
                    let to_script = Script::from_str(case.to.as_str()).unwrap_or_else(|e| {
                        panic!("invalid script {:?} in {}: {e}", case.to, path.display())
                    });
                    let result = emulate_typing(input, to_script, None);

                    let error_message = format!(
                        "Emulate Typing failed:\n  From: {}\n  To: {}\n  Input: \"{}\"\n  Expected: \"{}\"\n  Actual: \"{}\"",
                        case.from, case.to, case.input, case.output, result
                    );

                    if file_name.starts_with("auto")
                        && case.to == "Tamil-Extended"
                        && VEDIC_SVARAS.iter().any(|sv| result.contains(*sv))
                    {
                        auto_vedic_skipped += 1;
                        continue;
                    }

                    assert_eq!(result, case.output, "{}", error_message);
                }
            }
        }

        let passed = total_emulations.saturating_sub(auto_vedic_skipped);
        let summary = format!(
            "Emulate Typing (auto transliteration): total_emulations={}, auto_vedic_skipped={}, passed={}",
            total_emulations, auto_vedic_skipped, passed
        );
        println!("{}", summary);

        // Also write summary to a log file so it's visible even when tests succeed.
        let _ = std::fs::create_dir_all("test_log");
        if let Ok(mut file) = OpenOptions::new()
            .create(true)
            .write(true)
            .truncate(true)
            .open("test_log/typing_auto_emulate_log.txt")
        {
            let _ = writeln!(file, "{}", summary);
        }
    }

    /// Typed view of typing options from YAML.
    #[derive(Debug, Deserialize, Default)]
    struct TypingOptionsYaml {
        #[serde(rename = "useNativeNumerals")]
        #[serde(default)]
        use_native_numerals: Option<bool>,

        #[serde(rename = "includeInherentVowel")]
        #[serde(default)]
        include_inherent_vowel: Option<bool>,

        #[serde(rename = "autoContextTClearTimeMs")]
        #[serde(default)]
        auto_context_clear_time_ms: Option<u64>,
    }

    /// Schema for typing-mode YAML tests (`test_data/typing`).
    #[derive(Debug, Deserialize)]
    struct TypingTestCase {
        index: i64,
        text: String,
        output: String,
        script: String,
        #[serde(default)]
        preserve_check: bool,
        #[serde(default)]
        todo: bool,
        #[serde(default)]
        options: Option<TypingOptionsYaml>,
    }

    fn typing_test_data_root() -> PathBuf {
        // `packages/rust` -> `../../test_data/typing`
        let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        manifest_dir
            .join("..")
            .join("..")
            .join("test_data")
            .join("typing")
    }

    fn list_yaml_files_typing(dir: &Path, out: &mut Vec<PathBuf>) -> std::io::Result<()> {
        for entry in fs::read_dir(dir)? {
            let entry = entry?;
            let path = entry.path();
            if path.is_dir() {
                if path
                    .file_name()
                    .and_then(|n| n.to_str())
                    .is_some_and(|n| n == "context")
                {
                    continue;
                }
                list_yaml_files_typing(&path, out)?;
            } else if path.extension().and_then(|e| e.to_str()) == Some("yaml") {
                out.push(path);
            }
        }
        Ok(())
    }

    fn build_typing_options(opts: &Option<TypingOptionsYaml>) -> Option<TypingContextOptions> {
        let some_opts = opts.as_ref()?;

        let mut rust_opts = TypingContextOptions::default();
        if let Some(v) = some_opts.use_native_numerals {
            rust_opts.use_native_numerals = v;
        }
        if let Some(v) = some_opts.include_inherent_vowel {
            rust_opts.include_inherent_vowel = v;
        }
        if let Some(v) = some_opts.auto_context_clear_time_ms {
            rust_opts.auto_context_clear_time_ms = v;
        }

        Some(rust_opts)
    }

    #[test]
    fn typing_mode_yaml_tests() {
        use serde_yaml_ng as yaml;

        let root = typing_test_data_root();
        let mut files: Vec<PathBuf> = Vec::new();
        list_yaml_files_typing(&root, &mut files)
            .unwrap_or_else(|e| panic!("Failed listing YAML files in `{}`: {e}", root.display()));
        files.sort();

        assert!(
            !files.is_empty(),
            "No YAML typing test files found in `{}`",
            root.display()
        );

        // Basic reporting counters
        let mut total_emulations: usize = 0;
        let mut preserve_checks: usize = 0;

        for file in files {
            let yaml_text = fs::read_to_string(&file)
                .unwrap_or_else(|e| panic!("Failed reading YAML file `{}`: {e}", file.display()));
            let cases: Vec<TypingTestCase> = yaml::from_str(&yaml_text)
                .unwrap_or_else(|e| panic!("Failed parsing YAML file `{}`: {e}", file.display()));

            for case in cases {
                if case.todo {
                    continue;
                }

                let opts = build_typing_options(&case.options);
                let script = Script::from_str(case.script.as_str()).unwrap_or_else(|e| {
                    panic!(
                        "invalid script {:?} in `{}` index {}: {e}",
                        case.script,
                        file.display(),
                        case.index
                    )
                });
                total_emulations += 1;
                let result = emulate_typing(&case.text, script, opts.clone());

                assert_eq!(
                    result,
                    case.output,
                    "Typing Mode failed in `{}` index {} (script {}): input {:?}",
                    file.display(),
                    case.index,
                    case.script,
                    case.text
                );

                if case.preserve_check {
                    preserve_checks += 1;
                    // Transliterate back to Normal with `all_to_normal:preserve_specific_chars`
                    let mut trans_options = CustomOptions::default();
                    trans_options
                        .try_set("all_to_normal:preserve_specific_chars", true)
                        .unwrap();

                    let preserved =
                        crate::transliterate(&result, script, Script::Normal, Some(&trans_options));

                    assert_eq!(
                        preserved,
                        case.text,
                        "Preserve check failed in `{}` index {} (script {}): input {:?}",
                        file.display(),
                        case.index,
                        case.script,
                        case.text
                    );
                }
            }
        }

        let summary = format!(
            "Typing Mode: total_emulations={}, preserve_checks={}, passed={}",
            total_emulations, preserve_checks, total_emulations
        );
        println!("{}", summary);

        // Also write summary to a log file so it's visible even when tests succeed.
        let _ = std::fs::create_dir_all("test_log");
        if let Ok(mut file) = OpenOptions::new()
            .create(true)
            .write(true)
            .truncate(true)
            .open("test_log/typing_mode_log.txt")
        {
            let _ = writeln!(file, "{}", summary);
        }
    }

    #[test]
    fn empty_key_does_not_change_the_context() {
        let mut ctx = TypingContext::new(Script::Devanagari, None);
        assert_eq!(ctx.take_key_input("k").context_length, 1);
        ctx.update_include_inherent_vowel(true);
        // the option change applies to the next key, the empty key does not re-render
        assert_eq!(
            ctx.take_key_input(""),
            TypingDiff {
                to_delete_chars_count: 0,
                diff_add_text: String::new(),
                context_length: 1,
            }
        );
        let diff = ctx.take_key_input("a");
        assert_eq!(
            (diff.to_delete_chars_count, diff.diff_add_text.as_str()),
            (1, "")
        );
    }

    #[cfg(feature = "std")]
    #[test]
    fn auto_context_clear_time_zero_clears_after_any_pause() {
        let mut ctx = TypingContext::new(
            Script::Devanagari,
            Some(TypingContextOptions {
                auto_context_clear_time_ms: 0,
                ..Default::default()
            }),
        );
        ctx.take_key_input("k");
        std::thread::sleep(core::time::Duration::from_millis(2));
        let diff = ctx.take_key_input("a");
        assert_eq!(
            (diff.to_delete_chars_count, diff.diff_add_text.as_str()),
            (0, "अ")
        );
    }

    /// Typing a long text without a space keeps it all as context, the result has to be the
    /// same as typing it in shorter words
    #[test]
    fn long_text_without_context_break() {
        let mut ctx = TypingContext::new(Script::Devanagari, None);
        let mut result = String::new();
        let start = std::time::Instant::now();
        for ch in "ka".repeat(10_000).chars() {
            let diff = ctx.take_key_input_char(ch);
            for _ in 0..diff.to_delete_chars_count {
                result.pop();
            }
            result.push_str(&diff.diff_add_text);
        }
        assert_eq!(result, "क".repeat(10_000));
        // took ~4 s (release) when each key re-transliterated the whole run, now ~0.05 s
        let elapsed = start.elapsed();
        assert!(
            elapsed.as_secs_f64() < 2.0,
            "typing 20000 keys took {elapsed:?}"
        );
    }

    /// With the inherent vowel, the start of a run of consonants (क्क्क) on its own lost its
    /// last halant (क्क), so the context was never committed and each key took longer
    #[test]
    fn long_consonant_run_with_inherent_vowel() {
        let mut ctx = TypingContext::new(
            Script::Devanagari,
            Some(TypingContextOptions {
                include_inherent_vowel: true,
                ..Default::default()
            }),
        );
        let mut result = String::new();
        let start = std::time::Instant::now();
        for _ in 0..20_000 {
            let diff = ctx.take_key_input_char('k');
            for _ in 0..diff.to_delete_chars_count {
                result.pop();
            }
            result.push_str(&diff.diff_add_text);
        }
        assert_eq!(result, "क्".repeat(19_999) + "क");
        // took ~6 s (release) when the context was never committed
        let elapsed = start.elapsed();
        assert!(
            elapsed.as_secs_f64() < 2.0,
            "typing 20000 keys took {elapsed:?}"
        );
    }

    #[test]
    fn test_get_script_typing_data_map_valid_script() {
        let data = get_script_typing_data_map(Script::Devanagari);

        assert!(!data.common_krama_map.is_empty());

        for (text, _list_type, _mappings) in &data.common_krama_map {
            assert!(!text.is_empty());
        }
    }

    #[test]
    fn typing_data_map_shows_keys_read_from_the_normal_krama() {
        let data = get_script_typing_data_map(Script::Devanagari);
        let keys_of = |text: &str| -> Vec<String> {
            data.common_krama_map
                .iter()
                .filter(|item| item.0 == text)
                .flat_map(|item| item.2.clone())
                .collect()
        };
        assert_eq!(keys_of("म"), ["m"]);
        assert_eq!(keys_of("ङ"), ["G"]);
        assert_eq!(keys_of("ः"), ["H"]);
        assert!(keys_of("श").contains(&"sh".to_string()));
        let v = keys_of("व");
        assert!(
            v.contains(&"v".to_string()) && v.contains(&"w".to_string()),
            "{v:?}"
        );
        let zero = keys_of("०");
        assert!(
            zero.contains(&"0".to_string()) && zero.contains(&".0".to_string()),
            "{zero:?}"
        );
        assert_eq!(keys_of("य़"), ["yz"]);
        assert_eq!(keys_of("ऍ"), ["aiI"]);
        assert_eq!(keys_of("ै"), [".ai"]);
    }

    /// `x` types क्ष (k, halant, Sh), it was not listed as only the keys of a single krama were (#186)
    #[test]
    fn typing_data_map_lists_the_x_conjunct() {
        for (script, text) in [
            (Script::Devanagari, "क्ष"),
            (Script::Telugu, "క్ష"),
            (Script::Brahmi, "𑀓𑁆𑀱"),
            (Script::Romanized, "kṣ"),
        ] {
            let data = get_script_typing_data_map(script);
            let item = data
                .common_krama_map
                .iter()
                .find(|item| item.2.iter().any(|key| key == "x"));
            assert_eq!(
                item,
                Some(&(text.to_string(), ListType::Vyanjana, vec!["x".to_string()])),
                "{script:?}"
            );
        }
    }

    #[test]
    fn typing_data_map_has_no_item_without_text() {
        for script in [Script::Devanagari, Script::Tamil, Script::Romanized] {
            let data = get_script_typing_data_map(script);
            for item in data
                .common_krama_map
                .iter()
                .chain(&data.script_specific_krama_map)
            {
                assert!(!item.0.is_empty(), "{item:?}");
            }
        }
    }

    #[test]
    fn test_get_script_typing_data_map_normalized_names() {
        let _ = get_script_typing_data_map(Script::from_str("dev").unwrap());
    }

    #[test]
    fn test_get_script_typing_data_map_mappings_populated() {
        let data = get_script_typing_data_map(Script::Telugu);

        let has_mappings = data.common_krama_map.iter().any(|item| !item.2.is_empty());

        assert!(
            has_mappings,
            "Expected at least some characters to have typing mappings"
        );
    }
}
