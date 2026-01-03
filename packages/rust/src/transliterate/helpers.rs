use crate::ScriptData;
use crate::binary_search::binary_search_lower_with_index;

// pub fn krama_index_of_text()

impl ScriptData {
    pub fn krama_text_or_null(&self, idx: usize) -> Option<&str> {
        match &self.get_common_attr().krama_text_arr.get(idx) {
            Some(item) => Some(&item.0),
            None => None,
        }
    }

    pub fn krama_text_or_empty(&self, idx: usize) -> &str {
        match &self.get_common_attr().krama_text_arr.get(idx) {
            Some(item) => &item.0,
            None => &"",
        }
    }

    pub fn krama_index_of_index(&self, text: &str) -> Option<usize> {
        binary_search_lower_with_index(
            &self.get_common_attr().krama_text_arr,
            &self.get_common_attr().krama_text_arr_index,
            &text,
            |arr, i| &arr[i].0,
            |a, b| a.cmp(b),
        )
    }
}

/// custom struct to construct output string
pub struct StringBuilder {
    result: Vec<String>,
}

pub struct CursorCp {
    pub cp: isize,
    pub ch: String,
    /// Width in UTF-16 code units (matches JS `string.length` semantics).
    pub width: usize,
}

impl StringBuilder {
    pub fn new() -> StringBuilder {
        StringBuilder { result: Vec::new() }
    }
    pub fn emit(&mut self, text: String) {
        if text.is_empty() {
            return;
        }
        self.result.push(text);
    }
    pub fn emit_pieces(&mut self, pieces: Vec<String>) {
        for p in pieces {
            self.emit(p);
        }
    }
    pub fn last_piece(&self) -> Option<String> {
        let last = self.result.last().cloned();
        return last;
    }
    pub fn last_char(&self) -> Option<char> {
        match self.last_piece() {
            None => None,
            Some(v) => v.chars().last(),
        }
    }

    pub fn pop_last_char(&mut self) -> Option<String> {
        let len = self.result.len();
        if len == 0 {
            return None;
        }

        let last_index = len - 1;
        let mut should_pop_piece = false;

        let ch = {
            let last_piece = &mut self.result[last_index];
            let popped = last_piece.pop();
            if let Some(_) = popped {
                if last_piece.is_empty() {
                    should_pop_piece = true;
                }
            }
            popped
        };

        if should_pop_piece {
            // safe: last_index was the last element
            self.result.pop();
        }

        ch.map(|c| c.to_string())
    }

    pub fn rewrite_tail_pieces(&mut self, count: usize, new_pieces: Vec<String>) {
        let len = self.result.len();
        let start = len.saturating_sub(count);
        self.result.truncate(start);
        for p in new_pieces {
            if !p.is_empty() {
                self.result.push(p);
            }
        }
    }

    pub fn with_last_char_moved_after(
        &mut self,
        before_pieces: Vec<String>,
        after_pieces: Vec<String>,
    ) {
        let ch = self.pop_last_char();
        match ch {
            None => {
                self.emit_pieces(before_pieces);
                self.emit_pieces(after_pieces);
            }
            Some(c) => {
                self.emit_pieces(before_pieces);
                self.emit(c);
                self.emit_pieces(after_pieces);
            }
        }
    }

    pub fn peek_at(&self, index: isize) -> Option<CursorCp> {
        let len = self.result.len() as isize;
        if len == 0 {
            return None;
        }

        let mut i = index;
        if i < 0 {
            i = len + i;
        }
        if i < 0 || i >= len {
            return None;
        }

        let item = self.result.get(i as usize)?.clone();
        let width = item.encode_utf16().count();
        Some(CursorCp {
            cp: index,
            ch: item,
            width,
        })
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

/// Convert a UTF-16 code unit index (JS string indexing) to a UTF-8 byte index (Rust string slicing).
/// Returns `None` if the index is not on a scalar boundary or is out of range.
fn utf16_index_to_byte_index(s: &str, unit_index: usize) -> Option<usize> {
    if unit_index == 0 {
        return Some(0);
    }

    let mut units_seen: usize = 0;
    for (byte_i, ch) in s.char_indices() {
        if units_seen == unit_index {
            return Some(byte_i);
        }
        units_seen += ch.len_utf16();
        if units_seen > unit_index {
            // unit_index points inside a surrogate pair in JS terms; caller shouldn't do this.
            return None;
        }
    }

    if units_seen == unit_index {
        Some(s.len())
    } else {
        None
    }
}

/// Port of TS `make_input_cursor(text)` (tracks position in UTF-16 code units).
pub struct InputCursor {
    text: String,
    pos: usize, // UTF-16 code unit index
}

impl InputCursor {
    pub fn new(text: String) -> InputCursor {
        InputCursor { text, pos: 0 }
    }

    pub fn pos(&self) -> usize {
        self.pos
    }

    /// Equivalent to TS `peekAt(index)`.
    pub fn peek_at(&self, index_units: usize) -> Option<CursorCp> {
        let byte_i = utf16_index_to_byte_index(&self.text, index_units)?;
        if byte_i >= self.text.len() {
            return None;
        }
        let ch = self.text[byte_i..].chars().next()?;
        let width = ch.len_utf16();
        Some(CursorCp {
            cp: ch as u32 as isize,
            ch: ch.to_string(),
            width,
        })
    }

    /// Equivalent to TS `peek()`.
    pub fn peek(&self) -> Option<CursorCp> {
        self.peek_at(self.pos)
    }

    /// Equivalent to TS `peekAtOffsetUnits(offsetUnits)`.
    pub fn peek_at_offset_units(&self, offset_units: usize) -> Option<CursorCp> {
        self.peek_at(self.pos + offset_units)
    }

    /// Equivalent to TS `advance(units)`.
    pub fn advance(&mut self, units: usize) {
        self.pos += units;
    }

    /// Equivalent to TS `slice(from, to)` / `substring(from, to)` (indices are UTF-16 code units).
    pub fn slice(&self, from_units: usize, to_units: usize) -> Option<String> {
        let start = utf16_index_to_byte_index(&self.text, from_units)?;
        let end = utf16_index_to_byte_index(&self.text, to_units)?;
        if start > end || end > self.text.len() {
            return None;
        }
        Some(self.text[start..end].to_string())
    }
}

/// Result type for `match_prev_krama_sequence` (mirrors TS `{ matched, matchedLen }`).
pub struct MatchPrevKramaSequenceResult {
    pub matched: bool,
    pub matched_len: usize,
}

/// Port of TS `matchPrevKramaSequence`.
///
/// `peek_at` is typically `|i| result.peek_at(i)` where `result` is a `StringBuilder`.
pub fn match_prev_krama_sequence<F>(
    peek_at: F,
    anchor_index: isize,
    prev: &[usize],
    script_data: &ScriptData,
) -> MatchPrevKramaSequenceResult
where
    F: Fn(isize) -> Option<CursorCp>,
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

        let got_krama_index = script_data.krama_index_of_index(&info.ch);
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

/// Port of TS `replaceWithPieces`.
pub fn replace_with_pieces(replace_with: &[i16], script_data: &ScriptData) -> Vec<String> {
    replace_with
        .iter()
        .map(|&k| {
            if k < 0 {
                ""
            } else {
                script_data.krama_text_or_empty(k as usize)
            }
        })
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
        .collect()
}

pub const TAMIL_EXTENDED_SUPERSCRIPT_NUMBERS: [char; 3] = ['²', '³', '⁴'];

pub fn is_ta_ext_superscript_tail(ch: Option<char>) -> bool {
    match ch {
        Some(c) => TAMIL_EXTENDED_SUPERSCRIPT_NUMBERS.contains(&c),
        None => false,
    }
}

pub const VEDIC_SVARAS: [char; 4] = ['॒', '॑', '᳚', '᳛'];

pub fn is_vedic_svara_tail(ch: Option<char>) -> bool {
    match ch {
        Some(c) => VEDIC_SVARAS.contains(&c),
        None => false,
    }
}

#[macro_export]
macro_rules! is_script_tamil_ext {
    ($var:expr) => {
        $var == "Tamil-Extended"
    };
}

/// Port of TS `emitPiecesWithReorder`.
pub fn emit_pieces_with_reorder(
    result: &mut StringBuilder,
    pieces: Vec<String>,
    halant: &str,
    should_reorder: bool,
) {
    if pieces.is_empty() {
        return;
    }
    if !should_reorder {
        result.emit_pieces(pieces);
        return;
    }

    let first_piece = pieces.first().map(|s| s.as_str()).unwrap_or("");
    if first_piece.starts_with(halant) {
        let rest_first = first_piece.strip_prefix(halant).unwrap_or("");
        let mut after_pieces: Vec<String> = Vec::new();
        if !rest_first.is_empty() {
            after_pieces.push(rest_first.to_string());
        }
        for p in pieces.into_iter().skip(1) {
            after_pieces.push(p);
        }
        result.with_last_char_moved_after(vec![halant.to_string()], after_pieces);
    } else {
        result.with_last_char_moved_after(pieces, vec![]);
    }
}

const VEDIC_SVARAS_TYPING_SYMBOLS: [&str; 4] = ["_", "'''", "''", "'"];
const VEDIC_SVARAS_NORMAL_SYMBOLS: [&str; 4] = ["↓", "↑↑↑", "↑↑", "↑"];

/// Port of TS `applyTypingInputAliases`.
pub fn apply_typing_input_aliases(mut text: String, to_script_name: &str) -> String {
    if text.is_empty() {
        return text;
    }

    // ITRANS-style shortcut: x -> kSh (क्ष)
    if text.contains('x') {
        text = text.replace("x", "kSh");
    }

    if is_script_tamil_ext!(to_script_name) {
        for i in 0..VEDIC_SVARAS_TYPING_SYMBOLS.len() {
            let symbol = VEDIC_SVARAS_TYPING_SYMBOLS[i];
            if text.contains(symbol) {
                text = text.replace(symbol, VEDIC_SVARAS_NORMAL_SYMBOLS[i]);
            }
        }
    }

    text
}
