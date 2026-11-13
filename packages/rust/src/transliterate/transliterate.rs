//! The transliteration core.
//!
//! [`transliterate_text_core_with`] reads the input once, character by character:
//!
//! 1. The input is prepared: the typing aliases, then the custom rules that are a plain replace
//!    on the input (`apply_custom_replace_rules`).
//! 2. A character that is copied as it is (space, punctuation, an ASCII digit when native
//!    numerals are off, a preserved custom character) is emitted and the loop goes on.
//! 3. Step 1 (`matcher.rs`): the longest text of the text to krama map at this position.
//!    `emit_match` writes its krama in the target script.
//! 4. Step 2 (`emit_krama_char`): a character without a match (or a match without a krama of its
//!    own) is looked up in the krama array directly. An unknown character is copied.
//! 5. Before every item is written `prev_context_cleanup` (`context.rs`) looks at the last items
//!    (`prev_context`): between a brahmic and an `other` script the inherent vowel, the halant
//!    and the mAtrA form of a vowel depend on what came before (`ContextMode`).
//! 6. After every match the custom rules of the enabled options are applied on the end of the
//!    result (`custom_rules.rs`), and at the end the ones that are a plain replace on the output.
//!
//! Tamil-Extended has its own handling in Step 1 and when writing (`tamil_ext.rs`).
//!
//! ## Inlining
//!
//! The steps are separate functions to be read, not to be called: the ones that run for every
//! character are `#[inline(always)]`, so the compiled loop is one function as before the split.
//! As calls, the fields of the context have to be reloaded after each of them, and the copy of
//! the core in the typing context is not specialised for its fixed options (measured: 6 to 13%
//! slower). The rare cases (Tamil-Extended, NFD, ॐ inside a word, unknown characters, the
//! in-match rules) are `#[inline(never)]`, to keep them out of that loop. Run `cargo bench`
//! before and after changing any of these attributes.

use super::context::{ContextMode, TransliterateCtx, context_text_of_match};
use super::custom_rules::apply_custom_replace_rules;
use super::helpers::{
    self, InputTextCursor, PrevContextBuilder, ResultStringBuilder, ZWJ, ZWNJ, char_eq_str,
    emit_krama_pieces, is_skip_char, is_ta_ext_superscript_tail, krama_has_output,
};
use super::matcher::only_read_in_longer_text;
use crate::custom_options::CustomOptions;
use crate::script_data::{CheckInEnum, List, Rule, ScriptData, TextToKramaMap};
use crate::scripts::ScriptListEnum;
use alloc::borrow::Cow;
use alloc::string::String;
use alloc::vec::Vec;
use core::borrow::Borrow;

pub use super::options::{
    ResolvedTransliterationRules, get_active_custom_options, resolve_transliteration_rules,
};

const DEFAULT_USE_NATIVE_NUMERALS_MODE: bool = true;
const DEFAULT_INCLUDE_INHERENT_VOWEL_MODE: bool = false;

#[derive(Debug, Clone, Copy)]
pub struct TransliterationFnOptions {
    pub typing_mode: bool,
    pub use_native_numerals: bool,
    pub include_inherent_vowel: bool,
}

impl Default for TransliterationFnOptions {
    fn default() -> Self {
        Self {
            typing_mode: false,
            use_native_numerals: DEFAULT_USE_NATIVE_NUMERALS_MODE,
            include_inherent_vowel: DEFAULT_INCLUDE_INHERENT_VOWEL_MODE,
        }
    }
}

#[derive(Debug, Clone)]
pub struct TransliterationOutput {
    pub output: String,
    #[allow(dead_code)]
    pub context_length: usize,
}

#[inline]
#[allow(dead_code)]
fn is_single_ascii_digit(s: &str) -> bool {
    s.len() == 1 && s.chars().next().is_some_and(|c| c.is_ascii_digit())
}

/// Where [`transliterate_text_core_with`] gets its working buffers from and returns them to.
///
/// Generic (rather than always passing a scratch struct) so that the plain one-shot path
/// monomorphizes to exactly the allocate-fresh code, with no reuse bookkeeping.
pub trait CoreBuffers {
    /// Buffer for the input char table (contents are discarded).
    fn take_chars(&mut self) -> Vec<(char, usize)>;
    /// Buffer for the output (contents are discarded).
    fn take_out(&mut self) -> String;
    /// Hands the char-table buffer back after the call.
    fn put_chars(&mut self, chars: Vec<(char, usize)>);
}

/// Allocates fresh buffers on every call (the one-shot transliteration path).
pub struct FreshBuffers;

impl CoreBuffers for FreshBuffers {
    #[inline(always)]
    fn take_chars(&mut self) -> Vec<(char, usize)> {
        Vec::new()
    }
    #[inline(always)]
    fn take_out(&mut self) -> String {
        String::new()
    }
    #[inline(always)]
    fn put_chars(&mut self, _chars: Vec<(char, usize)>) {}
}

/// Reusable buffers, so repeated calls (typing mode re-transliterates the context on
/// every key) avoid per-call allocations. Give an output allocation back via `out`.
#[derive(Debug, Default)]
pub struct TransliterateScratch {
    /// char table of the input (see `InputTextCursor`)
    chars: Vec<(char, usize)>,
    /// Spare allocation used for the next call's output.
    pub out: String,
}

impl CoreBuffers for &mut TransliterateScratch {
    #[inline(always)]
    fn take_chars(&mut self) -> Vec<(char, usize)> {
        core::mem::take(&mut self.chars)
    }
    #[inline(always)]
    fn take_out(&mut self) -> String {
        core::mem::take(&mut self.out)
    }
    #[inline(always)]
    fn put_chars(&mut self, chars: Vec<(char, usize)>) {
        self.chars = chars;
    }
}

impl<'a, R> TransliterateCtx<'a, R>
where
    R: Borrow<Rule>,
{
    /// The superscript of a Tamil-Extended match that was read with it (see
    /// `ta_ext_skip_index`)
    #[inline(always)]
    fn skip_consumed_ta_ext_superscript(&mut self, text_index: usize) -> bool {
        if self.ta_ext_skip_index == -1 || (text_index as isize) < self.ta_ext_skip_index {
            return false;
        }
        self.ta_ext_skip_index = -1;
        self.cursor.advance(1);
        true
    }

    /// skip certain chars (preserve as-is), they also end the context
    fn emit_skip_char(&mut self, ch: char) {
        self.cursor.advance(1);
        if self.mode != ContextMode::None {
            self.prev_context_cleanup((Some(" "), None), None);
            self.prev_context.clear();
        }
        self.result.emit_char(ch);
    }

    /// latin digits passthrough if native numerals disabled
    #[inline(never)]
    fn emit_ascii_digit(&mut self, ch: char) {
        self.cursor.advance(1);
        const DIGIT_STRS: [&str; 10] = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
        let digit_str = DIGIT_STRS[(ch as u8 - b'0') as usize];
        // cleanup first, so a pending halant/schwa goes before the digit (k0 -> क्0)
        let _ = self.prev_context_cleanup((Some(digit_str), None), None);
        self.result.emit_char(ch);
    }

    /// Preserve mode: custom script chars when converting to Normal
    /// (unless it starts a longer text, the Sinhala ZWJ + al-lakuna `‍්` is a halant)
    ///
    /// Returns `true` when the character was a custom script character (written as its Normal
    /// key)
    #[inline(never)]
    fn emit_preserved_custom_char(&mut self, ch: char, text_index: usize) -> bool {
        let from_script_data = self.from_script_data;
        let mut ch_buf = [0u8; 4];
        let ch_str = ch.encode_utf8(&mut ch_buf);
        let Some(custom_idx) = from_script_data.custom_script_char_index_of_text(ch_str) else {
            return false;
        };
        if only_read_in_longer_text(from_script_data, self.cursor, text_index) {
            return false;
        }
        let (custom_text, list_ref_opt, back_ref_opt) =
            &from_script_data.custom_script_chars_arr[custom_idx];
        let list_item = list_ref_opt.and_then(|i| from_script_data.list.get(i as usize));
        self.prev_context_cleanup((Some(custom_text.as_str()), list_item), None);

        let normal_text = back_ref_opt
            .and_then(|i| from_script_data.typing_text_to_krama_map.get(i as usize))
            .map(|(s, _)| s.as_str())
            .unwrap_or_default();
        self.result.emit(normal_text);
        self.cursor.advance(custom_text.chars().count());
        true
    }

    /// The characters that are copied as they are (not looked up in the script data).
    ///
    /// Returns `true` when the character was one of them (it is emitted and advanced over)
    #[inline(always)]
    fn emit_passthrough_char(&mut self, ch: char, text_index: usize) -> bool {
        if is_skip_char(ch) && !(ch == '~' && self.tilde_is_text) {
            self.emit_skip_char(ch);
            return true;
        }
        if ch.is_ascii_digit() && !self.use_native_numerals {
            self.emit_ascii_digit(ch);
            return true;
        }
        self.preserve_specific_chars && self.emit_preserved_custom_char(ch, text_index)
    }

    /// brahmic -> other: the list item (type info) that stands for a match of the brahmic text
    fn source_list_item_of_match(&self, map: &TextToKramaMap, krama: &[i16]) -> Option<&'a List> {
        let from_script_data = self.from_script_data;
        // pick a brahmic list item (from-script) if available
        if !self.use_typing_chars
            && let Some(item) = map
                .fallback_list_ref
                .and_then(|i| from_script_data.list.get(i as usize))
        {
            return Some(item);
        }
        if krama.is_empty() {
            return None;
        }
        if self.is_from_tamil_ext {
            let any_is = |test: fn(&List) -> bool| {
                krama
                    .iter()
                    .any(|&k| from_script_data.list_item_of_krama(k).is_some_and(test))
            };
            // a mixture of vyanjana and mAtrA is an anya
            if any_is(List::is_matra) && any_is(List::is_vyanjana) {
                return Some(&helpers::ANYA_LIST_ITEM);
            }
            if krama.len() > 1
                && krama
                    .iter()
                    .any(|&k| from_script_data.list_item_of_krama(k).is_none())
            {
                return krama
                    .last()
                    .and_then(|&k| from_script_data.list_item_of_krama(k));
            }
        }
        krama
            .first()
            .and_then(|&k| from_script_data.list_item_of_krama(k))
    }

    /// other -> brahmic: the context update for a match, the item is of the brahmic target
    #[inline(always)]
    fn update_context_for_brahmic_target(
        &mut self,
        matched_text: &'a str,
        map: &'a TextToKramaMap,
        krama: &[i16],
    ) -> bool {
        let to_script_data = self.to_script_data;
        let item: Option<&List> = if let Some(f) = map.fallback_list_ref {
            to_script_data.list.get(f as usize)
        } else {
            krama
                .first()
                .and_then(|&k| to_script_data.list_item_of_krama(k))
        };

        let typing_from_normal = self.typing_mode && *self.from_script == ScriptListEnum::Normal;
        let next_list = if typing_from_normal {
            map.next.as_deref()
        } else {
            None
        };
        // The halant typed by its own key (`.h`) is passed as the halant
        // itself, so that the cleanup does not add a second one after a
        // vyanjana (k.h -> क्, not क््)
        let item_text =
            context_text_of_match(to_script_data, krama, matched_text, self.brahmic_halant);
        let emits_ta_ext_superscript_tail = typing_from_normal
            && self.is_to_tamil_ext
            && krama.last().is_some_and(|&k| {
                is_ta_ext_superscript_tail(to_script_data.krama_text_or_empty(k).chars().last())
            });
        self.prev_context_cleanup_ext(
            (Some(item_text), item),
            next_list,
            emits_ta_ext_superscript_tail,
        )
    }

    /// The context update for a match with a krama, by the mode.
    ///
    /// Returns `true` when the cleanup already wrote the item (as the mAtrA of the vyanjana
    /// before)
    #[inline(always)]
    fn update_context_for_match(
        &mut self,
        matched_text: &'a str,
        map: &'a TextToKramaMap,
        krama: &[i16],
    ) -> bool {
        match self.mode {
            ContextMode::BrahmicToOther => {
                let item = self.source_list_item_of_match(map, krama);
                // A halant variant matched as a whole (Sinhala al-lakuna + ZWJ `්‍`)
                // is passed as the halant itself, so that the cleanup does not add an
                // inherent vowel before it (ක්‍ෂ -> kSha, not kaSha)
                let item_text = context_text_of_match(
                    self.from_script_data,
                    krama,
                    matched_text,
                    self.brahmic_halant,
                );
                self.prev_context_cleanup((Some(item_text), item), None)
            }
            ContextMode::OtherToBrahmic => {
                self.update_context_for_brahmic_target(matched_text, map, krama)
            }
            ContextMode::TypingToOther => {
                self.prev_context_cleanup((Some(matched_text), None), map.next.as_deref())
            }
            ContextMode::None => false,
        }
    }

    /// Emits the krama piece by piece, the rules that can apply inside a match see every piece
    /// of it, not only the last: Romanized sh (स्ह) -> ස්‍හ with the Sinhala conjunct
    /// ZWJ, Sinhala ඟ (ङ्ग) -> nga, or -> ंग with the anusvAra option
    #[inline(never)]
    fn emit_krama_with_in_match_rules(&mut self, krama: &[i16], match_start: usize) {
        let to_script_data = self.to_script_data;
        for (i, &k) in krama.iter().enumerate() {
            if k < 0 {
                continue;
            }
            let piece = to_script_data.krama_text_or_empty(k);
            self.result.emit(piece);
            if !piece.is_empty() && i + 1 < krama.len() {
                let next_index = self.cursor.pos() as isize;
                self.apply_custom_trans_rules(
                    match_start as isize,
                    next_index,
                    &krama[..=i],
                    Some(krama[i + 1]),
                );
            }
        }
    }

    /// A match with a krama (at least one entry is not `-1`): emitted directly
    #[inline(always)]
    fn emit_match_krama(
        &mut self,
        matched_text: &'a str,
        map: &'a TextToKramaMap,
        krama: &[i16],
        match_start: usize,
    ) {
        let to_script_data = self.to_script_data;
        // prev-context bookkeeping
        let result_concat_status = self.update_context_for_match(matched_text, map, krama);
        if !result_concat_status {
            // Tamil-Extended output reorder (matra/halant after superscript)
            if let ScriptData::Brahmic {
                halant: to_halant, ..
            } = to_script_data
                && self.result_ends_with_ta_ext_superscript()
            {
                self.emit_krama_after_ta_ext_superscript(krama, to_halant);
            } else if self.has_in_match_rules && krama.len() > 1 {
                self.emit_krama_with_in_match_rules(krama, match_start);
            } else {
                emit_krama_pieces(self.result, to_script_data, krama);
            }
        }

        if !self.custom_rules.is_empty() {
            let next_index = self.cursor.pos() as isize;
            self.apply_custom_trans_rules(match_start as isize, next_index, krama, None);
        }
    }

    /// krama contains -1 entries: emit raw match
    /// (prefix-only entries like `c` of `ch` or `S` of `Sh`)
    #[inline(never)]
    fn emit_prefix_only_match(&mut self, matched_text: &'a str, next: Option<&[String]>) {
        // cleanup first, so a pending halant goes before the text (kc -> क्c)
        if self.typing_mode {
            self.prev_context_cleanup((Some(matched_text), None), next);
        } else if self.mode != ContextMode::None {
            // like an unknown character (see Step 2), `kca` -> क्cअ
            self.prev_context_cleanup((Some(matched_text), None), None);
            self.prev_context.clear();
        }
        self.result.emit(matched_text);
    }

    /// Writes the match of Step 1 and advances over it. The cursor is on the first character
    /// of the match, `ch`.
    ///
    /// Returns `false` when the entry has no krama of its own: its text is read in Step 2
    ///
    /// - `superscript_detached`: see [`super::tamil_ext::TaExtSuperscript::detached`]
    #[inline(always)]
    fn emit_match(&mut self, match_index: usize, ch: char, superscript_detached: bool) -> bool {
        let text_to_krama_map = self.text_to_krama_map;
        let to_script_data = self.to_script_data;
        let (matched_text, map) = &text_to_krama_map[match_index];
        let match_start = self.cursor.pos();
        // a match always starts at `ch`, so equal byte length means it is exactly `ch`
        let matched_char_count = if matched_text.len() == ch.len_utf8() {
            1
        } else {
            matched_text.chars().count()
        };
        let matched_len_units = matched_char_count
            - self.ta_ext_unconsumed_superscript_units(
                superscript_detached,
                matched_text,
                matched_char_count,
                map,
            );
        self.cursor.advance(matched_len_units);

        if self.use_typing_chars
            && let Some(custom_back_ref) = map.custom_back_ref
            && custom_back_ref >= 0
            && let Some(custom_item) = to_script_data
                .custom_script_chars_arr
                .get(custom_back_ref as usize)
        {
            let list_item = custom_item
                .1
                .and_then(|li| to_script_data.list.get(li as usize));
            // cleanup first, so a pending halant goes before the custom character
            // (kqq -> क्q, k.qSha -> क्‍ष)
            // custom characters are never svara/mAtrA, so cleanup never emits them itself
            self.prev_context_cleanup(
                (Some(matched_text.as_str()), list_item),
                map.next.as_deref(),
            );
            self.result.emit(custom_item.0.as_str());
            return true;
        }

        let Some(krama) = &map.krama else {
            return false;
        };
        if krama_has_output(krama) {
            self.emit_match_krama(matched_text, map, krama, match_start);
            return true;
        }
        if krama.contains(&-1) {
            self.emit_prefix_only_match(matched_text, map.next.as_deref());
            return true;
        }
        false
    }

    /// text not matched so ignore and return as it is
    #[inline(never)]
    fn emit_unknown_char(&mut self, text: &'a str) {
        // A ZWJ / ZWNJ only changes how a Brahmic text is shown (a conjunct, half form or
        // the eyelash ra र‍्), it is not written in Normal / Romanized and does not end the
        // syllable: क्‍ष and क‍्ष are kSha (were k‍Sha and ka‍Sha)
        if self.mode == ContextMode::BrahmicToOther
            && (char_eq_str(ZWJ, text) || char_eq_str(ZWNJ, text))
        {
            return;
        }
        if self.mode != ContextMode::None {
            self.prev_context_cleanup((Some(text), None), None);
            self.prev_context.clear();
        }
        self.result.emit(text);
    }

    /// The context update for the krama entry `index` read in Step 2, by the mode
    #[inline(always)]
    fn update_context_for_krama_char(
        &mut self,
        text: &'a str,
        index: usize,
        next: Option<&[String]>,
    ) -> bool {
        match self.mode {
            ContextMode::BrahmicToOther => {
                let from_script_data = self.from_script_data;
                let item = from_script_data.list_item_of_krama_index(index);
                self.prev_context_cleanup((Some(text), item), None)
            }
            ContextMode::OtherToBrahmic => {
                let to_script_data = self.to_script_data;
                let item = to_script_data.list_item_of_krama_index(index);
                self.prev_context_cleanup((Some(text), item), None)
            }
            ContextMode::TypingToOther => {
                // Typing into an `other` script: a key with no krama in the typing map (Romanized
                // `sh` / `ch`, prefixes of `shh` / `sh^` / `chh`) is resolved here. Pass its `next`
                // as in Step 1, so the context is kept while more keys can follow (else `shh` at
                // the start of a word comes out as `śh`), and cleared like in Step 1 when none can.
                self.prev_context_cleanup((Some(text), None), next);
                false
            }
            ContextMode::None => false,
        }
    }

    /// Step 2: Search in krama_text_arr
    ///
    /// The cursor is already after the character `ch` (or after the match without krama,
    /// `match_index`).
    #[inline(always)]
    fn emit_krama_char(&mut self, ch: char, match_index: Option<usize>) {
        let from_script_data = self.from_script_data;
        let to_script_data = self.to_script_data;
        let text_to_krama_map = self.text_to_krama_map;
        let text_to_krama_item = match_index.map(|i| &text_to_krama_map[i]);
        let char_to_search: &'a str = match text_to_krama_item {
            Some(item) => item.0.as_str(),
            None => self
                .cursor
                .peek_at_str(self.cursor.pos().saturating_sub(1))
                // pos - 1 as fallback consumed(advanced 1) the previous character
                .unwrap_or_default(),
        };

        let idx = if text_to_krama_item.is_none() {
            from_script_data.krama_index_of_char(ch)
            // more performanct : as searching char
        } else {
            from_script_data.krama_index_of_text(char_to_search)
        };
        let Some(index) = idx else {
            self.emit_unknown_char(char_to_search);
            return;
        };

        let result_concat_status = self.update_context_for_krama_char(
            char_to_search,
            index,
            text_to_krama_item.and_then(|(_, m)| m.next.as_deref()),
        );
        if !result_concat_status {
            if let ScriptData::Brahmic {
                halant: to_halant, ..
            } = to_script_data
                && self.result_ends_with_ta_ext_superscript()
            {
                self.emit_piece_after_ta_ext_superscript(index, to_halant);
            } else {
                self.result
                    .emit(to_script_data.krama_text_or_empty(index as i16));
            }
        }

        // (the start given to the rules is one character before the cursor, as it always was:
        // for a match of several characters without krama that is not the start of the match)
        if !self.custom_rules.is_empty() {
            let next_index = self.cursor.pos() as isize;
            self.apply_custom_trans_rules(next_index - 1, next_index, &[index as i16], None);
        }
    }
}

/// Synchronous core transliterator
#[allow(clippy::too_many_arguments)]
pub fn transliterate_text_core(
    text: &str,
    from_script: &ScriptListEnum,
    to_script: &ScriptListEnum,
    from_script_data: &ScriptData,
    to_script_data: &ScriptData,
    trans_options_in: &CustomOptions,
    custom_rules: &[impl Borrow<Rule>],
    options: Option<TransliterationFnOptions>,
) -> TransliterationOutput {
    transliterate_text_core_with(
        text,
        from_script,
        to_script,
        from_script_data,
        to_script_data,
        trans_options_in,
        custom_rules,
        options,
        FreshBuffers,
    )
}

/// [`transliterate_text_core`] taking its working buffers from `buffers`.
///
/// `#[inline]`: the typing context calls it with fixed options (typing mode, from `Normal`), in
/// its own copy the compiler drops the branches that never run there (measured: about 10% of the
/// typing time).
#[inline(always)]
#[allow(clippy::too_many_arguments)]
pub fn transliterate_text_core_with(
    text: &str,
    from_script: &ScriptListEnum,
    to_script: &ScriptListEnum,
    from_script_data: &ScriptData,
    to_script_data: &ScriptData,
    trans_options_in: &CustomOptions,
    custom_rules: &[impl Borrow<Rule>],
    options: Option<TransliterationFnOptions>,
    mut buffers: impl CoreBuffers,
) -> TransliterationOutput {
    let mut opts = options.unwrap_or_default();
    // the custom options turn these on too (the typing context passes them as `opts`)
    opts.use_native_numerals &= !trans_options_in.normal_to_brahmic_keep_ascii_numerals;
    opts.include_inherent_vowel |= trans_options_in.normal_to_brahmic_include_inherent_vowel;

    if opts.typing_mode && *from_script != ScriptListEnum::Normal {
        panic!("Typing mode is only supported with Normal script as the input");
        // ^ this is just a assertion, this will never be done in this codebase
        // as it is only called internally in `typing.rs` with from always being "Normal"
    }

    let trans_options = trans_options_in;

    let text = if opts.typing_mode && *from_script == ScriptListEnum::Normal {
        helpers::apply_typing_input_aliases(text, to_script)
    } else {
        Cow::Borrowed(text)
    };

    let text = apply_custom_replace_rules(
        text.as_ref(),
        from_script_data,
        custom_rules,
        CheckInEnum::Input,
    );

    let mode = ContextMode::of(
        from_script,
        from_script_data,
        to_script_data,
        opts.typing_mode,
    );
    let track_result_pieces = !custom_rules.is_empty()
        || (*to_script == ScriptListEnum::Sinhala
            && trans_options.all_to_sinhala_use_conjunct_enabling_halant);
    // ^ as currently we are using rewrite_at only for sinhala target
    let result_capacity = if mode == ContextMode::OtherToBrahmic {
        text.len().saturating_mul(3)
        // brahmic script usually use 3x more bytes
    } else {
        text.len()
    };
    let mut result =
        ResultStringBuilder::new_in(buffers.take_out(), result_capacity, track_result_pieces);
    let mut cursor = InputTextCursor::new_in(text.as_ref(), buffers.take_chars());
    let mut prev_context = PrevContextBuilder::new();

    let mut ctx = TransliterateCtx::new(
        mode,
        from_script,
        to_script,
        from_script_data,
        to_script_data,
        trans_options,
        custom_rules,
        opts,
        &mut cursor,
        &mut result,
        &mut prev_context,
    );

    let chars_len = ctx.cursor.char_count();
    while ctx.cursor.pos() < chars_len {
        let text_index = ctx.cursor.pos();
        let Some(ch) = ctx.cursor.peek() else {
            break;
        };

        if ctx.skip_consumed_ta_ext_superscript(text_index) {
            continue;
        }
        if ctx.emit_passthrough_char(ch, text_index) {
            continue;
        }

        // Step 1: match text_to_krama_map / typing_text_to_krama_map
        let text_match = ctx.match_text_to_krama(ch, text_index);
        // a Tamil-Extended superscript read with the match is skipped when the cursor gets there
        if let Some(superscript) = text_match.superscript {
            ctx.ta_ext_skip_index = superscript.index as isize;
        }
        match text_match.index {
            Some(match_index) => {
                let detached = text_match.superscript.is_some_and(|s| s.detached);
                if ctx.emit_match(match_index, ch, detached) {
                    continue;
                }
            }
            None => ctx.cursor.advance(1),
        }

        // Step 2: Search in krama_text_arr
        ctx.emit_krama_char(ch, text_match.index);
    }
    // the inherent vowel / halant of a last vyanjana
    ctx.flush_prev_context();

    let context_length = ctx.prev_context.length();
    // (taken via `ctx`: `cursor` stays borrowed for its whole lifetime)
    buffers.put_chars(ctx.cursor.take_buffer());

    let output = result.into_string();
    let output = if custom_rules.is_empty() {
        output
    } else {
        apply_custom_replace_rules(
            output.as_str(),
            to_script_data,
            custom_rules,
            CheckInEnum::Output,
        )
        .into_owned()
    };

    TransliterationOutput {
        output,
        context_length,
    }
}

pub fn transliterate_text(
    text: impl AsRef<str>,
    from_script: ScriptListEnum,
    to_script: ScriptListEnum,
    transliteration_input_options: Option<&CustomOptions>,
    options: Option<TransliterationFnOptions>,
) -> TransliterationOutput {
    let text = text.as_ref();

    let from_data = ScriptData::get_script_data(&from_script);
    let to_data = ScriptData::get_script_data(&to_script);

    // Keep only the custom options active for this script pair and flatten the rules of the
    // enabled ones into one list: the core reads these, not the input options.
    let ResolvedTransliterationRules {
        trans_options: active_resolved_trans_options,
        custom_rules: resolved_custom_rules,
    } = resolve_transliteration_rules(from_data, to_data, transliteration_input_options);

    transliterate_text_core(
        text,
        &from_script,
        &to_script,
        from_data,
        to_data,
        &active_resolved_trans_options,
        &resolved_custom_rules,
        options,
    )
}
