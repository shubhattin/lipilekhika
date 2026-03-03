import type { script_list_type } from './lang_list';
import type { OutputScriptData } from '../make_script_data/output_script_data_schema';
import {
  get_package_current_version_macro,
  get_is_umd_build_mode_macro
} from './runtime_macros' with { type: 'macro' };

const IS_UMD_BUILD_MODE = get_is_umd_build_mode_macro();

const UMD_SCRIPT_DATA_PROMISE_CACHE: Partial<Record<script_list_type, Promise<ScriptData>>> = {};

const ESM_SCRIPT_DATA_PROMISE_CACHE: Partial<Record<script_list_type, Promise<ScriptData>>> = {};

type _custom_script_chars_arr_type = OutputScriptData['custom_script_chars_arr'][number];
// type GetMapValue<M> = M extends Map<any, infer V> ? V : never;
type _text_to_krama_map_val_type =
  | OutputScriptData['text_to_krama_map'][number][1]
  | OutputScriptData['typing_text_to_krama_map'][number][1];

/** This is an addition to the `OutputScriptData` type to add a Map based lookup for some structures
 *
 * The Map can be used for faster lookup than lower bound binary search.
 *
 * O(1) lookup time instead of O(log n) for lower bound binary search. It has resulted in practical performance improvements
 */
export type ScriptData = OutputScriptData & {
  // Script Id based map key
  /** `key` - krama_text, `value` - index (in array) */
  map_krama_text_arr: Map<string, number>;
  map_text_to_krama_map: Map<string, _text_to_krama_map_val_type>;
  map_typing_text_to_krama_map: Map<string, _text_to_krama_map_val_type>;
  map_custom_script_chars_arr: Map<
    string,
    [_custom_script_chars_arr_type[1], _custom_script_chars_arr_type[2]]
  >;
};

export const get_runtime_script_data = async (
  script_data_: Promise<OutputScriptData>
): Promise<ScriptData> => {
  const script_data = await script_data_;
  // krama_text_array
  const krama_arr_cache = new Map<string, number>();
  for (let i = 0; i < script_data.krama_text_arr.length; i++) {
    const krama_key = script_data.krama_text_arr[i][0];
    if (!krama_arr_cache.has(krama_key)) krama_arr_cache.set(krama_key, i);
    // ^ to not repeat the same key and match lower bound binary search behaviour
  }

  return {
    ...script_data,
    map_krama_text_arr: krama_arr_cache,
    map_text_to_krama_map: new Map(script_data.text_to_krama_map),
    map_typing_text_to_krama_map: new Map(script_data.typing_text_to_krama_map),
    map_custom_script_chars_arr: new Map(
      script_data.custom_script_chars_arr.map((v) => [v[0], [v[1], v[2]]])
    )
    // we can parse other elements dirctly as there are no duplicates in them like
    // map_krama_text_arr
  };
};

/**
 * Gets the script data for a given script name
 * @param script_name - The name of the script to get the data for
 * @returns The script data
 */
export const getScriptData = async (script_name: script_list_type): Promise<ScriptData> => {
  if (IS_UMD_BUILD_MODE) {
    if (UMD_SCRIPT_DATA_PROMISE_CACHE[script_name]) {
      return UMD_SCRIPT_DATA_PROMISE_CACHE[script_name];
    }
    const package_current_version = get_package_current_version_macro();
    const SCRIPT_DATA_URL = `https://cdn.jsdelivr.net/npm/lipilekhika@${package_current_version}/dist/umd_json/script_data/${script_name}.json`;
    const response = await fetch(SCRIPT_DATA_URL);
    const data = response.json() as Promise<OutputScriptData>;
    const runtime_data = get_runtime_script_data(data);
    UMD_SCRIPT_DATA_PROMISE_CACHE[script_name] = runtime_data;
    return runtime_data;
  }
  if (!ESM_SCRIPT_DATA_PROMISE_CACHE[script_name]) {
    ESM_SCRIPT_DATA_PROMISE_CACHE[script_name] = get_runtime_script_data(
      import(`../script_data/${script_name}.json`).then((m) => m.default as OutputScriptData)
    );
  }
  return ESM_SCRIPT_DATA_PROMISE_CACHE[script_name]!;
};
