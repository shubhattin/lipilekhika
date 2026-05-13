import type { OutputScriptData } from '../../make_script_data/output_script_data_schema';
import type { script_list_type } from '../../utils/lang_list';
import { get_package_current_version_macro } from '../../utils/runtime_macros' with { type: 'macro' };

export async function fetchScriptDataPayload(
  script_name: script_list_type
): Promise<OutputScriptData> {
  const package_current_version = get_package_current_version_macro();
  const SCRIPT_DATA_URL = `https://cdn.jsdelivr.net/npm/lipilekhika@${package_current_version}/dist/umd_json/script_data/${script_name}.json`;
  const response = await fetch(SCRIPT_DATA_URL);
  if (!response.ok) {
    throw new Error(
      `Failed to load script data for ${script_name}: ${response.status} ${response.statusText}`
    );
  }
  return response.json() as Promise<OutputScriptData>;
}
