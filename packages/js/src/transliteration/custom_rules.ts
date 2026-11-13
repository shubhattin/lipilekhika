import type { ScriptData } from '../utils/get_script_data';
import type { CustomRule, CustomRulesType } from './options';
import type { TransliterateCtx } from './context';
import {
  kramaIndexOfText,
  kramaTextOrEmpty,
  matchPrevKramaSequence,
  replaceWithPieces,
  ZWJ,
  ZWNJ
} from './helpers';

const get_rule_replace_text = (rule: CustomRule, script_data: ScriptData) =>
  rule.replace_with.map((replace_with) => kramaTextOrEmpty(script_data, replace_with)).join('');
/** Apply replacement rules using direct replaceAll method if exist */
export const apply_custom_replace_rules = (
  text: string,
  script_data: ScriptData,
  rules: CustomRulesType,
  allowed_input_rule_type: CustomRule['check_in']
) => {
  if (rules.length === 0) return text;
  for (const rule of rules) {
    if (rule.use_replace !== true || rule.check_in !== allowed_input_rule_type) continue;
    if (rule.type === 'replace_prev_krama_keys') {
      const prev_string = rule.prev.map((prev) => kramaTextOrEmpty(script_data, prev)).join('');
      for (const follow_krama_index of rule.following) {
        const follow_krama_string = kramaTextOrEmpty(script_data, follow_krama_index);
        if (!follow_krama_string) continue;
        const replace_string = get_rule_replace_text(rule, script_data) + follow_krama_string;
        text = text.replaceAll(prev_string + follow_krama_string, replace_string);
      }
    } else if (rule.type === 'direct_replace') {
      const replace_with = rule.replace_text ?? get_rule_replace_text(rule, script_data);
      for (const grp of rule.to_replace) {
        const to_replace_string = grp
          .map((to_replace_item) => kramaTextOrEmpty(script_data, to_replace_item))
          .join('');
        text = text.replaceAll(to_replace_string, replace_with);
      }
    }
  }
  return text;
};

type ReplacePrevKramaKeysRule = Extract<CustomRule, { type: 'replace_prev_krama_keys' }>;
type DirectReplaceRule = Extract<CustomRule, { type: 'direct_replace' }>;

/**
 * Whether `prev` (krama indexes) is what was read before the end of the match.
 *
 * The letters read, not the input characters: the end of `prev` is compared with the krama of
 * this match (a Tamil-Extended ்ரு² (ृ) starts with the halant character but is no halant, a
 * Sinhala ඟ is ङ्ग), the rest with the characters before the match
 */
function prev_krama_matches_input(
  ctx: TransliterateCtx,
  prev: readonly number[],
  match_krama: readonly number[],
  match_start: number
): boolean {
  const { cursor, from_script_data } = ctx;
  let match_krama_index = match_krama.length;
  let input_index = match_start;
  for (let i = prev.length - 1; i >= 0; i--) {
    const expected = prev[i];
    while (match_krama_index > 0 && match_krama[match_krama_index - 1] < 0) match_krama_index--;
    if (match_krama_index > 0) {
      if (match_krama[--match_krama_index] !== expected) return false;
      continue;
    }
    // step back by characters, not UTF-16 units (non-BMP scripts like Brahmi)
    input_index = input_index > 0 ? cursor.prevCharIndex(input_index) : -1;
    const info = input_index >= 0 ? cursor.peekAt(input_index) : null;
    if (info === null || kramaIndexOfText(from_script_data, info.ch) !== expected) return false;
  }
  return true;
}

/** `replace_prev_krama_keys` checked in the input: `prev` read before, a `following` read next */
function apply_prev_krama_rule_on_input(
  ctx: TransliterateCtx,
  rule: ReplacePrevKramaKeysRule,
  match_start: number,
  next_index: number,
  match_krama: readonly number[],
  next_in_match: number | undefined
) {
  if (match_start < 0) return;
  if (!prev_krama_matches_input(ctx, rule.prev, match_krama, match_start)) return;
  let next_krama = next_in_match;
  if (next_krama === undefined) {
    const next_char_info = ctx.cursor.peekAt(next_index);
    if (next_char_info === null) return;
    next_krama = kramaIndexOfText(ctx.from_script_data, next_char_info.ch);
  }
  if (next_krama !== -1 && rule.following.indexOf(next_krama) !== -1) {
    const replace_with_pieces = replaceWithPieces(rule.replace_with, ctx.to_script_data);
    ctx.result.rewriteTailPieces(rule.prev.length, replace_with_pieces);
  }
}

/** `replace_prev_krama_keys` checked in the output: in this approch we will have check backwards */
function apply_prev_krama_rule_on_output(ctx: TransliterateCtx, rule: ReplacePrevKramaKeysRule) {
  const { result, to_script_data } = ctx;
  const last_piece = result.lastPiece();
  if (!last_piece) return;
  const following_krama_indexes = kramaIndexOfText(to_script_data, last_piece);
  if (following_krama_indexes === -1 || rule.following.indexOf(following_krama_indexes) === -1)
    return;
  const prev_match = matchPrevKramaSequence(result.peekAt, -2, rule.prev, to_script_data);
  if (prev_match.matched) {
    const replace_with_pieces = replaceWithPieces(rule.replace_with, to_script_data);
    result.rewriteTailPieces(prev_match.matchedLen + 1, [...replace_with_pieces, last_piece]);
  }
}

/** `direct_replace`: the end of the result is one of the `to_replace` groups */
function apply_direct_replace_rule(
  ctx: TransliterateCtx,
  rule: DirectReplaceRule,
  next_index: number,
  next_in_match: number | undefined
) {
  const { result } = ctx;
  const lookup_data = rule.check_in === 'output' ? ctx.to_script_data : ctx.from_script_data;
  // a joiner is not added next to one already in the text (the Sinhala conjunct ZWJ before a
  // ZWJ, or before a ZWNJ asking for no conjunct)
  if (next_in_match === undefined && rule.replace_text?.endsWith(ZWJ)) {
    const next_char = ctx.cursor.peekAt(next_index)?.ch;
    if (next_char === ZWJ || next_char === ZWNJ) return;
  }
  for (const search_group of rule.to_replace) {
    const match = matchPrevKramaSequence(result.peekAt, -1, search_group, lookup_data);
    if (!match.matched) continue;
    if (rule.replace_text) {
      // handling direct text replace rules which are not krama specific for a certain script
      result.rewriteTailPieces(match.matchedLen, [rule.replace_text]);
      return;
    }
    const replace_with_pieces = replaceWithPieces(rule.replace_with, lookup_data);
    result.rewriteTailPieces(match.matchedLen, replace_with_pieces);
    return;
  }
}

/**
 * Applies the custom rules after a match (`next_in_match` is `undefined`), or between two pieces
 * of one match (only the rules that can apply there: `direct_replace` and the input side
 * `replace_prev_krama_keys`), `next_in_match` then is the krama of the next piece.
 * @param match_start index of the first character of the match in the input
 * @param next_index index of the character after the match (read when `next_in_match` is `undefined`)
 * @param match_krama the krama of the match read so far (all of it after the match)
 */
export function apply_custom_trans_rules(
  ctx: TransliterateCtx,
  match_start: number,
  next_index: number,
  match_krama: readonly number[],
  next_in_match?: number
) {
  const custom_rules = ctx.custom_rules;
  for (let rule_index = 0; rule_index < custom_rules.length; rule_index++) {
    const rule = custom_rules[rule_index];
    if (rule.use_replace === true) continue;
    if (rule.type === 'direct_replace') {
      apply_direct_replace_rule(ctx, rule, next_index, next_in_match);
    } else if (rule.check_in === 'input') {
      apply_prev_krama_rule_on_input(
        ctx,
        rule,
        match_start,
        next_index,
        match_krama,
        next_in_match
      );
    } else if (rule.check_in === 'output' && next_in_match === undefined) {
      // the output side rule sees whole matches only, not the pieces of one
      apply_prev_krama_rule_on_output(ctx, rule);
    }
  }
}
