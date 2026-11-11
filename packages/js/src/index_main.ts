import {
  transliterate_text,
  get_active_custom_options,
  type CustomOptionType,
  type CustomOptionList
} from './transliteration/transliterate';
import { getScriptData } from './utils/get_script_data';
import { getNormalizedScriptName } from './utils/lang_list/script_normalization';
import custom_options_json from './custom_options.json';
import { validate_trans_options } from './utils/validate_trans_options';
import { to_well_formed, validate_text } from './utils/validate_input';
import { SCRIPT_LIST, LANG_LIST, ALL_LANG_SCRIPT_LIST } from './utils/lang_list';
import type { ScriptLangType, TransliterateInput, TransliterateOutput } from './types';

export * from './types';

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
  ALL_LANG_SCRIPT_LIST,
  /** Get Normalized Script Name */
  getNormalizedScriptName
};
/**
 * Preloads the script data. Useful for browsers as avoids the fetch latency
 * @param name - The name of the script/language to preload
 * @returns The script data
 * @public
 */
export const preloadScriptData = async (name: ScriptLangType) => {
  const normalizedName = getNormalizedScriptName(name);
  if (!normalizedName) {
    throw new Error(`Invalid script name: ${String(name)}`);
  }
  const scriptData = await getScriptData(normalizedName);
  return scriptData;
};

/**
 * Transliterates `text` from `from` to `to`.
 * @param text - `string | string[]` — text to transliterate (same options for all items in an array)
 * @param from - The script/language to transliterate from
 * @param to - The script/language to transliterate to
 * @param trans_options - The custom transliteration options to use for the transliteration
 * @returns `string` or `string[]` — same shape as `text`
 */
export async function transliterate<T extends TransliterateInput>(
  text: T,
  from: ScriptLangType,
  to: ScriptLangType,
  trans_options_?: CustomOptionType
): Promise<TransliterateOutput<T>> {
  validate_text(text);
  const trans_options = validate_trans_options(trans_options_);
  const normalized_from = getNormalizedScriptName(from);
  if (!normalized_from) {
    throw new Error(`Invalid script name: ${String(from)}`);
  }
  const normalized_to = getNormalizedScriptName(to);
  if (!normalized_to) {
    throw new Error(`Invalid script name: ${String(to)}`);
  }

  if (normalized_from === normalized_to) {
    return (typeof text === 'string' ? text : [...text]) as TransliterateOutput<T>;
  }

  // a lone surrogate is read as U+FFFD, like the Rust based bindings do
  if (typeof text === 'string') {
    const result = await transliterate_text(
      to_well_formed(text),
      normalized_from,
      normalized_to,
      trans_options
    );
    return result.output as TransliterateOutput<T>;
  }

  const outputs = await Promise.all(
    text.map((piece) =>
      transliterate_text(to_well_formed(piece), normalized_from, normalized_to, trans_options).then(
        (result) => result.output
      )
    )
  );
  return outputs as TransliterateOutput<T>;
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
    throw new Error(`Invalid script name: ${String(from_script_name)}`);
  }
  const normalized_to = getNormalizedScriptName(to_script_name);
  if (!normalized_to) {
    throw new Error(`Invalid script name: ${String(to_script_name)}`);
  }
  // the text is returned as it is, no option has an effect (Hindi -> Sanskrit)
  if (normalized_from === normalized_to) return [];
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

/**
 * his returns the schwa deletion characteristic of the script provided.
 * It is the property in which a inherent vowel 'a' (अ) is added to
 * the end of vyanjana (consonant) characters.
 */
export async function getSchwaStatusForScript(
  script_name: ScriptLangType
): Promise<boolean | null> {
  const normalized_name = getNormalizedScriptName(script_name);
  if (!normalized_name) {
    throw new Error(`Invalid script name: ${String(script_name)}`);
  }
  const script_data = await getScriptData(normalized_name);
  if (script_data.script_type === 'brahmic') {
    return script_data.schwa_property;
  } else {
    return null;
  }
}
