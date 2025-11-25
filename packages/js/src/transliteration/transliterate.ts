import type { OutputScriptData } from '../make_script_data/output_script_data_schema';
import { binarySearch, binarySearchWithIndex } from '../utils/binary_search/binary_search';
import { getScriptData } from '../utils/get_script_data';
import type { script_list_type } from '../utils/lang_list';

export const transliterate_text = async (
  text: string,
  from_script_name: script_list_type,
  to_script_name: script_list_type
) => {
  const from_script_data = await getScriptData(from_script_name);
  const to_script_data = await getScriptData(to_script_name);

  let result_str = '';

  let text_index = 0;
  for (; text_index < text.length; ) {
    if (text[text_index] === ' ') {
      // ignore blank spaces
      result_str += ' ';
      text_index++;
      continue;
    }

    const char = text[text_index];

    // Step 1: Search for the character in the text_to_krama_map
    const text_to_krama_item = search_in_text_to_krama_map(text, text_index, from_script_data);
    if (text_to_krama_item !== null) {
      text_index += text_to_krama_item[0].length;
      if (text_to_krama_item[1].krama !== null && text_to_krama_item[1].krama !== undefined) {
        // as the krama index is present we can skip the Step 2 and return the result directly
        const result_text = text_to_krama_item[1].krama
          .map((krama_index) => to_script_data.krama_text_map[krama_index][0])
          .join('');
        result_str += result_text;
        continue;
      }
    } else {
      text_index++;
    }

    // Step 2: Search for the character in the krama_text_map
    const char_to_search = text_to_krama_item === null ? char : text_to_krama_item[0];
    const index = binarySearchWithIndex(
      from_script_data.krama_text_map,
      from_script_data.krama_text_map_index,
      char_to_search,
      {
        accessor: (arr, i) => arr[i][0]
      }
    );
    if (index === -1) {
      // text not matched so ignore and return as it is
      result_str += char_to_search;
      continue;
    }
    result_str += to_script_data.krama_text_map[index][0];
  }

  return result_str;
};

/**
 * This is a recursive function that searches the text_to_krama_map for the given text and char_index else retuns null
 * @param text The Original text to be transliterated
 * @param text_index current pointer location in the text
 * @param from_script_data script data of the from script
 * @param chars_scanned number of characters scanned so far (recursion counter)
 * @returns the krama index of the text if found else null
 */
function search_in_text_to_krama_map(
  text: string,
  text_index: number,
  from_script_data: OutputScriptData,
  chars_scanned: number = 0
): OutputScriptData['text_to_krama_map'][number] | null {
  const char_to_search = text.substring(text_index, text_index + chars_scanned + 1);
  const char_index = binarySearch(from_script_data.krama_text_map, char_to_search);
  if (char_index === -1) {
    // if the character is not found, then retun null
    return null;
  }
  const text_to_krama_item = from_script_data.text_to_krama_map[char_index];
  // try to reach to the last possible character following the next using recursion
  if (text_to_krama_item[1].next && text_to_krama_item[1].next.length > 0) {
    const nth_next_character = text[text_index + chars_scanned + 1] as string | undefined;
    if (
      nth_next_character !== undefined &&
      text_to_krama_item[1].next.indexOf(nth_next_character) !== -1
    ) {
      // we can return the result as we know that it exists as it is defined in `next` field
      return search_in_text_to_krama_map(text, text_index, from_script_data, chars_scanned + 1);
    }
  }
  return text_to_krama_item;
}
