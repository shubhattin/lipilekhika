//! Realtime typing in a text box: each key goes through a [`TypingContext`] and the text right
//! before the caret is replaced with its result, the same as `handleTypingBeforeInputEvent` of
//! the JS package (`packages/js/src/typing.ts`).
//!
//! This is kept apart from GPUI: it works on the text, the selection (UTF-8 byte offsets) and a
//! key, and returns the edit to make, so it can be tested on its own.

use lipilekhika::typing::{
  DEFAULT_AUTO_CONTEXT_CLEAR_TIME_MS, TypingContext, TypingContextOptions,
};
use lipilekhika::{Script, ScriptListEnum};
use std::ops::Range;
use std::str::FromStr;

/// The edit a key makes: replace `range` (UTF-8 bytes of the text) with `text`
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Edit {
  pub range: Range<usize>,
  pub text: String,
  /// where the caret is after the edit
  pub caret: usize,
}

impl Edit {
  /// The text after the edit
  pub fn apply(&self, text: &str) -> String {
    let mut out = String::with_capacity(text.len() + self.text.len());
    out.push_str(&text[..self.range.start]);
    out.push_str(&self.text);
    out.push_str(&text[self.range.end..]);
    out
  }
}

pub struct LiveTyping {
  ctx: TypingContext,
  script: ScriptListEnum,
  /// The caret and the text length right after the last key: the context only continues while
  /// the text before the caret is still what it typed
  anchor: Option<(usize, usize)>,
}

fn script_of(script: ScriptListEnum) -> Script {
  Script::from_str(script.as_ref()).unwrap_or(Script::Devanagari)
}

impl LiveTyping {
  pub fn new(
    script: ScriptListEnum,
    use_native_numerals: bool,
    include_inherent_vowel: bool,
  ) -> Self {
    Self {
      ctx: TypingContext::new(
        script_of(script),
        Some(TypingContextOptions {
          auto_context_clear_time_ms: DEFAULT_AUTO_CONTEXT_CLEAR_TIME_MS,
          use_native_numerals,
          include_inherent_vowel,
        }),
      ),
      script,
      anchor: None,
    }
  }

  pub fn set_script(&mut self, script: ScriptListEnum) {
    if script != self.script {
      let (n, v) = (
        self.ctx.get_use_native_numerals(),
        self.ctx.get_include_inherent_vowel(),
      );
      *self = Self::new(script, n, v);
    }
  }

  pub fn set_use_native_numerals(&mut self, on: bool) {
    self.ctx.update_use_native_numerals(on);
  }

  pub fn set_include_inherent_vowel(&mut self, on: bool) {
    self.ctx.update_include_inherent_vowel(on);
  }

  /// Forgets the keys typed so far: the next key starts afresh
  pub fn clear(&mut self) {
    self.ctx.clear_context();
    self.anchor = None;
  }

  /// Whether a key typed with this script goes through the typing (`Normal` types as it is)
  pub fn is_active(&self) -> bool {
    self.script != ScriptListEnum::Normal
  }

  /// The edit typing `key` makes in `text` with `selection` (UTF-8 byte offsets)
  pub fn key(&mut self, text: &str, selection: Range<usize>, key: char) -> Edit {
    let (start, end) = (
      selection.start.min(selection.end),
      selection.start.max(selection.end),
    );
    // typing over a selection, or somewhere else than where the last key left the caret, starts
    // a new context: the text before the caret is not what the context holds
    if start != end || self.anchor != Some((end, text.len())) {
      self.ctx.clear_context();
    }
    let diff = self.ctx.take_key_input_char(key);

    // the selection goes first, then the context's text before it
    let mut replace_start = start;
    if start == end {
      let before = &text[..start];
      let mut chars = before.char_indices().rev();
      for _ in 0..diff.to_delete_chars_count {
        match chars.next() {
          Some((i, _)) => replace_start = i,
          None => {
            replace_start = 0;
            break;
          }
        }
      }
    }
    let edit = Edit {
      range: replace_start..end,
      caret: replace_start + diff.diff_add_text.len(),
      text: diff.diff_add_text,
    };
    let new_len = text.len() - (edit.range.end - edit.range.start) + edit.text.len();
    self.anchor = Some((edit.caret, new_len));
    edit
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  fn type_str(lt: &mut LiveTyping, text: &mut String, caret: &mut usize, keys: &str) {
    for key in keys.chars() {
      let edit = lt.key(text, *caret..*caret, key);
      *text = edit.apply(text);
      *caret = edit.caret;
    }
  }

  #[test]
  fn types_devanagari() {
    let mut lt = LiveTyping::new(ScriptListEnum::Devanagari, true, false);
    let (mut text, mut caret) = (String::new(), 0);
    type_str(&mut lt, &mut text, &mut caret, "namaste");
    assert_eq!(text, "नमस्ते");
    assert_eq!(caret, text.len());
  }

  #[test]
  fn types_in_the_middle() {
    let mut lt = LiveTyping::new(ScriptListEnum::Devanagari, true, false);
    let mut text = String::from("[]");
    let mut caret = 1;
    type_str(&mut lt, &mut text, &mut caret, "rAma");
    assert_eq!(text, "[राम]");
  }

  #[test]
  fn moved_caret_starts_new_context() {
    let mut lt = LiveTyping::new(ScriptListEnum::Devanagari, true, false);
    let (mut text, mut caret) = (String::new(), 0);
    type_str(&mut lt, &mut text, &mut caret, "k");
    assert_eq!(text, "क्");
    // the caret goes to the start: `a` is a new अ there, not the क's vowel
    caret = 0;
    type_str(&mut lt, &mut text, &mut caret, "a");
    assert_eq!(text, "अक्");
  }

  #[test]
  fn typing_over_a_selection() {
    let mut lt = LiveTyping::new(ScriptListEnum::Devanagari, true, false);
    let text = String::from("abc");
    let edit = lt.key(&text, 0..2, 'k');
    assert_eq!(edit.apply(&text), "क्c");
  }

  #[test]
  fn brahmi_outside_bmp() {
    let mut lt = LiveTyping::new(ScriptListEnum::Brahmi, true, false);
    let (mut text, mut caret) = (String::new(), 0);
    type_str(&mut lt, &mut text, &mut caret, "kA");
    assert_eq!(text, "𑀓𑀸");
  }
}
