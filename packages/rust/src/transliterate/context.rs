use super::helpers::{
    InputTextCursor, PrevContextBuilder, PrevContextItem, ResultStringBuilder, is_script_tamil_ext,
    is_standard_scheme, is_ta_ext_superscript_tail,
};
use super::transliterate::TransliterationFnOptions;
use crate::custom_options::CustomOptions;
use crate::script_data::{CheckInEnum, List, Rule, ScriptData, TextToKramaMap};
use crate::scripts::ScriptListEnum;
use alloc::string::String;
use core::borrow::Borrow;

/// How the previous context (`prev_context`) is used, from the types of the two scripts.
/// It is in use in every mode but [`ContextMode::None`].
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(super) enum ContextMode {
    /// brahmic -> brahmic, or other -> other without typing: no context
    None,
    /// the inherent vowel (schwa) is written after a vyanjana
    BrahmicToOther,
    /// a vowel after a vyanjana is its mAtrA, a vyanjana without a vowel takes the halant
    OtherToBrahmic,
    /// typing (`Normal`) into an `other` script: only the length of the context is used
    TypingToOther,
}

impl ContextMode {
    pub(super) fn of(
        from_script: &ScriptListEnum,
        from_script_data: &ScriptData,
        to_script_data: &ScriptData,
        typing_mode: bool,
    ) -> Self {
        match (from_script_data, to_script_data) {
            (ScriptData::Brahmic { .. }, ScriptData::Other { .. }) => ContextMode::BrahmicToOther,
            (ScriptData::Other { .. }, ScriptData::Brahmic { .. }) => ContextMode::OtherToBrahmic,
            (_, ScriptData::Other { .. })
                if typing_mode && *from_script == ScriptListEnum::Normal =>
            {
                ContextMode::TypingToOther
            }
            _ => ContextMode::None,
        }
    }
}

/// Everything a transliteration call works with: the data, the options resolved once, and the
/// state of the pass over the input
pub(super) struct TransliterateCtx<'a, R> {
    pub(super) from_script: &'a ScriptListEnum,
    pub(super) from_script_data: &'a ScriptData,
    pub(super) to_script_data: &'a ScriptData,
    pub(super) custom_rules: &'a [R],
    pub(super) cursor: &'a mut InputTextCursor<'a>,
    pub(super) result: &'a mut ResultStringBuilder,
    /// The last items read (their text in the input and the type of the brahmic script)
    pub(super) prev_context: &'a mut PrevContextBuilder<'a>,
    pub(super) mode: ContextMode,
    /// halant of the brahmic script of the pair
    pub(super) brahmic_halant: Option<&'a str>,
    /// nuqta of the brahmic script of the pair, `None` if it has none (or no brahmic side)
    pub(super) brahmic_nuqta: Option<&'a str>,
    pub(super) typing_mode: bool,
    pub(super) include_inherent_vowel: bool,
    pub(super) use_native_numerals: bool,
    pub(super) is_from_tamil_ext: bool,
    pub(super) is_to_tamil_ext: bool,
    /// typing mode, or the `normal_to_all:use_typing_chars` option
    pub(super) use_typing_chars: bool,
    /// the typing map of the target script is used (`Normal` as the input)
    pub(super) use_typing_map: bool,
    /// the script data whose (typing) text to krama map is looked up
    pub(super) lookup_data: &'a ScriptData,
    /// The map whose indices the lookups (`text_to_krama_map_index`, ...) return
    pub(super) text_to_krama_map: &'a [(String, TextToKramaMap)],
    pub(super) from_is_other: bool,
    /// `~` is a letter in some romanization schemes (Harvard-Kyoto candrabindu, ITRANS `~N`),
    /// there it is read instead of skipped
    pub(super) tilde_is_text: bool,
    /// Between two romanizations, one of them a standard scheme, ॐ is read only at the start of
    /// a word (there is no vyanjana context to tell `logoṃ` लोगों from ॐ). Normal and Romanized
    /// are kept as they were.
    pub(super) om_only_at_word_start: bool,
    /// the `all_to_normal:preserve_specific_chars` option, to `Normal`
    pub(super) preserve_specific_chars: bool,
    /// `direct_replace` and input side `replace_prev_krama_keys` rules are applied after every
    /// piece of a match
    pub(super) has_in_match_rules: bool,
    /// the `all_to_sinhala:use_conjunct_enabling_halant` option, to `Sinhala`
    pub(super) sinhala_conjunct_halant: bool,
    /// Index of a Tamil-Extended superscript that was read with the match before it (a halant, a
    /// mAtrA or Vedic svaras are written in between), to be skipped when the cursor gets there.
    /// `-1` if none. Used when converting from Tamil-Extended
    pub(super) ta_ext_skip_index: isize,
    /// the matched text ends with a Tamil-Extended superscript that is not next to the rest
    /// of it in the input (a Vedic svara is in between), so it is not to be advanced over
    pub(super) ta_ext_superscript_detached: bool,
}

impl<'a, R> TransliterateCtx<'a, R>
where
    R: Borrow<Rule>,
{
    /// `opts` with the custom options that turn them on already applied
    #[allow(clippy::too_many_arguments)]
    pub(super) fn new(
        mode: ContextMode,
        from_script: &'a ScriptListEnum,
        to_script: &'a ScriptListEnum,
        from_script_data: &'a ScriptData,
        to_script_data: &'a ScriptData,
        trans_options: &CustomOptions,
        custom_rules: &'a [R],
        opts: TransliterationFnOptions,
        cursor: &'a mut InputTextCursor<'a>,
        result: &'a mut ResultStringBuilder,
        prev_context: &'a mut PrevContextBuilder<'a>,
    ) -> Self {
        let (brahmic_nuqta, brahmic_halant) = match (from_script_data, to_script_data) {
            (ScriptData::Brahmic { nuqta, halant, .. }, ScriptData::Other { .. }) => {
                (nuqta.as_deref(), Some(halant.as_str()))
            }
            (ScriptData::Other { .. }, ScriptData::Brahmic { nuqta, halant, .. }) => {
                (nuqta.as_deref(), Some(halant.as_str()))
            }
            _ => (None, None),
        };

        let use_typing_chars = opts.typing_mode || trans_options.normal_to_all_use_typing_chars;
        // choose matching map
        let use_typing_map = use_typing_chars && *from_script == ScriptListEnum::Normal;
        let lookup_data = if use_typing_map {
            to_script_data
        } else {
            from_script_data
        };
        let text_to_krama_map = if use_typing_map {
            &to_script_data.typing_text_to_krama_map
        } else {
            &from_script_data.text_to_krama_map
        };
        let has_in_match_rules = custom_rules.iter().any(|rule| match rule.borrow() {
            Rule::DirectReplace { use_replace, .. } => use_replace != &Some(true),
            Rule::ReplacePrevKramaKeys {
                use_replace,
                check_in,
                ..
            } => use_replace != &Some(true) && !matches!(check_in, Some(CheckInEnum::Output)),
        });

        TransliterateCtx {
            from_script,
            from_script_data,
            to_script_data,
            custom_rules,
            cursor,
            result,
            prev_context,
            mode,
            brahmic_halant,
            brahmic_nuqta,
            typing_mode: opts.typing_mode,
            include_inherent_vowel: opts.include_inherent_vowel,
            use_native_numerals: opts.use_native_numerals,
            is_from_tamil_ext: is_script_tamil_ext(from_script),
            is_to_tamil_ext: is_script_tamil_ext(to_script),
            use_typing_chars,
            use_typing_map,
            lookup_data,
            text_to_krama_map,
            from_is_other: matches!(from_script_data, ScriptData::Other { .. }),
            tilde_is_text: lookup_data
                .text_to_krama_map_char_index('~', use_typing_map)
                .is_some()
                || from_script_data.krama_index_of_char('~').is_some(),
            om_only_at_word_start: matches!(from_script_data, ScriptData::Other { .. })
                && matches!(to_script_data, ScriptData::Other { .. })
                && (is_standard_scheme(from_script) || is_standard_scheme(to_script)),
            preserve_specific_chars: trans_options.all_to_normal_preserve_specific_chars
                && *to_script == ScriptListEnum::Normal,
            has_in_match_rules,
            sinhala_conjunct_halant: *to_script == ScriptListEnum::Sinhala
                && trans_options.all_to_sinhala_use_conjunct_enabling_halant,
            ta_ext_skip_index: -1,
            ta_ext_superscript_detached: false,
        }
    }

    /// The last context item is a vyanjana, or a vyanjana + nuqta
    #[inline]
    pub(super) fn prev_ends_with_vyanjana(&self) -> bool {
        self.prev_context
            .type_at(-1)
            .is_some_and(|k| k.is_vyanjana())
            || (self.brahmic_nuqta.is_some()
                && self
                    .prev_context
                    .type_at(-2)
                    .is_some_and(|k| k.is_vyanjana())
                && self.prev_context.text_at(-1) == self.brahmic_nuqta)
    }

    /// The result ends with a Tamil-Extended superscript (a mAtrA, halant or Vedic svara written
    /// next goes before it)
    #[inline]
    pub(super) fn result_ends_with_ta_ext_superscript(&self) -> bool {
        self.is_to_tamil_ext && is_ta_ext_superscript_tail(self.result.last_char())
    }

    /// Emits the (skipped) halant in other -> brahmic conversion
    fn emit_halant(&mut self) {
        let (
            Some(brahmic_halant),
            ScriptData::Brahmic {
                halant: to_halant, ..
            },
        ) = (self.brahmic_halant, self.to_script_data)
        else {
            return;
        };
        let should_reorder = self.result_ends_with_ta_ext_superscript();
        self.result
            .emit_pieces_with_reorder(&[brahmic_halant], to_halant, should_reorder);

        if self.sinhala_conjunct_halant
            && let Some(last_piece) = self.result.last_piece()
        {
            self.result.rewrite_at(-1, &{
                let mut s = String::with_capacity(last_piece.len() + 3);
                s.push_str(last_piece);
                s.push('\u{200D}');
                s
            });
        }
    }

    /// vyanjana (+ nuqta) + mAtrA in the context: the syllable is complete, an `anya` after it
    /// starts with an empty context
    fn clear_context_after_matra(&mut self) {
        if (self.brahmic_nuqta.is_some()
            && self
                .prev_context
                .type_at(-3)
                .is_some_and(|k| k.is_vyanjana())
            && self.prev_context.text_at(-2) == self.brahmic_nuqta
            && self.prev_context.type_at(-1).is_some_and(|k| k.is_matra()))
            || (self
                .prev_context
                .type_at(-2)
                .is_some_and(|k| k.is_vyanjana())
                && self.prev_context.type_at(-1).is_some_and(|k| k.is_matra()))
        {
            self.prev_context.clear();
        }
    }

    /// brahmic -> other: the inherent vowel of the vyanjana before the item, when the item is
    /// not its mAtrA or halant
    fn emit_pending_schwa(&mut self, item_text: Option<&'a str>, item_type: Option<&'a List>) {
        // Short-circuit chain ordered cheapest/most selective first (all checks are pure).
        // Since `item_text != halant` is required, the former `to_anya_or_null`
        // (`(!matra && text != halant) || anya || none`) reduces to `!matra`.
        if let ScriptData::Other {
            schwa_character, ..
        } = self.to_script_data
            && !item_type.is_some_and(|k| k.is_matra())
            // vyanjana or vyanjana + nuqta
            && self.prev_ends_with_vyanjana()
            && item_text != self.brahmic_halant
            && (self.brahmic_nuqta.is_none() || item_text != self.brahmic_nuqta)
            && (!self.is_from_tamil_ext
                || item_text.and_then(|k| k.chars().next())
                    != self.brahmic_halant.and_then(|k| k.chars().next()))
        {
            self.result.emit(schwa_character);
        }
    }

    /// other -> brahmic: a vowel after a vyanjana is written as its mAtrA, else the vyanjana
    /// takes the halant.
    ///
    /// Returns `true` when the item (the mAtrA) was written to the result here
    fn join_to_prev_vyanjana(
        &mut self,
        item_text: Option<&'a str>,
        item_type: Option<&'a List>,
    ) -> bool {
        let to_script_data = self.to_script_data;
        let prev_is_vyanjana = self
            .prev_context
            .type_at(-1)
            .is_some_and(|k| k.is_vyanjana());
        if prev_is_vyanjana && item_type.is_some_and(|k| k.is_matra() || k.is_svara()) {
            let linked_matra: &str = item_type
                .and_then(|item_type| match item_type {
                    List::Svara {
                        matra_krama_ref, ..
                    } => Some(
                        to_script_data.krama_text_or_empty(*matra_krama_ref.first().unwrap_or(&-1)),
                    ),
                    _ => None,
                })
                .unwrap_or_else(|| item_text.unwrap_or(""));

            if let ScriptData::Brahmic { halant, .. } = to_script_data {
                let should_reorder = self.result_ends_with_ta_ext_superscript();
                self.result
                    .emit_pieces_with_reorder(&[linked_matra], halant, should_reorder);
                return true;
            }
            return false;
        }
        if
        // default transliteration behavior (without schwa deletion)
        (!self.include_inherent_vowel
            && prev_is_vyanjana
            && !item_type.is_some_and(|k| k.is_matra())
            && item_text != self.brahmic_halant)
            // if to include inherent vowel then check when to add that skipped halant
            || (self.include_inherent_vowel
                && item_type.is_some_and(|k| k.is_vyanjana())
                && self.prev_ends_with_vyanjana())
        {
            self.emit_halant();
        }
        false
    }

    /// The typing mode context clear, then the item is added to the context
    fn update_prev_context(
        &mut self,
        item: PrevContextItem<'a>,
        next: Option<&[String]>,
        emits_ta_ext_superscript_tail: bool,
    ) {
        if !self.typing_mode {
            self.prev_context.push(item);
            return;
        }
        // custom typing mode context clear logic
        // only clear context if there are no next characters
        if next.map(|n| n.is_empty()).unwrap_or(true)
            // the case below is to enable typing of _, ' (Vedic svara chihnas too)
            && !(self.is_to_tamil_ext
                && (emits_ta_ext_superscript_tail
                    || is_ta_ext_superscript_tail(self.result.last_char())))
            // do not clear the context only if case where the current added element is a vyanjana
            && !item.1.is_some_and(|k| k.is_vyanjana())
        {
            self.prev_context.clear();
            return;
        }
        self.prev_context.push(item);
    }

    /// Called before an item is written: writes what the context still owes (the inherent vowel,
    /// the halant, or the item itself as a mAtrA), then adds the item to the context.
    ///
    /// - `item`: the text of the current item (stored in the context) and its list item (type)
    /// - `next`: the keys that can follow the item (typing mode: the context is kept while more
    ///   keys can follow)
    ///
    /// Returns `true` when the current write already handled concatenation/reordering.
    pub(super) fn prev_context_cleanup(
        &mut self,
        item: PrevContextItem<'a>,
        next: Option<&[String]>,
    ) -> bool {
        self.prev_context_cleanup_ext(item, next, false)
    }

    /// [`Self::prev_context_cleanup`] with `emits_ta_ext_superscript_tail`: the text of the
    /// current item (emitted after this call) ends with a Tamil-Extended superscript, eg
    /// `RR` -> `ரூ²`. Like when the superscript is already the last character, the typing
    /// context is kept so that a Vedic svara typed next goes before it.
    pub(super) fn prev_context_cleanup_ext(
        &mut self,
        item: PrevContextItem<'a>,
        next: Option<&[String]>,
        emits_ta_ext_superscript_tail: bool,
    ) -> bool {
        let (item_text, item_type) = item;
        if item_type.is_some_and(|k| k.is_anya()) {
            self.clear_context_after_matra();
        }
        let mut result_str_concat_status = false;
        match self.mode {
            ContextMode::BrahmicToOther => self.emit_pending_schwa(item_text, item_type),
            ContextMode::OtherToBrahmic => {
                result_str_concat_status = self.join_to_prev_vyanjana(item_text, item_type);
            }
            ContextMode::TypingToOther | ContextMode::None => {}
        }
        self.update_prev_context(item, next, emits_ta_ext_superscript_tail);
        result_str_concat_status
    }

    /// After the last character: the inherent vowel / halant still owed to a trailing vyanjana.
    /// Nothing is added to the context.
    pub(super) fn flush_prev_context(&mut self) {
        if self.mode == ContextMode::None {
            return;
        }
        // (the JS version does not clear the context here)
        self.clear_context_after_matra();
        match self.mode {
            ContextMode::BrahmicToOther => self.emit_pending_schwa(None, None),
            ContextMode::OtherToBrahmic => {
                self.join_to_prev_vyanjana(None, None);
            }
            ContextMode::TypingToOther | ContextMode::None => {}
        }
    }
}

/// The text of a match as it is stored in the context: a match which is the halant (a halant
/// variant matched as a whole, or the halant typed by its own key) is stored as the halant itself
#[inline]
pub(super) fn context_text_of_match<'a>(
    script_data: &ScriptData,
    krama: &[i16],
    matched_text: &'a str,
    halant: Option<&'a str>,
) -> &'a str {
    match halant {
        Some(halant) if krama.len() == 1 && script_data.krama_text_or_empty(krama[0]) == halant => {
            halant
        }
        _ => matched_text,
    }
}
