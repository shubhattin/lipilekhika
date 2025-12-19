import type { script_list_type } from './lang_list';
import type { OutputScriptData } from '../make_script_data/output_script_data_schema';
import {
  get_package_current_version_macro,
  get_is_umd_build_mode_macro
} from './runtime_macros' with { type: 'macro' };

const IS_UMD_BUILD_MODE = get_is_umd_build_mode_macro();

/**
 * Gets the script data for a given script name
 * @param script_name - The name of the script to get the data for
 * @returns The script data
 */
export const getScriptData = async (script_name: script_list_type): Promise<OutputScriptData> => {
  // @ts-ignore
  if (IS_UMD_BUILD_MODE) {
    const package_current_version = get_package_current_version_macro();
    const SCRIPT_DATA_URL = `https://cdn.jsdelivr.net/npm/lipilekhika@${package_current_version}/dist/umd_json/script_data/${script_name}.json`;
    const response = await fetch(SCRIPT_DATA_URL);
    const data = await response.json();
    return data as OutputScriptData;
  }
  const scriptData = (await import(`../script_data/${script_name}.json`))
    .default as OutputScriptData;
  return scriptData;
};
