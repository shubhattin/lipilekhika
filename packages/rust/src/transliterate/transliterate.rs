use std::collections::HashMap;

use crate::is_script_tamil_ext;
use crate::script_data::{CheckInEnum, CustomOptionScriptTypeEnum, List, Rule, ScriptData};
use crate::transliterate::helpers::{
  self, InputTextCursor, PrevContextBuilder, ResultStringBuilder, is_ta_ext_superscript_tail,
  is_vedic_svara_tail,
};
use crate::utils::binary_search::binary_search_lower;

struct TransliterateCtx<'a> {
  #[allow(dead_code)]
  from_script_name: &'a str,
  to_script_name: &'a str,
  from_script_data: &'a ScriptData,
  to_script_data: &'a ScriptData,
  trans_options: &'a HashMap<String, bool>,
  custom_rules: &'a [Rule],
  cursor: &'a mut InputTextCursor<'a>,
  result: &'a mut ResultStringBuilder,
  prev_context: &'a mut PrevContextBuilder,
  prev_context_in_use: bool,
  brahmic_halant: &'a Option<String>,
  brahmic_nuqta: &'a Option<String>,
  typing_mode: bool,
  include_inherent_vowels: bool,
}

type PrevContextItem = (Option<String>, Option<List>);

impl<'a> TransliterateCtx<'a> {
  /// Returns `true` when the current write already handled concatenation/reordering.
  fn prev_context_cleanup(
    &mut self,
    item: Option<PrevContextItem>,
    next: Option<&[String]>,
    last_extra_call: Option<bool>,
  ) -> bool {
    let last_extra_call = match last_extra_call {
      None => false,
      Some(v) => v,
    };
    let mut result_str_concat_status = false;

    let brahmic_halant = self.brahmic_halant.as_deref();
    let brahmic_nuqta = self.brahmic_nuqta.as_deref();

    let item_text = item.as_ref().and_then(|(t, _)| t.as_deref()); // [0]
    let item_type = item.as_ref().and_then(|(_, t)| t.as_ref()); // [1]

    // custom cleanup logic/cases
    if ((brahmic_nuqta.is_some()
      && self
        .prev_context
        .type_at(-3)
        .is_some_and(|k| k.is_vyanjana())
      && self.prev_context.text_at(-2) == brahmic_nuqta
      && self.prev_context.type_at(-1).is_some_and(|k| k.is_matra()))
      || (self
        .prev_context
        .type_at(-2)
        .is_some_and(|k| k.is_vyanjana())
        && self.prev_context.type_at(-1).is_some_and(|k| k.is_matra())))
      && (item.is_none() || item_type.is_some_and(|k| k.is_anya()))
    {
      self.prev_context.clear();
    }

    if matches!(self.from_script_data, ScriptData::Brahmic { .. })
      && matches!(self.to_script_data, ScriptData::Other { .. })
    {
      // custom logic when converting from brahmic to other
      if item_text != brahmic_halant
        && (if is_script_tamil_ext!(self.from_script_name) {
          match (item_text, brahmic_halant) {
            (Some(s), Some(h)) if !s.is_empty() => s.chars().next() != h.chars().next(), // here same as nth(0)
            _ => true,
          }
        } else {
          true
        })
        && (brahmic_nuqta.is_none() || item_text != brahmic_nuqta)
        && (self
          .prev_context
          .type_at(-1)
          .is_some_and(|k| k.is_vyanjana())
          || (brahmic_nuqta.is_some()
            && self
              .prev_context
              .type_at(-2)
              .is_some_and(|k| k.is_vyanjana())
            && self.prev_context.text_at(-1) == brahmic_nuqta))
        && ((item_type.is_some_and(|k| k.is_matra()) && item_text != brahmic_halant)
          || item_type.is_some_and(|k| k.is_anya())
          || item.is_none())
      {
        if let ScriptData::Other {
          schwa_character, ..
        } = self.to_script_data
        {
          self.result.emit(schwa_character.clone());
        }
      }
    } else if matches!(self.from_script_data, ScriptData::Other { .. })
      && matches!(self.to_script_data, ScriptData::Brahmic { .. })
    {
      // custom logic when converting from other to brahmic
      if self
        .prev_context
        .type_at(-1)
        .is_some_and(|k| k.is_vyanjana())
        && (item_type.is_some_and(|k| k.is_matra()) || item_type.is_some_and(|k| k.is_svara()))
      {
        let linked_matra: String = match item_type {
          Some(List::Svara {
            matra_krama_ref, ..
          }) => self
            .to_script_data
            .krama_text_or_empty(*matra_krama_ref.first().unwrap_or(&-1))
            .to_string(),
          _ => item_text.unwrap_or("").to_string(),
        };

        if let ScriptData::Brahmic { halant, .. } = self.to_script_data {
          self.result.emit_pieces_with_reorder(
            &[linked_matra],
            halant,
            is_script_tamil_ext!(self.to_script_name)
              && is_ta_ext_superscript_tail(self.result.last_char()),
          );
          result_str_concat_status = true;
        }
      } else if !self.include_inherent_vowels
        && (self
          .prev_context
          .type_at(-1)
          .is_some_and(|k| k.is_vyanjana()))
        && !(item_text == brahmic_halant || item_type.is_some_and(|k| k.is_matra()))
      {
        if let (
          Some(brahmic_halant),
          ScriptData::Brahmic {
            halant: to_halant, ..
          },
        ) = (brahmic_halant, self.to_script_data)
        {
          let should_reorder = is_script_tamil_ext!(self.to_script_name)
            && is_ta_ext_superscript_tail(self.result.last_char());
          self.result.emit_pieces_with_reorder(
            &[brahmic_halant.to_string()],
            to_halant,
            should_reorder,
          );

          if self.to_script_name == "Sinhala"
            && *self
              .trans_options
              .get("all_to_sinhala:use_conjunct_enabling_halant")
              .unwrap_or(&false)
          {
            if let Some(last_piece) = self.result.last_piece() {
              self
                .result
                .rewrite_at(-1, format!("{}\u{200D}", last_piece));
            }
          }
        }
      } else if self.include_inherent_vowels
        && item.is_some()
        && item_type.is_some_and(|k| k.is_vyanjana())
        && (self
          .prev_context
          .type_at(-1)
          .is_some_and(|k| k.is_vyanjana())
          || (brahmic_nuqta.is_some()
            && self
              .prev_context
              .type_at(-2)
              .is_some_and(|k| k.is_vyanjana())
            && self.prev_context.text_at(-1) == brahmic_nuqta))
      {
        if let (
          Some(brahmic_halant),
          ScriptData::Brahmic {
            halant: to_halant, ..
          },
        ) = (brahmic_halant, self.to_script_data)
        {
          let should_reorder = is_script_tamil_ext!(self.to_script_name)
            && is_ta_ext_superscript_tail(self.result.last_char());
          self.result.emit_pieces_with_reorder(
            &[brahmic_halant.to_string()],
            to_halant,
            should_reorder,
          );

          if self.to_script_name == "Sinhala"
            && *self
              .trans_options
              .get("all_to_sinhala:use_conjunct_enabling_halant")
              .unwrap_or(&false)
          {
            if let Some(last_piece) = self.result.last_piece() {
              self
                .result
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
            // the case below is to enable typing of _, ' (Vedic svara chihnas too)
            && !(is_script_tamil_ext!(self.to_script_name)
                && is_ta_ext_superscript_tail(self.result.last_char()))
    {
      to_clear_context = true;
      // do not clear the context only if case where the current added element is a vyanjana
      if item_type.is_some_and(|k| k.is_vyanjana()) {
        to_clear_context = false;
      }
      if to_clear_context {
        self.prev_context.clear();
      }
    }

    // addition and shifting
    // in typing it should not be the last extra call
    if (!self.typing_mode) || (!last_extra_call && !to_clear_context) {
      if let Some(item) = item {
        self.prev_context.push(item);
      }
    }

    result_str_concat_status
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
  fn apply_custom_trans_rules(&mut self, text_index: isize, delta: isize) {
    let current_text_index = text_index + delta;

    for rule in self.custom_rules.iter() {
      match rule {
        Rule::DirectReplace { use_replace, .. }
        | Rule::ReplacePrevKramaKeys { use_replace, .. } => {
          if use_replace == &Some(true) {
            continue;
          }
        }
      }

      match rule {
        Rule::ReplacePrevKramaKeys {
          prev,
          following,
          replace_with,
          check_in,
          ..
        } => {
          let prev_arr_as_usize = match Self::i16_vec_to_usize_vec(prev) {
            Some(v) => v,
            None => continue,
          };

          let is_check_in_input = !matches!(check_in, Some(CheckInEnum::Output));
          if is_check_in_input {
            if current_text_index < 0 || text_index < 0 {
              continue;
            }
            let prev_match = self.from_script_data.match_prev_krama_sequence(
              |i| self.cursor.peek_at(i as usize),
              current_text_index,
              &prev_arr_as_usize,
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
                    let pieces = self.to_script_data.replace_with_pieces(replace_with);
                    self
                      .result
                      .rewrite_tail_pieces(prev_match.matched_len, &pieces);
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

            if let Some(following_idx) = self.to_script_data.krama_index_of_text(&last_piece) {
              if !following.contains(&(following_idx as i16)) {
                continue;
              }
              let prev_match = self.to_script_data.match_prev_krama_sequence(
                |i| self.result.peek_at(i),
                -2,
                &prev_arr_as_usize,
              );
              if prev_match.matched {
                let mut pieces = self.to_script_data.replace_with_pieces(replace_with);
                pieces.push(last_piece); // instead [...pices, last_piece]
                self
                  .result
                  .rewrite_tail_pieces(prev_match.matched_len + 1, &pieces);
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
            let matched =
              lookup_data.match_prev_krama_sequence(|i| self.result.peek_at(i), -1, &sg_usize);
            if !matched.matched {
              continue;
            }
            if let Some(replace_text) = replace_text {
              self
                .result
                .rewrite_tail_pieces(matched.matched_len, &[replace_text.clone()]);
            } else {
              let pieces = lookup_data.replace_with_pieces(replace_with);
              self
                .result
                .rewrite_tail_pieces(matched.matched_len, &pieces);
            }
            break;
          }
        }
      }
    }
  }
}

/// maps the ScriptData type to Custom Option Script Type
fn custom_option_script_type_of(
  script_data: &ScriptData,
) -> crate::script_data::CustomOptionScriptTypeEnum {
  match script_data {
    ScriptData::Brahmic { .. } => crate::script_data::CustomOptionScriptTypeEnum::Brahmic,
    ScriptData::Other { .. } => crate::script_data::CustomOptionScriptTypeEnum::Other,
  }
}
/// also consider the all case for matching
fn custom_option_script_type_matches(
  expected: CustomOptionScriptTypeEnum,
  actual: CustomOptionScriptTypeEnum,
) -> bool {
  match expected {
    CustomOptionScriptTypeEnum::All => true,
    _ => expected == actual,
  }
}
fn get_active_custom_options(
  from_script_data: &ScriptData,
  to_script_data: &ScriptData,
  input_options: Option<&HashMap<String, bool>>,
) -> HashMap<String, bool> {
  let Some(input_options) = input_options else {
    return HashMap::new();
  };

  let from_script_name = &from_script_data.get_common_attr().script_name;
  let to_script_name = &to_script_data.get_common_attr().script_name;
  let custom_options_map = crate::script_data::get_custom_options_map();
  let mut active: HashMap<String, bool> = HashMap::new();

  let from_type = custom_option_script_type_of(from_script_data);
  let to_type = custom_option_script_type_of(to_script_data);

  for (key, enabled) in input_options.iter() {
    let Some(option_info) = custom_options_map.get(key) else {
      continue;
    };

    let from_all = option_info.from_script_type.as_ref()
      == Some(&crate::script_data::CustomOptionScriptTypeEnum::All);
    let to_all = option_info.to_script_type.as_ref()
      == Some(&crate::script_data::CustomOptionScriptTypeEnum::All);
    if from_all && to_all {
      active.insert(key.clone(), *enabled);
    } else if (option_info
      .from_script_type
      .as_ref()
      .map(|t| custom_option_script_type_matches(*t, from_type))
      .unwrap_or(false))
      || (option_info
        .from_script_name
        .as_ref()
        .map(|names| names.iter().any(|n| n == from_script_name))
        .unwrap_or(false))
    // ^ from matches
    {
      let to_matches = (option_info
        .to_script_type
        .as_ref()
        .map(|t| custom_option_script_type_matches(*t, to_type))
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
  }

  active
}

#[derive(Debug, Clone)]
pub struct ResolvedTransliterationRules {
  pub trans_options: HashMap<String, bool>,
  pub custom_rules: Vec<Rule>,
}
/// Resolves active options once and flattens enabled rules into a single list.
pub fn resolve_transliteration_rules(
  from_script_data: &ScriptData,
  to_script_data: &ScriptData,
  transliteration_input_options: Option<&HashMap<String, bool>>,
) -> ResolvedTransliterationRules {
  let trans_options = get_active_custom_options(
    from_script_data,
    to_script_data,
    transliteration_input_options,
  );

  let custom_options_map = crate::script_data::get_custom_options_map();
  let mut custom_rules: Vec<Rule> = Vec::new();

  for (key, enabled) in trans_options.iter() {
    if !*enabled {
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
    Rule::ReplacePrevKramaKeys { replace_with, .. } | Rule::DirectReplace { replace_with, .. } => {
      replace_with
        .iter()
        .map(|&k| {
          if k < 0 {
            ""
          } else {
            script_data.krama_text_or_empty(k)
          }
        })
        .collect::<Vec<&str>>()
        .join("")
    }
  }
}
/// Only applies rules marked with `use_replace=true` (fast replaceAll pass).
fn apply_custom_replace_rules(
  mut text: String,
  script_data: &ScriptData,
  rules: &[Rule],
  allowed_input_rule_type: CheckInEnum,
) -> String {
  if rules.is_empty() {
    return text;
  }

  for rule in rules.iter() {
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
          .collect::<Vec<&str>>()
          .join("");

        let repl_text = get_rule_replace_text(rule, script_data);

        for &follow_krama_index in following.iter() {
          let follow_krama_string = script_data.krama_text_or_empty(follow_krama_index);
          if follow_krama_string.is_empty() {
            continue;
          }

          let search = format!("{}{}", prev_string, follow_krama_string);
          let replace = format!("{}{}", repl_text, follow_krama_string);
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
          .unwrap_or_else(|| get_rule_replace_text(rule, script_data));

        for grp in to_replace.iter() {
          let to_replace_string = grp
            .iter()
            .map(|&k| script_data.krama_text_or_empty(k))
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

const DEFAULT_USE_NATIVE_NUMERALS_MODE: bool = true;
const DEFAULT_INCLUDE_INHERENT_VOWEL_MODE: bool = false;

const CHARS_TO_SKIP: [char; 10] = [' ', '\n', '\r', '\t', ',', '~', '!', '@', '?', '%'];
const MAX_CONTEXT_LENGTH: u8 = 3;

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

fn is_single_ascii_digit(s: &str) -> bool {
  s.len() == 1 && s.chars().next().is_some_and(|c| c.is_ascii_digit())
}
fn trans_opt<'a>(trans_options: &'a HashMap<String, bool>, key: &str) -> &'a bool {
  trans_options.get(key).unwrap_or(&false)
}

/// Synchronous core transliterator
pub fn transliterate_text_core(
  mut text: String,
  from_script_name: &str,
  to_script_name: &str,
  from_script_data: &ScriptData,
  to_script_data: &ScriptData,
  trans_options_in: &HashMap<String, bool>,
  custom_rules: &[Rule],
  options: Option<TransliterationFnOptions>,
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
    text = helpers::apply_typing_input_aliases(text, to_script_name);
  }

  text = apply_custom_replace_rules(text, from_script_data, custom_rules, CheckInEnum::Input);

  let mut result = ResultStringBuilder::new();
  let mut cursor = InputTextCursor::new(&text);
  let mut prev_context = PrevContextBuilder::new(MAX_CONTEXT_LENGTH as usize);

  let prev_context_in_use = (matches!(from_script_data, ScriptData::Brahmic { .. })
    && matches!(to_script_data, ScriptData::Other { .. }))
    || (matches!(from_script_data, ScriptData::Other { .. })
      && matches!(to_script_data, ScriptData::Brahmic { .. }))
    || (opts.typing_mode
      && from_script_name == "Normal"
      && matches!(to_script_data, ScriptData::Other { .. }));

  let (brahmic_nuqta, brahmic_halant) = match (from_script_data, to_script_data) {
    (ScriptData::Brahmic { nuqta, halant, .. }, ScriptData::Other { .. }) => {
      (nuqta.clone(), Some(halant.clone()))
    }
    (ScriptData::Other { .. }, ScriptData::Brahmic { nuqta, halant, .. }) => {
      (nuqta.clone(), Some(halant.clone()))
    }
    _ => (None, None),
  };

  // choose matching map
  let use_typing_map = (*trans_opt(&trans_options, "normal_to_all:use_typing_chars")
    || opts.typing_mode)
    && from_script_name == "Normal";
  let from_text_to_krama_map = if use_typing_map {
    &to_script_data.get_common_attr().typing_text_to_krama_map
  } else {
    &from_script_data.get_common_attr().text_to_krama_map
  };

  // Used when converting from Tamil-Extended (superscript numbers)
  let mut ignore_ta_ext_sup_num_text_index: isize = -1;

  let mut ctx = TransliterateCtx {
    from_script_name,
    to_script_name,
    from_script_data,
    to_script_data,
    trans_options: &trans_options,
    custom_rules,
    cursor: &mut cursor,
    result: &mut result,
    prev_context: &mut prev_context,
    prev_context_in_use,
    brahmic_halant: &brahmic_halant,
    brahmic_nuqta: &brahmic_nuqta,
    typing_mode: opts.typing_mode,
    include_inherent_vowels: opts.include_inherent_vowel,
  };

  let chars_len = &text.chars().count();
  while ctx.cursor.pos() < *chars_len {
    let mut text_index = ctx.cursor.pos();
    let cur = match ctx.cursor.peek() {
      Some(v) => v,
      None => break,
    };
    let ch = cur.ch;
    // println!("{} - {:?}", ctx.cursor.pos(), ch);

    if ignore_ta_ext_sup_num_text_index != -1
      && (text_index as isize) >= ignore_ta_ext_sup_num_text_index
    {
      ignore_ta_ext_sup_num_text_index = -1;
      ctx.cursor.advance(1);
      continue;
    }

    // skip certain chars (preserve as-is)
    if CHARS_TO_SKIP.contains(&ch.chars().next().unwrap_or('\0')) {
      ctx.cursor.advance(1);
      if ctx.prev_context_in_use {
        ctx.prev_context_cleanup(Some((Some(" ".to_string()), None)), None, None);
        ctx.prev_context.clear();
      }
      ctx.result.emit(ch);
      continue;
    }

    // latin digits passthrough if native numerals disabled
    if is_single_ascii_digit(&ch) && !opts.use_native_numerals {
      ctx.result.emit(ch.clone());
      ctx.cursor.advance(1);
      let _ = ctx.prev_context_cleanup(Some((Some(ch), None)), None, None);
      continue;
    }

    // Preserve mode: custom script chars when converting to Normal
    if *trans_opt(&trans_options, "all_to_normal:preserve_specific_chars")
      && to_script_name == "Normal"
    {
      let custom_arr = &from_script_data.get_common_attr().custom_script_chars_arr;
      let idx = binary_search_lower(
        custom_arr,
        &ch.as_str(),
        |a, i| a[i].0.as_str(),
        |a, b| a.cmp(b),
      );
      if let Some(custom_idx) = idx {
        let (custom_text, list_ref_opt, back_ref_opt) =
          &from_script_data.get_common_attr().custom_script_chars_arr[custom_idx];
        let list_item = list_ref_opt
          .and_then(|i| from_script_data.get_common_attr().list.get(i as usize))
          .cloned();
        ctx.prev_context_cleanup(Some((Some(custom_text.clone()), list_item)), None, None);

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
        ctx.cursor.advance(custom_text.chars().count());
        continue;
      }
    }

    // Step 1: match text_to_krama_map / typing_text_to_krama_map
    let mut text_to_krama_item_index: Option<usize>;
    {
      let mut scan_units: usize = 0;
      let mut last_valid_vowel_match_index: Option<usize> = None;
      let check_vowel_retraction = ctx.prev_context_in_use
        && matches!(from_script_data, ScriptData::Other { .. })
        && matches!(to_script_data, ScriptData::Brahmic { .. })
        && (ctx
          .prev_context
          .type_at(-1)
          .is_some_and(|k| k.is_vyanjana())
          || (ctx.brahmic_nuqta.is_some()
            && ctx
              .prev_context
              .type_at(-2)
              .is_some_and(|k| k.is_vyanjana())
            && ctx.prev_context.text_at(-1) == ctx.brahmic_nuqta.as_deref()));

      loop {
        let next = ctx.cursor.peek_at(text_index + scan_units + 1);
        let next_char = next
          .as_ref()
          .map(|c| c.ch.clone())
          .unwrap_or("".to_string());

        if ignore_ta_ext_sup_num_text_index != -1
          && !next_char.is_empty()
          && is_ta_ext_superscript_tail(next_char.chars().next())
        {
          scan_units += next.as_ref().map(|c| c.ch.chars().count()).unwrap_or(0);
        }

        let end_index = text_index + scan_units + 1;
        let char_to_search = if ignore_ta_ext_sup_num_text_index != -1 {
          let a = ctx
            .cursor
            .slice(text_index, ignore_ta_ext_sup_num_text_index as usize)
            .unwrap_or(String::new());
          let b = if end_index > (ignore_ta_ext_sup_num_text_index as usize) {
            ctx
              .cursor
              .slice((ignore_ta_ext_sup_num_text_index as usize) + 1, end_index)
              .unwrap_or("".to_string())
          } else {
            "".to_string()
          };
          format!("{}{}", a, b)
        } else {
          ctx
            .cursor
            .slice(text_index, end_index)
            .unwrap_or("".to_string())
        };

        let potential_match_index = binary_search_lower(
          from_text_to_krama_map,
          &char_to_search.as_str(),
          |a, i| a[i].0.as_str(),
          |a, b| a.cmp(b),
        );

        let Some(potential_match_index) = potential_match_index else {
          text_to_krama_item_index = None;
          break;
        };
        let potential_match = &from_text_to_krama_map[potential_match_index];

        // vowel retraction support (kAUM etc.)
        if check_vowel_retraction {
          if let Some(krama) = &potential_match.1.krama {
            if !krama.is_empty() {
              let krama_id = krama[0];
              if krama_id >= 0 {
                let list_idx = to_script_data
                  .get_common_attr()
                  .krama_text_arr
                  .get(krama_id as usize)
                  .and_then(|(_, li)| *li);
                let list_type =
                  list_idx.and_then(|li| to_script_data.get_common_attr().list.get(li as usize));
                let is_single_vowel =
                  krama.len() == 1 && list_type.is_some_and(|t| t.is_svara() || t.is_matra());
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
          if !next_list.is_empty() {
            let nth_next = ctx.cursor.peek_at(end_index);
            let nth_next_character = nth_next.as_ref().map(|c| c.ch.clone());

            // Tamil-Extended special handling (superscript numbers after matra/halant)
            if is_script_tamil_ext!(from_script_name)
              && matches!(from_script_data, ScriptData::Brahmic { .. })
            {
              let n_1_th_next = if nth_next.is_some() {
                ctx.cursor.peek_at(end_index + 1)
              } else {
                None
              };
              let n_1_th_next_character = n_1_th_next.as_ref().map(|c| c.ch.clone());

              // this handles mAtrA duplicates like O = E + A in gEA (or gO as visible when)
              let n_2_th_next = if nth_next.is_some() && n_1_th_next.is_some() {
                ctx.cursor.peek_at(end_index + 1 + 1)
              } else {
                None
              };
              let n_2_th_next_character = n_2_th_next.as_ref().map(|c| c.ch.clone());

              let canonical_map = &from_script_data.get_common_attr().text_to_krama_map;

              // Case: matra/halant + superscript tail (superscript is in next list)
              if ignore_ta_ext_sup_num_text_index == -1
                && n_1_th_next_character
                  .as_ref()
                  .is_some_and(|s| is_ta_ext_superscript_tail(s.chars().next()))
                && n_1_th_next_character
                  .as_ref()
                  .is_some_and(|s| next_list.iter().any(|x| x == s))
              {
                let sup = n_1_th_next_character.clone().unwrap_or_default();
                let char_index = binary_search_lower(
                  canonical_map,
                  &format!("{}{}", char_to_search, sup).as_str(),
                  |a, i| a[i].0.as_str(),
                  |a, b| a.cmp(b),
                );
                let nth_char_text_index = nth_next_character
                  .as_ref()
                  .and_then(|s| from_script_data.krama_index_of_text(s.as_str()));

                if let (Some(char_index), Some(nth_char_text_index)) =
                  (char_index, nth_char_text_index)
                {
                  text_to_krama_item_index = Some(char_index);

                  let nth_char_type = from_script_data
                    .get_common_attr()
                    .krama_text_arr
                    .get(nth_char_text_index)
                    .and_then(|(_, li)| *li)
                    .and_then(|li| from_script_data.get_common_attr().list.get(li as usize));

                  if let ScriptData::Brahmic { halant, .. } = from_script_data {
                    if nth_next_character.as_deref() == Some(halant)
                      || nth_char_type.is_some_and(|k| k.is_matra())
                    {
                      ignore_ta_ext_sup_num_text_index = (end_index + 1) as isize;
                      break;
                    }
                  }
                }
              }
              // Case: matra + matra + superscript tail (superscript is in next list; special for gO = g + E + A)
              else if ignore_ta_ext_sup_num_text_index == -1
                && n_2_th_next_character
                  .as_ref()
                  .is_some_and(|s| is_ta_ext_superscript_tail(s.chars().next()))
                && n_2_th_next_character
                  .as_ref()
                  .is_some_and(|s| next_list.iter().any(|x| x == s))
              {
                let sup = n_2_th_next_character.clone().unwrap_or_default();
                let char_index = binary_search_lower(
                  canonical_map,
                  &format!("{}{}", char_to_search, sup).as_str(),
                  |a, i| a[i].0.as_str(),
                  |a, b| a.cmp(b),
                );
                let nth_char_text_index = nth_next_character
                  .as_ref()
                  .and_then(|s| from_script_data.krama_index_of_text(s.as_str()));
                let n_1_th_char_text_index = n_1_th_next_character
                  .as_ref()
                  .and_then(|s| from_script_data.krama_index_of_text(s.as_str()));

                if let (Some(char_index), Some(nth_char_text_index), Some(n_1_th_char_text_index)) =
                  (char_index, nth_char_text_index, n_1_th_char_text_index)
                {
                  text_to_krama_item_index = Some(char_index);

                  let nth_char_type = from_script_data
                    .get_common_attr()
                    .krama_text_arr
                    .get(nth_char_text_index)
                    .and_then(|(_, li)| *li)
                    .and_then(|li| from_script_data.get_common_attr().list.get(li as usize));
                  let n_1_th_char_type = from_script_data
                    .get_common_attr()
                    .krama_text_arr
                    .get(n_1_th_char_text_index)
                    .and_then(|(_, li)| *li)
                    .and_then(|li| from_script_data.get_common_attr().list.get(li as usize));

                  if nth_char_type.is_some_and(|k| k.is_svara())
                    && n_1_th_char_type.is_some_and(|k| k.is_matra())
                  {
                    ignore_ta_ext_sup_num_text_index = (end_index + 1 + 1) as isize;
                    break;
                  }
                }
              }

              // Handle case: mAtrA + Vedic mark + superscript (n_2_th is superscript, n_1_th is Vedic)
              if ignore_ta_ext_sup_num_text_index == -1
                && nth_next_character.as_ref().is_some()
                && n_1_th_next_character
                  .as_ref()
                  .is_some_and(|s| is_vedic_svara_tail(s.chars().next()))
                && n_2_th_next_character
                  .as_ref()
                  .is_some_and(|s| is_ta_ext_superscript_tail(s.chars().next()))
                && n_2_th_next_character
                  .as_ref()
                  .is_some_and(|s| next_list.iter().any(|x| x == s))
              {
                let nth_char_text_index = nth_next_character
                  .as_ref()
                  .and_then(|s| from_script_data.krama_index_of_text(s.as_str()));

                if let Some(nth_char_text_index) = nth_char_text_index {
                  let nth_char_type = from_script_data
                    .get_common_attr()
                    .krama_text_arr
                    .get(nth_char_text_index)
                    .and_then(|(_, li)| *li)
                    .and_then(|li| from_script_data.get_common_attr().list.get(li as usize));

                  // If nth_next is a mAtrA and n_1_th is Vedic mark, include superscript
                  if nth_char_type.is_some_and(|k| k.is_matra()) {
                    let sup = n_2_th_next_character.clone().unwrap_or_default();
                    let char_index = binary_search_lower(
                      canonical_map,
                      &format!("{}{}", char_to_search, sup).as_str(),
                      |a, i| a[i].0.as_str(),
                      |a, b| a.cmp(b),
                    );
                    if let Some(char_index) = char_index {
                      text_to_krama_item_index = Some(char_index);
                      ignore_ta_ext_sup_num_text_index = (end_index + 1 + 1) as isize;
                      break;
                    }
                  }
                }
              }
            }

            // Generic: if the next character is in the next list, extend scan and continue
            if let Some(nth_next_character) = nth_next_character {
              if next_list.iter().any(|x| x == &nth_next_character) {
                scan_units += nth_next.as_ref().map(|c| c.ch.chars().count()).unwrap_or(0);
                continue;
              }
            }
          }
        }

        text_to_krama_item_index = Some(potential_match_index);
        break;
      }
    }
    let text_to_krama_item = text_to_krama_item_index.map(|i| &from_text_to_krama_map[i]);
    if let Some(text_to_krama_item) = text_to_krama_item {
      let (matched_text, map) = text_to_krama_item;
      let is_type_vyanjana = match &map.krama {
        Some(krama) => {
          match from_script_data
            .get_common_attr()
            .list
            .get(match krama.get(0) {
              Some(idx) => *idx,
              _ => -1,
            } as usize)
          {
            Some(v) => v.is_vyanjana(),
            _ => false,
          }
        }
        _ => false,
      };
      let index_delete_length = if ignore_ta_ext_sup_num_text_index != -1
        && matched_text.chars().count() > 1
        && is_type_vyanjana
        && is_ta_ext_superscript_tail(matched_text.chars().last())
      {
        1
      } else {
        0
      };
      let matched_len_units = matched_text.chars().count() - index_delete_length;
      ctx.cursor.advance(matched_len_units);

      if *trans_opt(&trans_options, "normal_to_all:use_typing_chars") {
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
                .and_then(|li| to_script_data.get_common_attr().list.get(li as usize))
                .cloned();
              ctx.prev_context_cleanup(
                Some((Some(matched_text.clone()), list_item)),
                map.next.as_deref(),
                None,
              );
              continue;
            }
          }
        }
      }

      // If krama exists and has at least one non -1, emit directly
      if let Some(krama) = &map.krama {
        if krama.iter().any(|&k| k != -1) {
          let mut pieces: Vec<String> = Vec::new();
          for &k in krama.iter() {
            if k < 0 {
              continue;
            }
            pieces.push(ctx.to_script_data.krama_text_or_empty(k).to_string());
          }

          // prev-context bookkeeping
          let mut result_concat_status = false;
          if ctx.prev_context_in_use {
            if matches!(from_script_data, ScriptData::Brahmic { .. })
              && matches!(to_script_data, ScriptData::Other { .. })
            {
              // pick a brahmic list item (from-script) if available
              let mut item = map.fallback_list_ref.and_then(|i| {
                if !trans_opt(&trans_options, "normal_to_all:use_typing_chars") {
                  from_script_data
                    .get_common_attr()
                    .list
                    .get(i as usize)
                    .cloned()
                } else {
                  None
                }
              });
              if item.is_none()
                && match &map.krama {
                  None => true,
                  Some(krama) => krama.is_empty(),
                }
              {
                item = None;
              } else if item.is_none() {
                if let Some(krama) = &map.krama {
                  let list_refs = (krama
                    .iter()
                    .map(|x| {
                      from_script_data
                        .get_common_attr()
                        .krama_text_arr
                        .get(*x as usize)
                        .and_then(|k| k.1)
                        .unwrap_or(-1)
                    })
                    .collect::<Vec<i16>>())
                  .iter()
                  .map(|list_ref| {
                    from_script_data
                      .get_common_attr()
                      .list
                      .get(*list_ref as usize)
                      .clone()
                      .map(|k| k.clone())
                  })
                  .collect::<Vec<Option<List>>>();
                  if is_script_tamil_ext!(from_script_name)
                    && list_refs
                      .iter()
                      .any(|k| k.as_ref().is_some_and(|k| k.is_matra()))
                    && list_refs
                      .iter()
                      .any(|k| k.as_ref().is_some_and(|k| k.is_vyanjana()))
                  {
                    if let Some(first) = list_refs.get(0) {
                      item = Some(List::Anya {
                        krama_ref: first
                          .clone()
                          .map(|x| x.get_krama_ref().clone())
                          .unwrap_or(Vec::new()),
                      });
                    }
                  } else if is_script_tamil_ext!(from_script_name)
                    && list_refs.len() > 1
                    && list_refs.iter().any(|k| k.is_none())
                  {
                    if let Some(last) = list_refs.last() {
                      match last {
                        None => {
                          item = None;
                        }
                        Some(v) => {
                          item = Some(v.clone());
                        }
                      }
                    }
                  } else {
                    // first
                    if let Some(first) = list_refs.first() {
                      match first {
                        None => {
                          item = None;
                        }
                        Some(v) => {
                          item = Some(v.clone());
                        }
                      }
                    }
                  }
                }
              }

              result_concat_status =
                ctx.prev_context_cleanup(Some((Some(matched_text.clone()), item)), None, None);
            } else if matches!(to_script_data, ScriptData::Brahmic { .. })
              && matches!(from_script_data, ScriptData::Other { .. })
            {
              let item: Option<List>;
              if let Some(f) = map.fallback_list_ref {
                item = to_script_data
                  .get_common_attr()
                  .list
                  .get(f as usize)
                  .cloned();
              } else {
                item = if krama.is_empty() {
                  None
                } else {
                  krama
                    .first()
                    .and_then(|k| {
                      to_script_data
                        .get_common_attr()
                        .krama_text_arr
                        .get(*k as usize)
                    })
                    .and_then(|k| match k.1 {
                      Some(i) => to_script_data.get_common_attr().list.get(i as usize),
                      None => None,
                    })
                    .map(|k| k.to_owned())
                };
              }

              let next_list = if opts.typing_mode && from_script_name == "Normal" {
                map.next.as_deref()
              } else {
                None
              };
              result_concat_status =
                ctx.prev_context_cleanup(Some((Some(matched_text.clone()), item)), next_list, None);
            } else if opts.typing_mode
              && from_script_name == "Normal"
              && matches!(to_script_data, ScriptData::Other { .. })
            {
              result_concat_status = ctx.prev_context_cleanup(
                Some((Some(matched_text.clone()), None)),
                map.next.as_deref(),
                None,
              );
            }
          }

          if !result_concat_status {
            // Tamil-Extended output reorder (matra/halant after superscript)
            if let ScriptData::Brahmic {
              halant: to_halant, ..
            } = to_script_data
            {
              if is_script_tamil_ext!(to_script_name)
                && is_ta_ext_superscript_tail(ctx.result.last_char())
              {
                if pieces.concat() == *to_halant
                  || match &map.krama {
                    Some(krama) => match krama.last() {
                      Some(last_i) => to_script_data
                        .get_common_attr()
                        .list
                        .get(*last_i as usize)
                        .is_some_and(|k| k.is_matra()),
                      None => false,
                    },
                    None => false,
                  }
                {
                  ctx
                    .result
                    .emit_pieces_with_reorder(&pieces, to_halant, true);
                } else if is_vedic_svara_tail(pieces.last().and_then(|k| k.chars().last())) {
                  ctx.result.emit_pieces(&pieces);
                  let last = ctx.result.pop_last_char().unwrap_or("".to_owned());
                  ctx.result.emit(last);
                } else {
                  ctx.result.emit_pieces(&pieces);
                }
              } else {
                ctx.result.emit_pieces(&pieces);
              }
            } else {
              ctx.result.emit_pieces(&pieces);
            }
          }

          ctx.apply_custom_trans_rules(ctx.cursor.pos() as isize, -(matched_len_units as isize));
          continue;
        } else
        // typing-mode special case when krama contains -1 entries: emit raw match
        if krama.iter().any(|&k| k == -1) {
          ctx.result.emit(matched_text.clone());
          if opts.typing_mode {
            ctx.prev_context_cleanup(
              Some((Some(matched_text.clone()), None)),
              map.next.as_deref(),
              None,
            );
          }
          continue;
        }
      }
    } else {
      ctx.cursor.advance(1);
      text_index = ctx.cursor.pos();
    }

    // Step 2: Search in krama_text_arr
    let char_to_search = text_to_krama_item
      .map(|k| k.0.clone())
      .unwrap_or(ch.clone());
    let idx = from_script_data.krama_index_of_text(&char_to_search);
    let Some(index) = idx else {
      if ctx.prev_context_in_use {
        ctx.prev_context_cleanup(Some((Some(char_to_search.clone()), None)), None, None);
        ctx.prev_context.clear();
      }
      ctx.result.emit(char_to_search);
      continue;
    };

    let mut result_concat_status = false;
    if ctx.prev_context_in_use {
      if matches!(from_script_data, ScriptData::Brahmic { .. }) {
        let list_idx = from_script_data
          .get_common_attr()
          .krama_text_arr
          .get(index)
          .and_then(|(_, li)| *li);
        let item = list_idx.and_then(|li| {
          from_script_data
            .get_common_attr()
            .list
            .get(li as usize)
            .cloned()
        });
        result_concat_status =
          ctx.prev_context_cleanup(Some((Some(char_to_search.clone()), item)), None, None);
      } else if matches!(to_script_data, ScriptData::Brahmic { .. }) {
        let list_idx = to_script_data
          .get_common_attr()
          .krama_text_arr
          .get(index)
          .and_then(|(_, li)| *li);
        let item = list_idx.and_then(|li| {
          to_script_data
            .get_common_attr()
            .list
            .get(li as usize)
            .cloned()
        });
        result_concat_status =
          ctx.prev_context_cleanup(Some((Some(char_to_search.clone()), item)), None, None);
      }
    }

    if !result_concat_status {
      let to_add_text = to_script_data.krama_text_or_empty(index as i16).to_string();
      let pieces = [to_add_text.to_owned()];
      if let ScriptData::Brahmic {
        halant: to_halant, ..
      } = to_script_data
      {
        if is_script_tamil_ext!(to_script_name)
          && is_ta_ext_superscript_tail(ctx.result.last_char())
        {
          if pieces.concat() == *to_halant
            || match to_script_data.get_common_attr().krama_text_arr.get(index) {
              Some(krama) => match krama.1 {
                Some(i) => to_script_data
                  .get_common_attr()
                  .list
                  .get(i as usize)
                  .is_some_and(|k| k.is_matra()),
                None => false,
              },
              None => false,
            }
          {
            ctx
              .result
              .emit_pieces_with_reorder(&pieces, to_halant, true);
          } else if is_vedic_svara_tail(pieces.last().and_then(|k| k.chars().last())) {
            ctx.result.emit_pieces(&pieces);
            let last = ctx.result.pop_last_char().unwrap_or("".to_owned());
            ctx.result.emit(last);
          } else {
            ctx.result.emit_pieces(&pieces);
          }
        } else {
          ctx.result.emit_pieces(&pieces);
        }
      } else {
        ctx.result.emit_pieces(&pieces);
      }
    }

    ctx.apply_custom_trans_rules(ctx.cursor.pos() as isize, -1);
  }

  if ctx.prev_context_in_use {
    let _ = ctx.prev_context_cleanup(None, None, Some(true));
  }

  let mut output = ctx.result.to_string();
  output = apply_custom_replace_rules(output, to_script_data, custom_rules, CheckInEnum::Output);

  Ok(TransliterationOutput {
    output,
    context_length: ctx.prev_context.length(),
  })
}

pub fn transliterate_text(
  text: String,
  from_script_name: &str,
  to_script_name: &str,
  transliteration_input_options: Option<&HashMap<String, bool>>,
  options: Option<TransliterationFnOptions>,
) -> Result<TransliterationOutput, String> {
  let from_norm = crate::script_data::get_normalized_script_name(from_script_name)
    .ok_or_else(|| format!("Unknown from-script `{}`", from_script_name))?;
  let to_norm = crate::script_data::get_normalized_script_name(to_script_name)
    .ok_or_else(|| format!("Unknown to-script `{}`", to_script_name))?;

  let from_data = ScriptData::get_script_data(&from_norm);
  let to_data = ScriptData::get_script_data(&to_norm);

  let resolved = resolve_transliteration_rules(from_data, to_data, transliteration_input_options);

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
