import type { script_list_type } from './lang_list';
import type { OutputScriptData } from '../make_script_data/output_script_data_schema';

/**
 * Gets the script data for a given script name
 * @param script_name - The name of the script to get the data for
 * @returns The script data
 */
export const getScriptData = async (script_name: script_list_type): Promise<OutputScriptData> => {
  const scriptData = (await import(`../script_data/${script_name}.json`))
    .default as OutputScriptData;
  return scriptData;
};
