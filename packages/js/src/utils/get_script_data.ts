import type { script_list_type } from './lang_list';
import type { OutputScriptData } from '../make_script_data/output_script_data_schema';

const scriptDataModules = import.meta.glob<{ default: OutputScriptData }>('../script_data/*.json');

/**
 * Gets the script data for a given script name
 * @param script_name - The name of the script to get the data for
 * @returns The script data
 */
export const getScriptData = async (script_name: script_list_type): Promise<OutputScriptData> => {
  const modulePath = `../script_data/${script_name}.json`;
  const loader = scriptDataModules[modulePath];
  if (!loader) {
    throw new Error(`Script data not found for: ${script_name}`);
  }
  const module = await loader();
  return module.default;
};
