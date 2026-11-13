/**
 * Step 1 of the transliteration: the entry of the text to krama map to read at a position.
 *
 * The map holds the texts of more than one character (and the ones that do not map to a single
 * krama entry). Every entry lists the characters that can continue it (`next`), the scan follows
 * them to the longest text. It does not back out of a longer text, the few cases where the
 * longest text is not the one to read are handled here by name.
 */
import type { ScriptData } from '../utils/get_script_data';
import { MODE_OTHER_TO_BRAHMIC, prev_ends_with_vyanjana, type TransliterateCtx } from './context';
import { ta_ext_match_with_superscript, ta_ext_split_before_halant_matra } from './tamil_ext';
import {
  cpWidth,
  has_krama_other_than,
  is_fully_read_krama,
  isLatinCombiningMark,
  isTaExtSuperscriptTailCp,
  isVedicSvaraTailCp,
  isWordCp,
  kramaIndexOfChar,
  listItemOfKrama,
  make_input_cursor,
  textToKramaMapCharIndex,
  textToKramaMapIndex,
  OM_KRAMA_INDEX
} from './helpers';

/**
 * Whether the text before `index` is a syllable that a sign written as a dead consonant (the
 * Tamil anusvAra ம், see `dead_consonant_sign_index`) can go with: a vyanjana (with its inherent
 * vowel), a svara or a mAtrA, looking past Vedic svaras. Else (the start of a word, after a
 * halant, a digit or a sign) it is the consonant + halant (ஸாத்ம்ய -> सात्म्य, not सात्ंय).
 */
const sign_has_base = (
  script_data: ScriptData,
  cursor: ReturnType<typeof make_input_cursor>,
  index: number
): boolean => {
  let end = index;
  let prev = cursor.prevCharIndex(end);
  while (prev >= 0 && isVedicSvaraTailCp(cursor.cpAt(prev))) {
    end = prev;
    prev = cursor.prevCharIndex(end);
  }
  if (prev < 0) return false;
  let krama_index = kramaIndexOfChar(script_data, cursor.cpAt(prev));
  if (krama_index === -1 && prev > 0) {
    // a vowel sign or vowel written as its parts (ௌ as ெ + ௗ): the text of the last two
    const map_index = textToKramaMapIndex(
      script_data,
      cursor.slice(cursor.prevCharIndex(prev), end)
    );
    krama_index = script_data.text_to_krama_map[map_index]?.[1].krama?.at(-1) ?? -1;
  }
  const type = listItemOfKrama(script_data, krama_index)?.type;
  return type === 'vyanjana' || type === 'svara' || type === 'mAtrA';
};

/**
 * Whether the character at `index` (`width` UTF-16 units) is not read by itself but starts a
 * longer text that is, walking `text_to_krama_map` like Step 1. The Sinhala ZWJ + al-lakuna `‍්`
 * is a halant, while the ZWJ by itself is a custom script character.
 */
export const only_read_in_longer_text = (
  script_data: ScriptData,
  cursor: ReturnType<typeof make_input_cursor>,
  index: number,
  width: number
): boolean => {
  const cp = cursor.cpAt(index);
  let map_index = textToKramaMapCharIndex(script_data, cp);
  const own_krama = map_index !== -1 ? script_data.text_to_krama_map[map_index][1].krama : null;
  if (
    kramaIndexOfChar(script_data, cp) !== -1 ||
    (own_krama && has_krama_other_than(own_krama, -1))
  )
    return false;
  let end = index + width;
  let read = false;
  while (map_index !== -1) {
    const next_cps = script_data.next_cps_text_to_krama_map[map_index];
    const cp = cursor.cpAt(end);
    if (next_cps === null || cp === -1 || !next_cps.includes(cp)) break;
    end += cpWidth(cp);
    map_index = textToKramaMapIndex(script_data, cursor.slice(index, end));
    const krama = map_index !== -1 ? script_data.text_to_krama_map[map_index][1].krama : null;
    if (krama && has_krama_other_than(krama, -1)) read = true;
  }
  return read;
};

/** The krama is one single vowel (svara / mAtrA) of the script */
function is_single_vowel_krama(script_data: ScriptData, krama: readonly number[]): boolean {
  if (krama.length !== 1) return false;
  const type = listItemOfKrama(script_data, krama[0])?.type;
  return type === 'svara' || type === 'mAtrA';
}

/**
 * The text from `text_index` to `end_index` that is searched in the map. While a Tamil-Extended
 * superscript is being skipped (`ctx.ta_ext_skip_index`) it is left out of the text.
 *
 * usage example: க்⁴ரு² -> ghR
 */
function scan_text(ctx: TransliterateCtx, text_index: number, end_index: number): string {
  const { cursor } = ctx;
  const skip_index = ctx.ta_ext_skip_index;
  if (skip_index === -1) return cursor.slice(text_index, end_index);
  // in this we will ignore the current charcter and scan one ahead
  return (
    cursor.slice(text_index, skip_index) +
    (end_index > skip_index ? cursor.slice(skip_index + 1, end_index) : '')
  );
}

/**
 * Decomposed (NFD) text: a letter is its base + combining marks (ī is i + U+0304), and
 * the base can continue the letter before it (a + i is ai, k + h is kh). When the match
 * cannot take the mark after it but its last letter can, the match stops before that
 * letter: kaī is k a ī (कई), not kai + U+0304
 *
 * @returns index in the map of the match without its last letter, `-1` if this is not the case
 */
function nfd_split_before_marked_letter(
  ctx: TransliterateCtx,
  match_index: number,
  text_index: number,
  end_index: number
): number {
  const { cursor, lookup_data, use_typing_map } = ctx;
  const mark_cp = cursor.cpAt(end_index);
  if (!isLatinCombiningMark(mark_cp) || ctx.text_to_krama_next_cps[match_index]?.includes(mark_cp))
    return -1;
  const last_index = cursor.prevCharIndex(end_index);
  const head_index = textToKramaMapIndex(
    lookup_data,
    cursor.slice(text_index, last_index),
    use_typing_map
  );
  const head_krama = head_index !== -1 ? ctx.text_to_krama_map[head_index][1].krama : null;
  if (
    is_fully_read_krama(head_krama) &&
    textToKramaMapIndex(
      lookup_data,
      cursor.slice(last_index, end_index) + String.fromCharCode(mark_cp),
      use_typing_map
    ) !== -1
  )
    return head_index;
  return -1;
}

/**
 * Follows the `next` characters of the entries of the map to the longest text at `text_index`.
 *
 * Iterative matching with retraction support for vyanjana+vowel context.
 * Instead of lookahead, we save the last valid vowel (svara/mAtrA) match and retract if needed
 *
 * @returns index in `ctx.text_to_krama_map`, `-1` if no match
 */
function scan_longest_match(
  ctx: TransliterateCtx,
  cp: number,
  text_index: number,
  char_width: number
): number {
  const { cursor, lookup_data, use_typing_map, from_script_data } = ctx;
  let scan_units = 0;
  let last_valid_vowel_match_index = -1;
  // Flag to track if we're in a vyanjana+vowel context where retraction may be needed
  const check_vowel_retraction = ctx.mode === MODE_OTHER_TO_BRAHMIC && prev_ends_with_vyanjana(ctx);

  while (true) {
    if (
      ctx.ta_ext_skip_index !== -1 &&
      isTaExtSuperscriptTailCp(cursor.cpAt(text_index + char_width + scan_units))
    ) {
      scan_units += 1; // superscript numbers are single UTF-16 units
    }
    const end_index = text_index + char_width + scan_units;
    // The single char lookup is done by code point, so the search text is only built when needed
    const single_char_lookup = scan_units === 0 && ctx.ta_ext_skip_index === -1;
    let char_to_search = '';
    let match_index: number;
    if (single_char_lookup) {
      // more scan units only needed in case ta-ext so safe to do
      match_index = textToKramaMapCharIndex(lookup_data, cp, use_typing_map);
    } else {
      char_to_search = scan_text(ctx, text_index, end_index);
      match_index = textToKramaMapIndex(lookup_data, char_to_search, use_typing_map);
    }
    if (match_index === -1) return -1;

    // When in vyanjana context, track single-vowel (svara/mAtrA) matches for potential retraction
    // eg: for kAUM :- काऊं
    if (check_vowel_retraction) {
      const krama = ctx.text_to_krama_map[match_index][1].krama;
      if (krama && krama.length >= 1) {
        if (is_single_vowel_krama(ctx.to_script_data, krama)) {
          // Save this as a valid retraction point
          last_valid_vowel_match_index = match_index;
        } else if (last_valid_vowel_match_index !== -1) {
          // Current match is NOT a single vowel but we have a saved vowel match
          // Retract to the last valid vowel match
          return last_valid_vowel_match_index;
        }
      }
    }

    // `next` entries are single characters, so their code points are precomputed
    const next_cps = ctx.text_to_krama_next_cps[match_index];
    if (next_cps !== null) {
      const nth_next_cp = cursor.cpAt(end_index);

      if (ctx.is_from_tamil_ext && from_script_data.script_type === 'brahmic') {
        // Tamil-Extended only: work with strings here (rare path)
        if (single_char_lookup) char_to_search = cursor.slice(text_index, end_index);
        const halant = from_script_data.halant;
        let ta_ext_index = ta_ext_match_with_superscript(
          ctx,
          halant,
          ctx.text_to_krama_map[match_index][1].next!,
          char_to_search,
          end_index
        );
        if (ta_ext_index === -1)
          ta_ext_index = ta_ext_split_before_halant_matra(
            ctx,
            halant,
            char_to_search,
            end_index,
            nth_next_cp,
            next_cps
          );
        if (ta_ext_index !== -1) return ta_ext_index;
      }
      // Generic: if the next character is in the next list, extend scan and continue
      if (nth_next_cp !== -1 && next_cps.includes(nth_next_cp)) {
        scan_units += cpWidth(nth_next_cp);
        continue;
      }
    }
    if (scan_units > 0 && ctx.ta_ext_skip_index === -1 && ctx.from_is_other) {
      const head_index = nfd_split_before_marked_letter(ctx, match_index, text_index, end_index);
      if (head_index !== -1) return head_index;
    }
    return match_index;
  }
}

/**
 * A sign written as a dead consonant (Tamil anusvAra ம்) with no syllable to go with (the start
 * of a word, after a halant): only the consonant is read (in Step 2), the halant next
 */
function is_dead_consonant_sign_without_base(
  ctx: TransliterateCtx,
  match_index: number,
  char_index: number
): boolean {
  return (
    match_index === ctx.from_script_data.dead_consonant_sign_index &&
    !ctx.use_typing_map &&
    !sign_has_base(ctx.from_script_data, ctx.cursor, char_index)
  );
}

/**
 * ॐ inside a word (after a letter) is read as the letters of its text, the longest part of it
 * which is read: IAST logoṃ is लोगों, SLP1 jAUM जाऊं (to a brahmic script the same is done
 * after a vyanjana, `check_vowel_retraction`)
 *
 * @returns index in the map of that part, `match_index` if the match is not ॐ inside a word
 */
function split_om_inside_word(
  ctx: TransliterateCtx,
  match_index: number,
  char_index: number
): number {
  const { cursor } = ctx;
  if (char_index <= 0 || !isWordCp(cursor.cpAt(cursor.prevCharIndex(char_index))))
    return match_index;
  const [matched_text, { krama }] = ctx.text_to_krama_map[match_index];
  if (krama?.length !== 1 || krama[0] !== OM_KRAMA_INDEX) return match_index;
  const code_points = [...matched_text];
  for (let end = code_points.length - 1; end > 0; end--) {
    const index = textToKramaMapIndex(
      ctx.lookup_data,
      code_points.slice(0, end).join(''),
      ctx.use_typing_map
    );
    const part_krama = index !== -1 ? ctx.text_to_krama_map[index][1].krama : null;
    if (is_fully_read_krama(part_krama)) return index;
  }
  return match_index;
}

/**
 * Step 1: Search for the character in the text_to_krama_map
 *
 * Only reads the context, but for its own results: from Tamil-Extended a superscript read with
 * the match is given in `ctx.matched_superscript_index` / `ctx.matched_superscript_detached`
 * (the loop then skips it), also when the match itself is dropped here.
 *
 * (the Tamil-Extended matches index into `from_script_data.text_to_krama_map`, which
 * is `ctx.text_to_krama_map` as typing map is only used with `Normal` as the input)
 *
 * @param cp code point at `char_index`, `char_width` its UTF-16 units
 * @returns index in `ctx.text_to_krama_map`, `-1` if no match
 */
export function match_text_to_krama(
  ctx: TransliterateCtx,
  cp: number,
  char_index: number,
  char_width: number
): number {
  ctx.matched_superscript_index = -1;
  ctx.matched_superscript_detached = false;
  const match_index = scan_longest_match(ctx, cp, char_index, char_width);
  if (match_index === -1) return -1;
  if (is_dead_consonant_sign_without_base(ctx, match_index, char_index)) return -1;
  if (ctx.om_only_at_word_start) return split_om_inside_word(ctx, match_index, char_index);
  return match_index;
}
