import { getScriptData } from '../utils/get_script_data';
import type { script_list_type } from '../utils/lang_list';

export const transliterate = async (
  text: string,
  from_script_name: script_list_type,
  to_script_name: script_list_type
) => {
  const from_script_data = await getScriptData(from_script_name);
  const to_script_data = await getScriptData(to_script_name);
  return text;
};
