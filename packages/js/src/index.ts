import {
  transliterate_text,
  get_active_custom_options,
  type CustomOptionType,
  type CustomOptionList
} from './transliteration/transliterate';
import { getScriptData } from './utils/get_script_data';
import {
  getNormalizedScriptName,
  type script_input_name_type
} from './utils/lang_list/script_normalization';
import custom_options_json from './custom_options.json';

/**
 * Preloads the script data. Useful for browsers as avoids the fetch latency
 * @param name - The name of the script/language to preload
 * @returns The script data
 */
export const preloadScriptData = async (name: script_input_name_type) => {
  const normalizedName = getNormalizedScriptName(name);
  if (!normalizedName) {
    throw new Error(`Invalid script name: ${name}`);
  }
  const scriptData = await getScriptData(normalizedName);
  return scriptData;
};

export type ScriptLangType = script_input_name_type;

export async function transliterate(
  text: string,
  from: ScriptLangType,
  to: ScriptLangType,
  options?: CustomOptionType
) {
  const normalized_from = getNormalizedScriptName(from);
  if (!normalized_from) {
    throw new Error(`Invalid script name: ${from}`);
  }
  const normalized_to = getNormalizedScriptName(to);
  if (!normalized_to) {
    throw new Error(`Invalid script name: ${to}`);
  }
  if (normalized_from === normalized_to) return text;
  const result = await transliterate_text(text, normalized_from, normalized_to, options);
  return result.output;
}

/**
 * This returns the list of all supported custom options for
 * transliterations for the provided script pair
 */
export async function getAllOptions(
  from_script_name: ScriptLangType,
  to_script_name: ScriptLangType
) {
  const normalized_from = getNormalizedScriptName(from_script_name);
  if (!normalized_from) {
    throw new Error(`Invalid script name: ${from_script_name}`);
  }
  const normalized_to = getNormalizedScriptName(to_script_name);
  if (!normalized_to) {
    throw new Error(`Invalid script name: ${to_script_name}`);
  }
  const from_script_data = await getScriptData(normalized_from);
  const to_script_data = await getScriptData(normalized_to);
  return Object.keys(
    get_active_custom_options(
      from_script_data,
      to_script_data,
      Object.fromEntries(Object.keys(custom_options_json).map((key) => [key, true]))
    )
  ) as CustomOptionList[];
}
