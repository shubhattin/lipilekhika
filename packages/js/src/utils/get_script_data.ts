import type { script_list_type } from './lang_list';
import type { OutputScriptData } from '../make_script_data/output_script_data_schema';
import {
  get_package_current_version_macro,
  get_is_umd_build_mode_macro
} from './runtime_macros' with { type: 'macro' };

const IS_UMD_BUILD_MODE = get_is_umd_build_mode_macro();

const UMD_SCRIPT_DATA_PROMISE_CACHE: {
  [script_name in script_list_type]?: Promise<OutputScriptData>;
} = {};

const ESM_SCRIPT_DATA_PROMISE_CACHE: {
  [script_name in script_list_type]?: Promise<OutputScriptData>;
} = {};

/**
 * Gets the script data for a given script name
 * @param script_name - The name of the script to get the data for
 * @returns The script data
 */
export const getScriptData = async (script_name: script_list_type): Promise<OutputScriptData> => {
  if (IS_UMD_BUILD_MODE) {
    if (UMD_SCRIPT_DATA_PROMISE_CACHE[script_name]) {
      return UMD_SCRIPT_DATA_PROMISE_CACHE[script_name];
    }
    const package_current_version = get_package_current_version_macro();
    const SCRIPT_DATA_URL = `https://cdn.jsdelivr.net/npm/lipilekhika@${package_current_version}/dist/umd_json/script_data/${script_name}.json`;
    const response = await fetch(SCRIPT_DATA_URL);
    const data = response.json() as Promise<OutputScriptData>;
    UMD_SCRIPT_DATA_PROMISE_CACHE[script_name] = data;
    return data;
  }
  if (!ESM_SCRIPT_DATA_PROMISE_CACHE[script_name]) {
    ESM_SCRIPT_DATA_PROMISE_CACHE[script_name] = import(`../script_data/${script_name}.json`).then(
      (m) => m.default as OutputScriptData
    );
  }
  return ESM_SCRIPT_DATA_PROMISE_CACHE[script_name]!;
};
