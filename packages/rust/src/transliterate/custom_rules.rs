use super::context::TransliterateCtx;
use super::helpers::{ZWJ, ZWNJ};
use crate::script_data::{CheckInEnum, Rule, ScriptData};
use alloc::borrow::{Cow, ToOwned};
use alloc::string::String;
use core::borrow::Borrow;
use core::slice;

impl Rule {
    // helper check function
    fn check_should_use_replace(&self, allowed: CheckInEnum) -> bool {
        match self {
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
}

fn get_rule_replace_text(rule: &Rule, script_data: &ScriptData) -> String {
    match rule {
        Rule::ReplacePrevKramaKeys { replace_with, .. }
        | Rule::DirectReplace { replace_with, .. } => {
            replace_with
                .iter()
                .map(|&k| {
                    if k < 0 {
                        ""
                    } else {
                        script_data.krama_text_or_empty(k)
                    }
                })
                // .collect::<Vec<&str>>()
                // .join("")
                .collect::<String>()
        }
    }
}
/// Only applies rules marked with `use_replace=true` (fast replaceAll pass).
pub(super) fn apply_custom_replace_rules<'a, R: Borrow<Rule>>(
    text: &'a str,
    script_data: &ScriptData,
    rules: &[R],
    allowed_input_rule_type: CheckInEnum,
) -> Cow<'a, str> {
    if rules.is_empty() {
        return Cow::Borrowed(text);
    }

    // Lazy clone: only allocate when a rule actually fires
    let mut text: Cow<'a, str> = Cow::Borrowed(text);
    for rule_ref in rules.iter() {
        let rule = rule_ref.borrow();
        if !rule.check_should_use_replace(allowed_input_rule_type) {
            continue;
        }

        match rule {
            Rule::ReplacePrevKramaKeys {
                prev, following, ..
            } => {
                let prev_string = prev
                    .iter()
                    .map(|&p| script_data.krama_text_or_empty(p))
                    .collect::<String>();

                let repl_text = get_rule_replace_text(rule, script_data);

                for &follow_krama_index in following.iter() {
                    let follow_krama_string = script_data.krama_text_or_empty(follow_krama_index);
                    if follow_krama_string.is_empty() {
                        continue;
                    }

                    let search = {
                        let mut s =
                            String::with_capacity(prev_string.len() + follow_krama_string.len());
                        s.push_str(&prev_string);
                        s.push_str(follow_krama_string);
                        s
                    };
                    if text.contains(&search) {
                        let replace = {
                            let mut s =
                                String::with_capacity(repl_text.len() + follow_krama_string.len());
                            s.push_str(&repl_text);
                            s.push_str(follow_krama_string);
                            s
                        };
                        text = Cow::Owned(text.replace(&search, &replace));
                    }
                }
            }
            Rule::DirectReplace {
                to_replace,
                replace_text,
                ..
            } => {
                // Use as_deref() to avoid cloning the Option<String>
                let replace_with: Cow<str> = replace_text.as_deref().map_or_else(
                    || Cow::Owned(get_rule_replace_text(rule, script_data)),
                    Cow::Borrowed,
                );

                for grp in to_replace.iter() {
                    let to_replace_string = grp
                        .iter()
                        .map(|&k| script_data.krama_text_or_empty(k))
                        .collect::<String>();

                    if !to_replace_string.is_empty() && text.contains(&*to_replace_string) {
                        text = Cow::Owned(text.replace(&to_replace_string, &replace_with));
                    }
                }
            }
        }
    }

    text
}

impl<'a, R> TransliterateCtx<'a, R>
where
    R: Borrow<Rule>,
{
    /// Applies the custom rules after a match (`next_in_match` is `None`), or between two pieces
    /// of one match (only the rules that can apply there: `direct_replace` and the input side
    /// `replace_prev_krama_keys`), `next_in_match` then is the krama of the next piece.
    ///
    /// - `match_start`: index of the first character of the match in the input
    /// - `next_index`: index of the character after the match (read when `next_in_match` is
    ///   `None`)
    /// - `match_krama`: the krama of the match read so far (all of it after the match)
    pub(super) fn apply_custom_trans_rules(
        &mut self,
        match_start: isize,
        next_index: isize,
        match_krama: &[i16],
        next_in_match: Option<i16>,
    ) {
        let custom_rules = self.custom_rules;
        for rule_ref in custom_rules.iter() {
            match rule_ref.borrow() {
                Rule::ReplacePrevKramaKeys {
                    use_replace,
                    prev,
                    following,
                    replace_with,
                    check_in,
                } => {
                    // Bail out if any prev index is negative
                    if use_replace == &Some(true) || prev.iter().any(|&n| n < 0) {
                        continue;
                    }
                    if !matches!(check_in, Some(CheckInEnum::Output)) {
                        self.apply_prev_krama_rule_on_input(
                            prev,
                            following,
                            replace_with,
                            match_start,
                            next_index,
                            match_krama,
                            next_in_match,
                        );
                    } else if next_in_match.is_none() {
                        // the output side rule sees whole matches only, not the pieces of one
                        self.apply_prev_krama_rule_on_output(prev, following, replace_with);
                    }
                }
                Rule::DirectReplace {
                    use_replace,
                    to_replace,
                    replace_with,
                    replace_text,
                    check_in,
                } => {
                    if use_replace == &Some(true) {
                        continue;
                    }
                    self.apply_direct_replace_rule(
                        to_replace,
                        replace_with,
                        replace_text.as_ref(),
                        matches!(check_in, Some(CheckInEnum::Output)),
                        next_index,
                        next_in_match,
                    );
                }
            }
        }
    }

    /// Whether `prev` (krama indexes) is what was read before the end of the match.
    ///
    /// The letters read, not the input characters: the end of `prev` is compared with the krama
    /// of this match (a Tamil-Extended ்ரு² (ृ) starts with the halant character but is no halant,
    /// a Sinhala ඟ is ङ्ग), the rest with the characters before the match
    fn prev_krama_matches_input(
        &self,
        prev: &[i16],
        match_krama: &[i16],
        match_start: isize,
    ) -> bool {
        let mut match_krama_rev = match_krama.iter().rev().filter(|&&k| k >= 0);
        let mut input_index = match_start;
        prev.iter().rev().all(|&expected| {
            if let Some(&got) = match_krama_rev.next() {
                return got == expected;
            }
            input_index -= 1;
            input_index >= 0
                && self
                    .cursor
                    .peek_at_str(input_index as usize)
                    .and_then(|s| self.from_script_data.krama_index_of_text(s))
                    .is_some_and(|got| got == expected as usize)
        })
    }

    /// `replace_prev_krama_keys` checked in the input: `prev` read before, a `following` read next
    #[allow(clippy::too_many_arguments)]
    fn apply_prev_krama_rule_on_input(
        &mut self,
        prev: &[i16],
        following: &[i16],
        replace_with: &[i16],
        match_start: isize,
        next_index: isize,
        match_krama: &[i16],
        next_in_match: Option<i16>,
    ) {
        if match_start < 0 || next_index < 0 {
            return;
        }
        if !self.prev_krama_matches_input(prev, match_krama, match_start) {
            return;
        }
        let next_krama = match next_in_match {
            Some(next) => Some(next),
            None => self
                .cursor
                .peek_at(next_index as usize)
                .and_then(|next_ch| {
                    // char buffer to store utf-8 (no heap allocation)
                    let mut buf = [0u8; 4];
                    let next_ch_str = next_ch.encode_utf8(&mut buf);
                    self.from_script_data
                        .krama_index_of_text(next_ch_str)
                        .map(|i| i as i16)
                }),
        };
        if next_krama.is_some_and(|next| following.contains(&next)) {
            let pieces = self.to_script_data.replace_with_pieces(replace_with);
            self.result.rewrite_tail_pieces(prev.len(), &pieces);
        }
    }

    /// `replace_prev_krama_keys` checked in the output: the last piece is a `following`, `prev`
    /// is before it
    fn apply_prev_krama_rule_on_output(
        &mut self,
        prev: &[i16],
        following: &[i16],
        replace_with: &[i16],
    ) {
        let to_script_data = self.to_script_data;
        let Some(last_piece) = self.result.last_piece() else {
            return;
        };
        let Some(following_idx) = to_script_data.krama_index_of_text(last_piece) else {
            return;
        };
        if !following.contains(&(following_idx as i16)) {
            return;
        }
        let prev_match =
            to_script_data.match_prev_krama_sequence(|i| self.result.peek_at(i), -2, prev);
        if prev_match.matched {
            let last_piece_owned = last_piece.to_owned();
            let mut pieces = to_script_data.replace_with_pieces(replace_with);
            pieces.push(last_piece_owned.as_str()); // instead [...pices, last_piece]
            self.result
                .rewrite_tail_pieces(prev_match.matched_len + 1, &pieces);
        }
    }

    /// `direct_replace`: the end of the result is one of the `to_replace` groups
    fn apply_direct_replace_rule(
        &mut self,
        to_replace: &[alloc::vec::Vec<i16>],
        replace_with: &[i16],
        replace_text: Option<&String>,
        check_in_output: bool,
        next_index: isize,
        next_in_match: Option<i16>,
    ) {
        let lookup_data = if check_in_output {
            self.to_script_data
        } else {
            self.from_script_data
        };
        // a joiner is not added next to one already in the text (the Sinhala
        // conjunct ZWJ before a ZWJ, or before a ZWNJ asking for no conjunct)
        if next_in_match.is_none()
            && replace_text.is_some_and(|t| t.ends_with(ZWJ))
            && next_index >= 0
            && self
                .cursor
                .peek_at(next_index as usize)
                .is_some_and(|c| c == ZWJ || c == ZWNJ)
        {
            return;
        }

        for search_group in to_replace.iter() {
            if search_group.iter().any(|&n| n < 0) {
                continue;
            }
            let matched =
                lookup_data.match_prev_krama_sequence(|i| self.result.peek_at(i), -1, search_group);
            if !matched.matched {
                continue;
            }
            if let Some(replace_text) = replace_text {
                self.result
                    .rewrite_tail_pieces(matched.matched_len, slice::from_ref(replace_text));
            } else {
                let pieces = lookup_data.replace_with_pieces(replace_with);
                self.result
                    .rewrite_tail_pieces(matched.matched_len, &pieces);
            }
            return;
        }
    }
}
