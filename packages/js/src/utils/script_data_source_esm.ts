import type { OutputScriptData } from '../make_script_data/output_script_data_schema';
import type { script_list_type } from './lang_list';

export function fetchScriptDataPayload(
  script_name: script_list_type
): Promise<OutputScriptData> {
  return import(`../script_data/${script_name}.json`).then((m) => m.default as OutputScriptData);
}
