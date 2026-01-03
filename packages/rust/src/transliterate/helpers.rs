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

struct InputCursor {
    pos: usize,
}

impl InputCursor {
    fn new() -> InputCursor {
        InputCursor { pos: 0 }
    }
}
