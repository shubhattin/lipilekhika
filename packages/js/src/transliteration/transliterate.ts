import type { OutputScriptData } from '../make_script_data/output_script_data_schema';
import {
  binarySearchLower,
  binarySearchLowerWithIndex
} from '../utils/binary_search/binary_search';
import { getScriptData } from '../utils/get_script_data';
import type { script_list_type } from '../utils/lang_list';
import custom_options_json from '../custom_options.json';
import type { OptionsType } from '../make_script_data/custom_options_input';
import {
  make_input_cursor,
  kramaTextOrEmpty,
  prev_context_builder,
  string_builder,
  type prev_context_array_type
} from './helpers';

export type CustomOptionList = keyof typeof custom_options_json;
export type CustomOptionType = {
  [key in CustomOptionList]?: boolean;
};

/** These Characters can be skipped/ignore while transliterating the input text */
const CHARS_TO_SKIP = [' ', '\n', '\r', '\t', ',', ';', '!', '@', '?', '%'] as const;
const TAMIL_EXTENDED_SUPERSCRIPT_NUMBERS = ['²', '³', '⁴'] as const;

export const transliterate_text = async (
  text: string,
  from_script_name: script_list_type,
  to_script_name: script_list_type,
  input_options?: CustomOptionType
) => {
  const from_script_data = await getScriptData(from_script_name);
  const to_script_data = await getScriptData(to_script_name);
  const options = get_active_custom_options(from_script_data, to_script_data, input_options);
  const custom_rules = Object.keys(options).flatMap(
    (key) =>
      custom_options_json[key as CustomOptionList].rules as OptionsType[keyof OptionsType]['rules']
  );
  // ^ all active rules for auto processing extracted

  text = apply_custom_repalce_rules(text, from_script_data, custom_rules, 'input');

  const result = string_builder();
  let text_index = 0;
  const cursor = make_input_cursor(text);

  const MAX_CONTEXT_LENGTH = 5;
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
    (from_script_data.script_type === 'other' && to_script_data.script_type === 'brahmic');
  const BRAHMIC_NUQTA =
    from_script_data.script_type === 'brahmic' && to_script_data.script_type === 'other'
      ? from_script_data?.nuqta
      : from_script_data.script_type === 'other' && to_script_data.script_type === 'brahmic'
        ? to_script_data?.nuqta
        : null;
  const BRAHMIC_HALANT =
    from_script_data.script_type === 'brahmic' && to_script_data.script_type === 'other'
      ? from_script_data.halant
      : from_script_data.script_type === 'other' && to_script_data.script_type === 'brahmic'
        ? to_script_data.halant
        : null;

  /** Return flag to indicate if the result_str concat has to be done
   * as it already is concatenated in this function
   */
  function prev_context_cleanup_func(item: prev_context_array_type[number]) {
    let result_str_concat_status = false;

    // custom cleanup logic/cases
    // console.log(
    //   [item[0], item[1]?.type],
    //   prev_context_arr.map((item) => item[1]?.type),
    //   result_str.split('')
    // );
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
        (from_script_name === 'Tamil-Extended' && item[0] && item[0].length > 0
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
    } else if (
      from_script_data.script_type === 'other' &&
      to_script_data.script_type === 'brahmic'
    ) {
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
        if (
          to_script_name === 'Tamil-Extended' &&
          TAMIL_EXTENDED_SUPERSCRIPT_NUMBERS.indexOf(
            result.lastChar()! as (typeof TAMIL_EXTENDED_SUPERSCRIPT_NUMBERS)[number]
          ) !== -1
        ) {
          if (linked_mAtrA[0] === to_script_data.halant) {
            result.withLastCharMovedAfter([to_script_data.halant], [linked_mAtrA.slice(1)]);
          } else {
            result.withLastCharMovedAfter([linked_mAtrA], []);
          }
        } else {
          result.emit(linked_mAtrA);
        }
        result_str_concat_status = true;
      } else if (
        prev_context.typeAt(-1) === 'vyanjana' &&
        !(item[0] === BRAHMIC_HALANT || item[1]?.type === 'mAtrA')
      ) {
        if (
          to_script_name === 'Tamil-Extended' &&
          TAMIL_EXTENDED_SUPERSCRIPT_NUMBERS.indexOf(
            result.lastChar()! as (typeof TAMIL_EXTENDED_SUPERSCRIPT_NUMBERS)[number]
          ) !== -1
        ) {
          result.withLastCharMovedAfter([BRAHMIC_HALANT!], []);
        } else {
          result.emit(BRAHMIC_HALANT!);
        }
      }
    }

    // addition and shifting
    prev_context.push(item);

    return result_str_concat_status;
  }

  function apply_custom_rules(text_index: number, delta: number) {
    const current_text_index = text_index + delta;
    for (let rule_index = 0; rule_index < custom_rules.length; rule_index++) {
      if (custom_rules[rule_index].use_replace === true) continue;
      const rule = custom_rules[rule_index];
      if (rule.check_in === 'output') continue;
      // output rule handling will be added
      if (rule.type === 'replace_prev_krama_keys') {
        let prev_exists = true;
        let prev_matched_indexes: number[] = [];
        for (let i = 0; i < rule.prev.length; i++) {
          const prev_krama_index = rule.prev[rule.prev.length - 1 - i];
          const current_char_info = cursor.peekAt(current_text_index - i);
          if (current_char_info === null) {
            prev_exists = false;
            break;
          }
          const current_char = current_char_info.ch;
          const current_char_krama_index = binarySearchLowerWithIndex(
            from_script_data.krama_text_arr,
            from_script_data.krama_text_arr_index,
            current_char,
            {
              accessor: (arr, i) => arr[i][0]
            }
          );
          if (current_char_krama_index === -1 || current_char_krama_index !== prev_krama_index) {
            prev_exists = false;
            break;
          }
          prev_matched_indexes.push(current_char_krama_index);
        }
        const next_char_info = cursor.peekAt(text_index);
        if (prev_exists && next_char_info !== null) {
          const next_char = next_char_info.ch;
          const next_char_krama_index = binarySearchLowerWithIndex(
            from_script_data.krama_text_arr,
            from_script_data.krama_text_arr_index,
            next_char,
            {
              accessor: (arr, i) => arr[i][0]
            }
          );
          if (
            next_char_krama_index !== -1 &&
            rule.following.indexOf(next_char_krama_index) !== -1
          ) {
            // Replace last K output pieces corresponding to the matched previous krama keys.
            // This is token-safe and avoids char-count slicing.
            const replace_with_pieces = rule.replace_with
              .map((replace_with) => kramaTextOrEmpty(to_script_data, replace_with))
              .filter(Boolean);
            result.rewriteTailPieces(prev_matched_indexes.length, replace_with_pieces);
          }
        }
      }
    }
  }

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
        prev_context_cleanup_func([' ', null]);
        prev_context.clear();
      }
      result.emit(char);
      continue;
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
          TAMIL_EXTENDED_SUPERSCRIPT_NUMBERS.indexOf(
            next_char as (typeof TAMIL_EXTENDED_SUPERSCRIPT_NUMBERS)[number]
          ) !== -1
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
        const potential_match_index = binarySearchLower(
          from_script_data.text_to_krama_map,
          char_to_search,
          {
            accessor: (arr, i) => arr[i][0]
          }
        );
        if (potential_match_index === -1) {
          text_to_krama_item_index = -1;
          break;
        }
        const potential_match = from_script_data.text_to_krama_map[potential_match_index];

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

          if (from_script_name === 'Tamil-Extended' && from_script_data.script_type === 'brahmic') {
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
              TAMIL_EXTENDED_SUPERSCRIPT_NUMBERS.indexOf(
                n_1_th_next_character as (typeof TAMIL_EXTENDED_SUPERSCRIPT_NUMBERS)[number]
              ) !== -1 &&
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
              TAMIL_EXTENDED_SUPERSCRIPT_NUMBERS.indexOf(
                n_2_th_next_character as (typeof TAMIL_EXTENDED_SUPERSCRIPT_NUMBERS)[number]
              ) !== -1 &&
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

    const text_to_krama_item: OutputScriptData['text_to_krama_map'][number] | null =
      text_to_krama_item_index !== -1
        ? from_script_data.text_to_krama_map[text_to_krama_item_index]
        : null;
    if (text_to_krama_item !== null) {
      // condtional subtarct 1 when a superscript number is present in the current match
      const index_delete_length =
        ignore_ta_ext_sup_num_text_index !== -1 &&
        text_to_krama_item[0].length > 1 &&
        from_script_data.list[
          from_script_data.krama_text_arr[text_to_krama_item[1].krama?.[0] ?? -1]?.[1] ?? -1
        ]?.type === 'vyanjana' &&
        TAMIL_EXTENDED_SUPERSCRIPT_NUMBERS.indexOf(
          text_to_krama_item[0].at(-1) as (typeof TAMIL_EXTENDED_SUPERSCRIPT_NUMBERS)[number]
        ) !== -1
          ? 1
          : 0;
      const matched_len_units = text_to_krama_item[0].length - index_delete_length;
      cursor.advance(matched_len_units);
      text_index = cursor.pos;
      // we have to componsate for the superscript number's length
      if (text_to_krama_item[1].krama !== null && text_to_krama_item[1].krama !== undefined) {
        // as the krama index is present we can skip the Step 2 and return the result directly
        const result_pieces_to_add = text_to_krama_item[1].krama.map(
          (krama_index) => kramaTextOrEmpty(to_script_data, krama_index)
          // revert to the original character if the krama index is not found
        );
        const result_text = result_pieces_to_add.join('');
        let result_concat_status = false;
        if (PREV_CONTEXT_IN_USE) {
          if (from_script_data.script_type === 'brahmic') {
            result_concat_status = prev_context_cleanup_func([
              text_to_krama_item[0],
              (() => {
                if (
                  text_to_krama_item[1].fallback_list_ref !== undefined &&
                  text_to_krama_item[1].fallback_list_ref !== null
                ) {
                  return from_script_data.list[text_to_krama_item[1].fallback_list_ref];
                }
                // if otherwise then follow the the last kram ref
                // use last as that is prev which will be used to decide svara or vyanjana
                // This condition very well may change in the future so be careful
                if (!text_to_krama_item[1].krama || text_to_krama_item[1].krama.length === 0)
                  return null;
                const list_refs = text_to_krama_item[1].krama.map(
                  (krama_index) =>
                    from_script_data.list[from_script_data.krama_text_arr[krama_index][1] ?? -1]
                );
                // if mixture of vyanjana and mAtrA then return the first item as anya type
                if (
                  from_script_name === 'Tamil-Extended' &&
                  list_refs.some((item) => item?.type === 'mAtrA') &&
                  list_refs.some((item) => item?.type === 'vyanjana')
                ) {
                  return { ...list_refs[0], type: 'anya' };
                } else if (
                  from_script_name === 'Tamil-Extended' &&
                  list_refs.length > 1 &&
                  list_refs.some((item) => item === undefined || item === null)
                ) {
                  return list_refs.at(-1);
                }
                return list_refs[0];
              })()
            ]);
          } else if (to_script_data.script_type === 'brahmic') {
            result_concat_status = prev_context_cleanup_func([
              text_to_krama_item[0],
              (() => {
                if (
                  text_to_krama_item[1].fallback_list_ref !== undefined &&
                  text_to_krama_item[1].fallback_list_ref !== null
                ) {
                  return to_script_data.list[text_to_krama_item[1].fallback_list_ref];
                }
                return text_to_krama_item[1].krama && text_to_krama_item[1].krama.length > 0
                  ? to_script_data.list[
                      to_script_data.krama_text_arr[text_to_krama_item[1].krama[0]][1] ?? -1
                    ]
                  : null;
              })()
            ]);
          }
        }
        if (!result_concat_status) {
          if (
            to_script_data.script_type === 'brahmic' &&
            to_script_name === 'Tamil-Extended' &&
            (to_script_data.list[text_to_krama_item[1].krama?.at(-1) ?? -1]?.type === 'mAtrA' ||
              result_text === to_script_data.halant) &&
            TAMIL_EXTENDED_SUPERSCRIPT_NUMBERS.indexOf(
              result.lastChar()! as (typeof TAMIL_EXTENDED_SUPERSCRIPT_NUMBERS)[number]
            ) !== -1
          ) {
            const first_piece = result_pieces_to_add[0] ?? '';
            if (first_piece[0] === to_script_data.halant) {
              const rest_first = first_piece.slice(1);
              const after_pieces: string[] = [];
              if (rest_first) after_pieces.push(rest_first);
              for (let i = 1; i < result_pieces_to_add.length; i++)
                after_pieces.push(result_pieces_to_add[i]);
              result.withLastCharMovedAfter([to_script_data.halant], after_pieces);
            } else {
              result.withLastCharMovedAfter(result_pieces_to_add, []);
            }
          } else {
            result.emitPieces(result_pieces_to_add);
          }
        }
        apply_custom_rules(text_index, -matched_len_units);
        continue;
      }
    } else {
      cursor.advance(char_width);
      text_index = cursor.pos;
    }

    // Step 2: Search for the character in the krama_text_map
    const char_to_search = text_to_krama_item === null ? char : text_to_krama_item[0];
    const index = binarySearchLowerWithIndex(
      from_script_data.krama_text_arr,
      from_script_data.krama_text_arr_index,
      char_to_search,
      {
        accessor: (arr, i) => arr[i][0]
      }
    );
    if (index === -1) {
      // text not matched so ignore and return as it is
      if (PREV_CONTEXT_IN_USE) {
        prev_context_cleanup_func([char_to_search, null]);
        prev_context.clear();
        // clear the array as an unidentified character found
      }
      result.emit(char_to_search);
      continue;
    }
    let result_concat_status = false;
    if (PREV_CONTEXT_IN_USE) {
      if (from_script_data.script_type === 'brahmic') {
        result_concat_status = prev_context_cleanup_func([
          char_to_search,
          from_script_data.list[from_script_data.krama_text_arr[index][1] ?? -1]
        ]);
      } else if (to_script_data.script_type === 'brahmic') {
        result_concat_status = prev_context_cleanup_func([
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
        to_script_name === 'Tamil-Extended' &&
        (to_script_data.list[to_script_data.krama_text_arr[index][1] ?? -1]?.type === 'mAtrA' ||
          to_add_text === to_script_data.halant) &&
        TAMIL_EXTENDED_SUPERSCRIPT_NUMBERS.indexOf(
          result.lastChar()! as (typeof TAMIL_EXTENDED_SUPERSCRIPT_NUMBERS)[number]
        ) !== -1
      ) {
        if (to_add_text[0] === to_script_data.halant) {
          result.withLastCharMovedAfter([to_script_data.halant], [to_add_text.slice(1)]);
        } else {
          result.withLastCharMovedAfter([to_add_text], []);
        }
      } else {
        result.emit(to_add_text);
      }
    }
    apply_custom_rules(text_index, -char_width);
  }
  if (PREV_CONTEXT_IN_USE) prev_context_cleanup_func([undefined, null]);

  let output = result.toString();
  output = apply_custom_repalce_rules(output, to_script_data, custom_rules, 'output');

  return {
    output,
    /** Can be used to manage context while using the typing feature */
    context_length: prev_context.length()
  };
};

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
    if (!enabled || !(key in custom_options_json)) continue;
    const option_info = custom_options_json[
      key as CustomOptionList
    ] as OptionsType[keyof OptionsType];
    if (
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
        active_custom_options[key as CustomOptionList] = true;
      } else if (
        option_info.to_script_name !== undefined &&
        option_info.to_script_name.includes(to_script_data.script_name)
      ) {
        active_custom_options[key as CustomOptionList] = true;
      }
    }
  }
  return active_custom_options;
};

/** Apply replacement rules using direct replaceAll method if exist */
export const apply_custom_repalce_rules = (
  text: string,
  script_data: OutputScriptData,
  rules: OptionsType[keyof OptionsType]['rules'],
  allowed_input_rule_type: OptionsType[keyof OptionsType]['rules'][number]['check_in']
) => {
  if (rules.length === 0) return text;
  for (const rule of rules) {
    if (rule.use_replace !== true || rule.check_in !== allowed_input_rule_type) continue;
    if (rule.type === 'replace_prev_krama_keys') {
      const prev_string = rule.prev.map((prev) => kramaTextOrEmpty(script_data, prev)).join('');
      for (let follow_krama_index of rule.following) {
        const follow_krama_string = kramaTextOrEmpty(script_data, follow_krama_index);
        if (!follow_krama_string) continue;
        const replace_string =
          rule.replace_with
            .map((replace_with) => kramaTextOrEmpty(script_data, replace_with))
            .join('') + follow_krama_string;
        text = text.replaceAll(prev_string + follow_krama_string, replace_string);
      }
    } else if (rule.type === 'direct_replace') {
      const to_replace_strings = rule.to_replace.map((to_replace) =>
        to_replace.map((to_replace_item) => kramaTextOrEmpty(script_data, to_replace_item)).join('')
      );
      for (let to_replace_string of to_replace_strings) {
        text = text.replaceAll(
          to_replace_string,
          rule.replace_with
            .map((replace_with) => kramaTextOrEmpty(script_data, replace_with))
            .join('')
        );
      }
    }
  }
  return text;
};
