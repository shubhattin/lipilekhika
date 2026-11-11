import custom_options_json from '../custom_options.json';
import type { CustomOptionList, CustomOptionType } from '../transliteration/transliterate';

/**
 * Checks the custom options like the Rust based bindings (WASM, N-API, Python, Dart) do: every key
 * has to be an option name and every value a boolean. An `undefined` value is taken as not set.
 * @returns the options without the `undefined` values
 */
export const validate_trans_options = (
  trans_options: CustomOptionType | undefined
): CustomOptionType | undefined => {
  if (trans_options === undefined || trans_options === null) return undefined;
  if (typeof trans_options !== 'object' || Array.isArray(trans_options))
    throw new TypeError('trans_options must be an object');
  const options: CustomOptionType = {};
  for (const [key, value] of Object.entries(trans_options)) {
    if (!Object.hasOwn(custom_options_json, key))
      throw new Error(`unknown trans_options key: ${key}`);
    if (value === undefined) continue;
    if (typeof value !== 'boolean') throw new Error('trans_options value must be a boolean');
    options[key as CustomOptionList] = value;
  }
  return options;
};
