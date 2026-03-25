use napi::bindgen_prelude::Result;
use napi::Error;
use napi_derive::napi;
use std::collections::HashMap;

#[napi(object)]
pub struct TypingContextOptionsInput {
  pub auto_context_clear_time_ms: Option<u32>,
  pub use_native_numerals: Option<bool>,
  pub include_inherent_vowel: Option<bool>,
}

#[napi(object)]
pub struct TypingDiffOutput {
  pub to_delete_chars_count: u32,
  pub diff_add_text: String,
  pub context_length: u32,
}

#[napi]
pub struct NativeTypingContext {
  inner: lipilekhika::typing::TypingContext,
}

#[napi]
pub fn transliterate(
  text: String,
  from: String,
  to: String,
  trans_options: Option<HashMap<String, bool>>,
) -> Result<String> {
  lipilekhika::transliterate(&text, &from, &to, trans_options.as_ref()).map_err(Error::from_reason)
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

    let inner = lipilekhika::typing::TypingContext::new(&typing_lang, typing_options)
      .map_err(Error::from_reason)?;

    Ok(Self { inner })
  }

  #[napi]
  pub fn clear_context(&mut self) {
    self.inner.clear_context();
  }

  #[napi]
  pub fn take_key_input(&mut self, key: String) -> Result<TypingDiffOutput> {
    let diff = self.inner.take_key_input(&key).map_err(Error::from_reason)?;
    Ok(TypingDiffOutput {
      to_delete_chars_count: diff.to_delete_chars_count as u32,
      diff_add_text: diff.diff_add_text,
      context_length: diff.context_length as u32,
    })
  }

  #[napi]
  pub fn update_use_native_numerals(&mut self, use_native_numerals: bool) {
    self.inner.update_use_native_numerals(use_native_numerals);
  }

  #[napi]
  pub fn update_include_inherent_vowel(&mut self, include_inherent_vowel: bool) {
    self.inner
      .update_include_inherent_vowel(include_inherent_vowel);
  }

  #[napi]
  pub fn get_use_native_numerals(&self) -> bool {
    self.inner.get_use_native_numerals()
  }

  #[napi]
  pub fn get_include_inherent_vowel(&self) -> bool {
    self.inner.get_include_inherent_vowel()
  }

  #[napi]
  pub fn get_normalized_script(&self) -> String {
    self.inner.get_normalized_script()
  }
}
