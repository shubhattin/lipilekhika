//! Tamil-Extended: an aspirated / voiced consonant is the Tamil consonant + a superscript number
//! (க² is ख), and the writer puts the halant, the mAtrA and the Vedic svaras **before** the
//! superscript (க்² is ख्, கி⁴ is घि). So going from it the superscript is read with the
//! consonant before these, and going to it these are written before the superscript already in
//! the result.

use super::context::TransliterateCtx;
use super::helpers::{char_eq_str, is_ta_ext_superscript_tail, is_vedic_svara_tail, with_tail};
use crate::script_data::{Rule, TextToKramaMap};
use alloc::string::String;
use core::borrow::Borrow;

impl<'a, R> TransliterateCtx<'a, R>
where
    R: Borrow<Rule>,
{
    /// Step 1, from Tamil-Extended: the match followed by a superscript that comes after a
    /// halant or a mAtrA and Vedic svaras, as the writer puts them before it:
    ///   `[halant | mAtrA | mAtrA mAtrA]? svara* superscript`
    ///
    /// eg. க்² (ख्), கி⁴ (घि), கொ⁴ (घो as ெ + ா), க॒॑⁴ (घ॒॑), க்॒² (ख्॒), கி॒⁴ (घि॒), ரு॒॑² (ऋ॒॑).
    ///
    /// In the match the superscript takes the place of these, which are read next. On a match
    /// sets `ta_ext_skip_index` (the superscript, skipped when the cursor gets there) and
    /// `ta_ext_superscript_detached`.
    ///
    /// - `next_chars`: the characters that can continue the current match
    /// - `char_to_search`: the text of the current match, `end_index` the index after it
    /// - `nth_next_character`: the character at `end_index`
    ///
    /// Returns the index in `text_to_krama_map` of the match with the superscript
    pub(super) fn ta_ext_match_with_superscript(
        &mut self,
        halant: &str,
        next_chars: &[char],
        char_to_search: &str,
        end_index: usize,
        nth_next_character: Option<char>,
    ) -> Option<usize> {
        let from_script_data = self.from_script_data;
        let is_sign = |c: char| char_eq_str(c, halant) || from_script_data.is_matra_char(c);
        let mut sup_index = end_index;
        let sign = nth_next_character.filter(|&c| is_sign(c));
        if let Some(sign) = sign {
            sup_index += 1;
            // mAtrA duplicates like O = E + A in gEA (or gO as visible when)
            if from_script_data.is_matra_char(sign)
                && self
                    .cursor
                    .peek_at(sup_index)
                    .is_some_and(|c| from_script_data.is_matra_char(c))
            {
                sup_index += 1;
            }
        }
        let svaras_start = sup_index;
        while is_vedic_svara_tail(self.cursor.peek_at(sup_index)) {
            sup_index += 1;
        }
        let sup_character = self.cursor.peek_at(sup_index);
        if !(sign.is_some() || sup_index > svaras_start)
            || !is_ta_ext_superscript_tail(sup_character)
            || !sup_character.is_some_and(|c| next_chars.contains(&c))
            // no superscript is being skipped, or (with only svaras in between)
            // the skipped one is inside this match: the ² of க்² in க்²ரு॑² (खृ॑)
            || !(self.ta_ext_skip_index == -1
                || (sign.is_none() && self.ta_ext_skip_index < end_index as isize))
        {
            return None;
        }
        let match_index = from_script_data
            .text_to_krama_map_index(&with_tail(char_to_search, sup_character), false)?;
        // With only svaras in between, a superscript already skipped inside
        // this match (the ² of க்² in க்²ரு॑²) makes up for the one after the
        // svaras in the match length, so the whole match is advanced over.
        if sign.is_none() {
            self.ta_ext_superscript_detached = self.ta_ext_skip_index == -1;
        }
        self.ta_ext_skip_index = sup_index as isize;
        Some(match_index)
    }

    /// Step 1, from Tamil-Extended: the match ends with a halant, or a halant + a letter, that
    /// cannot be continued (ல் and ல்ர are the start of ல்ரி² ல்ரீ² (ऌ ॡ)), but the halant
    /// starts a mAtrA ending in a superscript (்ரு² ்ரூ² ்ல்ரி² ்ல்ரீ²): stop the
    /// match before the halant, so ல்ரு² is read as ல + ்ரு² (लृ) and ல்ல்ரி²
    /// as ல + ்ல்ரி² (लॢ, like க்ல்ரி² कॢ)
    ///
    /// Returns the index in `text_to_krama_map` of the text before the halant
    pub(super) fn ta_ext_split_before_halant_matra(
        &self,
        halant: &str,
        next_chars: &[char],
        char_to_search: &str,
        end_index: usize,
        nth_next_character: Option<char>,
    ) -> Option<usize> {
        let from_script_data = self.from_script_data;
        let is_halant = |c: char| char_eq_str(c, halant);
        let mut rev = char_to_search.char_indices().rev();
        let (tail_start, back) = match (rev.next(), rev.next()) {
            (Some((i, c)), _) if is_halant(c) => (i, 1),
            (Some(_), Some((i, c))) if is_halant(c) => (i, 2),
            _ => return None,
        };
        let nth_ch = nth_next_character?;
        if tail_start == 0
            || next_chars.contains(&nth_ch)
            || end_index < back
            || self.cursor.slice(end_index - back, end_index) != Some(&char_to_search[tail_start..])
        {
            return None;
        }
        // the longest text from the halant up to the superscript (after
        // Vedic svaras)
        let mut tail = String::with_capacity(24);
        tail.push_str(&char_to_search[tail_start..]);
        let mut tail_end = end_index;
        while let Some(c) = self.cursor.peek_at(tail_end) {
            if is_ta_ext_superscript_tail(Some(c)) {
                break;
            }
            tail.push(c);
            if from_script_data
                .text_to_krama_map_index(&tail, false)
                .is_none()
            {
                tail.pop();
                break;
            }
            tail_end += 1;
        }
        while is_vedic_svara_tail(self.cursor.peek_at(tail_end)) {
            tail_end += 1;
        }
        let tail_sup = self.cursor.peek_at(tail_end);
        if !is_ta_ext_superscript_tail(tail_sup) {
            return None;
        }
        tail.extend(tail_sup);
        let tail_is_matra = from_script_data
            .text_to_krama_map_index(&tail, false)
            .and_then(|i| from_script_data.text_to_krama_map[i].1.krama.as_deref())
            .and_then(|krama| match krama {
                &[k] => from_script_data.list_item_of_krama(k),
                _ => None,
            })
            .is_some_and(|k| k.is_matra());
        if !tail_is_matra {
            return None;
        }
        from_script_data.text_to_krama_map_index(&char_to_search[..tail_start], false)
    }

    /// The characters of the matched text that are not advanced over: `1` when it ends with a
    /// superscript that is not next to the rest of it in the input (it is skipped later, see
    /// `ta_ext_skip_index`), else `0`.
    ///
    /// (only relevant while skipping a Tamil-Extended superscript; evaluated lazily)
    #[inline]
    pub(super) fn ta_ext_unconsumed_superscript_units(
        &self,
        matched_text: &str,
        matched_char_count: usize,
        map: &TextToKramaMap,
    ) -> usize {
        if self.ta_ext_superscript_detached
            || (self.ta_ext_skip_index != -1
                && matched_char_count > 1
                && map
                    .krama
                    .as_ref()
                    .and_then(|k| k.first())
                    .and_then(|&ki| self.from_script_data.list_item_of_krama(ki))
                    .is_some_and(|l| l.is_vyanjana())
                && is_ta_ext_superscript_tail(matched_text.chars().last()))
        {
            1
        } else {
            0
        }
    }

    /// To Tamil-Extended, the result ends with a superscript: emits the texts of `krama`, a
    /// mAtrA / halant or a Vedic svara goes before the superscript.
    pub(super) fn emit_krama_after_ta_ext_superscript(&mut self, krama: &[i16], to_halant: &str) {
        let to_script_data = self.to_script_data;
        // Stack buffer (no heap allocation); only this reorder path
        // needs the pieces as a slice. krama sequences are at most
        // ~4 entries in practice; 8 is a safe upper bound.
        let mut pieces_buf = [""; 8];
        let mut pieces_len = 0usize;
        for &k in krama.iter() {
            if k < 0 {
                continue;
            }
            if pieces_len < pieces_buf.len() {
                pieces_buf[pieces_len] = to_script_data.krama_text_or_empty(k);
                pieces_len += 1;
            }
        }
        let pieces = &pieces_buf[..pieces_len];
        if pieces.len() == 1 && pieces[0] == to_halant
            || krama
                .last()
                .and_then(|&last| to_script_data.list_item_of_krama(last))
                .is_some_and(|k| k.is_matra())
        {
            self.result
                .emit_pieces_with_reorder(pieces, to_halant, true);
        } else if pieces
            .last()
            .and_then(|k| k.chars().last())
            .is_some_and(|s| is_vedic_svara_tail(Some(s)))
        {
            let last = self.result.pop_last_char().unwrap_or_default();
            self.result.emit_pieces(pieces);
            self.result.emit_char(last);
        } else {
            self.result.emit_pieces(pieces);
        }
    }

    /// [`Self::emit_krama_after_ta_ext_superscript`] for the text of one krama index (Step 2).
    pub(super) fn emit_piece_after_ta_ext_superscript(
        &mut self,
        krama_index: usize,
        to_halant: &str,
    ) {
        let to_script_data = self.to_script_data;
        let pieces = [to_script_data.krama_text_or_empty(krama_index as i16)];
        if pieces[0] == to_halant
            || to_script_data
                .list_item_of_krama_index(krama_index)
                .is_some_and(|k| k.is_matra())
        {
            self.result
                .emit_pieces_with_reorder(&pieces, to_halant, true);
        } else if pieces[0]
            .chars()
            .last()
            .is_some_and(|s| is_vedic_svara_tail(Some(s)))
        {
            let last = self.result.pop_last_char().unwrap_or_default();
            self.result.emit_pieces(&pieces);
            self.result.emit_char(last);
        } else {
            self.result.emit_pieces(&pieces);
        }
    }
}
