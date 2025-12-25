import type { OutputScriptData } from '../make_script_data/output_script_data_schema';
import {
  binarySearchLower,
  binarySearchLowerWithIndex
} from '../utils/binary_search/binary_search';
import { getScriptData } from '../utils/get_script_data';
import type { script_list_type } from '../utils/lang_list';
import custom_options_json from '../custom_options.json';
import type { TransOptionsType } from '../make_script_data/custom_options_input';
import {
  make_input_cursor,
  kramaTextOrEmpty,
  prev_context_builder,
  string_builder,
  kramaIndexOfText,
  matchPrevKramaSequence,
  replaceWithPieces,
  applyTypingInputAliases,
  emitPiecesWithReorder,
  isTaExtSuperscriptTail,
  isScriptTamilExt,
  isVedicSvaraTail,
  type prev_context_array_type
} from './helpers';

export type CustomOptionList = keyof typeof custom_options_json;
export type CustomOptionType = Partial<Record<CustomOptionList, boolean>>;

type CustomRulesType = TransOptionsType[keyof TransOptionsType]['rules'];

/** These Characters can be skipped/ignore while transliterating the input text */
const CHARS_TO_SKIP = [' ', '\n', '\r', '\t', ',', ';', '!', '@', '?', '%'] as const;

/**
 * Mostly used is -1 for prev context.
 * But even in the theoretical case it is -3 for now
 */
const MAX_CONTEXT_LENGTH = 3;

/**
 * @return flag to indicate if the result concat has to be done as it already is concatenated here.
 */
function prev_context_cleanup(
  ctx: TransliterateCtx,
  item: prev_context_array_type[number],
  additional?: {
    next?: string[];
    last_extra_call?: boolean;
  }
) {
  const {
    from_script_name,
    to_script_name,
    from_script_data,
    to_script_data,
    trans_options: options,
    result,
    prev_context,
    BRAHMIC_HALANT,
    BRAHMIC_NUQTA,
    typing_mode,
    include_inherent_vowel
  } = ctx;
  const { next, last_extra_call } = additional ?? {};
  let result_str_concat_status = false;
  // console.log(
  //   [item[0], item[1]?.type],
  //   prev_context_arr.map((item) => item[1]?.type),
  //   result_str.split('')
  // );
  // custom cleanup logic/cases
  if (
    // vyanjana, nuqta, svara
    ((BRAHMIC_NUQTA &&
      prev_context.typeAt(-3) === 'vyanjana' &&
      prev_context.textAt(-2) === BRAHMIC_NUQTA &&
      prev_context.typeAt(-1) === 'mAtrA') ||
      // or vyanjana, svara
      (prev_context.typeAt(-2) === 'vyanjana' && prev_context.typeAt(-1) === 'mAtrA')) &&
    // to anya or null
    (!item || item[1]?.type === 'anya')
  ) {
    prev_context.clear();
  }
  if (from_script_data.script_type === 'brahmic' && to_script_data.script_type === 'other') {
    // custom logic when converting from brahmic to other
    // console.log(
    //   [item[0], item[1]?.type],
    //   prev_context_arr.map((item) => item[1]?.type)
    // );
    if (
      item[0] !== BRAHMIC_HALANT! &&
      (isScriptTamilExt(from_script_name) && item[0] && item[0].length > 0
        ? item[0].charAt(0) !== BRAHMIC_HALANT!
        : true) &&
      // (BRAHMIC_NUQTA ? item[0] !== BRAHMIC_NUQTA : true) &&
      (!BRAHMIC_NUQTA || item[0] !== BRAHMIC_NUQTA) &&
      // ^ two special cases to ignore
      // vyanjana or vyanjana, nuqta
      (prev_context.typeAt(-1) === 'vyanjana' ||
        (BRAHMIC_NUQTA &&
          prev_context.typeAt(-2) === 'vyanjana' &&
          prev_context.textAt(-1) === BRAHMIC_NUQTA)) &&
      // to anya or null
      ((item[1]?.type !== 'mAtrA' && item[0] !== BRAHMIC_HALANT!) ||
        item[1]?.type === 'anya' ||
        item[1] === null ||
        item[1] === undefined)
      // ^ as halant also a null 'type'
    ) {
      result.emit(to_script_data.schwa_character);
      // console.log('a added');
    }
  } else if (from_script_data.script_type === 'other' && to_script_data.script_type === 'brahmic') {
    // custom logic when converting from other to brahmic
    if (
      prev_context.typeAt(-1) === 'vyanjana' &&
      (item[1]?.type === 'mAtrA' || item[1]?.type === 'svara')
    ) {
      const linked_mAtrA =
        item[1].type === 'svara'
          ? kramaTextOrEmpty(to_script_data, item[1].mAtrA_krama_ref?.[0] ?? -1)
          : item[0]!;
      // const linked_mAtrA = item[0]!;
      if (isScriptTamilExt(to_script_name) && isTaExtSuperscriptTail(result.lastChar())) {
        emitPiecesWithReorder(result, [linked_mAtrA], to_script_data.halant!, true);
      } else {
        emitPiecesWithReorder(result, [linked_mAtrA], to_script_data.halant!, false);
      }
      result_str_concat_status = true;
    } else if (
      // default transliteration behavior (without schwa deletion)
      !include_inherent_vowel &&
      prev_context.typeAt(-1) === 'vyanjana' &&
      !(item[0] === BRAHMIC_HALANT || item[1]?.type === 'mAtrA')
    ) {
      if (isScriptTamilExt(to_script_name) && isTaExtSuperscriptTail(result.lastChar())) {
        emitPiecesWithReorder(result, [BRAHMIC_HALANT!], to_script_data.halant!, true);
      } else {
        emitPiecesWithReorder(result, [BRAHMIC_HALANT!], to_script_data.halant!, false);
        if (to_script_name === 'Sinhala' && options['all_to_sinhala:use_conjuct_enabling_halant']) {
          result.rewriteAt(-1, result.lastPiece() + '\u200d');
        }
      }
    } else if (
      // if to include inherent vowel then check when to add that skipped halant
      include_inherent_vowel &&
      item &&
      item[1]?.type === 'vyanjana' &&
      (prev_context.typeAt(-1) === 'vyanjana' ||
        (BRAHMIC_NUQTA &&
          prev_context.typeAt(-2) === 'vyanjana' &&
          prev_context.textAt(-1) === BRAHMIC_NUQTA))
    ) {
      if (isScriptTamilExt(to_script_name) && isTaExtSuperscriptTail(result.lastChar())) {
        emitPiecesWithReorder(result, [BRAHMIC_HALANT!], to_script_data.halant!, true);
      } else {
        emitPiecesWithReorder(result, [BRAHMIC_HALANT!], to_script_data.halant!, false);
        if (to_script_name === 'Sinhala' && options['all_to_sinhala:use_conjuct_enabling_halant']) {
          result.rewriteAt(-1, result.lastPiece() + '\u200d');
        }
      }
    }
  }
  // custom typing mode context clear logic
  // only clear context if there are no next characters or if its last extra call
  let to_clear_context = false;
  if (typing_mode && (next === undefined || next.length === 0) && !last_extra_call) {
    to_clear_context = true;
    // do not clear the context only if case where the current added element is a vyanjana
    if (item[1]?.type === 'vyanjana') to_clear_context = false;
    if (to_clear_context) {
      prev_context.clear();
    }
  }
  // addition and shifting
  // in typing it should not be the last extra call
  if (!typing_mode ? true : !last_extra_call && !to_clear_context) prev_context.push(item);

  return result_str_concat_status;
}

function apply_custom_rules(ctx: TransliterateCtx, text_index: number, delta: number) {
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
          from_script_data
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
  from_script_data: OutputScriptData,
  to_script_data: OutputScriptData,
  input_options?: Record<string, boolean>
): CustomOptionType => {
  if (!input_options) return {};
  const active_custom_options: CustomOptionType = {};
  for (const [key, enabled] of Object.entries(input_options ?? {})) {
    if (!(key in custom_options_json)) continue;
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
  from_script_data: OutputScriptData,
  to_script_data: OutputScriptData,
  transliteration_input_options?: CustomOptionType
): { trans_options: CustomOptionType; custom_rules: CustomRulesType } => {
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
  script_data: OutputScriptData
) => rule.replace_with.map((replace_with) => kramaTextOrEmpty(script_data, replace_with)).join('');
/** Apply replacement rules using direct replaceAll method if exist */
export const apply_custom_replace_rules = (
  text: string,
  script_data: OutputScriptData,
  rules: TransOptionsType[keyof TransOptionsType]['rules'],
  allowed_input_rule_type: TransOptionsType[keyof TransOptionsType]['rules'][number]['check_in']
) => {
  if (rules.length === 0) return text;
  for (const rule of rules) {
    if (rule.use_replace !== true || rule.check_in !== allowed_input_rule_type) continue;
    if (rule.type === 'replace_prev_krama_keys') {
      const prev_string = rule.prev.map((prev) => kramaTextOrEmpty(script_data, prev)).join('');
      for (let follow_krama_index of rule.following) {
        const follow_krama_string = kramaTextOrEmpty(script_data, follow_krama_index);
        if (!follow_krama_string) continue;
        const replace_string = get_rule_replace_text(rule, script_data) + follow_krama_string;
        text = text.replaceAll(prev_string + follow_krama_string, replace_string);
      }
    } else if (rule.type === 'direct_replace') {
      const to_replace_strings = rule.to_replace.map((to_replace) =>
        to_replace.map((to_replace_item) => kramaTextOrEmpty(script_data, to_replace_item)).join('')
      );
      for (let to_replace_string of to_replace_strings) {
        text = text.replaceAll(to_replace_string, get_rule_replace_text(rule, script_data));
      }
    }
  }
  return text;
};

type TransliterateCtx = {
  from_script_name: script_list_type;
  to_script_name: script_list_type;
  from_script_data: OutputScriptData;
  to_script_data: OutputScriptData;
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
  from_script_data: OutputScriptData,
  to_script_data: OutputScriptData,
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
  if (typing_mode) trans_options['normal_to_all:use_typing_chars'] = true;

  if (typing_mode && from_script_name === 'Normal') {
    text = applyTypingInputAliases(text);
  }
  text = apply_custom_replace_rules(text, from_script_data, custom_rules, 'input');

  const result = string_builder();
  let text_index = 0;
  const cursor = make_input_cursor(text);

  /** It stores the previous attribute types of the brahmic scripts
   * Use only when converted Brahmic -> Other or Other -> Brahmic
   * Stores attributes of the Brahmic script like svara, vyanjana, anya not of the Other script
   * and the characters match text of the brahmic script
   *
   * **Note** :- The `arr[i][0]` stores the contents of the `text` (not `result_str`) but the `arr[i][1]`
   * stores the attributes of the brahmic script (in both cases)
   */
  const prev_context = prev_context_builder(MAX_CONTEXT_LENGTH);
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
    include_inherent_vowel
  };

  // use a custom map when Normal -> All in typing mode (or when a explicit option)
  const from_text_to_krama_map =
    (trans_options['normal_to_all:use_typing_chars'] || typing_mode) &&
    from_script_name === 'Normal'
      ? to_script_data.typing_text_to_krama_map
      : from_script_data.text_to_krama_map;

  /** A flag to indicate when to ignore the tamil extended numeral
   * Used when converting from tamil extended
   */
  let ignore_ta_ext_sup_num_text_index = -1;

  while (cursor.pos < text.length) {
    text_index = cursor.pos;
    const cur = cursor.peek();
    if (!cur) break;
    const char = cur.ch;
    const char_width = cur.width;
    // Preserve legacy matching semantics: the Step-1 text_to_krama_map matcher historically
    // used a single UTF-16 code unit as the initial window (i.e. `+ 1`), which effectively
    // disables multi-char matching for astral-plane scripts (surrogate pairs). Some fixtures
    // rely on that behavior (e.g. Siddham reversible cases).
    const search_base_units = char_width === 2 ? 1 : char_width;
    // console.log(['index', char, text_index, ignore_ta_ext_sup_num_text_index]);

    if (ignore_ta_ext_sup_num_text_index !== -1 && text_index >= ignore_ta_ext_sup_num_text_index) {
      ignore_ta_ext_sup_num_text_index = -1;
      cursor.advance(char_width);
      continue;
    }

    if (CHARS_TO_SKIP.indexOf(char as (typeof CHARS_TO_SKIP)[number]) !== -1) {
      // ignore blank spaces
      cursor.advance(char_width);
      if (PREV_CONTEXT_IN_USE) {
        prev_context_cleanup(ctx, [' ', null]);
        prev_context.clear();
      }
      result.emit(char);
      continue;
    }

    if (char.match(/^\d$/) && !use_native_numerals) {
      result.emit(char);
      cursor.advance(char_width);
      prev_context_cleanup(ctx, [char, null]);
      continue;
    }

    // In Preserve mode, first check if the character is a custom script character
    if (trans_options['all_to_normal:preserve_specific_chars'] && to_script_name === 'Normal') {
      const custom_script_index = binarySearchLower(
        from_script_data.custom_script_chars_arr,
        char,
        {
          accessor: (arr, i) => arr[i][0]
        }
      );
      if (custom_script_index !== -1) {
        const custom_script_item = from_script_data.custom_script_chars_arr[custom_script_index];
        prev_context_cleanup(ctx, [
          custom_script_item[0],
          from_script_data.list[custom_script_item[1] ?? -1] ?? null
        ]);
        const normal_text =
          from_script_data.typing_text_to_krama_map[custom_script_item[2] ?? -1]?.[0];
        result.emit(normal_text ?? '');
        cursor.advance(custom_script_item[0].length);
        continue;
      }
    }

    // Step 1: Search for the character in the text_to_krama_map
    let text_to_krama_item_index = -1;
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
        const next = cursor.peekAt(text_index + search_base_units + scan_units);
        const next_char = next?.ch ?? '';
        if (
          ignore_ta_ext_sup_num_text_index !== -1 &&
          next_char &&
          isTaExtSuperscriptTail(next_char)
        ) {
          scan_units += next?.width ?? 0;
        }
        const end_index = text_index + search_base_units + scan_units;
        const char_to_search =
          // usage example: க்⁴ரு² -> ghR
          ignore_ta_ext_sup_num_text_index !== -1
            ? // in this we will ignore the current charcter and scan one ahead
              cursor.slice(text_index, ignore_ta_ext_sup_num_text_index) +
              (end_index > ignore_ta_ext_sup_num_text_index
                ? cursor.slice(ignore_ta_ext_sup_num_text_index + 1, end_index)
                : '')
            : cursor.slice(text_index, end_index);
        const potential_match_index = binarySearchLower(from_text_to_krama_map, char_to_search, {
          accessor: (arr, i) => arr[i][0]
        });
        if (potential_match_index === -1) {
          text_to_krama_item_index = -1;
          break;
        }
        const potential_match = from_text_to_krama_map[potential_match_index];

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

        if (potential_match[1].next && potential_match[1].next.length > 0) {
          const nth_next = cursor.peekAt(end_index);
          const nth_next_character = nth_next?.ch;

          if (isScriptTamilExt(from_script_name) && from_script_data.script_type === 'brahmic') {
            const n_1_th_next = nth_next ? cursor.peekAt(end_index + nth_next.width) : null;
            const n_1_th_next_character = n_1_th_next?.ch;
            // this handles mAtrA duplicates like O = E + A in gEA (or gO as visible when)
            const n_2_th_next =
              nth_next && n_1_th_next
                ? cursor.peekAt(end_index + nth_next.width + n_1_th_next.width)
                : null;
            const n_2_th_next_character = n_2_th_next?.ch;
            if (
              ignore_ta_ext_sup_num_text_index === -1 &&
              n_1_th_next_character !== undefined &&
              isTaExtSuperscriptTail(n_1_th_next_character) &&
              potential_match[1].next.indexOf(n_1_th_next_character) !== -1
            ) {
              // the next character is also a superscript number and also is in the next list
              // so we find a match (guranteed as in 'next') and map to it and break
              const char_index = binarySearchLower(
                from_script_data.text_to_krama_map,
                char_to_search + n_1_th_next_character,
                {
                  accessor: (arr, i) => arr[i][0]
                }
              );
              const nth_char_text_index = binarySearchLowerWithIndex(
                from_script_data.krama_text_arr,
                from_script_data.krama_text_arr_index,
                nth_next_character ?? '',
                {
                  accessor: (arr, i) => arr[i][0]
                }
              );
              if (char_index !== -1 && nth_char_text_index !== -1) {
                text_to_krama_item_index = char_index;
                const nth_char_text_item = from_script_data.krama_text_arr[nth_char_text_index];
                const nth_char_type = from_script_data.list[nth_char_text_item[1] ?? -1]?.type;
                if (nth_next_character === from_script_data.halant || nth_char_type === 'mAtrA') {
                  ignore_ta_ext_sup_num_text_index = end_index + (nth_next?.width ?? 0);
                  break;
                }
              }
            } else if (
              ignore_ta_ext_sup_num_text_index === -1 &&
              n_2_th_next_character !== undefined &&
              isTaExtSuperscriptTail(n_2_th_next_character) &&
              potential_match[1].next.indexOf(n_2_th_next_character) !== -1
            ) {
              // the next character is also a superscript number and also is in the next list
              // so we find a match (guranteed as in 'next') and map to it and break
              const char_index = binarySearchLower(
                from_script_data.text_to_krama_map,
                char_to_search + n_2_th_next_character,
                {
                  accessor: (arr, i) => arr[i][0]
                }
              );
              const nth_char_text_index = binarySearchLowerWithIndex(
                from_script_data.krama_text_arr,
                from_script_data.krama_text_arr_index,
                nth_next_character ?? '',
                {
                  accessor: (arr, i) => arr[i][0]
                }
              );
              const n_1_th_char_text_index = binarySearchLowerWithIndex(
                from_script_data.krama_text_arr,
                from_script_data.krama_text_arr_index,
                n_1_th_next_character ?? '',
                {
                  accessor: (arr, i) => arr[i][0]
                }
              );
              // special case for some mAtrAs like gO = g + E + A
              if (
                char_index !== -1 &&
                nth_char_text_index !== -1 &&
                n_1_th_char_text_index !== -1
              ) {
                const nth_char_text_item = from_script_data.krama_text_arr[nth_char_text_index];
                const n_1_th_char_text_item =
                  from_script_data.krama_text_arr[n_1_th_char_text_index];
                text_to_krama_item_index = char_index;
                const nth_char_type = from_script_data.list[nth_char_text_item[1] ?? -1]?.type;
                const n_1_th_char_type =
                  from_script_data.list[n_1_th_char_text_item[1] ?? -1]?.type;
                if (nth_char_type === 'mAtrA' && n_1_th_char_type === 'mAtrA') {
                  ignore_ta_ext_sup_num_text_index =
                    end_index + (nth_next?.width ?? 0) + (n_1_th_next?.width ?? 0);
                  break;
                }
              }
            }
          }
          if (
            nth_next_character !== undefined &&
            potential_match[1].next.indexOf(nth_next_character) !== -1
          ) {
            scan_units += nth_next?.width ?? 0;
            continue;
          }
        }
        text_to_krama_item_index = potential_match_index;
        break;
      }
    }

    const text_to_krama_item:
      | (
          | OutputScriptData['text_to_krama_map'][number]
          | OutputScriptData['typing_text_to_krama_map'][number]
        )
      | null =
      text_to_krama_item_index !== -1 ? from_text_to_krama_map[text_to_krama_item_index] : null;
    if (text_to_krama_item !== null) {
      // condtional subtarct 1 when a superscript number is present in the current match
      const index_delete_length =
        ignore_ta_ext_sup_num_text_index !== -1 &&
        text_to_krama_item[0].length > 1 &&
        from_script_data.list[
          from_script_data.krama_text_arr[text_to_krama_item[1].krama?.[0] ?? -1]?.[1] ?? -1
        ]?.type === 'vyanjana' &&
        isTaExtSuperscriptTail(text_to_krama_item[0].at(-1) ?? undefined)
          ? 1
          : 0;
      const matched_len_units = text_to_krama_item[0].length - index_delete_length;
      cursor.advance(matched_len_units);
      text_index = cursor.pos;
      // console.log(text_to_krama_item);
      if (
        trans_options['normal_to_all:use_typing_chars'] &&
        'custom_back_ref' in text_to_krama_item[1] &&
        text_to_krama_item[1].custom_back_ref !== undefined &&
        text_to_krama_item[1].custom_back_ref !== null
      ) {
        const custom_script_char_item =
          to_script_data.custom_script_chars_arr[text_to_krama_item[1].custom_back_ref] ?? null;
        if (custom_options_json !== null) {
          result.emit(custom_script_char_item[0]);
          prev_context_cleanup(
            ctx,
            [text_to_krama_item[0], to_script_data.list[custom_script_char_item[1] ?? -1] ?? null],
            {
              next: text_to_krama_item[1].next ?? undefined
            }
          );
        }
        continue;
      }
      // we have to componsate for the superscript number's length
      if (
        text_to_krama_item[1].krama !== null &&
        text_to_krama_item[1].krama !== undefined &&
        text_to_krama_item[1].krama.some((krama_index) => krama_index !== -1)
      ) {
        // as the krama index is present we can skip the Step 2 and return the result directly
        const result_pieces_to_add = text_to_krama_item[1].krama.map(
          (krama_index) => kramaTextOrEmpty(to_script_data, krama_index)
          // revert to the original character if the krama index is not found
        );
        const result_text = result_pieces_to_add.join('');
        let result_concat_status = false;
        if (PREV_CONTEXT_IN_USE) {
          if (
            from_script_data.script_type === 'brahmic' &&
            to_script_data.script_type === 'other'
          ) {
            let item: (typeof from_script_data.list)[number] | null | undefined = null;
            if (
              !trans_options['normal_to_all:use_typing_chars'] &&
              text_to_krama_item[1].fallback_list_ref !== undefined &&
              text_to_krama_item[1].fallback_list_ref !== null
            ) {
              item = from_script_data.list[text_to_krama_item[1].fallback_list_ref];
            }
            // if otherwise then follow the the last kram ref
            // use last as that is prev which will be used to decide svara or vyanjana
            // This condition very well may change in the future so be careful
            else if (!text_to_krama_item[1].krama || text_to_krama_item[1].krama.length === 0)
              item = null;
            else {
              const list_refs = text_to_krama_item[1].krama.map(
                (krama_index) =>
                  from_script_data.list[from_script_data.krama_text_arr[krama_index][1] ?? -1]
              );
              // if mixture of vyanjana and mAtrA then return the first item as anya type
              if (
                isScriptTamilExt(from_script_name) &&
                list_refs.some((item) => item?.type === 'mAtrA') &&
                list_refs.some((item) => item?.type === 'vyanjana')
              ) {
                item = { ...list_refs[0], type: 'anya' };
              } else if (
                isScriptTamilExt(from_script_name) &&
                list_refs.length > 1 &&
                list_refs.some((item) => item === undefined || item === null)
              ) {
                item = list_refs.at(-1);
              } else {
                item = list_refs[0];
              }
            }

            result_concat_status = prev_context_cleanup(ctx, [text_to_krama_item[0], item]);
          } else if (
            to_script_data.script_type === 'brahmic' &&
            from_script_data.script_type === 'other'
          ) {
            let item: (typeof to_script_data.list)[number] | null | undefined = null;
            if (
              text_to_krama_item[1].fallback_list_ref !== undefined &&
              text_to_krama_item[1].fallback_list_ref !== null
            ) {
              item = to_script_data.list[text_to_krama_item[1].fallback_list_ref];
            } else {
              item =
                text_to_krama_item[1].krama && text_to_krama_item[1].krama.length > 0
                  ? (to_script_data.list[
                      to_script_data.krama_text_arr[text_to_krama_item[1].krama[0]]?.[1] ?? -1
                    ] ?? null)
                  : null;
            }
            if (typing_mode && from_script_name === 'Normal') {
              // Note :- this is the only over place where next chars can be found
              result_concat_status = prev_context_cleanup(ctx, [text_to_krama_item[0], item], {
                next: text_to_krama_item[1].next ?? undefined
              });
            } else result_concat_status = prev_context_cleanup(ctx, [text_to_krama_item[0], item]);
          } else if (
            typing_mode &&
            from_script_name === 'Normal' &&
            to_script_data.script_type === 'other'
          ) {
            result_concat_status = prev_context_cleanup(ctx, [text_to_krama_item[0], null], {
              next: text_to_krama_item[1].next ?? undefined
            });
          }
        }
        if (!result_concat_status) {
          if (
            to_script_data.script_type === 'brahmic' &&
            isScriptTamilExt(to_script_name) &&
            (to_script_data.list[text_to_krama_item[1].krama?.at(-1) ?? -1]?.type === 'mAtrA' ||
              result_text === to_script_data.halant) &&
            isTaExtSuperscriptTail(result.lastChar())
          ) {
            emitPiecesWithReorder(result, result_pieces_to_add, to_script_data.halant!, true);
          } else if (
            isScriptTamilExt(to_script_name) &&
            isVedicSvaraTail(result_pieces_to_add.at(-1)?.at(-1) ?? '') &&
            isTaExtSuperscriptTail(result.lastChar())
          ) {
            const last = result.popLastChar();
            result.emitPieces(result_pieces_to_add);
            result.emit(last ?? '');
          } else {
            result.emitPieces(result_pieces_to_add);
          }
        }
        apply_custom_rules(ctx, text_index, -matched_len_units);
        continue;
      } else if (
        text_to_krama_item[1].krama !== null &&
        text_to_krama_item[1].krama !== undefined &&
        text_to_krama_item[1].krama.some((krama_index) => krama_index === -1)
      ) {
        // handle cases where any one of the krama poiting is -1
        result.emit(text_to_krama_item[0]);
        if (typing_mode) {
          // custom context setup call where -1
          // Like for Sh('), ''(')\
          prev_context_cleanup(ctx, [text_to_krama_item[0], null], {
            next: text_to_krama_item[1].next ?? undefined
          });
        }
        continue;
      }
    } else {
      cursor.advance(char_width);
      text_index = cursor.pos;
    }

    // Step 2: Search for the character in the krama_text_map
    const char_to_search = text_to_krama_item === null ? char : text_to_krama_item[0];
    const index = kramaIndexOfText(from_script_data, char_to_search);
    if (index === -1) {
      // text not matched so ignore and return as it is
      if (PREV_CONTEXT_IN_USE) {
        prev_context_cleanup(ctx, [char_to_search, null]);
        prev_context.clear();
        // clear the array as an unidentified character found
      }
      result.emit(char_to_search);
      continue;
    }
    let result_concat_status = false;
    if (PREV_CONTEXT_IN_USE) {
      if (from_script_data.script_type === 'brahmic') {
        result_concat_status = prev_context_cleanup(ctx, [
          char_to_search,
          from_script_data.list[from_script_data.krama_text_arr[index][1] ?? -1]
        ]);
      } else if (to_script_data.script_type === 'brahmic') {
        result_concat_status = prev_context_cleanup(ctx, [
          char_to_search,
          to_script_data.list[to_script_data.krama_text_arr[index][1] ?? -1]
        ]);
      }
    }
    if (!result_concat_status) {
      const to_add_text = kramaTextOrEmpty(to_script_data, index);
      // In tamil Extended check if the current one is a halant or a svara(mAtrA)
      if (
        to_script_data.script_type === 'brahmic' &&
        isScriptTamilExt(to_script_name) &&
        (to_script_data.list[to_script_data.krama_text_arr[index][1] ?? -1]?.type === 'mAtrA' ||
          to_add_text === to_script_data.halant) &&
        isTaExtSuperscriptTail(result.lastChar())
      ) {
        emitPiecesWithReorder(result, [to_add_text], to_script_data.halant!, true);
      } else if (
        isScriptTamilExt(to_script_name) &&
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
    apply_custom_rules(ctx, text_index, -char_width);
  }
  if (PREV_CONTEXT_IN_USE)
    // calling with last extra index flag
    prev_context_cleanup(ctx, [undefined, null], { last_extra_call: true });

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
