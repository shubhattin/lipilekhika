use crate::script_data::{List, ScriptData};
use std::borrow::Cow;
use std::collections::VecDeque;

// pub fn krama_index_of_text()

impl ScriptData {
  #[allow(dead_code)]
  pub fn krama_text_or_null(&self, idx: i16) -> Option<&str> {
    if idx < 0 {
      return None;
    }
    self
      .get_common_attr()
      .krama_text_arr
      .get(idx as usize)
      .map(|item| item.0.as_str())
  }

  pub fn krama_text_or_empty(&self, idx: i16) -> &str {
    if idx < 0 {
      return "";
    }
    self
      .get_common_attr()
      .krama_text_arr
      .get(idx as usize)
      .map(|item| item.0.as_str())
      .unwrap_or("")
  }

  pub fn krama_index_of_text(&self, text: &str) -> Option<usize> {
    self.get_common_attr().krama_text_lookup.get(text).copied()
  }
}

/// custom struct to construct output string
pub struct ResultStringBuilder {
  result: Vec<String>,
}

impl ResultStringBuilder {
  pub fn new() -> Self {
    ResultStringBuilder { result: Vec::new() }
  }
  pub fn emit(&mut self, text: impl Into<String>) {
    // Into<String> to have more wide support for &str and  Cow<&str>
    let text = text.into();
    if text.is_empty() {
      return;
    }
    self.result.push(text);
  }
  /// Emit a single character without heap-allocating a String.
  pub fn emit_char(&mut self, c: char) {
    let mut buf = [0u8; 4];
    let s = c.encode_utf8(&mut buf);
    self.result.push(s.to_owned());
  }
  pub fn emit_pieces(&mut self, pieces: &[impl AsRef<str>]) {
    for p in pieces {
      self.emit(p.as_ref());
    }
  }
  pub fn last_piece(&self) -> Option<&str> {
    self.result.last().map(String::as_str)
  }
  pub fn last_char(&self) -> Option<char> {
    self.result.last().and_then(|v| v.chars().last())
  }
  pub fn pop_last_char(&mut self) -> Option<char> {
    let lp = self.result.last_mut()?;
    if lp.is_empty() {
      // handling the panic case
      return None;
    }
    lp.pop()
  }
  pub fn rewrite_tail_pieces<S: AsRef<str>>(&mut self, count: usize, new_pieces: &[S]) {
    let len = self.result.len();
    let start = len.saturating_sub(count); // -count but safe
    self.result.truncate(start);
    for p in new_pieces {
      let p = p.as_ref();
      if !p.is_empty() {
        self.result.push(p.to_owned());
      }
    }
  }

  pub fn with_last_char_moved_after<S: AsRef<str>, T: AsRef<str>>(
    &mut self,
    before_pieces: &[S],
    after_pieces: &[T],
  ) {
    let ch = self.pop_last_char();
    match ch {
      None => {
        self.emit_pieces(before_pieces);
        self.emit_pieces(after_pieces);
      }
      Some(c) => {
        self.emit_pieces(before_pieces);
        self.emit_char(c);
        self.emit_pieces(after_pieces);
      }
    }
  }

  /// index can be -ve
  pub fn peek_at(&self, index: isize) -> Option<&str> {
    // ^ no need for a specific cursor return type over here
    let len = self.result.len() as isize;
    if len == 0 {
      return None;
    }

    let mut i = index;
    if i < 0 {
      // handle negative indexes
      i = len + i;
    }
    if i < 0 || i >= len {
      return None;
    }

    self.result.get(i as usize).map(String::as_str)
  }

  pub fn rewrite_at(&mut self, index: isize, new_piece: String) {
    let len = self.result.len() as isize;
    if len == 0 {
      return;
    }

    let mut i = index;
    if i < 0 {
      i = len + i;
    }
    if i < 0 || i >= len {
      return;
    }

    self.result[i as usize] = new_piece;
  }

  pub fn to_string(&self) -> String {
    self.result.concat()
  }
}

pub(crate) type PrevContextItem<'a> = (Option<Cow<'a, str>>, Option<Cow<'a, List>>);

pub struct PrevContextBuilder<'a> {
  arr: VecDeque<PrevContextItem<'a>>,
  max_len: usize,
}

impl<'a> PrevContextBuilder<'a> {
  pub fn new(max_len: usize) -> PrevContextBuilder<'a> {
    PrevContextBuilder {
      arr: VecDeque::new(),
      max_len,
    }
  }

  pub fn clear(&mut self) {
    self.arr.clear();
  }

  pub fn length(&self) -> usize {
    self.arr.len()
  }

  /// resolves negative index for the `arr`
  fn resolve_arr_index(&self, i: isize) -> Option<usize> {
    if self.arr.is_empty() {
      return None;
    }
    let len = self.arr.len() as isize;
    let mut idx = i;
    if idx < 0 {
      idx = len + idx;
    }
    if idx < 0 || idx >= len {
      None
    } else {
      Some(idx as usize)
    }
  }

  pub fn at(&self, i: isize) -> Option<&PrevContextItem<'a>> {
    match self.resolve_arr_index(i) {
      None => None,
      Some(idx) => self.arr.get(idx),
    }
  }

  pub fn last(&self) -> Option<&PrevContextItem<'a>> {
    self.arr.back()
  }
  #[allow(dead_code)]
  pub fn last_text(&self) -> Option<&str> {
    self.last().and_then(|(text_opt, _)| text_opt.as_deref())
  }
  pub fn last_type(&self) -> Option<&List> {
    self.last().and_then(|(_, list_opt)| list_opt.as_deref())
  }

  pub fn type_at(&self, i: isize) -> Option<&List> {
    self.at(i).and_then(|(_, list_opt)| list_opt.as_deref())
  }

  /// Text at a given index (supports -ve indices).
  pub fn text_at(&self, i: isize) -> Option<&str> {
    self.at(i).and_then(|(text_opt, _)| text_opt.as_deref())
  }

  /// Check if the last context item has the given type.
  #[allow(dead_code)]
  pub fn is_last_type(&self, t: &List) -> bool {
    self.last_type() == Some(t)
  }

  /// Push a new context item, enforcing `max_len` and skipping empty/None text.
  pub fn push(&mut self, item: PrevContextItem<'a>) {
    if !item.0.as_ref().is_some_and(|s| !s.is_empty()) {
      return;
    }
    self.arr.push_back(item);
    if self.arr.len() > self.max_len {
      self.arr.pop_front();
    }
  }
}

pub struct InputTextCursor<'a> {
  /// Pre-computed character table with byte offsets for O(1) indexed access.
  chars: Vec<(char, usize)>,
  text: &'a str,
  pos: usize,
}

// pub struct InputCursor {
//   pub ch: String,
//   // no cp(codepoint) or width needed here in rust
// }
// ^ No need for InputCursor here in the rust implementation

impl<'a> InputTextCursor<'a> {
  pub fn new(text: &'a str) -> InputTextCursor<'a> {
    let mut chars = Vec::with_capacity(text.len() + 1); // text.len() is an upper bound for char count

    for (byte_idx, ch) in text.char_indices() {
      chars.push((ch, byte_idx));
    }
    chars.push(('\0', text.len()));
    // ^ needed for the last character to be accessible via the `peek_at` method
    // stores the char offsets

    InputTextCursor {
      text,
      chars,
      pos: 0,
    }
  }

  pub fn pos(&self) -> usize {
    self.pos
  }

  pub fn char_count(&self) -> usize {
    self.chars.len().saturating_sub(1)
  }

  /// Returns the character at the given index without heap allocation.
  pub fn peek_at(&self, index_units: usize) -> Option<char> {
    self.chars.get(index_units).map(|(ch, _)| *ch)
  }

  pub fn peek(&self) -> Option<char> {
    self.peek_at(self.pos)
  }

  #[allow(dead_code)]
  pub fn peek_at_offset_units(&self, offset_units: usize) -> Option<char> {
    self.peek_at(self.pos + offset_units)
  }

  /// Peek and return as a String (for APIs that need &str).
  /// Only call when you actually need the String form.
  pub fn peek_at_str(&self, index_units: usize) -> Option<&'a str> {
    // by using character offsets and slice of text we avoid unnecessary string allocations
    let start = self.chars.get(index_units).map(|(_, byte_idx)| *byte_idx)?;
    let end = self
      .chars
      .get(index_units + 1)
      .map(|(_, byte_idx)| *byte_idx)?;
    self.text.get(start..end)
  }

  /// units here is for char (and not bytes)
  /// in TS version `units` is byte index for utf-16 encoding used by js
  /// rust stores as utf-8 but has methods to access nth char or substring (char_substring)
  pub fn advance(&mut self, units: usize) {
    self.pos += units;
  }

  pub fn slice(&self, start: usize, end: usize) -> Option<&'a str> {
    if start > end || end > self.char_count() {
      return None;
    }
    let start_byte = self.chars.get(start).map(|(_, byte_idx)| *byte_idx)?;
    let end_byte = self.chars.get(end).map(|(_, byte_idx)| *byte_idx)?;
    self.text.get(start_byte..end_byte)
  }
}

/// Result type for `match_prev_krama_sequence`
pub struct MatchPrevKramaSequenceResult {
  pub matched: bool,
  pub matched_len: usize,
}

impl ScriptData {
  /// Match a sequence of krama items against previous context.
  /// `peek_at` returns the text at a given index as a String.
  pub fn match_prev_krama_sequence<F, T>(
    &self,
    peek_at: F,
    anchor_index: isize,
    prev: &[usize], // indices(number) array
  ) -> MatchPrevKramaSequenceResult
  where
    T: AsRef<str>,
    F: Fn(isize) -> Option<T>,
  {
    for i in 0..prev.len() {
      let expected_krama_index = prev[prev.len() - 1 - i];
      let info = match peek_at(anchor_index - i as isize) {
        Some(v) => v,
        None => {
          return MatchPrevKramaSequenceResult {
            matched: false,
            matched_len: 0,
          };
        }
      };

      let got_krama_index = self.krama_index_of_text(info.as_ref());
      match got_krama_index {
        Some(got) if got == expected_krama_index => {}
        _ => {
          return MatchPrevKramaSequenceResult {
            matched: false,
            matched_len: 0,
          };
        }
      }
    }

    MatchPrevKramaSequenceResult {
      matched: true,
      matched_len: prev.len(),
    }
  }

  pub fn replace_with_pieces(&self, replace_with: &[i16]) -> Vec<&str> {
    replace_with
      .iter()
      .map(|&k| self.krama_text_or_empty(k))
      .filter(|s| !s.is_empty())
      .collect()
  }
}
pub const TAMIL_EXTENDED_SUPERSCRIPT_NUMBERS: [char; 3] = ['²', '³', '⁴'];

pub fn is_ta_ext_superscript_tail(ch: Option<char>) -> bool {
  match ch {
    Some(c) => TAMIL_EXTENDED_SUPERSCRIPT_NUMBERS.contains(&c),
    None => false,
  }
}

pub const VEDIC_SVARAS: [char; 4] = ['॒', '॑', '᳚', '᳛'];

#[inline]
pub fn is_vedic_svara_tail(ch: Option<char>) -> bool {
  match ch {
    Some(c) => VEDIC_SVARAS.contains(&c),
    None => false,
  }
}

impl ResultStringBuilder {
  pub fn emit_pieces_with_reorder<S: AsRef<str>>(
    &mut self,
    pieces: &[S],
    halant: &str,
    should_reorder: bool,
  ) {
    if pieces.is_empty() {
      return;
    }
    if !should_reorder {
      self.emit_pieces(pieces);
      return;
    }

    let first_piece = pieces.first().map(|s| s.as_ref()).unwrap_or("");
    if first_piece.starts_with(halant) {
      let rest_first = first_piece.strip_prefix(halant).unwrap_or("");
      let mut after_pieces: Vec<&str> = Vec::new();
      if !rest_first.is_empty() {
        after_pieces.push(rest_first);
      }
      for p in pieces.iter().skip(1) {
        after_pieces.push(p.as_ref());
      }
      self.with_last_char_moved_after(&[halant], &after_pieces);
    } else {
      self.with_last_char_moved_after(pieces, &[] as &[&str]);
    }
  }
}

#[inline]
pub(crate) fn is_script_tamil_ext(var: &str) -> bool {
  var == "Tamil-Extended"
}

const VEDIC_SVARAS_TYPING_SYMBOLS: [&str; 4] = ["_", "'''", "''", "'"];
const VEDIC_SVARAS_NORMAL_SYMBOLS: [&str; 4] = ["↓", "↑↑↑", "↑↑", "↑"];

pub fn apply_typing_input_aliases(mut text: String, to_script_name: &str) -> String {
  if text.is_empty() {
    return text;
  }

  // ITRANS-style shortcut: x -> kSh (क्ष)
  if text.contains('x') {
    text = text.replace("x", "kSh");
  }

  if is_script_tamil_ext(to_script_name) {
    for i in 0..VEDIC_SVARAS_TYPING_SYMBOLS.len() {
      let symbol = VEDIC_SVARAS_TYPING_SYMBOLS[i];
      if text.contains(symbol) {
        text = text.replace(symbol, VEDIC_SVARAS_NORMAL_SYMBOLS[i]);
      }
    }
  }

  text
}
