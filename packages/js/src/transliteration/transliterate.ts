import { getScriptData, type ScriptData } from '../utils/get_script_data';
import type { script_list_type } from '../utils/lang_list';
import custom_options_json from '../custom_options.json';
import type { TransOptionsType } from '../make_script_data/custom_options_input';
import {
  make_input_cursor,
  kramaTextOrEmpty,
  prev_context_builder,
  string_builder,
  kramaIndexOfText,
  kramaIndexOfChar,
  matchPrevKramaSequence,
  replaceWithPieces,
  applyTypingInputAliases,
  emitPiecesWithReorder,
  isTaExtSuperscriptTail,
  isTaExtSuperscriptTailCp,
  isScriptTamilExt,
  isVedicSvaraTail,
  isVedicSvaraTailCp,
  cpWidth,
  textToKramaMapIndex,
  textToKramaMapCharIndex,
  getCustomScriptCharsData,
  getTypingTextToKramaText,
  ANYA_LIST_ITEM
} from './helpers';

export type CustomOptionList = keyof typeof custom_options_json;
export type CustomOptionType = Partial<Record<CustomOptionList, boolean>>;

type CustomRulesType = TransOptionsType[keyof TransOptionsType]['rules'];

/** These Characters can be skipped/ignore while transliterating the input text
 *
 * `' '`, `'\n'`, `'\r'`, `'\t'`, `','`, `'~'`, `'!'`, `'@'`, `'?'`, `'%'`
 */
const isSkipChar = (cp: number): boolean => {
  switch (cp) {
    case 0x20: // ' '
    case 0x0a: // '\n'
    case 0x0d: // '\r'
    case 0x09: // '\t'
    case 0x2c: // ','
    case 0x7e: // '~'
    case 0x21: // '!'
    case 0x40: // '@'
    case 0x3f: // '?'
    case 0x25: // '%'
      return true;
    default:
      return false;
  }
};

type ListItem = ScriptData['list'][number];

/** `true` if any krama index is not equal to `value` (allocation-free `krama.some(k => k !== value)`) */
const has_krama_other_than = (krama: number[], value: number): boolean => {
  for (let i = 0; i < krama.length; i++) if (krama[i] !== value) return true;
  return false;
};

/** Emit the target-script text of each krama index directly, without first collecting the pieces */
const emit_krama_pieces = (
  result: ReturnType<typeof string_builder>,
  to_script_data: ScriptData,
  krama: number[]
) => {
  for (let i = 0; i < krama.length; i++) {
    if (krama[i] >= 0) result.emit(kramaTextOrEmpty(to_script_data, krama[i]));
  }
};

/**
 * @param item_text text of the current item (stored in the context)
 * @param item_list list item (type info) of the current item
 * @param emits_ta_ext_superscript_tail the text of the current item (emitted after this call)
 * ends with a Tamil-Extended superscript, eg `RR` -> `ரூ²`. Like when the superscript is already
 * the last character, the typing context is kept so that a Vedic svara typed next goes before it.
 * @return flag to indicate if the result concat has to be done as it already is concatenated here.
 */
function prev_context_cleanup(
  ctx: TransliterateCtx,
  item_text: string | undefined,
  item_list: ListItem | null | undefined,
  next?: string[] | null,
  last_extra_call: boolean = false,
  emits_ta_ext_superscript_tail: boolean = false
) {
  const {
    to_script_name,
    from_script_data,
    to_script_data,
    trans_options: options,
    result,
    prev_context,
    BRAHMIC_HALANT,
    BRAHMIC_NUQTA,
    typing_mode,
    include_inherent_vowel,
    is_from_tamil_ext,
    is_to_tamil_ext
  } = ctx;
  const item_type = item_list?.type;
  let result_str_concat_status = false;
  // custom cleanup logic/cases
  // (cheapest, most selective test first; all operands are side-effect free)
  if (
    // to anya
    item_type === 'anya' &&
    // vyanjana, nuqta, svara
    ((BRAHMIC_NUQTA &&
      prev_context.typeAt(-3) === 'vyanjana' &&
      prev_context.textAt(-2) === BRAHMIC_NUQTA &&
      prev_context.typeAt(-1) === 'mAtrA') ||
      // or vyanjana, svara
      (prev_context.typeAt(-2) === 'vyanjana' && prev_context.typeAt(-1) === 'mAtrA'))
  ) {
    prev_context.clear();
  }
  if (from_script_data.script_type === 'brahmic' && to_script_data.script_type === 'other') {
    // custom logic when converting from brahmic to other
    // Short-circuit chain ordered cheapest/most selective first (all checks are pure).
    // Since `item_text !== halant` is required, the former "to anya or null" check
    // (`(type !== mAtrA && text !== halant) || anya || null`) reduces to `type !== mAtrA`.
    if (
      item_type !== 'mAtrA' &&
      // vyanjana or vyanjana, nuqta
      (prev_context.typeAt(-1) === 'vyanjana' ||
        (BRAHMIC_NUQTA &&
          prev_context.typeAt(-2) === 'vyanjana' &&
          prev_context.textAt(-1) === BRAHMIC_NUQTA)) &&
      // two special cases to ignore
      item_text !== BRAHMIC_HALANT! &&
      (!BRAHMIC_NUQTA || item_text !== BRAHMIC_NUQTA) &&
      (!is_from_tamil_ext || !item_text || item_text.charAt(0) !== BRAHMIC_HALANT!)
    ) {
      result.emit(to_script_data.schwa_character);
    }
  } else if (from_script_data.script_type === 'other' && to_script_data.script_type === 'brahmic') {
    // custom logic when converting from other to brahmic
    if (
      prev_context.typeAt(-1) === 'vyanjana' &&
      (item_type === 'mAtrA' || item_type === 'svara')
    ) {
      const linked_mAtrA =
        item_list!.type === 'svara'
          ? kramaTextOrEmpty(to_script_data, item_list!.mAtrA_krama_ref?.[0] ?? -1)
          : item_text!;
      emitPiecesWithReorder(
        result,
        [linked_mAtrA],
        to_script_data.halant!,
        is_to_tamil_ext && isTaExtSuperscriptTail(result.lastChar())
      );
      result_str_concat_status = true;
    } else if (
      // default transliteration behavior (without schwa deletion)
      !include_inherent_vowel &&
      prev_context.typeAt(-1) === 'vyanjana' &&
      item_type !== 'mAtrA' &&
      item_text !== BRAHMIC_HALANT
    ) {
      if (is_to_tamil_ext && isTaExtSuperscriptTail(result.lastChar())) {
        emitPiecesWithReorder(result, [BRAHMIC_HALANT!], to_script_data.halant!, true);
      } else {
        emitPiecesWithReorder(result, [BRAHMIC_HALANT!], to_script_data.halant!, false);
        if (
          to_script_name === 'Sinhala' &&
          options['all_to_sinhala:use_conjunct_enabling_halant']
        ) {
          result.rewriteAt(-1, result.lastPiece() + '\u200d');
        }
      }
    } else if (
      // if to include inherent vowel then check when to add that skipped halant
      include_inherent_vowel &&
      item_type === 'vyanjana' &&
      (prev_context.typeAt(-1) === 'vyanjana' ||
        (BRAHMIC_NUQTA &&
          prev_context.typeAt(-2) === 'vyanjana' &&
          prev_context.textAt(-1) === BRAHMIC_NUQTA))
    ) {
      if (is_to_tamil_ext && isTaExtSuperscriptTail(result.lastChar())) {
        emitPiecesWithReorder(result, [BRAHMIC_HALANT!], to_script_data.halant!, true);
      } else {
        emitPiecesWithReorder(result, [BRAHMIC_HALANT!], to_script_data.halant!, false);
        if (
          to_script_name === 'Sinhala' &&
          options['all_to_sinhala:use_conjunct_enabling_halant']
        ) {
          result.rewriteAt(-1, result.lastPiece() + '\u200d');
        }
      }
    }
  }
  // custom typing mode context clear logic
  // only clear context if there are no next characters or if its last extra call
  let to_clear_context = false;
  if (
    typing_mode &&
    (next === undefined || next === null || next.length === 0) &&
    !last_extra_call &&
    // the case below is to enable typing of _, ' (Vedic svara chihnas too)
    !(
      is_to_tamil_ext &&
      (emits_ta_ext_superscript_tail || isTaExtSuperscriptTail(result.lastChar()))
    )
  ) {
    to_clear_context = true;
    // do not clear the context only if case where the current added element is a vyanjana
    if (item_type === 'vyanjana') to_clear_context = false;
    if (to_clear_context) {
      prev_context.clear();
    }
  }
  // addition and shifting
  // in typing it should not be the last extra call
  if (!typing_mode ? true : !last_extra_call && !to_clear_context)
    prev_context.push(item_text, item_type);

  return result_str_concat_status;
}

function apply_custom_trans_rules(ctx: TransliterateCtx, text_index: number, delta: number) {
  const { custom_rules, cursor, result, from_script_data, to_script_data } = ctx;
  const current_text_index = text_index + delta;

  for (let rule_index = 0; rule_index < custom_rules.length; rule_index++) {
    if (custom_rules[rule_index].use_replace === true) continue;
    const rule = custom_rules[rule_index];

    if (rule.type === 'replace_prev_krama_keys') {
      if (rule.check_in === 'input') {
        const prev_match = matchPrevKramaSequence(
          cursor.peekAt,
          current_text_index,
          rule.prev,
          from_script_data,
          // step back by characters, not UTF-16 units (non-BMP scripts like Brahmi)
          cursor.prevCharIndex
        );
        const next_char_info = cursor.peekAt(text_index);
        if (prev_match.matched && next_char_info !== null) {
          const next_char = next_char_info.ch;
          const next_char_krama_index = kramaIndexOfText(from_script_data, next_char);
          if (
            next_char_krama_index !== -1 &&
            rule.following.indexOf(next_char_krama_index) !== -1
          ) {
            const replace_with_pieces = replaceWithPieces(rule.replace_with, to_script_data);
            result.rewriteTailPieces(prev_match.matchedLen, replace_with_pieces);
          }
        }
      } else if (rule.check_in === 'output') {
        // in this approch we will have check backwards

        const last_piece = result.lastPiece();
        if (!last_piece) continue;
        const following_krama_indexes = kramaIndexOfText(to_script_data, last_piece);
        if (
          following_krama_indexes !== -1 &&
          rule.following.indexOf(following_krama_indexes) !== -1
        ) {
          const prev_match = matchPrevKramaSequence(result.peekAt, -2, rule.prev, to_script_data);
          if (prev_match.matched) {
            const replace_with_pieces = replaceWithPieces(rule.replace_with, to_script_data);
            result.rewriteTailPieces(prev_match.matchedLen + 1, [
              ...replace_with_pieces,
              last_piece
            ]);
          }
        }
      }
    } else if (rule.type === 'direct_replace') {
      const lookup_data = rule.check_in === 'output' ? to_script_data : from_script_data;
      for (const search_group of rule.to_replace) {
        const match = matchPrevKramaSequence(result.peekAt, -1, search_group, lookup_data);
        if (!match.matched) continue;
        if (rule.replace_text) {
          // handling direct text replace rules which are not krama specific for a certain script
          result.rewriteTailPieces(match.matchedLen, [rule.replace_text]);
          break;
        }
        const replace_with_pieces = replaceWithPieces(rule.replace_with, lookup_data);
        result.rewriteTailPieces(match.matchedLen, replace_with_pieces);
        break;
      }
    }
  }
}

/**
 * Returns the active custom options to applied based on the `from` and `to` script information
 */
export const get_active_custom_options = (
  from_script_data: ScriptData,
  to_script_data: ScriptData,
  input_options?: Record<string, boolean>
): CustomOptionType => {
  if (!input_options) return {};
  const active_custom_options: CustomOptionType = {};
  for (const [key, enabled] of Object.entries(input_options ?? {})) {
    if (!Object.hasOwn(custom_options_json, key)) continue;
    const option_info = custom_options_json[
      key as CustomOptionList
    ] as TransOptionsType[keyof TransOptionsType];
    if (option_info.from_script_type === 'all' && option_info.to_script_type === 'all') {
      active_custom_options[key as CustomOptionList] = enabled;
    } else if (
      (option_info.from_script_type !== undefined &&
        (option_info.from_script_type === 'all' ||
          option_info.from_script_type === from_script_data.script_type)) ||
      (option_info.from_script_name !== undefined &&
        option_info.from_script_name.includes(from_script_data.script_name))
    ) {
      if (
        option_info.to_script_type !== undefined &&
        (option_info.to_script_type === 'all' ||
          option_info.to_script_type === to_script_data.script_type)
      ) {
        active_custom_options[key as CustomOptionList] = enabled;
      } else if (
        option_info.to_script_name !== undefined &&
        option_info.to_script_name.includes(to_script_data.script_name)
      ) {
        active_custom_options[key as CustomOptionList] = enabled;
      }
    }
  }
  return active_custom_options;
};

/** Resolve active options + flattened rule list once, so hot paths can reuse it. */
export const resolve_transliteration_rules = (
  from_script_data: ScriptData,
  to_script_data: ScriptData,
  transliteration_input_options?: CustomOptionType
): { trans_options: CustomOptionType; custom_rules: CustomRulesType } => {
  // The overwhelmingly common API call has no custom options. Avoid scanning
  // custom-option data when every option is necessarily disabled.
  if (!transliteration_input_options) return { trans_options: {}, custom_rules: [] };
  const trans_options = get_active_custom_options(
    from_script_data,
    to_script_data,
    transliteration_input_options
  );
  const custom_rules = Object.keys(trans_options).flatMap((key) =>
    trans_options[key as CustomOptionList] === true
      ? (custom_options_json[key as CustomOptionList]
          .rules as TransOptionsType[keyof TransOptionsType]['rules'])
      : []
  );
  return { trans_options, custom_rules };
};

const get_rule_replace_text = (
  rule: TransOptionsType[keyof TransOptionsType]['rules'][number],
  script_data: ScriptData
) => rule.replace_with.map((replace_with) => kramaTextOrEmpty(script_data, replace_with)).join('');
/** Apply replacement rules using direct replaceAll method if exist */
export const apply_custom_replace_rules = (
  text: string,
  script_data: ScriptData,
  rules: TransOptionsType[keyof TransOptionsType]['rules'],
  allowed_input_rule_type: TransOptionsType[keyof TransOptionsType]['rules'][number]['check_in']
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

type TransliterateCtx = {
  from_script_name: script_list_type;
  to_script_name: script_list_type;
  from_script_data: ScriptData;
  to_script_data: ScriptData;
  trans_options: CustomOptionType;
  custom_rules: CustomRulesType;
  cursor: ReturnType<typeof make_input_cursor>;
  result: ReturnType<typeof string_builder>;
  prev_context: ReturnType<typeof prev_context_builder>;
  PREV_CONTEXT_IN_USE: boolean;
  BRAHMIC_NUQTA: string | null;
  BRAHMIC_HALANT: string | null;
  typing_mode: boolean;
  include_inherent_vowel: boolean;
  is_from_tamil_ext: boolean;
  is_to_tamil_ext: boolean;
};

const DEFAULT_USE_NATIVE_NUMERALS_MODE = true;
const DEFAULT_INCLUDE_INHERENT_VOWEL_MODE = false;

/** These options are not available on the main `transliterate` function of the `index.ts` */
type CustomOptionsType = {
  /** This enables typing mode, returns a context length which will be used to clear the external context */
  typing_mode?: boolean;
  /** Use native numerals in transliteration/typing */
  useNativeNumerals?: boolean;
  /** Include inherent vowels(schwa character) in transliteration/typing
   * @default false
   */
  includeInherentVowel?: boolean;
};

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
  options?: CustomOptionsType
) => {
  const use_native_numerals = options?.useNativeNumerals ?? DEFAULT_USE_NATIVE_NUMERALS_MODE;
  const typing_mode = options?.typing_mode ?? false;
  const include_inherent_vowel =
    options?.includeInherentVowel ?? DEFAULT_INCLUDE_INHERENT_VOWEL_MODE;
  if (typing_mode && from_script_name !== 'Normal') {
    throw new Error('Typing mode is only supported with Normal script as the input');
  }
  // Avoid mutating the caller's options object; use a local flag instead.
  const use_typing_chars = typing_mode || !!trans_options['normal_to_all:use_typing_chars'];

  if (typing_mode && from_script_name === 'Normal') {
    text = applyTypingInputAliases(text, to_script_name);
  }
  text = apply_custom_replace_rules(text, from_script_data, custom_rules, 'input');

  const result = string_builder();
  let text_index: number;
  const cursor = make_input_cursor(text);

  /** It stores the previous attribute types of the brahmic scripts
   * Use only when converted Brahmic -> Other or Other -> Brahmic
   * Stores attributes of the Brahmic script like svara, vyanjana, anya not of the Other script
   * and the characters match text of the brahmic script
   *
   * **Note** :- The text stores the contents of the `text` (not `result_str`) but the type
   * stores the attributes of the brahmic script (in both cases)
   */
  const prev_context = prev_context_builder();
  const PREV_CONTEXT_IN_USE =
    (from_script_data.script_type === 'brahmic' && to_script_data.script_type === 'other') ||
    (from_script_data.script_type === 'other' && to_script_data.script_type === 'brahmic') ||
    (typing_mode && from_script_name === 'Normal' && to_script_data.script_type === 'other');
  const BRAHMIC_NUQTA =
    from_script_data.script_type === 'brahmic' && to_script_data.script_type === 'other'
      ? (from_script_data.nuqta ?? null)
      : from_script_data.script_type === 'other' && to_script_data.script_type === 'brahmic'
        ? (to_script_data.nuqta ?? null)
        : null;
  const BRAHMIC_HALANT =
    from_script_data.script_type === 'brahmic' && to_script_data.script_type === 'other'
      ? from_script_data.halant
      : from_script_data.script_type === 'other' && to_script_data.script_type === 'brahmic'
        ? to_script_data.halant
        : null;

  const is_from_tamil_ext = isScriptTamilExt(from_script_name);
  const is_to_tamil_ext = isScriptTamilExt(to_script_name);
  const opt_preserve_specific_chars =
    !!trans_options['all_to_normal:preserve_specific_chars'] && to_script_name === 'Normal';

  const ctx: TransliterateCtx = {
    from_script_name,
    to_script_name,
    from_script_data,
    to_script_data,
    trans_options,
    custom_rules,
    cursor,
    result,
    prev_context,
    PREV_CONTEXT_IN_USE,
    BRAHMIC_NUQTA,
    BRAHMIC_HALANT,
    typing_mode,
    include_inherent_vowel,
    is_from_tamil_ext,
    is_to_tamil_ext
  };

  type TextToKramaItem =
    | ScriptData['text_to_krama_map'][number]
    | ScriptData['typing_text_to_krama_map'][number];
  // use typing map when Normal -> All in typing mode (or with explicit typing chars option)
  const use_typing_text_to_krama_map =
    (use_typing_chars || typing_mode) && from_script_name === 'Normal';
  const text_to_krama_lookup_script_data = use_typing_text_to_krama_map
    ? to_script_data
    : from_script_data;
  /** The map whose indices the lookups (`textToKramaMapIndex`, ...) return */
  const text_to_krama_map: TextToKramaItem[] = use_typing_text_to_krama_map
    ? to_script_data.typing_text_to_krama_map
    : from_script_data.text_to_krama_map;
  const text_to_krama_next_cps = use_typing_text_to_krama_map
    ? to_script_data.next_cps_typing_text_to_krama_map
    : from_script_data.next_cps_text_to_krama_map;

  /** A flag to indicate when to ignore the tamil extended numeral
   * Used when converting from tamil extended
   */
  let ignore_ta_ext_sup_num_text_index = -1;

  const text_length = text.length;
  while (cursor.pos < text_length) {
    text_index = cursor.pos;
    /** start index of the current character */
    const char_index = text_index;
    const cp = cursor.cpAt(char_index);
    if (cp === -1) break;
    const char_width = cpWidth(cp);
    // console.log(['index', char, text_index, ignore_ta_ext_sup_num_text_index]);

    if (ignore_ta_ext_sup_num_text_index !== -1 && text_index >= ignore_ta_ext_sup_num_text_index) {
      ignore_ta_ext_sup_num_text_index = -1;
      cursor.advance(char_width);
      continue;
    }

    if (isSkipChar(cp)) {
      // ignore blank spaces
      cursor.advance(char_width);
      if (PREV_CONTEXT_IN_USE) {
        prev_context_cleanup(ctx, ' ', null);
        prev_context.clear();
      }
      result.emit(cursor.slice(char_index, char_index + char_width));
      continue;
    }

    if (cp >= 0x30 && cp <= 0x39 && !use_native_numerals) {
      // '0' - '9'
      const char = cursor.slice(char_index, char_index + char_width);
      cursor.advance(char_width);
      // cleanup first, so a pending halant/schwa goes before the digit (k0 -> क्0)
      prev_context_cleanup(ctx, char, null);
      result.emit(char);
      continue;
    }

    // In Preserve mode, first check if the character is a custom script character
    if (opt_preserve_specific_chars) {
      const char = cursor.slice(char_index, char_index + char_width);
      const custom_script_val = getCustomScriptCharsData(from_script_data, char);
      if (custom_script_val !== undefined) {
        prev_context_cleanup(ctx, char, from_script_data.list[custom_script_val[0] ?? -1] ?? null);
        const normal_text = getTypingTextToKramaText(from_script_data, custom_script_val[1]);
        result.emit(normal_text ?? '');
        cursor.advance(char.length);
        continue;
      }
    }

    // Step 1: Search for the character in the text_to_krama_map
    /** index in `text_to_krama_map`, `-1` if no match */
    let text_to_krama_item_index = -1;
    /** the matched text ends with a Tamil-Extended superscript that is not next to the rest of
     * it in the input (a Vedic svara is in between), so the superscript is not to be advanced over */
    let ta_ext_superscript_detached = false;
    {
      // Iterative matching with retraction support for vyanjana+vowel context
      // Instead of lookahead, we save the last valid vowel (svara/mAtrA) match and retract if needed
      let scan_units = 0;
      let last_valid_vowel_match_index = -1;
      // Flag to track if we're in a vyanjana+vowel context where retraction may be needed
      const check_vowel_retraction =
        PREV_CONTEXT_IN_USE &&
        from_script_data.script_type === 'other' &&
        to_script_data.script_type === 'brahmic' &&
        (prev_context.typeAt(-1) === 'vyanjana' ||
          (BRAHMIC_NUQTA &&
            prev_context.typeAt(-2) === 'vyanjana' &&
            prev_context.textAt(-1) === BRAHMIC_NUQTA));

      while (true) {
        if (
          ignore_ta_ext_sup_num_text_index !== -1 &&
          isTaExtSuperscriptTailCp(cursor.cpAt(text_index + char_width + scan_units))
        ) {
          scan_units += 1; // superscript numbers are single UTF-16 units
        }
        const end_index = text_index + char_width + scan_units;
        // The single char lookup is done by code point, so the search text is only built when needed
        const single_char_lookup = scan_units === 0 && ignore_ta_ext_sup_num_text_index === -1;
        let char_to_search = '';
        let potential_match_index: number;
        if (single_char_lookup) {
          // more scan units only needed in case ta-ext so safe to do
          potential_match_index = textToKramaMapCharIndex(
            text_to_krama_lookup_script_data,
            cp,
            use_typing_text_to_krama_map
          );
        } else {
          char_to_search =
            // usage example: க்⁴ரு² -> ghR
            ignore_ta_ext_sup_num_text_index !== -1
              ? // in this we will ignore the current charcter and scan one ahead
                cursor.slice(text_index, ignore_ta_ext_sup_num_text_index) +
                (end_index > ignore_ta_ext_sup_num_text_index
                  ? cursor.slice(ignore_ta_ext_sup_num_text_index + 1, end_index)
                  : '')
              : cursor.slice(text_index, end_index);
          potential_match_index = textToKramaMapIndex(
            text_to_krama_lookup_script_data,
            char_to_search,
            use_typing_text_to_krama_map
          );
        }
        if (potential_match_index === -1) {
          text_to_krama_item_index = -1;
          break;
        }
        const potential_match = text_to_krama_map[potential_match_index];

        // When in vyanjana context, track single-vowel (svara/mAtrA) matches for potential retraction
        // eg: for kAUM :- काऊं
        if (
          check_vowel_retraction &&
          potential_match[1].krama &&
          potential_match[1].krama.length >= 1
        ) {
          const krama = potential_match[1].krama;
          const krama_id = krama[0];
          const brahmic_entry = to_script_data.krama_text_arr[krama_id];
          const list_index = brahmic_entry?.[1];
          const list_type = to_script_data.list[list_index ?? -1]?.type;
          const is_single_vowel =
            krama.length === 1 &&
            list_index !== null &&
            list_index !== undefined &&
            (list_type === 'svara' || list_type === 'mAtrA');

          if (is_single_vowel) {
            // Save this as a valid retraction point
            last_valid_vowel_match_index = potential_match_index;
          } else if (last_valid_vowel_match_index !== -1) {
            // Current match is NOT a single vowel but we have a saved vowel match
            // Retract to the last valid vowel match
            text_to_krama_item_index = last_valid_vowel_match_index;
            break;
          }
        }

        // `next` entries are single characters, so their code points are precomputed
        const next_cps = text_to_krama_next_cps[potential_match_index];
        if (next_cps !== null) {
          const nth_next_cp = cursor.cpAt(end_index);

          if (is_from_tamil_ext && from_script_data.script_type === 'brahmic') {
            // Tamil-Extended only: work with strings here (rare path)
            const next = potential_match[1].next!;
            if (single_char_lookup) char_to_search = cursor.slice(text_index, end_index);
            const halant = from_script_data.halant;
            const isMatraCp = (cp: number) =>
              from_script_data.list[
                from_script_data.krama_text_arr[kramaIndexOfChar(from_script_data, cp)]?.[1] ?? -1
              ]?.type === 'mAtrA';
            // The superscript of the match can be after a halant or a mAtrA and Vedic svaras, as
            // the writer puts them before it:  [halant | mAtrA | mAtrA mAtrA]? svara* superscript
            // eg. க்² (ख्), கி⁴ (घि), கொ⁴ (घो as ெ + ா), க॒॑⁴ (घ॒॑), க்॒² (ख्॒), கி॒⁴ (घि॒), ரு॒॑² (ऋ॒॑)
            // In the match the superscript takes the place of these, which are read next.
            let sup_index = end_index;
            const sign_cp = cursor.cpAt(sup_index);
            const has_sign =
              sign_cp !== -1 &&
              (String.fromCodePoint(sign_cp) === halant || isMatraCp(sign_cp));
            if (has_sign) {
              sup_index += cpWidth(sign_cp);
              const second_cp = cursor.cpAt(sup_index);
              // mAtrA duplicates like O = E + A in gEA (or gO as visible when)
              if (isMatraCp(sign_cp) && second_cp !== -1 && isMatraCp(second_cp))
                sup_index += cpWidth(second_cp);
            }
            const svaras_start = sup_index;
            while (isVedicSvaraTailCp(cursor.cpAt(sup_index))) sup_index += 1; // single UTF-16 units
            const sup_cp = cursor.cpAt(sup_index);
            if (
              (has_sign || sup_index > svaras_start) &&
              isTaExtSuperscriptTailCp(sup_cp) &&
              // no superscript is being skipped, or (with only svaras in between) the skipped one
              // is inside this match: the ² of க்² in க்²ரு॑² (खृ॑)
              (ignore_ta_ext_sup_num_text_index === -1 ||
                (!has_sign && ignore_ta_ext_sup_num_text_index < end_index))
            ) {
              const sup_character = String.fromCharCode(sup_cp);
              const char_index_ =
                next.indexOf(sup_character) !== -1
                  ? textToKramaMapIndex(from_script_data, char_to_search + sup_character)
                  : -1;
              if (char_index_ !== -1) {
                text_to_krama_item_index = char_index_;
                // With only svaras in between, a superscript already skipped inside this match
                // (the ² of க்² in க்²ரு॑²) makes up for the one after the svaras in the match
                // length, so the whole match is advanced over.
                if (!has_sign) ta_ext_superscript_detached = ignore_ta_ext_sup_num_text_index === -1;
                ignore_ta_ext_sup_num_text_index = sup_index;
                break;
              }
            }
            // The match ends with halant + a letter that cannot be continued (ல்ர is the start of
            // ல்ரி² ல்ரீ² (ऌ ॡ)), but the halant starts a mAtrA ending in a superscript (்ரு² ்ரூ²):
            // stop the match before the halant, so ல்ரு² is read as ல + ்ரு² (लृ), not ल्रु²
            if (
              nth_next_cp !== -1 &&
              !next_cps.includes(nth_next_cp) &&
              char_to_search.length > 2 &&
              char_to_search.at(-2) === halant &&
              cursor.slice(end_index - 2, end_index) === char_to_search.slice(-2)
            ) {
              let tail_sup_index = end_index + cpWidth(nth_next_cp);
              while (isVedicSvaraTailCp(cursor.cpAt(tail_sup_index))) tail_sup_index += 1;
              const tail_sup_cp = cursor.cpAt(tail_sup_index);
              if (isTaExtSuperscriptTailCp(tail_sup_cp)) {
                const tail_index = textToKramaMapIndex(
                  from_script_data,
                  char_to_search.slice(-2) +
                    String.fromCodePoint(nth_next_cp) +
                    String.fromCharCode(tail_sup_cp)
                );
                const head_index = textToKramaMapIndex(
                  from_script_data,
                  char_to_search.slice(0, -2)
                );
                if (tail_index !== -1 && head_index !== -1) {
                  text_to_krama_item_index = head_index;
                  break;
                }
              }
            }
          }
          // Generic: if the next character is in the next list, extend scan and continue
          if (nth_next_cp !== -1 && next_cps.includes(nth_next_cp)) {
            scan_units += cpWidth(nth_next_cp);
            continue;
          }
        }
        text_to_krama_item_index = potential_match_index;
        break;
      }
    }
    // (the Tamil-Extended matches index into `from_script_data.text_to_krama_map`, which
    // is `text_to_krama_map` as typing map is only used with `Normal` as the input)
    const text_to_krama_item: TextToKramaItem | null =
      text_to_krama_item_index !== -1 ? text_to_krama_map[text_to_krama_item_index] : null;
    if (text_to_krama_item !== null) {
      const [matched_text, map] = text_to_krama_item;
      // condtional subtarct 1 when a superscript number is present in the current match
      // (only relevant while skipping a Tamil-Extended superscript)
      const index_delete_length =
        ta_ext_superscript_detached ||
        (ignore_ta_ext_sup_num_text_index !== -1 &&
          matched_text.length > 1 &&
          from_script_data.list[from_script_data.krama_text_arr[map.krama?.[0] ?? -1]?.[1] ?? -1]
            ?.type === 'vyanjana' &&
          isTaExtSuperscriptTail(matched_text.at(-1) ?? undefined))
          ? 1
          : 0;
      const matched_len_units = matched_text.length - index_delete_length;
      cursor.advance(matched_len_units);
      text_index = cursor.pos;
      if (
        use_typing_chars &&
        'custom_back_ref' in map &&
        map.custom_back_ref !== undefined &&
        map.custom_back_ref !== null
      ) {
        const custom_script_char_item =
          to_script_data.custom_script_chars_arr[map.custom_back_ref] ?? null;
        if (custom_options_json !== null) {
          // cleanup first, so a pending halant goes before the custom character
          // (kqq -> क्q, k.qSha -> क्‍ष)
          // custom characters are never svara/mAtrA, so cleanup never emits them itself
          prev_context_cleanup(
            ctx,
            matched_text,
            to_script_data.list[custom_script_char_item[1] ?? -1] ?? null,
            map.next
          );
          result.emit(custom_script_char_item[0]);
        }
        continue;
      }
      const krama = map.krama;
      // we have to componsate for the superscript number's length
      if (krama !== null && krama !== undefined && has_krama_other_than(krama, -1)) {
        // as the krama index is present we can skip the Step 2 and return the result directly
        let result_concat_status = false;
        if (PREV_CONTEXT_IN_USE) {
          if (
            from_script_data.script_type === 'brahmic' &&
            to_script_data.script_type === 'other'
          ) {
            let item: ListItem | null | undefined;
            if (
              !use_typing_chars &&
              map.fallback_list_ref !== undefined &&
              map.fallback_list_ref !== null
            ) {
              item = from_script_data.list[map.fallback_list_ref];
            }
            // if otherwise then follow the the last kram ref
            // use last as that is prev which will be used to decide svara or vyanjana
            // This condition very well may change in the future so be careful
            // else if (!map.krama || map.krama.length === 0)
            //   item = null;
            else if (krama.length > 0) {
              const list_ref_of = (krama_index: number) =>
                from_script_data.list[from_script_data.krama_text_arr[krama_index]?.[1] ?? -1];
              if (is_from_tamil_ext) {
                const list_refs = krama.map(list_ref_of);
                // if mixture of vyanjana and mAtrA then return the first item as anya type
                if (
                  list_refs.some((item) => item?.type === 'mAtrA') &&
                  list_refs.some((item) => item?.type === 'vyanjana')
                ) {
                  item = ANYA_LIST_ITEM;
                } else if (
                  list_refs.length > 1 &&
                  list_refs.some((item) => item === undefined || item === null)
                ) {
                  item = list_refs.at(-1);
                } else {
                  item = list_refs[0];
                }
              } else {
                item = list_ref_of(krama[0]);
              }
            } else {
              item = null;
            }
            // A halant variant matched as a whole (Sinhala al-lakuna + ZWJ `්‍`) is passed as
            // the halant itself, so that the cleanup does not add an inherent vowel before it
            // (ක්‍ෂ -> kSha, not kaSha)
            const item_text =
              krama.length === 1 && kramaTextOrEmpty(from_script_data, krama[0]) === BRAHMIC_HALANT
                ? BRAHMIC_HALANT
                : matched_text;
            result_concat_status = prev_context_cleanup(ctx, item_text, item);
          } else if (
            to_script_data.script_type === 'brahmic' &&
            from_script_data.script_type === 'other'
          ) {
            let item: ListItem | null | undefined;
            if (map.fallback_list_ref !== undefined && map.fallback_list_ref !== null) {
              item = to_script_data.list[map.fallback_list_ref];
            } else {
              item =
                krama.length > 0
                  ? (to_script_data.list[to_script_data.krama_text_arr[krama[0]]?.[1] ?? -1] ??
                    null)
                  : null;
            }
            // The halant typed by its own key (`.h`) is passed as the halant itself, so that
            // the cleanup does not add a second one after a vyanjana (k.h -> क्, not क््)
            const item_text =
              krama.length === 1 && kramaTextOrEmpty(to_script_data, krama[0]) === BRAHMIC_HALANT
                ? BRAHMIC_HALANT
                : matched_text;
            if (typing_mode && from_script_name === 'Normal') {
              // Note :- this is the only over place where next chars can be found
              result_concat_status = prev_context_cleanup(
                ctx,
                item_text,
                item,
                map.next,
                false,
                is_to_tamil_ext &&
                  isTaExtSuperscriptTail(
                    kramaTextOrEmpty(to_script_data, krama[krama.length - 1]).at(-1)
                  )
              );
            } else result_concat_status = prev_context_cleanup(ctx, item_text, item);
          } else if (
            typing_mode &&
            from_script_name === 'Normal' &&
            to_script_data.script_type === 'other'
          ) {
            result_concat_status = prev_context_cleanup(ctx, matched_text, null, map.next);
          }
        }
        if (!result_concat_status) {
          if (is_to_tamil_ext && isTaExtSuperscriptTail(result.lastChar())) {
            // Tamil-Extended output reorder (mAtrA/halant after superscript)
            // only this path needs the pieces as an array
            const result_pieces_to_add = krama.map((krama_index) =>
              kramaTextOrEmpty(to_script_data, krama_index)
            );
            if (
              to_script_data.script_type === 'brahmic' &&
              (to_script_data.list[to_script_data.krama_text_arr[krama.at(-1) ?? -1]?.[1] ?? -1]
                ?.type === 'mAtrA' ||
                result_pieces_to_add.join('') === to_script_data.halant)
            ) {
              emitPiecesWithReorder(result, result_pieces_to_add, to_script_data.halant!, true);
            } else if (isVedicSvaraTail(result_pieces_to_add.at(-1)?.at(-1) ?? '')) {
              const last = result.popLastChar();
              result.emitPieces(result_pieces_to_add);
              result.emit(last ?? '');
            } else {
              result.emitPieces(result_pieces_to_add);
            }
          } else {
            emit_krama_pieces(result, to_script_data, krama);
          }
        }
        if (custom_rules.length > 0) apply_custom_trans_rules(ctx, text_index, -matched_len_units);
        continue;
      } else if (krama !== null && krama !== undefined && krama.indexOf(-1) !== -1) {
        // handle cases where any one of the krama poiting is -1
        // (prefix-only entries like `c` of `ch` or `S` of `Sh`, emitted as they are)
        // cleanup first, so a pending halant goes before the text (kc -> क्c)
        if (typing_mode) {
          // custom context setup call where -1
          // Like for Sh('), ''(')\
          prev_context_cleanup(ctx, matched_text, null, map.next);
        } else if (PREV_CONTEXT_IN_USE) {
          // like an unknown character (see Step 2), `kca` -> क्cअ
          prev_context_cleanup(ctx, matched_text, null);
          prev_context.clear();
        }
        result.emit(matched_text);
        continue;
      }
    } else {
      cursor.advance(char_width);
      text_index = cursor.pos;
    }

    // Step 2: Search for the character in the krama_text_map
    const index =
      text_to_krama_item === null
        ? kramaIndexOfChar(from_script_data, cp) // by code point, no string needed
        : kramaIndexOfText(from_script_data, text_to_krama_item[0]);
    // only built when needed
    const char_to_search =
      text_to_krama_item === null
        ? index === -1 || PREV_CONTEXT_IN_USE
          ? cursor.slice(char_index, char_index + char_width)
          : ''
        : text_to_krama_item[0];
    if (index === -1) {
      // text not matched so ignore and return as it is
      if (PREV_CONTEXT_IN_USE) {
        prev_context_cleanup(ctx, char_to_search, null);
        prev_context.clear();
        // clear the array as an unidentified character found
      }
      result.emit(char_to_search);
      continue;
    }
    let result_concat_status = false;
    if (PREV_CONTEXT_IN_USE) {
      if (from_script_data.script_type === 'brahmic') {
        result_concat_status = prev_context_cleanup(
          ctx,
          char_to_search,
          from_script_data.list[from_script_data.krama_text_arr[index][1] ?? -1]
        );
      } else if (to_script_data.script_type === 'brahmic') {
        result_concat_status = prev_context_cleanup(
          ctx,
          char_to_search,
          to_script_data.list[to_script_data.krama_text_arr[index][1] ?? -1]
        );
      } else if (typing_mode && from_script_name === 'Normal') {
        // Typing into an `other` script: a key with no krama in the typing map (Romanized `sh` /
        // `ch`, prefixes of `shh` / `sh^` / `chh`) is resolved here. Pass its `next` as in Step 1,
        // so the context is kept while more keys can follow (else `shh` at the start of a word
        // comes out as `śh`), and cleared like in Step 1 when none can.
        prev_context_cleanup(ctx, char_to_search, null, text_to_krama_item?.[1].next);
      }
    }
    if (!result_concat_status) {
      const to_add_text = kramaTextOrEmpty(to_script_data, index);
      // In tamil Extended check if the current one is a halant or a svara(mAtrA)
      if (
        to_script_data.script_type === 'brahmic' &&
        is_to_tamil_ext &&
        (to_script_data.list[to_script_data.krama_text_arr[index][1] ?? -1]?.type === 'mAtrA' ||
          to_add_text === to_script_data.halant) &&
        isTaExtSuperscriptTail(result.lastChar())
      ) {
        emitPiecesWithReorder(result, [to_add_text], to_script_data.halant!, true);
      } else if (
        is_to_tamil_ext &&
        isVedicSvaraTail(to_add_text) &&
        isTaExtSuperscriptTail(result.lastChar())
      ) {
        const last = result.popLastChar();
        result.emit(to_add_text);
        result.emit(last ?? '');
      } else {
        result.emit(to_add_text);
      }
    }
    if (custom_rules.length > 0) apply_custom_trans_rules(ctx, text_index, -char_width);
  }
  if (PREV_CONTEXT_IN_USE)
    // calling with last extra index flag
    prev_context_cleanup(ctx, undefined, null, undefined, true);

  let output = result.toString();
  output = apply_custom_replace_rules(output, to_script_data, custom_rules, 'output');

  return {
    output,
    /** Can be used to manage context while using the typing feature.
     * If this is 0, the external context can be cleared
     */
    context_length: prev_context.length()
  };
};

/** Async version for general use */
export const transliterate_text = async (
  text: string,
  from_script_name: script_list_type,
  to_script_name: script_list_type,
  transliteration_input_options?: CustomOptionType,
  options?: CustomOptionsType
) => {
  const typing_mode = options?.typing_mode ?? false;
  if (typing_mode && from_script_name !== 'Normal') {
    throw new Error('Typing mode is only supported with Normal script as the input');
  }
  const [from_script_data, to_script_data] = await Promise.all([
    getScriptData(from_script_name),
    getScriptData(to_script_name)
  ]);
  const { trans_options, custom_rules } = resolve_transliteration_rules(
    from_script_data,
    to_script_data,
    transliteration_input_options
  );
  return transliterate_text_core(
    text,
    from_script_name,
    to_script_name,
    from_script_data,
    to_script_data,
    trans_options,
    custom_rules,
    options
  );
};
