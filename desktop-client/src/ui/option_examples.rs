//! Real examples of the two typing options in a script, made by typing with each setting (a
//! port of the web app's `typing_help/option_examples.ts`).

use lipilekhika::typing::{TypingContext, TypingContextOptions};
use lipilekhika::{Script, ScriptListEnum};
use std::str::FromStr;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct OptionExample {
  pub off: String,
  pub on: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct TypingOptionExamples {
  /// what typing `k` gives without / with the inherent vowel
  pub vowel: Option<OptionExample>,
  /// what typing `1` gives without / with native numerals
  pub numerals: Option<OptionExample>,
}

fn type_keys(script: Script, keys: &str, inherent_vowel: bool, native_numerals: bool) -> String {
  let mut ctx = TypingContext::new(
    script,
    Some(TypingContextOptions {
      auto_context_clear_time_ms: 0,
      use_native_numerals: native_numerals,
      include_inherent_vowel: inherent_vowel,
    }),
  );
  let mut out: Vec<char> = vec![];
  for key in keys.chars() {
    let diff = ctx.take_key_input_char(key);
    out.truncate(out.len().saturating_sub(diff.to_delete_chars_count));
    out.extend(diff.diff_add_text.chars());
  }
  out.into_iter().collect()
}

/// An option that makes no difference in the script (as in the Latin ones) is `None`
pub fn typing_option_examples(script: ScriptListEnum) -> TypingOptionExamples {
  let Ok(script) = Script::from_str(script.as_ref()) else {
    return TypingOptionExamples::default();
  };
  let example = |off: String, on: String| (off != on).then_some(OptionExample { off, on });
  TypingOptionExamples {
    vowel: example(
      type_keys(script, "k", false, true),
      type_keys(script, "k", true, true),
    ),
    numerals: example(
      type_keys(script, "1", false, false),
      type_keys(script, "1", false, true),
    ),
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn devanagari_examples() {
    let e = typing_option_examples(ScriptListEnum::Devanagari);
    assert_eq!(
      e.vowel,
      Some(OptionExample {
        off: "क्".into(),
        on: "क".into()
      })
    );
    assert_eq!(
      e.numerals,
      Some(OptionExample {
        off: "1".into(),
        on: "१".into()
      })
    );
  }

  #[test]
  fn latin_has_none() {
    let e = typing_option_examples(ScriptListEnum::Romanized);
    assert_eq!(e.vowel, None);
  }
}
