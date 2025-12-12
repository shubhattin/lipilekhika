import { transliterate_text, type CustomOptionType } from './transliteration/transliterate';
import { getScriptData } from './utils/get_script_data';
import {
  getNormalizedScriptName,
  type script_input_name_type
} from './utils/lang_list/script_normalization';

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
  const result = await transliterate_text(text, normalized_from, normalized_to, options);
  return result.output;
}
