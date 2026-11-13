/**
 * The transliteration core.
 *
 * `transliterate_text_core` reads the input once, character by character:
 *
 * 1. The input is prepared: the typing aliases, then the custom rules that are a plain replace
 *    on the input (`apply_custom_replace_rules`).
 * 2. A character that is copied as it is (space, punctuation, an ASCII digit when native
 *    numerals are off, a preserved custom character) is emitted and the loop goes on.
 * 3. Step 1 (`matcher.ts`): the longest text of the text to krama map at this position.
 *    `emit_match` writes its krama in the target script.
 * 4. Step 2 (`emit_krama_char`): a character without a match (or a match without a krama of its
 *    own) is looked up in the krama array directly. An unknown character is copied.
 * 5. Before every item is written `prev_context_cleanup` (`context.ts`) looks at the last items
 *    (`prev_context`): between a brahmic and an `other` script the inherent vowel, the halant
 *    and the mAtrA form of a vowel depend on what came before (`ContextMode`).
 * 6. After every match the custom rules of the enabled options are applied on the end of the
 *    result (`custom_rules.ts`), and at the end the ones that are a plain replace on the output.
 *
 * Tamil-Extended has its own handling in Step 1 and when writing (`tamil_ext.ts`).
 */
import { getScriptData, type ScriptData } from '../utils/get_script_data';
import type { script_list_type } from '../utils/lang_list';
import {
  resolve_transliteration_rules,
  type CustomOptionType,
  type CustomRulesType
} from './options';
import { apply_custom_replace_rules, apply_custom_trans_rules } from './custom_rules';
import {
  context_text_of_match,
  create_transliterate_ctx,
  flush_prev_context,
  prev_context_cleanup,
  result_ends_with_ta_ext_superscript,
  MODE_BRAHMIC_TO_OTHER,
  MODE_NONE,
  MODE_OTHER_TO_BRAHMIC,
  MODE_TYPING_TO_OTHER,
  type ListItem,
  type TextToKramaItem,
  type TransliterateCtx
} from './context';
import { match_text_to_krama, only_read_in_longer_text } from './matcher';
import {
  emit_krama_after_ta_ext_superscript,
  emit_piece_after_ta_ext_superscript,
  ta_ext_unconsumed_superscript_units
} from './tamil_ext';
import {
  kramaTextOrEmpty,
  kramaIndexOfText,
  kramaIndexOfChar,
  applyTypingInputAliases,
  isTaExtSuperscriptTail,
  cpWidth,
  getCustomScriptCharsData,
  getTypingTextToKramaText,
  emit_krama_pieces,
  has_krama_other_than,
  isSkipChar,
  listItemOfKrama,
  ANYA_LIST_ITEM,
  ZWJ,
  ZWNJ
} from './helpers';

export {
  get_active_custom_options,
  resolve_transliteration_rules,
  type CustomOptionList,
  type CustomOptionType
} from './options';
export { apply_custom_replace_rules } from './custom_rules';

const DEFAULT_USE_NATIVE_NUMERALS_MODE = true;
const DEFAULT_INCLUDE_INHERENT_VOWEL_MODE = false;

/**
 * Options of the core transliterator call (not the custom transliteration options).
 *
 * Not available on the main `transliterate` function of the `index.ts`, which uses the
 * `normal_to_brahmic:keep_ascii_numerals` and `normal_to_brahmic:include_inherent_vowel`
 * custom options instead (either one turns the behaviour on).
 */
type TransliterationFnOptions = {
  /** This enables typing mode, returns a context length which will be used to clear the external context */
  typing_mode?: boolean;
  /** Use native numerals in transliteration/typing */
  useNativeNumerals?: boolean;
  /** Include inherent vowels(schwa character) in transliteration/typing
   * @default false
   */
  includeInherentVowel?: boolean;
};

/** The superscript of a Tamil-Extended match that was read with it (see `ta_ext_skip_index`) */
function skip_consumed_ta_ext_superscript(
  ctx: TransliterateCtx,
  char_index: number,
  char_width: number
): boolean {
  if (ctx.ta_ext_skip_index === -1 || char_index < ctx.ta_ext_skip_index) return false;
  ctx.ta_ext_skip_index = -1;
  ctx.cursor.advance(char_width);
  return true;
}

/** blank spaces and punctuation, they also end the context */
function emit_skip_char(ctx: TransliterateCtx, char_index: number, char_width: number) {
  ctx.cursor.advance(char_width);
  if (ctx.mode !== MODE_NONE) {
    prev_context_cleanup(ctx, ' ', null);
    ctx.prev_context.clear();
  }
  ctx.result.emit(ctx.cursor.slice(char_index, char_index + char_width));
}

/** `0` - `9` when native numerals are not used */
function emit_ascii_digit(ctx: TransliterateCtx, char_index: number, char_width: number) {
  const char = ctx.cursor.slice(char_index, char_index + char_width);
  ctx.cursor.advance(char_width);
  // cleanup first, so a pending halant/schwa goes before the digit (k0 -> क्0)
  prev_context_cleanup(ctx, char, null);
  ctx.result.emit(char);
}

/**
 * In Preserve mode, first check if the character is a custom script character
 * (unless it starts a longer text, the Sinhala ZWJ + al-lakuna `‍්` is a halant)
 * @returns `true` when the character was a custom script character (written as its Normal key)
 */
function emit_preserved_custom_char(
  ctx: TransliterateCtx,
  char_index: number,
  char_width: number
): boolean {
  const { cursor, from_script_data } = ctx;
  const char = cursor.slice(char_index, char_index + char_width);
  const custom_script_val = getCustomScriptCharsData(from_script_data, char);
  if (
    custom_script_val === undefined ||
    only_read_in_longer_text(from_script_data, cursor, char_index, char_width)
  )
    return false;
  prev_context_cleanup(ctx, char, from_script_data.list[custom_script_val[0] ?? -1] ?? null);
  const normal_text = getTypingTextToKramaText(from_script_data, custom_script_val[1]);
  ctx.result.emit(normal_text ?? '');
  cursor.advance(char.length);
  return true;
}

/**
 * The characters that are copied as they are (not looked up in the script data).
 * @returns `true` when the character was one of them (it is emitted and advanced over)
 */
function emit_passthrough_char(
  ctx: TransliterateCtx,
  cp: number,
  char_index: number,
  char_width: number
): boolean {
  if (isSkipChar(cp) && !(cp === 0x7e && ctx.tilde_is_text)) {
    emit_skip_char(ctx, char_index, char_width);
    return true;
  }
  if (cp >= 0x30 && cp <= 0x39 && !ctx.use_native_numerals) {
    emit_ascii_digit(ctx, char_index, char_width);
    return true;
  }
  return ctx.preserve_specific_chars && emit_preserved_custom_char(ctx, char_index, char_width);
}

/** A key of the typing map that is a custom script character of the target script */
function emit_typing_custom_char(
  ctx: TransliterateCtx,
  matched_text: string,
  custom_back_ref: number,
  next: string[] | null | undefined
) {
  const { to_script_data } = ctx;
  const custom_script_char_item = to_script_data.custom_script_chars_arr[custom_back_ref];
  // cleanup first, so a pending halant goes before the custom character
  // (kqq -> क्q, k.qSha -> क्‍ष)
  // custom characters are never svara/mAtrA, so cleanup never emits them itself
  prev_context_cleanup(
    ctx,
    matched_text,
    to_script_data.list[custom_script_char_item[1] ?? -1] ?? null,
    next
  );
  ctx.result.emit(custom_script_char_item[0]);
}

/** brahmic -> other: the list item (type info) that stands for a match of the brahmic text */
function source_list_item_of_match(
  ctx: TransliterateCtx,
  map: TextToKramaItem[1],
  krama: number[]
): ListItem | null | undefined {
  const { from_script_data } = ctx;
  if (
    !ctx.use_typing_chars &&
    map.fallback_list_ref !== undefined &&
    map.fallback_list_ref !== null
  )
    return from_script_data.list[map.fallback_list_ref];
  // if otherwise then follow the the last kram ref
  // use last as that is prev which will be used to decide svara or vyanjana
  // This condition very well may change in the future so be careful
  if (krama.length === 0) return null;
  if (!ctx.is_from_tamil_ext) return listItemOfKrama(from_script_data, krama[0]);
  const list_refs = krama.map((krama_index) => listItemOfKrama(from_script_data, krama_index));
  // if mixture of vyanjana and mAtrA then return the first item as anya type
  if (
    list_refs.some((item) => item?.type === 'mAtrA') &&
    list_refs.some((item) => item?.type === 'vyanjana')
  )
    return ANYA_LIST_ITEM;
  if (list_refs.length > 1 && list_refs.some((item) => item === undefined || item === null))
    return list_refs.at(-1);
  return list_refs[0];
}

/** other -> brahmic: the context update for a match, the item is of the brahmic target */
function update_context_for_brahmic_target(
  ctx: TransliterateCtx,
  matched_text: string,
  map: TextToKramaItem[1],
  krama: number[]
): boolean {
  const { to_script_data } = ctx;
  let item: ListItem | null | undefined;
  if (map.fallback_list_ref !== undefined && map.fallback_list_ref !== null) {
    item = to_script_data.list[map.fallback_list_ref];
  } else {
    item = krama.length > 0 ? (listItemOfKrama(to_script_data, krama[0]) ?? null) : null;
  }
  // The halant typed by its own key (`.h`) is passed as the halant itself, so that
  // the cleanup does not add a second one after a vyanjana (k.h -> क्, not क््)
  const item_text = context_text_of_match(to_script_data, krama, matched_text, ctx.BRAHMIC_HALANT);
  if (ctx.typing_mode && ctx.from_script_name === 'Normal') {
    // Note :- this is the only over place where next chars can be found
    return prev_context_cleanup(
      ctx,
      item_text,
      item,
      map.next,
      ctx.is_to_tamil_ext &&
        isTaExtSuperscriptTail(kramaTextOrEmpty(to_script_data, krama[krama.length - 1]).at(-1))
    );
  }
  return prev_context_cleanup(ctx, item_text, item);
}

/**
 * The context update for a match with a krama, by the mode.
 * @returns `true` when the cleanup already wrote the item (as the mAtrA of the vyanjana before)
 */
function update_context_for_match(
  ctx: TransliterateCtx,
  matched_text: string,
  map: TextToKramaItem[1],
  krama: number[]
): boolean {
  switch (ctx.mode) {
    case MODE_BRAHMIC_TO_OTHER:
      return prev_context_cleanup(
        ctx,
        // A halant variant matched as a whole (Sinhala al-lakuna + ZWJ `්‍`) is passed as
        // the halant itself, so that the cleanup does not add an inherent vowel before it
        // (ක්‍ෂ -> kSha, not kaSha)
        context_text_of_match(ctx.from_script_data, krama, matched_text, ctx.BRAHMIC_HALANT),
        source_list_item_of_match(ctx, map, krama)
      );
    case MODE_OTHER_TO_BRAHMIC:
      return update_context_for_brahmic_target(ctx, matched_text, map, krama);
    case MODE_TYPING_TO_OTHER:
      return prev_context_cleanup(ctx, matched_text, null, map.next);
    default:
      return false;
  }
}

/**
 * Emits the krama piece by piece, the rules that can apply inside a match see every piece of
 * it, not only the last: Romanized sh (स्ह) -> ස්‍හ with the Sinhala conjunct ZWJ, Sinhala ඟ
 * (ङ्ग) -> nga, or -> ंग with the anusvAra option
 */
function emit_krama_with_in_match_rules(
  ctx: TransliterateCtx,
  krama: number[],
  match_start: number
) {
  for (let i = 0; i < krama.length; i++) {
    if (krama[i] < 0) continue;
    const piece = kramaTextOrEmpty(ctx.to_script_data, krama[i]);
    ctx.result.emit(piece);
    if (piece && i < krama.length - 1)
      apply_custom_trans_rules(
        ctx,
        match_start,
        ctx.cursor.pos,
        krama.slice(0, i + 1),
        krama[i + 1]
      );
  }
}

/** A match with a krama: as the krama index is present we can skip the Step 2 and return the
 * result directly */
function emit_match_krama(
  ctx: TransliterateCtx,
  matched_text: string,
  map: TextToKramaItem[1],
  krama: number[],
  match_start: number
) {
  const result_concat_status = update_context_for_match(ctx, matched_text, map, krama);
  if (!result_concat_status) {
    if (result_ends_with_ta_ext_superscript(ctx)) emit_krama_after_ta_ext_superscript(ctx, krama);
    else if (ctx.has_in_match_rules && krama.length > 1)
      emit_krama_with_in_match_rules(ctx, krama, match_start);
    else emit_krama_pieces(ctx.result, ctx.to_script_data, krama);
  }
  if (ctx.custom_rules.length > 0)
    apply_custom_trans_rules(ctx, match_start, ctx.cursor.pos, krama);
}

/**
 * A match where any one of the krama poiting is -1
 * (prefix-only entries like `c` of `ch` or `S` of `Sh`, emitted as they are)
 */
function emit_prefix_only_match(
  ctx: TransliterateCtx,
  matched_text: string,
  next: string[] | null | undefined
) {
  // cleanup first, so a pending halant goes before the text (kc -> क्c)
  if (ctx.typing_mode) {
    // custom context setup call where -1
    // Like for Sh('), ''(')\
    prev_context_cleanup(ctx, matched_text, null, next);
  } else if (ctx.mode !== MODE_NONE) {
    // like an unknown character (see Step 2), `kca` -> क्cअ
    prev_context_cleanup(ctx, matched_text, null);
    ctx.prev_context.clear();
  }
  ctx.result.emit(matched_text);
}

/**
 * Writes the match of Step 1 and advances over it.
 * @param match_start index of the first character of the match (the cursor is on it)
 * @returns `false` when the entry has no krama of its own: its text is read in Step 2
 */
function emit_match(ctx: TransliterateCtx, match_index: number, match_start: number): boolean {
  const [matched_text, map] = ctx.text_to_krama_map[match_index];
  // we have to componsate for the superscript number's length
  ctx.cursor.advance(
    matched_text.length - ta_ext_unconsumed_superscript_units(ctx, matched_text, map)
  );
  if (
    ctx.use_typing_chars &&
    'custom_back_ref' in map &&
    map.custom_back_ref !== undefined &&
    map.custom_back_ref !== null
  ) {
    emit_typing_custom_char(ctx, matched_text, map.custom_back_ref, map.next);
    return true;
  }
  const krama = map.krama;
  if (krama === null || krama === undefined) return false;
  if (has_krama_other_than(krama, -1)) {
    emit_match_krama(ctx, matched_text, map, krama, match_start);
    return true;
  }
  if (krama.indexOf(-1) !== -1) {
    emit_prefix_only_match(ctx, matched_text, map.next);
    return true;
  }
  return false;
}

/** text not matched so ignore and return as it is */
function emit_unknown_char(ctx: TransliterateCtx, char: string) {
  // A ZWJ / ZWNJ only changes how a Brahmic text is shown (a conjunct, half form or the
  // eyelash ra र‍्), it is not written in Normal / Romanized and does not end the syllable:
  // क्‍ष and क‍्ष are kSha (were k‍Sha and ka‍Sha)
  if (ctx.mode === MODE_BRAHMIC_TO_OTHER && (char === ZWJ || char === ZWNJ)) return;
  if (ctx.mode !== MODE_NONE) {
    prev_context_cleanup(ctx, char, null);
    ctx.prev_context.clear();
    // clear the array as an unidentified character found
  }
  ctx.result.emit(char);
}

/** The context update for the krama entry `index` read in Step 2, by the mode */
function update_context_for_krama_char(
  ctx: TransliterateCtx,
  char: string,
  index: number,
  text_to_krama_item: TextToKramaItem | null
): boolean {
  switch (ctx.mode) {
    case MODE_BRAHMIC_TO_OTHER:
      return prev_context_cleanup(ctx, char, listItemOfKrama(ctx.from_script_data, index));
    case MODE_OTHER_TO_BRAHMIC:
      return prev_context_cleanup(ctx, char, listItemOfKrama(ctx.to_script_data, index));
    case MODE_TYPING_TO_OTHER:
      // Typing into an `other` script: a key with no krama in the typing map (Romanized `sh` /
      // `ch`, prefixes of `shh` / `sh^` / `chh`) is resolved here. Pass its `next` as in Step 1,
      // so the context is kept while more keys can follow (else `shh` at the start of a word
      // comes out as `śh`), and cleared like in Step 1 when none can.
      prev_context_cleanup(ctx, char, null, text_to_krama_item?.[1].next);
      return false;
    default:
      return false;
  }
}

/**
 * Step 2: Search for the character in the krama_text_map
 *
 * The cursor is already after the character (or after the match without krama, `match_index`).
 */
function emit_krama_char(
  ctx: TransliterateCtx,
  cp: number,
  char_index: number,
  char_width: number,
  match_index: number
) {
  const { from_script_data } = ctx;
  const text_to_krama_item = match_index !== -1 ? ctx.text_to_krama_map[match_index] : null;
  const index =
    text_to_krama_item === null
      ? kramaIndexOfChar(from_script_data, cp) // by code point, no string needed
      : kramaIndexOfText(from_script_data, text_to_krama_item[0]);
  // only built when needed
  const char_to_search =
    text_to_krama_item === null
      ? index === -1 || ctx.mode !== MODE_NONE
        ? ctx.cursor.slice(char_index, char_index + char_width)
        : ''
      : text_to_krama_item[0];
  if (index === -1) {
    emit_unknown_char(ctx, char_to_search);
    return;
  }
  const result_concat_status = update_context_for_krama_char(
    ctx,
    char_to_search,
    index,
    text_to_krama_item
  );
  if (!result_concat_status) {
    if (result_ends_with_ta_ext_superscript(ctx)) emit_piece_after_ta_ext_superscript(ctx, index);
    else ctx.result.emit(kramaTextOrEmpty(ctx.to_script_data, index));
  }
  // (the start given to the rules is one character before the cursor, as it always was: for a
  // match of several characters without krama that is not the start of the match)
  if (ctx.custom_rules.length > 0)
    apply_custom_trans_rules(ctx, ctx.cursor.pos - char_width, ctx.cursor.pos, [index]);
}

/**
 * Synchronous version for low latency use cases
 *
 * Like typing
 */
export const transliterate_text_core = (
  text: string,
  from_script_name: script_list_type,
  to_script_name: script_list_type,
  from_script_data: ScriptData,
  to_script_data: ScriptData,
  trans_options: CustomOptionType,
  custom_rules: CustomRulesType,
  options?: TransliterationFnOptions
) => {
  const use_native_numerals =
    (options?.useNativeNumerals ?? DEFAULT_USE_NATIVE_NUMERALS_MODE) &&
    trans_options['normal_to_brahmic:keep_ascii_numerals'] !== true;
  const typing_mode = options?.typing_mode ?? false;
  const include_inherent_vowel =
    (options?.includeInherentVowel ?? DEFAULT_INCLUDE_INHERENT_VOWEL_MODE) ||
    trans_options['normal_to_brahmic:include_inherent_vowel'] === true;
  if (typing_mode && from_script_name !== 'Normal') {
    throw new Error('Typing mode is only supported with Normal script as the input');
  }

  if (typing_mode && from_script_name === 'Normal') {
    text = applyTypingInputAliases(text, to_script_name);
  }
  text = apply_custom_replace_rules(text, from_script_data, custom_rules, 'input');

  const ctx = create_transliterate_ctx(
    text,
    from_script_name,
    to_script_name,
    from_script_data,
    to_script_data,
    trans_options,
    custom_rules,
    typing_mode,
    use_native_numerals,
    include_inherent_vowel
  );
  const { cursor } = ctx;

  const text_length = ctx.text_length;
  while (cursor.pos < text_length) {
    /** start index of the current character */
    const char_index = cursor.pos;
    const cp = cursor.cpAt(char_index);
    if (cp === -1) break;
    const char_width = cpWidth(cp);

    if (skip_consumed_ta_ext_superscript(ctx, char_index, char_width)) continue;
    if (emit_passthrough_char(ctx, cp, char_index, char_width)) continue;

    // Step 1: Search for the character in the text_to_krama_map
    /** index in `text_to_krama_map`, `-1` if no match */
    const match_index = match_text_to_krama(ctx, cp, char_index, char_width);
    if (match_index !== -1) {
      if (emit_match(ctx, match_index, char_index)) continue;
    } else {
      cursor.advance(char_width);
    }

    // Step 2: Search for the character in the krama_text_map
    emit_krama_char(ctx, cp, char_index, char_width, match_index);
  }
  // the inherent vowel / halant of a last vyanjana
  flush_prev_context(ctx);

  let output = ctx.result.toString();
  output = apply_custom_replace_rules(output, to_script_data, custom_rules, 'output');

  return {
    output,
    /** Can be used to manage context while using the typing feature.
     * If this is 0, the external context can be cleared
     */
    context_length: ctx.prev_context.length()
  };
};

/** Async version for general use */
export const transliterate_text = async (
  text: string,
  from_script_name: script_list_type,
  to_script_name: script_list_type,
  transliteration_input_options?: CustomOptionType,
  options?: TransliterationFnOptions
) => {
  const typing_mode = options?.typing_mode ?? false;
  if (typing_mode && from_script_name !== 'Normal') {
    throw new Error('Typing mode is only supported with Normal script as the input');
  }
  const [from_script_data, to_script_data] = await Promise.all([
    getScriptData(from_script_name),
    getScriptData(to_script_name)
  ]);
  // Keep only the custom options active for this script pair and flatten the rules of the
  // enabled ones into one list: the core reads these, not the input options.
  const { trans_options: active_resolved_trans_options, custom_rules: resolved_custom_rules } =
    resolve_transliteration_rules(from_script_data, to_script_data, transliteration_input_options);
  return transliterate_text_core(
    text,
    from_script_name,
    to_script_name,
    from_script_data,
    to_script_data,
    active_resolved_trans_options,
    resolved_custom_rules,
    options
  );
};
