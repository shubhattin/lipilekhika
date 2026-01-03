use crate::script_data::{List, ScriptData};
use crate::utils::binary_search::binary_search_lower_with_index;
use crate::utils::strings::char_substring;

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
            Some(v) => v.chars().last(),
            None => None,
        }
    }
    pub fn pop_last_char(&mut self) -> Option<String> {
        let result_len = self.result.len();
        let lp = self.last_piece();
        match lp {
            Some(mut lp) => {
                if lp.len() == 0 {
                    // handling the panic case
                    return None;
                }
                let ch = lp.pop();
                // ^ slice(0, -1) done with pop inself
                if let Some(ch) = ch {
                    self.result[result_len - 1] = lp;
                    return Some(ch.to_string());
                }
                return None;
            }
            None => None,
        }
    }
    pub fn rewrite_tail_pieces(&mut self, count: usize, new_pieces: Vec<String>) {
        let len = self.result.len();
        let start = len.saturating_sub(count); // -count but safe
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

    /// index can be -ve
    pub fn peek_at(&self, index: isize) -> Option<CursorCp> {
        let len = self.result.len() as isize;
        if len == 0 {
            return None;
        }

        let mut i = index;
        if i < 0 {
            // handle negative indexes
            i = len + i;
        } else if i < 0 || i >= len {
            return None;
        }

        let item = self.result.get(i as usize);
        match item {
            Some(item) => {
                return Some(CursorCp {
                    ch: item.to_string(),
                });
            }
            None => None,
        }
    }

    pub fn rewrite_at(&mut self, index: isize, new_piece: String) {
        let len = self.result.len() as isize;
        if len == 0 {
            return;
        }

        let mut i = index;
        if i < 0 {
            i = len + i;
        } else if i < 0 || i >= len {
            return;
        }

        self.result[i as usize] = new_piece;
    }

    pub fn to_string(&self) -> String {
        self.result.concat()
    }
}

type PrevContextItem = (Option<String>, Option<List>);

pub struct PrevCtxBuilder {
    arr: Vec<PrevContextItem>,
    max_len: usize,
}

impl PrevCtxBuilder {
    pub fn new(max_len: usize) -> PrevCtxBuilder {
        PrevCtxBuilder {
            arr: Vec::new(),
            max_len,
        }
    }

    pub fn clear(&mut self) {
        self.arr.clear();
    }

    pub fn length(&self) -> usize {
        self.arr.len()
    }

    /// resolves negativee index for the `arr`
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

    pub fn at(&self, i: isize) -> Option<&PrevContextItem> {
        match self.resolve_arr_index(i) {
            None => None,
            Some(idx) => self.arr.get(idx),
        }
    }

    pub fn last(&self) -> Option<&PrevContextItem> {
        self.arr.last()
    }

    pub fn last_text(&self) -> Option<&str> {
        self.last().and_then(|(text_opt, _)| text_opt.as_deref())
    }

    pub fn last_type(&self) -> Option<&List> {
        self.last().and_then(|(_, list_opt)| list_opt.as_ref())
    }

    pub fn type_at(&self, i: isize) -> Option<&List> {
        self.at(i).and_then(|(_, list_opt)| list_opt.as_ref())
    }

    /// Text at a given index (supports -ve indices).
    pub fn text_at(&self, i: isize) -> Option<&str> {
        self.at(i).and_then(|(text_opt, _)| text_opt.as_deref())
    }

    /// Check if the last context item has the given type.
    pub fn is_last_type(&self, t: &List) -> bool {
        self.last_type() == Some(t)
    }

    /// Push a new context item, enforcing `max_len` and skipping empty/None text.
    pub fn push(&mut self, item: PrevContextItem) {
        let text_ok = item.0.as_ref().map(|s| !s.is_empty()).unwrap_or(false);
        if !text_ok {
            return;
        }
        self.arr.push(item);
        if self.arr.len() > self.max_len {
            // Remove oldest, similar to shift
            self.arr.remove(0);
        }
    }
}

pub struct InputCursor {
    text: String,
    pos: usize,
}

pub struct CursorCp {
    pub ch: String,
    // no cp(codepoint) or width needed here in rust
}

impl InputCursor {
    pub fn new(text: String) -> InputCursor {
        InputCursor { text, pos: 0 }
    }

    pub fn pos(&self) -> usize {
        self.pos
    }

    pub fn peek_at(&self, index_units: usize) -> Option<CursorCp> {
        self.text
            .chars()
            .nth(index_units)
            .and_then(|ch| Some(CursorCp { ch: ch.to_string() }))
    }

    pub fn peek(&self) -> Option<CursorCp> {
        self.peek_at(self.pos)
    }

    pub fn peek_at_offset_units(&self, offset_units: usize) -> Option<CursorCp> {
        self.peek_at(self.pos + offset_units)
    }

    /// units here is for char (and not bytes)
    /// in TS version `units` is byte index for utf-16 encoding used by js
    /// rust stores as utf-8 but has methods to access nth char or substring (char_substring)
    pub fn advance(&mut self, units: usize) {
        self.pos += units;
    }

    pub fn slice(&self, start: usize, end: usize) -> Option<String> {
        if start > end || end > self.text.len() {
            return None;
        }
        Some(char_substring(&self.text, start, end).to_string())
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
