use std::collections::HashMap;

use crate::script_data::{CheckInEnum, List, Rule, ScriptData, ScriptTypeEnum};
use crate::transliterate::helpers::{
    InputTextCursor, PrevContextBuilder, ResultStringBuilder, is_ta_ext_superscript_tail,
};
use crate::utils::binary_search::binary_search_lower;

const CHARS_TO_SKIP: [char; 10] = [' ', '\n', '\r', '\t', ',', '~', '!', '@', '?', '%'];

const MAX_CONTEXT_LENGTH: u8 = 3;

struct TransliterateCtx<'a> {
    #[allow(dead_code)]
    from_script_name: &'a str,
    to_script_name: &'a str,
    from_script_data: &'a ScriptData,
    to_script_data: &'a ScriptData,
    trans_options: &'a HashMap<String, bool>,
    custom_rules: &'a Vec<Rule>,
    cursor: &'a mut InputTextCursor,
    result: &'a mut ResultStringBuilder,
    prev_context: &'a mut PrevContextBuilder,
    prev_context_in_use: bool,
    brahmic_halant: Option<String>,
    brahmic_nuqta: Option<String>,
    typing_mode: bool,
    include_inherent_vowels: bool,
}

impl<'a> TransliterateCtx<'a> {
    fn list_type_str(list: &List) -> &'static str {
        match list {
            List::Anya { .. } => "anya",
            List::Vyanjana { .. } => "vyanjana",
            List::Matra { .. } => "mAtrA",
            List::Svara { .. } => "svara",
        }
    }

    fn i16_vec_to_usize_vec(v: &[i16]) -> Option<Vec<usize>> {
        let mut out = Vec::with_capacity(v.len());
        for &n in v {
            if n < 0 {
                return None;
            }
            out.push(n as usize);
        }
        Some(out)
    }

    /// Port of JS `prev_context_cleanup`.
    ///
    /// Returns `true` when the current write already handled concatenation/reordering.
    fn prev_context_cleanup(
        &mut self,
        item: Option<(Option<String>, Option<List>)>,
        next: Option<&[String]>,
        last_extra_call: bool,
    ) -> bool {
        let mut result_str_concat_status = false;

        let brahmic_halant = self.brahmic_halant.as_deref();
        let brahmic_nuqta = self.brahmic_nuqta.as_deref();

        let item_text = item.as_ref().and_then(|(t, _)| t.as_deref());
        // let item_type = item.as_ref();

        // custom cleanup logic/cases
        if (brahmic_nuqta.is_some()
            && matches!(self.prev_context.type_at(-3), Some(List::Vyanjana { .. }))
            && self.prev_context.text_at(-2) == brahmic_nuqta
            && !matches!(self.prev_context.type_at(-1), Some(List::Matra { .. })))
            || (matches!(self.prev_context.type_at(-2), Some(List::Vyanjana { .. }))
                && !matches!(self.prev_context.type_at(-1), Some(List::Matra { .. })))
                && (
                    item.is_none()
                    // || !matches!(item_type, Some(List::Anya { .. }))
                )
        {
            self.prev_context.clear();
        }

        if matches!(self.from_script_data, ScriptData::Brahmic { .. })
            && matches!(self.to_script_data, ScriptData::Other { .. })
        {
            // custom logic when converting from brahmic to other
            // if item_text != brahmic_halant
            //     && (if crate::is_script_tamil_ext!(self.from_script_name) {
            //         match (item_text, brahmic_halant) {
            //             (Some(s), Some(h)) if !s.is_empty() => s.chars().next() != h.chars().next(),
            //             _ => true,
            //         }
            //     } else {
            //         true
            //     })
            //     && (brahmic_nuqta.is_none() || item_text != brahmic_nuqta)
            //     && (matches!(self.prev_context.type_at(-1), Some(List::Vyanjana { .. }))
            //         || (brahmic_nuqta.is_some()
            //             && matches!(self.prev_context.type_at(-2), Some(List::Vyanjana { .. }))
            //             && self.prev_context.text_at(-1) == brahmic_nuqta))
            //     && ((item_type != Some("mAtrA") && item_text != brahmic_halant)
            //         || item_type == Some("anya")
            //         || item.is_none())
            // {
            //     if let ScriptData::Other {
            //         schwa_character, ..
            //     } = self.to_script_data
            //     {
            //         self.result.emit(schwa_character.clone());
            //     }
            // }
        } else if matches!(self.from_script_data, ScriptData::Other { .. })
            && matches!(self.to_script_data, ScriptData::Brahmic { .. })
        {
            // custom logic when converting from other to brahmic
            if matches!(
                self.prev_context.type_at(-1),
                Some(List::Vyanjana { .. }) // && (item_type == Some("mAtrA") || item_type == Some("svara")
            ) {
                let linked_matra: String = match item.as_ref().and_then(|(_, l)| l.as_ref()) {
                    Some(List::Svara {
                        matra_krama_ref, ..
                    }) => {
                        let idx = matra_krama_ref
                            .as_ref()
                            .and_then(|v| v.first().copied())
                            .unwrap_or(-1);
                        if idx < 0 {
                            "".to_string()
                        } else {
                            self.to_script_data
                                .krama_text_or_empty(idx as usize)
                                .to_string()
                        }
                    }
                    _ => item_text.unwrap_or("").to_string(),
                };

                if let ScriptData::Brahmic { halant, .. } = self.to_script_data {
                    self.result.emit_pieces_with_reorder(
                        vec![linked_matra],
                        halant,
                        crate::is_script_tamil_ext!(self.to_script_name)
                            && is_ta_ext_superscript_tail(self.result.last_char()),
                    );
                    result_str_concat_status = true;
                }
            } else if !self.include_inherent_vowels
                && matches!(self.prev_context.type_at(-1), Some(List::Vyanjana { .. }))
                && !(
                    item_text == brahmic_halant
                    // || matches!(item_type, Some(List::Matra { .. }
                )
            {
                if let (Some(out_halant), ScriptData::Brahmic { halant, .. }) =
                    (brahmic_halant, self.to_script_data)
                {
                    let should_reorder = crate::is_script_tamil_ext!(self.to_script_name)
                        && is_ta_ext_superscript_tail(self.result.last_char());
                    self.result.emit_pieces_with_reorder(
                        vec![out_halant.to_string()],
                        halant,
                        should_reorder,
                    );

                    if self.to_script_name == "Sinhala"
                        && *self
                            .trans_options
                            .get("all_to_sinhala:use_conjunct_enabling_halant")
                            .unwrap_or(&false)
                    {
                        if let Some(last_piece) = self.result.last_piece() {
                            self.result
                                .rewrite_at(-1, format!("{}\u{200D}", last_piece));
                        }
                    }
                }
            } else if self.include_inherent_vowels
                // && item_type == Some("vyanjana")
                && (matches!(self.prev_context.type_at(-1), Some(List::Vyanjana { .. }))
                    || (brahmic_nuqta.is_some()
                        && matches!(self.prev_context.type_at(-2), Some(List::Vyanjana { .. }))
                        && self.prev_context.text_at(-1) == brahmic_nuqta))
            {
                if let (Some(out_halant), ScriptData::Brahmic { halant, .. }) =
                    (brahmic_halant, self.to_script_data)
                {
                    let should_reorder = crate::is_script_tamil_ext!(self.to_script_name)
                        && is_ta_ext_superscript_tail(self.result.last_char());
                    self.result.emit_pieces_with_reorder(
                        vec![out_halant.to_string()],
                        halant,
                        should_reorder,
                    );

                    if self.to_script_name == "Sinhala"
                        && *self
                            .trans_options
                            .get("all_to_sinhala:use_conjunct_enabling_halant")
                            .unwrap_or(&false)
                    {
                        if let Some(last_piece) = self.result.last_piece() {
                            self.result
                                .rewrite_at(-1, format!("{}\u{200D}", last_piece));
                        }
                    }
                }
            }
        }

        // custom typing mode context clear logic
        // only clear context if there are no next characters or if its last extra call
        let mut to_clear_context = false;
        if self.typing_mode
            && next.map(|n| n.is_empty()).unwrap_or(true)
            && !last_extra_call
            // the case below is to enable typing of #an, #s (Vedic svara chihnas too)
            && !(crate::is_script_tamil_ext!(self.to_script_name)
                && is_ta_ext_superscript_tail(self.result.last_char()))
        {
            to_clear_context = true;
            // do not clear the context only if case where the current added element is a vyanjana
            // if item_type == Some("vyanjana") {
            //     to_clear_context = false;
            // }
            if to_clear_context {
                self.prev_context.clear();
            }
        }

        // addition and shifting
        // in typing it should not be the last extra call
        if (!self.typing_mode) || (!last_extra_call && !to_clear_context) {
            if let Some(it) = item {
                self.prev_context.push(it);
            }
        }

        result_str_concat_status
    }

    /// Port of JS `apply_custom_rules`.
    fn apply_custom_rules(&mut self, text_index: isize, delta: isize) {
        let current_text_index = text_index + delta;

        for rule in self.custom_rules.iter() {
            match rule {
                Rule::ReplacePrevKramaKeys {
                    prev,
                    following,
                    replace_with,
                    check_in,
                    ..
                } => {
                    let prev_usize = match Self::i16_vec_to_usize_vec(prev) {
                        Some(v) => v,
                        None => continue,
                    };

                    let is_input = !matches!(check_in, Some(CheckInEnum::Output));
                    if is_input {
                        if current_text_index < 0 || text_index < 0 {
                            continue;
                        }
                        let prev_match = self.from_script_data.match_prev_krama_sequence(
                            |i| {
                                if i < 0 {
                                    None
                                } else {
                                    self.cursor.peek_at(i as usize)
                                }
                            },
                            current_text_index,
                            &prev_usize,
                        );

                        if prev_match.matched {
                            let next_char_info = self.cursor.peek_at(text_index as usize);
                            if let Some(next_char_info) = next_char_info {
                                if let Some(next_idx) = self
                                    .from_script_data
                                    .krama_index_of_text(&next_char_info.ch)
                                {
                                    let next_i16 = next_idx as i16;
                                    if following.contains(&next_i16) {
                                        let pieces =
                                            self.to_script_data.replace_with_pieces(replace_with);
                                        self.result
                                            .rewrite_tail_pieces(prev_match.matched_len, pieces);
                                    }
                                }
                            }
                        }
                    } else {
                        // output
                        let last_piece = match self.result.last_piece() {
                            Some(v) => v,
                            None => continue,
                        };

                        if let Some(following_idx) =
                            self.to_script_data.krama_index_of_text(&last_piece)
                        {
                            if !following.contains(&(following_idx as i16)) {
                                continue;
                            }
                            let prev_match = self.to_script_data.match_prev_krama_sequence(
                                |i| self.result.peek_at(i),
                                -2,
                                &prev_usize,
                            );
                            if prev_match.matched {
                                let mut pieces =
                                    self.to_script_data.replace_with_pieces(replace_with);
                                pieces.push(last_piece);
                                self.result
                                    .rewrite_tail_pieces(prev_match.matched_len + 1, pieces);
                            }
                        }
                    }
                }
                Rule::DirectReplace {
                    to_replace,
                    replace_with,
                    replace_text,
                    check_in,
                    ..
                } => {
                    let lookup_data = if matches!(check_in, Some(CheckInEnum::Output)) {
                        self.to_script_data
                    } else {
                        self.from_script_data
                    };

                    for search_group in to_replace.iter() {
                        let sg_usize = match Self::i16_vec_to_usize_vec(search_group) {
                            Some(v) => v,
                            None => continue,
                        };
                        let matched = lookup_data.match_prev_krama_sequence(
                            |i| self.result.peek_at(i),
                            -1,
                            &sg_usize,
                        );
                        if !matched.matched {
                            continue;
                        }
                        if let Some(text) = replace_text {
                            self.result
                                .rewrite_tail_pieces(matched.matched_len, vec![text.clone()]);
                        } else {
                            let pieces = lookup_data.replace_with_pieces(replace_with);
                            self.result.rewrite_tail_pieces(matched.matched_len, pieces);
                        }
                        break;
                    }
                }
            }
        }
    }
}

const DEFAULT_USE_NATIVE_NUMERALS_MODE: bool = true;
const DEFAULT_INCLUDE_INHERENT_VOWEL_MODE: bool = false;

// struct CustomOptionsType {
//     typing_mode: Option<bool>,
//     use_native_numerals: Option<bool>,
//     include_inherent_vowel: Option<bool>,
// }

#[derive(Debug, Clone)]
pub struct ResolvedTransliterationRules {
    pub trans_options: HashMap<String, bool>,
    pub custom_rules: Vec<Rule>,
}

fn script_type_of(script_data: &ScriptData) -> crate::script_data::ScriptTypeEnum {
    match script_data {
        ScriptData::Brahmic { .. } => crate::script_data::ScriptTypeEnum::Brahmic,
        ScriptData::Other { .. } => crate::script_data::ScriptTypeEnum::Other,
    }
}

fn script_type_matches(expected: ScriptTypeEnum, actual: ScriptTypeEnum) -> bool {
    match expected {
        ScriptTypeEnum::All => true,
        _ => expected == actual,
    }
}

/// Port of TS `get_active_custom_options`.
///
/// Filters input option flags by script-type/name constraints from `custom_options.json`.
pub fn get_active_custom_options(
    from_script_name: &str,
    to_script_name: &str,
    from_script_data: &ScriptData,
    to_script_data: &ScriptData,
    input_options: Option<&HashMap<String, bool>>,
) -> HashMap<String, bool> {
    let Some(input_options) = input_options else {
        return HashMap::new();
    };

    let custom_options_map = crate::script_data::get_custom_options_map();
    let mut active: HashMap<String, bool> = HashMap::new();

    let from_type = script_type_of(from_script_data);
    let to_type = script_type_of(to_script_data);

    for (key, enabled) in input_options.iter() {
        let Some(option_info) = custom_options_map.get(key) else {
            continue;
        };

        let from_all =
            option_info.from_script_type.as_ref() == Some(&crate::script_data::ScriptTypeEnum::All);
        let to_all =
            option_info.to_script_type.as_ref() == Some(&crate::script_data::ScriptTypeEnum::All);
        if from_all && to_all {
            active.insert(key.clone(), *enabled);
            continue;
        }

        let from_matches = (option_info
            .from_script_type
            .as_ref()
            .map(|t| script_type_matches(*t, from_type))
            .unwrap_or(false))
            || (option_info
                .from_script_name
                .as_ref()
                .map(|names| names.iter().any(|n| n == from_script_name))
                .unwrap_or(false));

        if !from_matches {
            continue;
        }

        let to_matches = (option_info
            .to_script_type
            .as_ref()
            .map(|t| script_type_matches(*t, to_type))
            .unwrap_or(false))
            || (option_info
                .to_script_name
                .as_ref()
                .map(|names| names.iter().any(|n| n == to_script_name))
                .unwrap_or(false));

        if to_matches {
            active.insert(key.clone(), *enabled);
        }
    }

    active
}

/// Port of TS `resolve_transliteration_rules`.
///
/// Resolves active options once and flattens enabled rules into a single list.
pub fn resolve_transliteration_rules(
    from_script_name: &str,
    to_script_name: &str,
    from_script_data: &ScriptData,
    to_script_data: &ScriptData,
    transliteration_input_options: Option<&HashMap<String, bool>>,
) -> ResolvedTransliterationRules {
    let trans_options = get_active_custom_options(
        from_script_name,
        to_script_name,
        from_script_data,
        to_script_data,
        transliteration_input_options,
    );

    let custom_options_map = crate::script_data::get_custom_options_map();
    let mut custom_rules: Vec<Rule> = Vec::new();

    for (key, enabled) in trans_options.iter() {
        if *enabled != true {
            continue;
        }
        if let Some(opt) = custom_options_map.get(key) {
            custom_rules.extend(opt.rules.clone());
        }
    }

    ResolvedTransliterationRules {
        trans_options,
        custom_rules,
    }
}

fn rule_replace_text(rule: &Rule, script_data: &ScriptData) -> String {
    match rule {
        Rule::ReplacePrevKramaKeys { replace_with, .. }
        | Rule::DirectReplace { replace_with, .. } => replace_with
            .iter()
            .map(|&k| {
                if k < 0 {
                    ""
                } else {
                    script_data.krama_text_or_empty(k as usize)
                }
            })
            .collect::<Vec<&str>>()
            .join(""),
    }
}

fn should_use_replace(rule: &Rule, allowed: CheckInEnum) -> bool {
    match rule {
        Rule::ReplacePrevKramaKeys {
            use_replace,
            check_in,
            ..
        }
        | Rule::DirectReplace {
            use_replace,
            check_in,
            ..
        } => use_replace == &Some(true) && check_in == &Some(allowed),
    }
}

/// Port of TS `apply_custom_replace_rules`.
///
/// Only applies rules marked with `use_replace=true` (fast replaceAll pass).
pub fn apply_custom_replace_rules(
    mut text: String,
    script_data: &ScriptData,
    rules: &[Rule],
    allowed_input_rule_type: CheckInEnum,
) -> String {
    if rules.is_empty() {
        return text;
    }

    for rule in rules.iter() {
        if !should_use_replace(rule, allowed_input_rule_type) {
            continue;
        }

        match rule {
            Rule::ReplacePrevKramaKeys {
                prev, following, ..
            } => {
                let prev_string = prev
                    .iter()
                    .map(|&p| {
                        if p < 0 {
                            ""
                        } else {
                            script_data.krama_text_or_empty(p as usize)
                        }
                    })
                    .collect::<Vec<&str>>()
                    .join("");

                let repl_text = rule_replace_text(rule, script_data);

                for &follow_krama_index in following.iter() {
                    if follow_krama_index < 0 {
                        continue;
                    }
                    let follow_string =
                        script_data.krama_text_or_empty(follow_krama_index as usize);
                    if follow_string.is_empty() {
                        continue;
                    }

                    let search = format!("{}{}", prev_string, follow_string);
                    let replace = format!("{}{}", repl_text, follow_string);
                    text = text.replace(&search, &replace);
                }
            }
            Rule::DirectReplace {
                to_replace,
                replace_text,
                ..
            } => {
                let replace_with = replace_text
                    .clone()
                    .unwrap_or_else(|| rule_replace_text(rule, script_data));

                for grp in to_replace.iter() {
                    let to_replace_string = grp
                        .iter()
                        .map(|&k| {
                            if k < 0 {
                                ""
                            } else {
                                script_data.krama_text_or_empty(k as usize)
                            }
                        })
                        .collect::<Vec<&str>>()
                        .join("");

                    if !to_replace_string.is_empty() {
                        text = text.replace(&to_replace_string, &replace_with);
                    }
                }
            }
        }
    }

    text
}

#[derive(Debug, Clone, Copy)]
pub struct TransliterationOptions {
    pub typing_mode: bool,
    pub use_native_numerals: bool,
    pub include_inherent_vowel: bool,
}

impl Default for TransliterationOptions {
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
    pub context_length: usize,
}

fn utf16_len(s: &str) -> usize {
    s.encode_utf16().count()
}

fn is_single_ascii_digit(s: &str) -> bool {
    s.len() == 1 && s.chars().next().is_some_and(|c| c.is_ascii_digit())
}

fn trans_opt(trans_options: &HashMap<String, bool>, key: &str) -> bool {
    trans_options.get(key).copied().unwrap_or(false)
}

fn get_brahmic_attrs_for_prev_context(
    from_script_data: &ScriptData,
    to_script_data: &ScriptData,
) -> (Option<String>, Option<String>) {
    // (nuqta, halant) of the brahmic script participating in prev-context
    match (from_script_data, to_script_data) {
        (ScriptData::Brahmic { nuqta, halant, .. }, ScriptData::Other { .. }) => {
            (nuqta.clone(), Some(halant.clone()))
        }
        (ScriptData::Other { .. }, ScriptData::Brahmic { nuqta, halant, .. }) => {
            (nuqta.clone(), Some(halant.clone()))
        }
        _ => (None, None),
    }
}

/// Synchronous core transliterator (port of TS `transliterate_text_core`).
pub fn transliterate_text_core(
    mut text: String,
    from_script_name: &str,
    to_script_name: &str,
    from_script_data: &ScriptData,
    to_script_data: &ScriptData,
    trans_options_in: &HashMap<String, bool>,
    custom_rules: &[Rule],
    options: Option<TransliterationOptions>,
) -> Result<TransliterationOutput, String> {
    let mut trans_options = trans_options_in.clone();
    let opts = options.unwrap_or_default();

    if opts.typing_mode && from_script_name != "Normal" {
        return Err("Typing mode is only supported with Normal script as the input".to_string());
    }
    if opts.typing_mode {
        trans_options.insert("normal_to_all:use_typing_chars".to_string(), true);
    }

    if opts.typing_mode && from_script_name == "Normal" {
        text = crate::transliterate::helpers::apply_typing_input_aliases(text, to_script_name);
    }

    text = apply_custom_replace_rules(text, from_script_data, custom_rules, CheckInEnum::Input);

    let text_len_units = utf16_len(&text);
    let mut cursor = InputTextCursor::new(text);
    let mut result = ResultStringBuilder::new();
    let mut prev_context = PrevContextBuilder::new(MAX_CONTEXT_LENGTH as usize);
    let custom_rules_vec: Vec<Rule> = custom_rules.to_vec();

    let prev_context_in_use = (matches!(from_script_data, ScriptData::Brahmic { .. })
        && matches!(to_script_data, ScriptData::Other { .. }))
        || (matches!(from_script_data, ScriptData::Other { .. })
            && matches!(to_script_data, ScriptData::Brahmic { .. }))
        || (opts.typing_mode
            && from_script_name == "Normal"
            && matches!(to_script_data, ScriptData::Other { .. }));

    let (brahmic_nuqta, brahmic_halant) =
        get_brahmic_attrs_for_prev_context(from_script_data, to_script_data);

    // choose Step-1 matching map
    let use_typing_map = (trans_opt(&trans_options, "normal_to_all:use_typing_chars")
        || opts.typing_mode)
        && from_script_name == "Normal";
    let from_text_to_krama_map = if use_typing_map {
        to_script_data
            .get_common_attr()
            .typing_text_to_krama_map
            .as_slice()
    } else {
        from_script_data
            .get_common_attr()
            .text_to_krama_map
            .as_slice()
    };

    // Used when converting from Tamil-Extended (superscript numbers)
    let mut ignore_ta_ext_sup_num_text_index: isize = -1;

    let mut ctx = TransliterateCtx {
        from_script_name,
        to_script_name,
        from_script_data,
        to_script_data,
        trans_options: &trans_options,
        custom_rules: &custom_rules_vec,
        cursor: &mut cursor,
        result: &mut result,
        prev_context: &mut prev_context,
        prev_context_in_use,
        brahmic_halant,
        brahmic_nuqta,
        typing_mode: opts.typing_mode,
        include_inherent_vowels: opts.include_inherent_vowel,
    };

    while ctx.cursor.pos() < text_len_units {
        let text_index = ctx.cursor.pos();
        let cur = match ctx.cursor.peek() {
            Some(v) => v,
            None => break,
        };
        let ch = cur.ch;

        if ignore_ta_ext_sup_num_text_index != -1
            && (text_index as isize) >= ignore_ta_ext_sup_num_text_index
        {
            ignore_ta_ext_sup_num_text_index = -1;
            ctx.cursor.advance(1);
            continue;
        }

        let ch_char = ch.chars().next().unwrap_or('\0');

        // skip certain chars (preserve as-is)
        if CHARS_TO_SKIP.contains(&ch_char) {
            ctx.cursor.advance(1);
            if ctx.prev_context_in_use {
                let _ = ctx.prev_context_cleanup(Some((Some(" ".to_string()), None)), None, false);
                ctx.prev_context.clear();
            }
            ctx.result.emit(ch);
            continue;
        }

        // latin digits passthrough if native numerals disabled
        if is_single_ascii_digit(&ch) && !opts.use_native_numerals {
            ctx.result.emit(ch.clone());
            ctx.cursor.advance(1);
            let _ = ctx.prev_context_cleanup(Some((Some(ch), None)), None, false);
            continue;
        }

        // Preserve mode: custom script chars when converting to Normal
        if trans_opt(&trans_options, "all_to_normal:preserve_specific_chars")
            && to_script_name == "Normal"
        {
            let custom_arr = &from_script_data.get_common_attr().custom_script_chars_arr;
            let target = ch.as_str();
            let idx =
                binary_search_lower(custom_arr, &target, |a, i| a[i].0.as_str(), |a, b| a.cmp(b));
            if let Some(custom_idx) = idx {
                let (custom_text, list_ref_opt, back_ref_opt) =
                    &from_script_data.get_common_attr().custom_script_chars_arr[custom_idx];
                let list_item = list_ref_opt
                    .and_then(|i| from_script_data.get_common_attr().list.get(i as usize))
                    .cloned();
                let _ = ctx.prev_context_cleanup(
                    Some((Some(custom_text.clone()), list_item)),
                    None,
                    false,
                );

                let normal_text = back_ref_opt
                    .and_then(|i| {
                        from_script_data
                            .get_common_attr()
                            .typing_text_to_krama_map
                            .get(i as usize)
                    })
                    .map(|(s, _)| s.clone())
                    .unwrap_or_default();
                ctx.result.emit(normal_text);
                ctx.cursor.advance(utf16_len(custom_text));
                continue;
            }
        }

        // Step 1: match text_to_krama_map / typing_text_to_krama_map
        let mut text_to_krama_item_index: Option<usize> = None;
        {
            let scan_units: usize = 0;
            let mut last_valid_vowel_match_index: Option<usize> = None;
            let check_vowel_retraction = ctx.prev_context_in_use
                && matches!(from_script_data, ScriptData::Other { .. })
                && matches!(to_script_data, ScriptData::Brahmic { .. })
                && (matches!(ctx.prev_context.type_at(-1), Some(List::Vyanjana { .. }))
                    || (ctx.brahmic_nuqta.is_some()
                        && matches!(ctx.prev_context.type_at(-2), Some(List::Vyanjana { .. }))
                        && ctx.prev_context.text_at(-1) == ctx.brahmic_nuqta.as_deref()));

            loop {
                let next = ctx.cursor.peek_at(text_index + scan_units);
                let next_char = next.as_ref().map(|c| c.ch.clone()).unwrap_or_default();

                if ignore_ta_ext_sup_num_text_index != -1
                    && !next_char.is_empty()
                    && is_ta_ext_superscript_tail(next_char.chars().next())
                {
                    // scan_units += next.as_ref().map(|c| c.width).unwrap_or(0);
                }

                let end_index = text_index + scan_units;
                let char_to_search = match ctx.cursor.slice(text_index, end_index) {
                    Some(v) => v,
                    None => String::new(),
                };

                let target = char_to_search.as_str();
                let potential_match_index = binary_search_lower(
                    from_text_to_krama_map,
                    &target,
                    |a, i| a[i].0.as_str(),
                    |a, b| a.cmp(b),
                );

                let Some(potential_match_index) = potential_match_index else {
                    // text_to_krama_item_index = None;
                    break;
                };
                let potential_match = &from_text_to_krama_map[potential_match_index];

                // vowel retraction support (kAUM etc.)
                if check_vowel_retraction {
                    if let Some(krama) = &potential_match.1.krama {
                        if !krama.is_empty() {
                            let first = krama[0];
                            if first >= 0 {
                                let list_idx = to_script_data
                                    .get_common_attr()
                                    .krama_text_arr
                                    .get(first as usize)
                                    .and_then(|(_, li)| *li);
                                let list_type = list_idx
                                    .and_then(|li| {
                                        to_script_data.get_common_attr().list.get(li as usize)
                                    })
                                    .map(|l| TransliterateCtx::list_type_str(l));
                                let is_single_vowel = krama.len() == 1
                                    && list_type.is_some_and(|t| t == "svara" || t == "mAtrA");
                                if is_single_vowel {
                                    last_valid_vowel_match_index = Some(potential_match_index);
                                } else if last_valid_vowel_match_index.is_some() {
                                    text_to_krama_item_index = last_valid_vowel_match_index;
                                    break;
                                }
                            }
                        }
                    }
                }

                // extend match if `next` allows it
                if let Some(next_list) = &potential_match.1.next {
                    if !next_char.is_empty()
                        && next_char.chars().next().is_some_and(|c| {
                            next_list.iter().any(|s| s.chars().next() == Some(c))
                                || next_list.iter().any(|s| s == &next_char)
                        })
                    {
                        // scan_units += next.as_ref().map(|c| c.width).unwrap_or(0);
                        continue;
                    }
                }

                text_to_krama_item_index = Some(potential_match_index);
                break;
            }
        }

        if let Some(map_idx) = text_to_krama_item_index {
            let (matched_text, map) = &from_text_to_krama_map[map_idx];

            let matched_len_units = utf16_len(matched_text);
            ctx.cursor.advance(matched_len_units);

            // Typing-map: emit the referenced custom script character directly.
            // (Port of TS `custom_back_ref` branch.)
            if trans_opt(&trans_options, "normal_to_all:use_typing_chars") {
                if let Some(custom_back_ref) = map.custom_back_ref {
                    if custom_back_ref >= 0 {
                        if let Some(custom_item) = to_script_data
                            .get_common_attr()
                            .custom_script_chars_arr
                            .get(custom_back_ref as usize)
                        {
                            ctx.result.emit(custom_item.0.clone());
                            let list_item = custom_item
                                .1
                                .and_then(|li| {
                                    to_script_data.get_common_attr().list.get(li as usize)
                                })
                                .cloned();
                            let _ = ctx.prev_context_cleanup(
                                Some((Some(matched_text.clone()), list_item)),
                                map.next.as_deref(),
                                false,
                            );
                            continue;
                        }
                    }
                }
            }

            // If krama exists and has at least one non -1, emit directly
            if let Some(krama) = &map.krama {
                let has_non_neg = krama.iter().any(|&k| k != -1);
                if has_non_neg {
                    let mut pieces: Vec<String> = Vec::new();
                    for &k in krama.iter() {
                        if k < 0 {
                            continue;
                        }
                        pieces.push(
                            ctx.to_script_data
                                .krama_text_or_empty(k as usize)
                                .to_string(),
                        );
                    }

                    // prev-context bookkeeping
                    let mut result_concat_status = false;
                    if ctx.prev_context_in_use {
                        if matches!(from_script_data, ScriptData::Brahmic { .. })
                            && matches!(to_script_data, ScriptData::Other { .. })
                        {
                            // pick a brahmic list item (from-script) if available
                            let item = map
                                .fallback_list_ref
                                .and_then(|i| {
                                    if !trans_opt(&trans_options, "normal_to_all:use_typing_chars")
                                    {
                                        from_script_data
                                            .get_common_attr()
                                            .list
                                            .get(i as usize)
                                            .cloned()
                                    } else {
                                        None
                                    }
                                })
                                .or_else(|| {
                                    let first_krama = krama.iter().find(|&&k| k >= 0).copied()?;
                                    let list_idx = from_script_data
                                        .get_common_attr()
                                        .krama_text_arr
                                        .get(first_krama as usize)
                                        .and_then(|(_, li)| *li)?;
                                    from_script_data
                                        .get_common_attr()
                                        .list
                                        .get(list_idx as usize)
                                        .cloned()
                                });

                            result_concat_status = ctx.prev_context_cleanup(
                                Some((Some(matched_text.clone()), item)),
                                None,
                                false,
                            );
                        } else if matches!(to_script_data, ScriptData::Brahmic { .. })
                            && matches!(from_script_data, ScriptData::Other { .. })
                        {
                            let item = map
                                .fallback_list_ref
                                .and_then(|i| {
                                    to_script_data
                                        .get_common_attr()
                                        .list
                                        .get(i as usize)
                                        .cloned()
                                })
                                .or_else(|| {
                                    let first_krama = krama.iter().find(|&&k| k >= 0).copied()?;
                                    let list_idx = to_script_data
                                        .get_common_attr()
                                        .krama_text_arr
                                        .get(first_krama as usize)
                                        .and_then(|(_, li)| *li)?;
                                    to_script_data
                                        .get_common_attr()
                                        .list
                                        .get(list_idx as usize)
                                        .cloned()
                                });

                            let next_list = if opts.typing_mode && from_script_name == "Normal" {
                                map.next.as_deref()
                            } else {
                                None
                            };
                            result_concat_status = ctx.prev_context_cleanup(
                                Some((Some(matched_text.clone()), item)),
                                next_list,
                                false,
                            );
                        } else if opts.typing_mode
                            && from_script_name == "Normal"
                            && matches!(to_script_data, ScriptData::Other { .. })
                        {
                            result_concat_status = ctx.prev_context_cleanup(
                                Some((Some(matched_text.clone()), None)),
                                map.next.as_deref(),
                                false,
                            );
                        }
                    }

                    if !result_concat_status {
                        // Tamil-Extended output reorder (matra/halant after superscript)
                        if let ScriptData::Brahmic { halant, .. } = to_script_data {
                            if crate::is_script_tamil_ext!(to_script_name)
                                && is_ta_ext_superscript_tail(ctx.result.last_char())
                            {
                                // heuristic: if last piece is matra or halant, reorder
                                let last_k =
                                    krama.iter().rev().find(|&&k| k >= 0).copied().unwrap_or(-1);
                                let last_type = if last_k >= 0 {
                                    to_script_data
                                        .get_common_attr()
                                        .krama_text_arr
                                        .get(last_k as usize)
                                        .and_then(|(_, li)| *li)
                                        .and_then(|li| {
                                            to_script_data.get_common_attr().list.get(li as usize)
                                        })
                                        .map(|l| TransliterateCtx::list_type_str(l))
                                } else {
                                    None
                                };
                                let result_text = pieces.concat();
                                if last_type == Some("mAtrA") || result_text == *halant {
                                    ctx.result.emit_pieces_with_reorder(pieces, halant, true);
                                } else {
                                    ctx.result.emit_pieces(pieces);
                                }
                            } else {
                                ctx.result.emit_pieces(pieces);
                            }
                        } else {
                            ctx.result.emit_pieces(pieces);
                        }
                    }

                    ctx.apply_custom_rules(
                        ctx.cursor.pos() as isize,
                        -(matched_len_units as isize),
                    );
                    continue;
                }

                // typing-mode special case when krama contains -1 entries: emit raw match
                if opts.typing_mode && krama.iter().any(|&k| k == -1) {
                    ctx.result.emit(matched_text.clone());
                    let _ = ctx.prev_context_cleanup(
                        Some((Some(matched_text.clone()), None)),
                        map.next.as_deref(),
                        false,
                    );
                    continue;
                }
            }
        } else {
            // no step-1 match; advance one character
            ctx.cursor.advance(1);
        }

        // Step 2: Search in krama_text_arr
        let char_to_search = ch.clone();
        let idx = from_script_data.krama_index_of_text(&char_to_search);
        let Some(index) = idx else {
            if ctx.prev_context_in_use {
                let _ = ctx.prev_context_cleanup(
                    Some((Some(char_to_search.clone()), None)),
                    None,
                    false,
                );
                ctx.prev_context.clear();
            }
            ctx.result.emit(char_to_search);
            continue;
        };

        let mut result_concat_status = false;
        if ctx.prev_context_in_use {
            let item = match from_script_data {
                ScriptData::Brahmic { .. } => {
                    let list_idx = from_script_data
                        .get_common_attr()
                        .krama_text_arr
                        .get(index)
                        .and_then(|(_, li)| *li);
                    list_idx.and_then(|li| {
                        from_script_data
                            .get_common_attr()
                            .list
                            .get(li as usize)
                            .cloned()
                    })
                }
                ScriptData::Other { .. } => {
                    let list_idx = to_script_data
                        .get_common_attr()
                        .krama_text_arr
                        .get(index)
                        .and_then(|(_, li)| *li);
                    list_idx.and_then(|li| {
                        to_script_data
                            .get_common_attr()
                            .list
                            .get(li as usize)
                            .cloned()
                    })
                }
            };
            result_concat_status =
                ctx.prev_context_cleanup(Some((Some(char_to_search.clone()), item)), None, false);
        }

        if !result_concat_status {
            let to_add_text = to_script_data.krama_text_or_empty(index).to_string();
            if let ScriptData::Brahmic { halant, .. } = to_script_data {
                if crate::is_script_tamil_ext!(to_script_name)
                    && is_ta_ext_superscript_tail(ctx.result.last_char())
                {
                    let list_type = to_script_data
                        .get_common_attr()
                        .krama_text_arr
                        .get(index)
                        .and_then(|(_, li)| *li)
                        .and_then(|li| to_script_data.get_common_attr().list.get(li as usize))
                        .map(|l| TransliterateCtx::list_type_str(l));
                    if list_type == Some("mAtrA") || to_add_text == *halant {
                        ctx.result
                            .emit_pieces_with_reorder(vec![to_add_text], halant, true);
                    } else {
                        ctx.result.emit(to_add_text);
                    }
                } else {
                    ctx.result.emit(to_add_text);
                }
            } else {
                ctx.result.emit(to_add_text);
            }
        }

        ctx.apply_custom_rules(ctx.cursor.pos() as isize, -1);
    }

    if ctx.prev_context_in_use {
        let _ = ctx.prev_context_cleanup(None, None, true);
    }

    let mut output = ctx.result.to_string();
    output = apply_custom_replace_rules(output, to_script_data, custom_rules, CheckInEnum::Output);

    Ok(TransliterationOutput {
        output,
        context_length: ctx.prev_context.length(),
    })
}

/// Convenience wrapper (synchronous; resolves script data + rules, then calls `transliterate_text_core`).
pub fn transliterate_text(
    text: String,
    from_script_name: &str,
    to_script_name: &str,
    transliteration_input_options: Option<&HashMap<String, bool>>,
    options: Option<TransliterationOptions>,
) -> Result<TransliterationOutput, String> {
    let from_norm = crate::script_data::get_normalized_script_name(from_script_name)
        .ok_or_else(|| format!("Unknown from-script `{}`", from_script_name))?;
    let to_norm = crate::script_data::get_normalized_script_name(to_script_name)
        .ok_or_else(|| format!("Unknown to-script `{}`", to_script_name))?;

    let from_data = ScriptData::get_script_data(&from_norm);
    let to_data = ScriptData::get_script_data(&to_norm);

    let resolved = resolve_transliteration_rules(
        &from_norm,
        &to_norm,
        from_data,
        to_data,
        transliteration_input_options,
    );

    transliterate_text_core(
        text,
        &from_norm,
        &to_norm,
        from_data,
        to_data,
        &resolved.trans_options,
        &resolved.custom_rules,
        options,
    )
}
