import type { script_list_type } from '../../utils/lang_list';
import type { OutputScriptData } from '@lipilekhika/script-data/output_script_data_schema';
import { fetchScriptDataPayload } from '@lipilekhika/script-data-source';
import { CharIndexTable, single_code_point } from './char_table';

const SCRIPT_DATA_PROMISE_CACHE: Partial<Record<script_list_type, Promise<ScriptData>>> = {};

type _custom_script_chars_arr_type = OutputScriptData['custom_script_chars_arr'][number];

/** This is an addition to the `OutputScriptData` type to add a Map based lookup for some structures
 *
 * The Map can be used for faster lookup than lower bound binary search.
 *
 * O(1) lookup time instead of O(log n) for lower bound binary search. It has resulted in practical performance improvements
 *
 * Single code point keys additionally get a dense `CharIndexTable` (lookup by code point,
 * no string creation or hashing), see `char_table.ts`.
 */
export type ScriptData = OutputScriptData & {
  // Script Id based map key
  /** `key` - krama_text, `value` - index (in array) */
  map_krama_text_arr: Map<string, number>;
  /** single code point keys of `krama_text_arr` -> index (first index wins) */
  char_krama_text_arr: CharIndexTable;
  /** `key` - text, `value` - index in `text_to_krama_map` */
  map_text_to_krama_map: Map<string, number>;
  /** single code point keys of `text_to_krama_map` -> index */
  char_text_to_krama_map: CharIndexTable;
  /** `key` - text, `value` - index in `typing_text_to_krama_map` */
  map_typing_text_to_krama_map: Map<string, number>;
  /** single code point keys of `typing_text_to_krama_map` -> index */
  char_typing_text_to_krama_map: CharIndexTable;
  /** Code points of the `next` list of each `text_to_krama_map` entry (same index), `null` if empty.
   *
   * `next` entries are always single characters, so membership checks can compare numbers. */
  next_cps_text_to_krama_map: (number[] | null)[];
  /** Same as `next_cps_text_to_krama_map` but for `typing_text_to_krama_map` */
  next_cps_typing_text_to_krama_map: (number[] | null)[];
  map_custom_script_chars_arr: Map<
    string,
    [_custom_script_chars_arr_type[1], _custom_script_chars_arr_type[2]]
  >;
  /** Index in `text_to_krama_map` of a sign written as a consonant + halant (the Tamil anusvAra
   * ம்), `-1` if the script has none. Where the sign cannot be it is that consonant + halant. */
  dead_consonant_sign_index: number;
};

const dead_consonant_sign_index = (script_data: OutputScriptData): number => {
  if (script_data.script_type !== 'brahmic') return -1;
  const halant = script_data.halant;
  const type_of = (krama_index: number) =>
    script_data.list[script_data.krama_text_arr[krama_index]?.[1] ?? -1]?.type;
  return script_data.text_to_krama_map.findIndex(([text, { krama }]) => {
    if (!krama || krama.length !== 1 || type_of(krama[0]) === 'vyanjana') return false;
    if (!text.endsWith(halant)) return false;
    const consonant = text.slice(0, -halant.length);
    return (
      single_code_point(consonant) !== -1 &&
      type_of(script_data.krama_text_arr.findIndex(([t]) => t === consonant)) === 'vyanjana'
    );
  });
};

/** first index wins (to not repeat the same key and match lower bound binary search behaviour) */
const make_index_map = (keys: readonly string[]) => {
  const map = new Map<string, number>();
  for (let i = 0; i < keys.length; i++) {
    if (!map.has(keys[i])) map.set(keys[i], i);
  }
  return map;
};

const make_next_cps = (map: readonly (readonly [string, { next?: string[] | null }])[]) =>
  map.map(([, value]) => {
    const next = value.next;
    if (!next || next.length === 0) return null;
    const cps: number[] = [];
    for (const n of next) {
      const cp = single_code_point(n);
      if (cp !== -1) cps.push(cp);
    }
    return cps.length > 0 ? cps : null;
  });

const get_runtime_script_data = async (
  script_data_: Promise<OutputScriptData>
): Promise<ScriptData> => {
  const script_data = await script_data_;
  const krama_keys = script_data.krama_text_arr.map((v) => v[0]);
  const text_to_krama_keys = script_data.text_to_krama_map.map((v) => v[0]);
  const typing_text_to_krama_keys = script_data.typing_text_to_krama_map.map((v) => v[0]);

  return {
    ...script_data,
    map_krama_text_arr: make_index_map(krama_keys),
    char_krama_text_arr: CharIndexTable.from_keys(krama_keys),
    map_text_to_krama_map: make_index_map(text_to_krama_keys),
    char_text_to_krama_map: CharIndexTable.from_keys(text_to_krama_keys),
    map_typing_text_to_krama_map: make_index_map(typing_text_to_krama_keys),
    char_typing_text_to_krama_map: CharIndexTable.from_keys(typing_text_to_krama_keys),
    next_cps_text_to_krama_map: make_next_cps(script_data.text_to_krama_map),
    next_cps_typing_text_to_krama_map: make_next_cps(script_data.typing_text_to_krama_map),
    map_custom_script_chars_arr: new Map(
      script_data.custom_script_chars_arr.map((v) => [v[0], [v[1], v[2]]])
    ),
    dead_consonant_sign_index: dead_consonant_sign_index(script_data)
  };
};

/**
 * Gets the script data for a given script name
 * @param script_name - The name of the script to get the data for
 * @returns The script data
 */
export const getScriptData = async (script_name: script_list_type): Promise<ScriptData> => {
  if (!SCRIPT_DATA_PROMISE_CACHE[script_name]) {
    SCRIPT_DATA_PROMISE_CACHE[script_name] = get_runtime_script_data(
      fetchScriptDataPayload(script_name)
    ).catch((error) => {
      delete SCRIPT_DATA_PROMISE_CACHE[script_name];
      throw error;
    });
  }
  return SCRIPT_DATA_PROMISE_CACHE[script_name]!;
};
