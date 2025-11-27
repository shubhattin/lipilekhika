import type {
  OutputScriptData,
  OutputBrahmicScriptData
} from '../make_script_data/output_script_data_schema';
import { binarySearch, binarySearchWithIndex } from '../utils/binary_search/binary_search';
import { getScriptData } from '../utils/get_script_data';
import type { script_list_type } from '../utils/lang_list';

type prev_context_array_type = [
  string | undefined,
  OutputBrahmicScriptData['list'][number] | null | undefined
][];

const CHARS_TO_IGNORE = [' ', '\n', '\r', '\t', ',', ';', '!', '@', '?', '%'] as const;

export const transliterate_text = async (
  text: string,
  from_script_name: script_list_type,
  to_script_name: script_list_type
) => {
  const from_script_data = await getScriptData(from_script_name);
  const to_script_data = await getScriptData(to_script_name);

  let result_str = '';

  let text_index = 0;

  const MAX_CONTEXT_LENGTH = 5;
  /** It stores the previous attribute types of the brahmic scripts
   * Use only when converted Brahmic -> Other or Other -> Brahmic
   * Stores attributes of the Brahmic script like svara, vyanjana, anya not of the Other script
   * and the characters match text of the brahmic script
   */
  let prev_context_arr: prev_context_array_type = [];
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
  function prev_context_cleanup_func(item: (typeof prev_context_arr)[number]) {
    let result_str_concat_status = false;

    // custom cleanup logic/cases
    // console.log(
    //   [item[0], item[1]?.type],
    //   prev_context_arr.map((item) => item[1]?.type),
    //   result_str.split('')
    // );
    if (
      // vyanjana, nuqta, svara
      ((prev_context_arr.at(-3)?.[1]?.type === 'vyanjana' &&
        prev_context_arr.at(-2)?.[0] === BRAHMIC_NUQTA &&
        prev_context_arr.at(-1)?.[1]?.type === 'svara') ||
        // or vyanjana, svara
        (prev_context_arr.at(-2)?.[1]?.type === 'vyanjana' &&
          prev_context_arr.at(-1)?.[1]?.type === 'svara')) &&
      // to anya or null
      (!item || item[1]?.type === 'anya')
    ) {
      prev_context_arr = [];
    }
    if (from_script_data.script_type === 'brahmic' && to_script_data.script_type === 'other') {
      // custom logic when converting from brahmic to other
      const brahmic_halant = from_script_data.halant;
      if (
        item[0] !== brahmic_halant &&
        item[0] !== BRAHMIC_NUQTA &&
        // ^ two special cases to ignore
        // vyanjana or vyanjana, nuqta
        (prev_context_arr.at(-1)?.[1]?.type === 'vyanjana' ||
          (prev_context_arr.at(-2)?.[1]?.type === 'vyanjana' &&
            prev_context_arr.at(-1)?.[0] === BRAHMIC_NUQTA)) &&
        // to anya or null
        ((item[1]?.type !== 'svara' && item[0] !== brahmic_halant) ||
          item[1]?.type === 'anya' ||
          item[1] === null ||
          item[1] === undefined)
        // ^ as halant also a null 'type'
      ) {
        result_str += 'a';
        // this is 'a' is true for Romanized and Normal (could be different for others if added in future)
      }
    } else if (
      from_script_data.script_type === 'other' &&
      to_script_data.script_type === 'brahmic'
    ) {
      // custom logic when converting from other to brahmic
      if (prev_context_arr.at(-1)?.[1]?.type === 'vyanjana' && item[1]?.type === 'svara') {
        result_str += to_script_data.krama_text_arr[item[1]?.mAtrA_krama_ref?.[0] ?? -1][0];
        result_str_concat_status = true;
      } else if (
        prev_context_arr.at(-1)?.[1]?.type === 'vyanjana' &&
        !(item[0] === BRAHMIC_HALANT || item[1]?.type === 'svara')
      ) {
        result_str += BRAHMIC_HALANT;
      }
    }

    // addition and shifting
    if (item[0] !== undefined && item[0].length > 0) prev_context_arr.push(item);
    if (prev_context_arr.length > MAX_CONTEXT_LENGTH) {
      prev_context_arr.shift();
    }

    return result_str_concat_status;
  }

  for (; text_index < text.length; ) {
    const char = text[text_index];
    if (CHARS_TO_IGNORE.indexOf(char as (typeof CHARS_TO_IGNORE)[number]) !== -1) {
      // ignore blank spaces
      text_index++;
      if (PREV_CONTEXT_IN_USE) {
        prev_context_cleanup_func([' ', null]);
        prev_context_arr = [];
      }
      result_str += char;
      continue;
    }

    // Step 1: Search for the character in the text_to_krama_map
    // const context_break_condition =
    //   PREV_CONTEXT_IN_USE &&
    //   // context breaker currently needed like this only for other to brahmic conversion
    //   to_script_data.script_type === 'brahmic';
    // ((prev_context_arr.at(-3)?.[1]?.type === 'vyanjana' &&
    //   prev_context_arr.at(-2)?.[0] === BRAHMIC_NUQTA &&
    //   prev_context_arr.at(-1)?.[1]?.type === 'svara') ||
    //   (prev_context_arr.at(-2)?.[1]?.type === 'vyanjana' &&
    //     prev_context_arr.at(-1)?.[1]?.type === 'svara'));
    let text_to_krama_item: OutputScriptData['text_to_krama_map'][number] | null = null;
    {
      // Iterative matching with retraction support for vyanjana+svara context
      // Instead of lookahead, we save the last valid svara match and retract if needed
      let chars_to_scan = 0;
      let last_valid_svara_match: OutputScriptData['text_to_krama_map'][number] | null = null;
      // Flag to track if we're in a vyanjana+svara context where retraction may be needed
      const check_svara_retraction =
        PREV_CONTEXT_IN_USE &&
        to_script_data.script_type === 'brahmic' &&
        (prev_context_arr.at(-1)?.[1]?.type === 'vyanjana' ||
          (prev_context_arr.at(-2)?.[1]?.type === 'vyanjana' &&
            prev_context_arr.at(-1)?.[0] === BRAHMIC_NUQTA));

      while (true) {
        const char_to_search = text.substring(text_index, text_index + chars_to_scan + 1);
        const char_index = binarySearch(from_script_data.text_to_krama_map, char_to_search, {
          accessor: (arr, i) => arr[i][0]
        });
        if (char_index === -1) {
          text_to_krama_item = null;
          break;
        }
        const potential_match = from_script_data.text_to_krama_map[char_index];

        // When in vyanjana context, track single-svara matches for potential retraction
        if (
          check_svara_retraction &&
          potential_match[1].krama &&
          potential_match[1].krama.length >= 1
        ) {
          const krama = potential_match[1].krama;
          const krama_id = krama[0];
          const brahmic_entry = to_script_data.krama_text_arr[krama_id];
          const list_index = brahmic_entry?.[1];
          const is_single_svara =
            krama.length === 1 &&
            list_index !== null &&
            list_index !== undefined &&
            to_script_data.list[list_index]?.type === 'svara';

          if (is_single_svara) {
            // Save this as a valid retraction point
            last_valid_svara_match = potential_match;
          } else if (last_valid_svara_match !== null) {
            // Current match is NOT a single svara but we have a saved svara match
            // Retract to the last valid svara match
            text_to_krama_item = last_valid_svara_match;
            break;
          }
        }

        if (potential_match[1].next && potential_match[1].next.length > 0) {
          const nth_next_character = text[text_index + chars_to_scan + 1] as string | undefined;
          if (
            nth_next_character !== undefined &&
            potential_match[1].next.indexOf(nth_next_character) !== -1
          ) {
            chars_to_scan += 1;
            continue;
          }
        }
        text_to_krama_item = potential_match;
        break;
      }
    }
    if (text_to_krama_item !== null) {
      text_index += text_to_krama_item[0].length;
      if (text_to_krama_item[1].krama !== null && text_to_krama_item[1].krama !== undefined) {
        // as the krama index is present we can skip the Step 2 and return the result directly
        const result_text = text_to_krama_item[1].krama
          .map((krama_index) => to_script_data.krama_text_arr[krama_index][0])
          .join('');
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
                // if otherwise then follow the the first kram ref
                // This condition very well may change in the future so be careful
                return text_to_krama_item[1].krama && text_to_krama_item[1].krama.length > 0
                  ? from_script_data.list[
                      from_script_data.krama_text_arr[text_to_krama_item[1].krama[0]][1] ?? -1
                    ]
                  : null;
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
        if (!result_concat_status) result_str += result_text;
        continue;
      }
    } else {
      text_index++;
    }

    // Step 2: Search for the character in the krama_text_map
    const char_to_search = text_to_krama_item === null ? char : text_to_krama_item[0];
    const index = binarySearchWithIndex(
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
        prev_context_arr = [];
        // clear the array as an unidentified character found
      }
      result_str += char_to_search;
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
      result_str += to_script_data.krama_text_arr[index][0];
    }
  }
  if (PREV_CONTEXT_IN_USE) prev_context_cleanup_func([undefined, null]);

  return result_str;
};

/**
 * Recursively searches for the longest matching character sequence by probing krama_text_map
 * and retrieving the corresponding entry from text_to_krama_map. Returns null if no match.
 * @returns the krama index of the text if found else null
 */
// function search_in_text_to_krama_map(
//   text: string,
//   text_index: number,
//   from_script_data: OutputScriptData,
//   to_script_data: OutputScriptData,
//   context_break_condition_helper: boolean,
//   chars_scanned: number = 0
// ): OutputScriptData['text_to_krama_map'][number] | null {
//   const char_to_search = text.substring(text_index, text_index + chars_scanned + 1);
//   const char_index = binarySearch(from_script_data.text_to_krama_map, char_to_search, {
//     accessor: (arr, i) => arr[i][0]
//   });
//   if (char_index === -1) {
//     // if the character is not found, then retun null
//     return null;
//   }
//   const text_to_krama_item = from_script_data.text_to_krama_map[char_index];
//   let further_lookup_flag = true;
//   // try to reach to the last possible character following the next using recursion
//   if (further_lookup_flag && text_to_krama_item[1].next && text_to_krama_item[1].next.length > 0) {
//     const nth_next_character = text[text_index + chars_scanned + 1] as string | undefined;
//     if (
//       nth_next_character !== undefined &&
//       text_to_krama_item[1].next.indexOf(nth_next_character) !== -1
//     ) {
//       // we can return the result as we know that it exists as it is defined in `next` field
//       return search_in_text_to_krama_map(
//         text,
//         text_index,
//         from_script_data,
//         to_script_data,
//         context_break_condition_helper,
//         chars_scanned + 1
//       );
//     }
//   }
//   return text_to_krama_item;
// }
