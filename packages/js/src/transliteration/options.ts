import type { ScriptData } from '../utils/get_script_data';
import custom_options_json from '../custom_options.json';
import type {
  CustomOptionKey,
  TransOptionsType
} from '@lipilekhika/script-data/custom_options_input';

export type CustomOptionList = CustomOptionKey;
export type CustomOptionType = Partial<Record<CustomOptionList, boolean>>;

/** The rules of the enabled custom options, flattened into one list */
export type CustomRulesType = TransOptionsType[keyof TransOptionsType]['rules'];
export type CustomRule = CustomRulesType[number];

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
