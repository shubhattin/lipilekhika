pub fn char_substring(s: &str, start: usize, end: usize) -> &str {
    if start >= end {
        return "";
    }

    let mut char_indices = s.char_indices();

    let start_byte = match char_indices.nth(start) {
        Some((i, _)) => i,
        None => return "",
    };

    let end_byte = match char_indices.nth(end - start - 1) {
        Some((i, _)) => i,
        None => s.len(),
    };

    &s[start_byte..end_byte]
}
