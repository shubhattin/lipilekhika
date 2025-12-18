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
import {
  SCRIPT_LIST,
  LANG_LIST,
  ALL_LANG_SCRIPT_LIST,
  type script_list_type,
  type lang_list_type,
  type script_and_lang_list_type
} from './utils/lang_list';

export {
  /**
   * The list of all supported script names
   */
  SCRIPT_LIST,
  /**
   * The list of all supported language names which are mapped to a script
   */
  LANG_LIST,
  /** Lists of all Supported Script/Language */
  ALL_LANG_SCRIPT_LIST
};
/** Type of the script list */
export type ScriptListType = script_list_type;
/** Type of the language list */
export type LangListType = lang_list_type;
/** Type of the script and language list */
export type ScriptAndLangListType = script_and_lang_list_type;

/**
 * Preloads the script data. Useful for browsers as avoids the fetch latency
 * @param name - The name of the script/language to preload
 * @returns The script data
 * @public
 */
export const preloadScriptData = async (name: script_input_name_type) => {
  const normalizedName = getNormalizedScriptName(name);
  if (!normalizedName) {
    throw new Error(`Invalid script name: ${name}`);
  }
  const scriptData = await getScriptData(normalizedName);
  return scriptData;
};

/**
 * Supported script/language identifier types
 */
export type ScriptLangType = script_input_name_type;

/**
 * Transliterates `text` from `from` to `to`.
 * @param text - The text to transliterate
 * @param from - The script/language to transliterate from
 * @param to - The script/language to transliterate to
 * @param options - The custom options to use for the transliteration
 * @returns The transliterated text
 */
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
 * @param from_script_name - The script/language to transliterate from
 * @param to_script_name - The script/language to transliterate to
 * @returns The list of all supported custom options for the provided script pair
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

export type TransliterationOptions = CustomOptionType;

export async function emulateTyping(text: string, typing_lang: ScriptLangType) {
  const normalized_typing_lang = getNormalizedScriptName(typing_lang);
  if (!normalized_typing_lang) {
    throw new Error(`Invalid script name: ${typing_lang}`);
  }

  let result = '';
  // context variables
  let prev_input = '';
  let prev_output = '';
  for (let i = 0; i < text.length; i++) {
    prev_input += text[i];
    const { context_length, output } = await transliterate_text(
      prev_input,
      'Normal',
      normalized_typing_lang,
      {},
      true
    );
    if (context_length > 0) {
      prev_output = output;
    } else if (context_length === 0) {
      prev_input = '';
      prev_output = '';
      result += output;
    }
  }
  if (prev_output.length > 0) {
    result += prev_output;
  }
  return result;
}
