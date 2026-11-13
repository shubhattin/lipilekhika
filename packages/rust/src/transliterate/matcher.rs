//! Step 1 of the transliteration: the entry of the text to krama map to read at a position.
//!
//! The map holds the texts of more than one character (and the ones that do not map to a single
//! krama entry). Every entry lists the characters that can continue it (`next`), the scan
//! follows them to the longest text. It does not back out of a longer text, the few cases where
//! the longest text is not the one to read are handled here by name.

use super::context::{ContextMode, TransliterateCtx};
use super::helpers::{
    InputTextCursor, OM_KRAMA_INDEX, is_fully_read_krama, is_latin_combining_mark,
    is_ta_ext_superscript_tail, is_vedic_svara_tail, is_word_char, with_tail,
};
use super::tamil_ext::TaExtSuperscript;
use crate::script_data::{Rule, ScriptData};
use alloc::borrow::Cow;
use alloc::string::String;
use core::borrow::Borrow;

/// Whether the text before `index` is a syllable that a sign written as a dead consonant (the
/// Tamil anusvAra ம், see `dead_consonant_sign_index`) can go with: a vyanjana (with its inherent
/// vowel), a svara or a mAtrA, looking past Vedic svaras. Else (the start of a word, after a
/// halant, a digit or a sign) it is the consonant + halant (ஸாத்ம்ய -> सात्म्य, not सात्ंय).
fn sign_has_base(script_data: &ScriptData, cursor: &InputTextCursor, index: usize) -> bool {
    let mut end = index;
    while end > 0 && is_vedic_svara_tail(cursor.peek_at(end - 1)) {
        end -= 1;
    }
    let Some(prev) = end.checked_sub(1).and_then(|i| cursor.peek_at(i)) else {
        return false;
    };
    let krama_index = script_data.krama_index_of_char(prev).or_else(|| {
        // a vowel sign or vowel written as its parts (ௌ as ெ + ௗ): the text of the last two
        let map_index =
            script_data.text_to_krama_map_index(cursor.slice(end.checked_sub(2)?, end)?, false)?;
        usize::try_from(
            *script_data.text_to_krama_map[map_index]
                .1
                .krama
                .as_ref()?
                .last()?,
        )
        .ok()
    });
    krama_index
        .and_then(|i| script_data.krama_text_arr.get(i))
        .and_then(|(_, li)| *li)
        .and_then(|li| script_data.list.get(li as usize))
        .is_some_and(|k| k.is_vyanjana() || k.is_svara() || k.is_matra())
}

/// Whether the character at `index` is not read by itself but starts a longer text that is,
/// walking `text_to_krama_map` like Step 1. The Sinhala ZWJ + al-lakuna `‍්` is a halant, while
/// the ZWJ by itself is a custom script character.
pub(super) fn only_read_in_longer_text(
    script_data: &ScriptData,
    cursor: &InputTextCursor,
    index: usize,
) -> bool {
    let Some(ch) = cursor.peek_at(index) else {
        return false;
    };
    let has_krama = |i: usize| {
        script_data.text_to_krama_map[i]
            .1
            .krama
            .as_ref()
            .is_some_and(|krama| krama.iter().any(|&k| k != -1))
    };
    let mut map_index = script_data.text_to_krama_map_char_index(ch, false);
    if script_data.krama_index_of_char(ch).is_some() || map_index.is_some_and(has_krama) {
        return false;
    }
    let mut end = index + 1;
    let mut read = false;
    while let Some(i) = map_index {
        match cursor.peek_at(end) {
            Some(c) if script_data.text_to_krama_map[i].1.next_chars.contains(&c) => {}
            _ => break,
        }
        end += 1;
        map_index = cursor
            .slice(index, end)
            .and_then(|text| script_data.text_to_krama_map_index(text, false));
        if map_index.is_some_and(has_krama) {
            read = true;
        }
    }
    read
}

/// The result of Step 1
#[derive(Debug, Clone, Copy)]
pub(super) struct TextMatch {
    /// Index in `text_to_krama_map` of the text to read, `None` if no match
    pub(super) index: Option<usize>,
    /// From Tamil-Extended: the superscript read with the match, which the cursor skips later
    pub(super) superscript: Option<TaExtSuperscript>,
}

impl TextMatch {
    const NONE: TextMatch = TextMatch {
        index: None,
        superscript: None,
    };

    #[inline]
    fn of(index: usize) -> TextMatch {
        TextMatch {
            index: Some(index),
            superscript: None,
        }
    }
}

impl<'a, R> TransliterateCtx<'a, R>
where
    R: Borrow<Rule>,
{
    /// The text from `text_index` to `end_index` that is searched in the map. While a
    /// Tamil-Extended superscript is being skipped (`ta_ext_skip_index`) it is left out of it.
    #[inline(never)]
    fn scan_text(&self, text_index: usize, end_index: usize) -> Cow<'a, str> {
        if self.ta_ext_skip_index == -1 {
            return Cow::Borrowed(self.cursor.slice(text_index, end_index).unwrap_or_default());
        }
        let skip_index = self.ta_ext_skip_index as usize;
        let a = self
            .cursor
            .slice(text_index, skip_index)
            .unwrap_or_default();
        let b = if end_index > skip_index {
            self.cursor
                .slice(skip_index + 1, end_index)
                .unwrap_or_default()
        } else {
            ""
        };
        let mut s = String::with_capacity(a.len() + b.len());
        s.push_str(a);
        s.push_str(b);
        Cow::Owned(s)
    }

    /// Decomposed (NFD) text: a letter is its base + combining marks (ī is i + U+0304),
    /// and the base can continue the letter before it (a + i is ai, k + h is kh). When
    /// the match cannot take the mark after it but its last letter can, the match stops
    /// before that letter: kaī is k a ī (कई), not kai + U+0304
    ///
    /// Returns the index in the map of the match without its last letter
    #[inline(never)]
    fn nfd_split_before_marked_letter(
        &self,
        match_index: usize,
        text_index: usize,
        end_index: usize,
    ) -> Option<usize> {
        let mark = self.cursor.peek_at(end_index)?;
        if !is_latin_combining_mark(mark)
            || self.text_to_krama_map[match_index]
                .1
                .next_chars
                .contains(&mark)
        {
            return None;
        }
        let head = self.cursor.slice(text_index, end_index - 1)?;
        let last = self.cursor.peek_at(end_index - 1)?;
        let head_index = self
            .lookup_data
            .text_to_krama_map_index(head, self.use_typing_map)?;
        if !is_fully_read_krama(self.text_to_krama_map[head_index].1.krama.as_deref()) {
            return None;
        }
        self.lookup_data.text_to_krama_map_index(
            &with_tail(last.encode_utf8(&mut [0u8; 4]), Some(mark)),
            self.use_typing_map,
        )?;
        Some(head_index)
    }

    /// Follows the `next` characters of the entries of the map to the longest text at
    /// `text_index`, where the character is `ch`.
    ///
    /// Returns the index in `text_to_krama_map` (and from Tamil-Extended the superscript read
    /// with it)
    #[inline(always)]
    fn scan_longest_match(&self, ch: char, text_index: usize) -> TextMatch {
        let from_script_data = self.from_script_data;
        let to_script_data = self.to_script_data;
        let lookup_data = self.lookup_data;
        let text_to_krama_map = self.text_to_krama_map;
        let use_typing_map = self.use_typing_map;

        let mut scan_units: usize = 0;
        let mut last_valid_vowel_match_index: Option<usize> = None;
        let check_vowel_retraction =
            self.mode == ContextMode::OtherToBrahmic && self.prev_ends_with_vyanjana();

        loop {
            let next_char = self.cursor.peek_at(text_index + scan_units + 1);
            if self.ta_ext_skip_index != -1
                && next_char.is_some()
                && is_ta_ext_superscript_tail(next_char)
            {
                scan_units += 1; // each char is 1 unit
            }

            let end_index = text_index + scan_units + 1;
            let single_char_lookup = scan_units == 0 && self.ta_ext_skip_index == -1;
            // The single-char fast path never reads `char_to_search` unless the match
            // has a `next` list, so build the slice lazily.
            let char_to_search: Cow<'_, str> = if single_char_lookup {
                Cow::Borrowed("")
            } else {
                self.scan_text(text_index, end_index)
            };
            let match_index = if single_char_lookup {
                // more scan units only needed in case ta-ext so safe to do
                lookup_data.text_to_krama_map_char_index(ch, use_typing_map)
            } else {
                lookup_data.text_to_krama_map_index(char_to_search.as_ref(), use_typing_map)
            };
            let Some(match_index) = match_index else {
                return TextMatch::NONE;
            };
            let potential_match = &text_to_krama_map[match_index].1;

            // vowel retraction support (kAUM etc.)
            if check_vowel_retraction
                && let Some(krama) = &potential_match.krama
                && !krama.is_empty()
            {
                let krama_id = krama[0];
                if krama_id >= 0 {
                    let is_single_vowel = krama.len() == 1
                        && to_script_data
                            .list_item_of_krama(krama_id)
                            .is_some_and(|t| t.is_svara() || t.is_matra());
                    if is_single_vowel {
                        last_valid_vowel_match_index = Some(match_index);
                    } else if last_valid_vowel_match_index.is_some() {
                        return TextMatch {
                            index: last_valid_vowel_match_index,
                            superscript: None,
                        };
                    }
                }
            }

            // extend match if `next` allows it
            let next_chars = &potential_match.next_chars;
            if !next_chars.is_empty() {
                let nth_next_character = self.cursor.peek_at(end_index);

                // Tamil-Extended special handling (superscript numbers after matra/halant/svara)
                if self.is_from_tamil_ext
                    && let ScriptData::Brahmic { halant, .. } = from_script_data
                {
                    let char_to_search: Cow<'_, str> = if single_char_lookup {
                        Cow::Borrowed(self.cursor.slice(text_index, end_index).unwrap_or_default())
                    } else {
                        char_to_search
                    };
                    if let Some((index, superscript)) = self.ta_ext_match_with_superscript(
                        halant,
                        next_chars,
                        &char_to_search,
                        end_index,
                        nth_next_character,
                    ) {
                        return TextMatch {
                            index: Some(index),
                            superscript: Some(superscript),
                        };
                    }
                    if let Some(index) = self.ta_ext_split_before_halant_matra(
                        halant,
                        next_chars,
                        &char_to_search,
                        end_index,
                        nth_next_character,
                    ) {
                        return TextMatch::of(index);
                    }
                }

                // Generic: if the next character is in the next list, extend scan and continue
                if let Some(nth_ch) = nth_next_character
                    && next_chars.contains(&nth_ch)
                {
                    scan_units += 1; // each char is 1 unit
                    continue;
                }
            }

            if scan_units > 0
                && self.ta_ext_skip_index == -1
                && self.from_is_other
                && let Some(head_index) =
                    self.nfd_split_before_marked_letter(match_index, text_index, end_index)
            {
                return TextMatch::of(head_index);
            }
            return TextMatch::of(match_index);
        }
    }

    /// A sign written as a dead consonant (Tamil anusvAra ம்) with no syllable to go with (the
    /// start of a word, after a halant): only the consonant is read (in Step 2), the halant next
    #[inline(always)]
    fn is_dead_consonant_sign_without_base(&self, match_index: usize, text_index: usize) -> bool {
        Some(match_index) == self.from_script_data.dead_consonant_sign_index
            && !self.use_typing_map
            && !sign_has_base(self.from_script_data, self.cursor, text_index)
    }

    /// ॐ inside a word (after a letter) is read as the letters of its text, the longest part of
    /// it which is read: IAST logoṃ is लोगों, SLP1 jAUM जाऊं (to a brahmic script the same is
    /// done after a vyanjana, `check_vowel_retraction`)
    ///
    /// Returns the index in the map of that part, `match_index` if the match is not ॐ inside a
    /// word
    #[inline(never)]
    fn split_om_inside_word(&self, match_index: usize, text_index: usize) -> usize {
        let text_to_krama_map = self.text_to_krama_map;
        if text_index == 0
            || !self
                .cursor
                .peek_at(text_index - 1)
                .is_some_and(is_word_char)
            || text_to_krama_map[match_index].1.krama.as_deref() != Some(&[OM_KRAMA_INDEX])
        {
            return match_index;
        }
        let matched_text = text_to_krama_map[match_index].0.as_str();
        matched_text
            .char_indices()
            .rev()
            .map(|(end, _)| end)
            .filter(|&end| end > 0)
            .find_map(|end| {
                self.lookup_data
                    .text_to_krama_map_index(&matched_text[..end], self.use_typing_map)
                    .filter(|&index| {
                        is_fully_read_krama(text_to_krama_map[index].1.krama.as_deref())
                    })
            })
            .unwrap_or(match_index)
    }

    /// Step 1: match text_to_krama_map / typing_text_to_krama_map
    ///
    /// Only reads the context: a Tamil-Extended superscript read with the match is returned (the
    /// loop then skips it), also when the match itself is dropped here.
    ///
    /// - `ch`: the character at `text_index`
    #[inline(always)]
    pub(super) fn match_text_to_krama(&self, ch: char, text_index: usize) -> TextMatch {
        let mut text_match = self.scan_longest_match(ch, text_index);
        let Some(match_index) = text_match.index else {
            return text_match;
        };
        if self.is_dead_consonant_sign_without_base(match_index, text_index) {
            text_match.index = None;
        } else if self.om_only_at_word_start {
            text_match.index = Some(self.split_om_inside_word(match_index, text_index));
        }
        text_match
    }
}
