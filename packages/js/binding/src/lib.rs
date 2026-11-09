use lipilekhika::scripts::Script;
use napi::Error;
use napi::bindgen_prelude::Result;
use napi_derive::napi;
use std::collections::HashMap;
use std::str::FromStr;

#[napi(object)]
pub struct TypingContextOptionsInput {
    #[napi(js_name = "auto_context_clear_time_ms")]
    pub auto_context_clear_time_ms: Option<u32>,
    #[napi(js_name = "use_native_numerals")]
    pub use_native_numerals: Option<bool>,
    #[napi(js_name = "include_inherent_vowel")]
    pub include_inherent_vowel: Option<bool>,
}

#[napi(object)]
pub struct TypingDiffOutput {
    /// In UTF-16 code units (like JS `string.length`), not code points as in the Rust crate
    #[napi(js_name = "to_delete_chars_count")]
    pub to_delete_chars_count: u32,
    #[napi(js_name = "diff_add_text")]
    pub diff_add_text: String,
    #[napi(js_name = "context_length")]
    pub context_length: u32,
}

#[napi]
pub struct NativeTypingContext {
    inner: lipilekhika::typing::TypingContext,
    /// The diffs applied since the context last returned `context_length` 0 for a key or was cleared (a
    /// time based clear inside the context keeps the older text in front). The context's own
    /// output is always a suffix of it, so its last `to_delete_chars_count` chars are the ones
    /// being deleted, which gives their length in UTF-16 code units.
    output: String,
}

/// Removes the last `count` chars of `text`, returning their length in UTF-16 code units.
fn truncate_last_chars_utf16(text: &mut String, count: usize) -> usize {
    let mut utf16_len = 0;
    for _ in 0..count {
        match text.pop() {
            Some(ch) => utf16_len += ch.len_utf16(),
            None => break,
        }
    }
    utf16_len
}

#[napi]
pub fn transliterate(
    text: String,
    from: String,
    to: String,
    trans_options: Option<HashMap<String, bool>>,
) -> Result<String> {
    let from_script = Script::from_str(from.trim())
        .map_err(|e| Error::from_reason(format!("invalid from script: {e}")))?;
    let to_script = Script::from_str(to.trim())
        .map_err(|e| Error::from_reason(format!("invalid to script: {e}")))?;

    let trans_options = trans_options
        .map(lipilekhika::CustomOptions::try_from_map)
        .transpose()
        .map_err(|_| Error::from_reason("trans_options contains an unknown option key"))?;

    Ok(
        lipilekhika::transliterate(&text, from_script, to_script, trans_options.as_ref())
            .into_owned(),
    )
}

#[napi]
impl NativeTypingContext {
    #[napi(constructor)]
    pub fn new(typing_lang: String, options: Option<TypingContextOptionsInput>) -> Result<Self> {
        let typing_options = options.map(|opts| lipilekhika::typing::TypingContextOptions {
            auto_context_clear_time_ms: opts
                .auto_context_clear_time_ms
                .map(u64::from)
                .unwrap_or(lipilekhika::typing::DEFAULT_AUTO_CONTEXT_CLEAR_TIME_MS),
            use_native_numerals: opts
                .use_native_numerals
                .unwrap_or(lipilekhika::typing::DEFAULT_USE_NATIVE_NUMERALS),
            include_inherent_vowel: opts
                .include_inherent_vowel
                .unwrap_or(lipilekhika::typing::DEFAULT_INCLUDE_INHERENT_VOWEL),
        });

        let typing_script = Script::from_str(typing_lang.trim()).map_err(|e| {
            Error::from_reason(format!("invalid typing_lang script {typing_lang:?}: {e}"))
        })?;

        let inner = lipilekhika::typing::TypingContext::new(typing_script, typing_options);

        Ok(Self {
            inner,
            output: String::new(),
        })
    }

    #[napi(js_name = "clear_context")]
    pub fn clear_context(&mut self) {
        self.inner.clear_context();
        self.output.clear();
    }

    #[napi(js_name = "take_key_input")]
    pub fn take_key_input(&mut self, key: String) -> Result<TypingDiffOutput> {
        let diff = self.inner.take_key_input(&key);
        // the Rust count is in code points, JS slices strings in UTF-16 code units
        let to_delete_utf16_count =
            truncate_last_chars_utf16(&mut self.output, diff.to_delete_chars_count);
        if key.is_empty() {
            // an empty key changes nothing in the context
        } else if diff.context_length > 0 {
            self.output.push_str(&diff.diff_add_text);
        } else {
            // the context was cleared
            self.output.clear();
        }
        Ok(TypingDiffOutput {
            to_delete_chars_count: u32::try_from(to_delete_utf16_count)
                .map_err(|_| Error::from_reason("to_delete_chars_count exceeds u32 range"))?,
            diff_add_text: diff.diff_add_text,
            context_length: u32::try_from(diff.context_length)
                .map_err(|_| Error::from_reason("context_length exceeds u32 range"))?,
        })
    }

    #[napi(js_name = "update_use_native_numerals")]
    pub fn update_use_native_numerals(&mut self, use_native_numerals: bool) {
        self.inner.update_use_native_numerals(use_native_numerals);
    }

    #[napi(js_name = "update_include_inherent_vowel")]
    pub fn update_include_inherent_vowel(&mut self, include_inherent_vowel: bool) {
        self.inner
            .update_include_inherent_vowel(include_inherent_vowel);
    }

    #[napi(js_name = "get_use_native_numerals")]
    pub fn get_use_native_numerals(&self) -> bool {
        self.inner.get_use_native_numerals()
    }

    #[napi(js_name = "get_include_inherent_vowel")]
    pub fn get_include_inherent_vowel(&self) -> bool {
        self.inner.get_include_inherent_vowel()
    }

    #[napi(js_name = "get_normalized_script")]
    pub fn get_normalized_script(&self) -> String {
        self.inner.get_normalized_script().to_string()
    }
}
