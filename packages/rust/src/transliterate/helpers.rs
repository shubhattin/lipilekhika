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
      .krama_text_arr
      .get(idx as usize)
      .map(|item| item.0.as_str())
  }

  #[inline]
  pub fn krama_text_or_empty(&self, idx: i16) -> &str {
    if idx < 0 {
      return "";
    }
    self
      .krama_text_arr
      .get(idx as usize)
      .map(|item| item.0.as_str())
      .unwrap_or("")
  }

  #[inline]
  pub fn krama_index_of_text(&self, text: &str) -> Option<usize> {
    self.krama_text_lookup.get(text).copied()
  }
}

/// Custom struct to construct output string.
///
/// Uses a contiguous `String` buffer with piece boundary offsets for O(1)
/// piece-level access while avoiding per-piece heap allocations.
pub struct ResultStringBuilder {
  buf: String,
  /// Byte offsets marking the start of each "piece" within `buf`.
  offsets: Vec<usize>,
}

impl ResultStringBuilder {
  pub fn new() -> Self {
    ResultStringBuilder {
      buf: String::with_capacity(128),
      offsets: Vec::new(),
    }
  }

  /// Returns the byte range for the i-th piece.
  #[inline]
  fn piece_range(&self, i: usize) -> std::ops::Range<usize> {
    let start = self.offsets[i];
    let end = *self.offsets.get(i + 1).unwrap_or(&self.buf.len());
    start..end
  }

  pub fn emit(&mut self, text: &str) {
    if text.is_empty() {
      return;
    }
    self.offsets.push(self.buf.len());
    self.buf.push_str(text);
  }
  /// Emit a single character without heap-allocating a String.
  pub fn emit_char(&mut self, c: char) {
    self.offsets.push(self.buf.len());
    self.buf.push(c);
  }
  pub fn emit_pieces(&mut self, pieces: &[impl AsRef<str>]) {
    for p in pieces {
      self.emit(p.as_ref());
    }
  }
  pub fn last_piece(&self) -> Option<&str> {
    if self.offsets.is_empty() {
      return None;
    }
    let i = self.offsets.len() - 1;
    Some(&self.buf[self.piece_range(i)])
  }
  pub fn last_char(&self) -> Option<char> {
    self.buf.chars().next_back()
  }
  pub fn pop_last_char(&mut self) -> Option<char> {
    let c = self.buf.pop()?;
    // If popping made the last piece empty, remove its offset
    if let Some(&last_off) = self.offsets.last()
      && last_off >= self.buf.len()
      && last_off > 0
    {
      self.offsets.pop();
    }
    Some(c)
  }
  pub fn rewrite_tail_pieces<S: AsRef<str>>(&mut self, count: usize, new_pieces: &[S]) {
    let piece_count = self.offsets.len();
    let start = piece_count.saturating_sub(count);
    // Truncate buffer to the start of the removed region
    let buf_start = if start < self.offsets.len() {
      self.offsets[start]
    } else {
      self.buf.len()
    };
    self.buf.truncate(buf_start);
    self.offsets.truncate(start);
    for p in new_pieces {
      let p = p.as_ref();
      if !p.is_empty() {
        self.offsets.push(self.buf.len());
        self.buf.push_str(p);
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
    let len = self.offsets.len() as isize;
    if len == 0 {
      return None;
    }

    let mut i = index;
    if i < 0 {
      i += len;
      if i < 0 {
        return None;
      }
    } else if i >= len {
      return None;
    }

    let idx = i as usize;
    Some(&self.buf[self.piece_range(idx)])
  }

  pub fn rewrite_at(&mut self, index: isize, new_piece: &str) {
    let len = self.offsets.len() as isize;
    if len == 0 {
      return;
    }

    let mut i = index;
    if i < 0 {
      i += len;
      if i < 0 {
        return;
      }
    } else if i >= len {
      return;
    }

    let idx = i as usize;
    let range = self.piece_range(idx);
    let old_len = range.end - range.start;
    let new_len = new_piece.len();
    let diff = new_len as isize - old_len as isize;

    self.buf.replace_range(range, new_piece);

    // Adjust offsets for all pieces after the rewritten one
    for off in self.offsets.iter_mut().skip(idx + 1) {
      *off = (*off as isize + diff) as usize;
    }
  }
}

impl std::fmt::Display for ResultStringBuilder {
  fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
    f.write_str(&self.buf)
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
      arr: VecDeque::with_capacity(max_len),
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
      idx += len;
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
    if item.0.as_ref().is_none_or(|s| s.is_empty()) {
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
  /// `peek_at` returns the text at a given index.
  /// `prev` contains krama indices as `i16`; negative values cause an immediate non-match.
  pub fn match_prev_krama_sequence<F, T>(
    &self,
    peek_at: F,
    anchor_index: isize,
    prev: &[i16],
  ) -> MatchPrevKramaSequenceResult
  where
    T: AsRef<str>,
    F: Fn(isize) -> Option<T>,
  {
    for i in 0..prev.len() {
      let Some(expected_krama_index) = prev.get(prev.len() - 1 - i) else {
        return MatchPrevKramaSequenceResult {
          matched: false,
          matched_len: 0,
        };
      };
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
        Some(got) if got == *expected_krama_index as usize => {}
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

#[inline]
pub fn is_ta_ext_superscript_tail(ch: Option<char>) -> bool {
  ch.is_some_and(|c| TAMIL_EXTENDED_SUPERSCRIPT_NUMBERS.contains(&c))
}

pub const VEDIC_SVARAS: [char; 4] = ['॒', '॑', '᳚', '᳛'];

#[inline]
pub fn is_vedic_svara_tail(ch: Option<char>) -> bool {
  ch.is_some_and(|c| VEDIC_SVARAS.contains(&c))
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
pub fn is_script_tamil_ext(var: &str) -> bool {
  var == "Tamil-Extended"
}

const VEDIC_SVARAS_TYPING_SYMBOLS: [&str; 4] = ["_", "'''", "''", "'"];
const VEDIC_SVARAS_NORMAL_SYMBOLS: [&str; 4] = ["↓", "↑↑↑", "↑↑", "↑"];

pub fn apply_typing_input_aliases<'a>(text: &'a str, to_script_name: &str) -> Cow<'a, str> {
  if text.is_empty() {
    return Cow::Borrowed(text);
  }

  let needs_x = text.contains('x');
  let is_ta_ext = is_script_tamil_ext(to_script_name);

  // For Tamil-Extended check whether any vedic typing symbol is present.
  let needs_vedic = is_ta_ext && VEDIC_SVARAS_TYPING_SYMBOLS.iter().any(|s| text.contains(s));

  // Fast path: nothing to do, return the original slice without allocating.
  if !needs_x && !needs_vedic {
    return Cow::Borrowed(text);
  }

  // Single allocation: apply all replacements to one owned String.
  let mut result = if needs_x {
    text.replace('x', "kSh")
  } else {
    text.to_owned()
  };

  if needs_vedic {
    for (symbol, normal) in VEDIC_SVARAS_TYPING_SYMBOLS
      .iter()
      .zip(VEDIC_SVARAS_NORMAL_SYMBOLS.iter())
    {
      if result.contains(symbol) {
        result = result.replace(symbol, normal);
      }
    }
  }

  Cow::Owned(result)
}
