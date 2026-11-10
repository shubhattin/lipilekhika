// Run this from the root of the js project using `vite-node`
import * as fs from 'node:fs';
import path from 'node:path';
import { argv } from 'node:process';
import type { InputScriptInfoType } from './input_script_data_schema';
import type {
  ExpandedScriptData,
  KramaType,
  OutputScriptData,
  SharedScriptData
} from './output_script_data_schema';
import {
  KramaKeysArray,
  KramaLabelsArray,
  kramaKeyIndex,
  kramaLabelIndex,
  resolveKramaKeysExtendedType,
  type KramaKeysExtendedType,
  type KramaKeysType
} from './krama_array_keys';
import chalk from 'chalk';
import { deepCopy, toUnicodeEscapes } from '../tools/kry';
import { execSync } from 'child_process';
import { BMP_CODE_LAST_INDEX, LEAD_SURROGATE_RANGE } from '../utils/non_bmp';
import { type TransOptionsType, CustomOptionsInput } from './custom_options_input';
import { ALTERNATE_TO_SCRIPT_MAP } from '../utils/lang_list/script_normalization';
import { compare_text, expand_script_data } from '../utils/get_script_data/expand_script_data';
import { single_code_point } from '../utils/get_script_data/char_table';
import {
  lang_list_obj,
  script_list_obj,
  LANG_SCRIPT_MAP,
  SCRIPT_LIST,
  LANG_LIST,
  ALL_LANG_SCRIPT_LIST
} from '../utils/lang_list';

const IS_DEV_MODE = argv.at(-1) === '--dev';
const OUT_FOLDER = path.resolve('./src/script_data');
const SHARED_OUT_FILE = path.resolve('./src/shared_script_data.json');
const CUSTOM_OPTIONS_OUT_FOLDER = path.resolve('./src/custom_options.json');

/** The data of each script in the shape the runtimes work on, as expanded from the stored data
 * (filled by `make_script_data`). Rust and Go are generated from it. */
const EXPANDED_SCRIPT_DATA = new Map<string, ExpandedScriptData>();

async function make_script_data() {
  // reset output folder
  if (fs.existsSync(OUT_FOLDER)) fs.rmSync(OUT_FOLDER, { recursive: true });
  fs.mkdirSync(OUT_FOLDER, { recursive: true });

  // Load all script data files from input_data directory
  const inputDataDir = path.resolve('./src/make_script_data/input_data');
  const files = fs
    .readdirSync(inputDataDir)
    .filter((file) => file.endsWith('.ts') && !file.startsWith('_'));
  const script_data_list: InputScriptInfoType[] = [];
  for (const file of files) {
    const filePath = path.resolve(inputDataDir, file);
    const module = await import(filePath);
    script_data_list.push(module.default);
  }
  // precalculating normal output data as will be needed for typing data of other scripts
  const NormalInputData = script_data_list.find((item) => item.script_name === 'Normal');
  const NormalCompiledData = get_out_script_data(NormalInputData!);
  const compiled_list: ExpandedScriptData[] = [NormalCompiledData];
  for (const input_script_data of script_data_list) {
    if (input_script_data.script_name === 'Normal') continue;
    compiled_list.push(get_out_script_data(input_script_data, NormalCompiledData));
  }
  // a fixed order, so that the shared data does not depend on the order of the directory listing
  compiled_list.sort((a, b) => compare_text(a.script_name, b.script_name));

  const to_json = (data: unknown) =>
    JSON.stringify(data, null, 2).replace(/\\\\u([0-9a-fA-F]{4})/g, '\\u$1');

  const shared_script_data = make_shared_script_data(compiled_list);
  fs.writeFileSync(SHARED_OUT_FILE, to_json(shared_script_data));
  for (const compiled of compiled_list) {
    const stored = compact_script_data(compiled, shared_script_data);
    // expanded from what is written (after a JSON round trip), like the runtimes do
    const expanded = expand_script_data(
      JSON.parse(JSON.stringify(stored)),
      JSON.parse(JSON.stringify(shared_script_data))
    );
    assert_same_script_data(compiled, expanded);
    EXPANDED_SCRIPT_DATA.set(compiled.script_name, expanded);
    fs.writeFileSync(
      path.resolve(OUT_FOLDER, `${compiled.script_name}.json`),
      to_json(IS_DEV_MODE ? add_dev_info(stored, compiled) : stored)
    );
  }
}

type ExpandedValue = ExpandedScriptData['typing_text_to_krama_map'][number][1];
type StoredValue = SharedScriptData['typing_text_to_krama_map'][number][1] &
  OutputScriptData['text_to_krama_map'][number][1];

/** Type of each krama index of the script */
function get_krama_types(data: ExpandedScriptData): (KramaType | null)[] {
  return data.krama_text_arr.map(([, list_ref]) =>
    list_ref === null ? null : (data.list[list_ref]?.type ?? null)
  );
}

/** The value which occurs the most (the first one seen, if more than one does) */
function most_common<T>(values: T[]): { value: T; count: number } {
  const counts = new Map<string, { value: T; count: number }>();
  for (const value of values) {
    const key = JSON.stringify(value);
    const item = counts.get(key);
    if (item) item.count++;
    else counts.set(key, { value, count: 1 });
  }
  let best: { value: T; count: number } | undefined;
  for (const item of counts.values()) if (!best || item.count > best.count) best = item;
  return best!;
}

/** A map value as it is stored: the reference to a `list` item is stored as the type itself */
function to_stored_value(data: ExpandedScriptData, value: ExpandedValue): StoredValue {
  const stored: StoredValue = {};
  if (value.next !== null && value.next !== undefined) stored.next = value.next;
  if (value.krama !== null && value.krama !== undefined) stored.krama = value.krama;
  if (value.custom_back_ref !== null && value.custom_back_ref !== undefined)
    stored.custom_back_ref = value.custom_back_ref;
  if (value.fallback_list_ref !== null && value.fallback_list_ref !== undefined) {
    const list_item = data.list[value.fallback_list_ref];
    if (!list_item)
      throw new Error(`"${data.script_name}": list item ${value.fallback_list_ref} not found`);
    stored.type = list_item.type;
    if (list_item.type === 'svara') stored.mAtrA_krama = list_item.mAtrA_krama_ref[0] ?? -1;
  }
  return stored;
}

/**
 * The data which is stored once for all the scripts: the type of each krama index (the same
 * in every brahmic script) and the typing map entries which most scripts have in common.
 */
function make_shared_script_data(compiled_list: ExpandedScriptData[]): SharedScriptData {
  const brahmic_krama_types = compiled_list
    .filter((data) => data.script_type === 'brahmic')
    .map(get_krama_types);
  const krama_type_arr = KramaKeysArray.map(
    (_, i) => most_common(brahmic_krama_types.map((types) => types[i])).value
  );

  // An entry is shared if more scripts have it (with that value) than have to remove it
  const typing_script_list = compiled_list.filter(
    (data) => data.typing_text_to_krama_map.length > 0
  );
  const values_of_text = new Map<string, StoredValue[]>();
  for (const data of typing_script_list) {
    for (const [text, value] of data.typing_text_to_krama_map) {
      const values = values_of_text.get(text) ?? [];
      values.push(to_stored_value(data, value));
      values_of_text.set(text, values);
    }
  }
  const typing_text_to_krama_map: SharedScriptData['typing_text_to_krama_map'] = [];
  for (const [text, values] of values_of_text) {
    const { value, count } = most_common(values);
    const scripts_without_it = typing_script_list.length - values.length;
    if (count >= 2 && count > scripts_without_it) typing_text_to_krama_map.push([text, value]);
  }
  return { krama_type_arr, typing_text_to_krama_map: sortByText(typing_text_to_krama_map) };
}

/**
 * Index in `text_to_krama_map` of a sign written as a consonant + halant (the Tamil anusvAra
 * ம்), `-1` if the script has none. Where the sign cannot be it is that consonant + halant.
 */
function get_dead_consonant_sign_index(script_data: ExpandedScriptData): number {
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
}

/**
 * The data of a script as it is stored (`src/script_data/<script>.json`): only what is not
 * already in the shared data. `expand_script_data` gives back the compiled shape.
 */
function compact_script_data(data: ExpandedScriptData, shared: SharedScriptData): OutputScriptData {
  const krama_types = get_krama_types(data);
  const krama_text_arr = data.krama_text_arr.map(([text]) => text);
  const text_to_krama_map: OutputScriptData['text_to_krama_map'] = data.text_to_krama_map.map(
    ([text, value]) => [text, to_stored_value(data, value)]
  );

  // typing map: only the difference from the shared one
  let typing_text_to_krama_map: OutputScriptData['typing_text_to_krama_map'];
  if (data.typing_text_to_krama_map.length > 0) {
    const shared_values = new Map(
      shared.typing_text_to_krama_map.map(([text, value]) => [text, JSON.stringify(value)])
    );
    const texts = new Set<string>();
    typing_text_to_krama_map = [];
    for (const [text, value] of data.typing_text_to_krama_map) {
      texts.add(text);
      const stored_value = to_stored_value(data, value);
      if (shared_values.get(text) !== JSON.stringify(stored_value))
        typing_text_to_krama_map.push([text, stored_value]);
    }
    for (const text of shared_values.keys())
      if (!texts.has(text)) typing_text_to_krama_map.push([text, null]);
    typing_text_to_krama_map = sortByText(typing_text_to_krama_map);
  }

  const custom_script_chars_arr: OutputScriptData['custom_script_chars_arr'] =
    data.custom_script_chars_arr.map(([text, list_ref, custom_ref]) => {
      const type = list_ref === null ? null : (data.list[list_ref]?.type ?? null);
      if (type === 'svara')
        throw new Error(`"${data.script_name}": a custom script character cannot be a svara`);
      return [
        text,
        type,
        custom_ref === null ? null : (data.typing_text_to_krama_map[custom_ref]?.[0] ?? null)
      ];
    });

  if (data.script_type !== 'brahmic') {
    if (krama_types.some((type) => type !== null))
      throw new Error(`"${data.script_name}": krama types are only stored for brahmic scripts`);
    return {
      script_type: 'other',
      script_name: data.script_name,
      script_id: data.script_id,
      schwa_character: data.schwa_character,
      krama_text_arr,
      text_to_krama_map,
      ...(typing_text_to_krama_map ? { typing_text_to_krama_map } : {}),
      custom_script_chars_arr
    };
  }

  const krama_type_overrides: [number, KramaType | null][] = [];
  const svara_mAtrA_krama_overrides: [number, number][] = [];
  for (let i = 0; i < krama_types.length; i++) {
    if (krama_types[i] !== shared.krama_type_arr[i]) krama_type_overrides.push([i, krama_types[i]]);
    const list_item = data.list[data.krama_text_arr[i][1] ?? -1];
    if (list_item?.type !== 'svara') continue;
    // The mAtrA of a svara is the next krama index. Only its text is read, so it is listed
    // only if the text is not the same.
    const mAtrA_krama = list_item.mAtrA_krama_ref[0] ?? -1;
    if (mAtrA_krama !== i + 1 && krama_text_arr[mAtrA_krama] !== krama_text_arr[i + 1])
      svara_mAtrA_krama_overrides.push([i, mAtrA_krama]);
  }
  const dead_consonant_sign_index = get_dead_consonant_sign_index(data);
  return {
    script_type: 'brahmic',
    script_name: data.script_name,
    script_id: data.script_id,
    halant: data.halant,
    ...(data.nuqta === undefined ? {} : { nuqta: data.nuqta }),
    schwa_property: data.schwa_property,
    krama_text_arr,
    ...(krama_type_overrides.length > 0 ? { krama_type_overrides } : {}),
    ...(svara_mAtrA_krama_overrides.length > 0 ? { svara_mAtrA_krama_overrides } : {}),
    text_to_krama_map,
    ...(dead_consonant_sign_index !== -1 ? { dead_consonant_sign_index } : {}),
    ...(typing_text_to_krama_map ? { typing_text_to_krama_map } : {}),
    custom_script_chars_arr
  };
}

/**
 * What the runtimes read from the data of a script. The `list` is only read for the type of an
 * entry and for the text of the mAtrA of a svara, its items and their order do not matter.
 */
function get_read_view(data: ExpandedScriptData) {
  const type_of = (list_ref: number | null | undefined) =>
    list_ref === null || list_ref === undefined ? null : (data.list[list_ref]?.type ?? null);
  const value_view = (value: ExpandedValue) => {
    const list_item = data.list[value.fallback_list_ref ?? -1];
    return [
      value.next ?? null,
      value.krama ?? null,
      value.custom_back_ref ?? null,
      list_item
        ? list_item.type === 'svara'
          ? [list_item.type, list_item.mAtrA_krama_ref[0] ?? -1]
          : [list_item.type]
        : null
    ];
  };
  return {
    script: [
      data.script_type,
      data.script_name,
      data.script_id,
      data.script_type === 'brahmic'
        ? [data.halant, data.nuqta ?? null, data.schwa_property]
        : [data.schwa_character]
    ],
    krama_text_arr: data.krama_text_arr.map(([text, list_ref]) => {
      const list_item = data.list[list_ref ?? -1];
      return [
        text,
        list_item?.type ?? null,
        list_item?.type === 'svara'
          ? (data.krama_text_arr[list_item.mAtrA_krama_ref[0] ?? -1]?.[0] ?? null)
          : null
      ];
    }),
    text_to_krama_map: data.text_to_krama_map.map(([text, value]) => [text, value_view(value)]),
    typing_text_to_krama_map: data.typing_text_to_krama_map.map(([text, value]) => [
      text,
      value_view(value)
    ]),
    custom_script_chars_arr: data.custom_script_chars_arr.map(([text, list_ref, custom_ref]) => [
      text,
      type_of(list_ref),
      custom_ref
    ])
  };
}

/** Throws if the data expanded from what is stored is not read like the compiled data */
function assert_same_script_data(compiled: ExpandedScriptData, expanded: ExpandedScriptData) {
  const compiled_view = get_read_view(compiled);
  const expanded_view = get_read_view(expanded);
  for (const key of Object.keys(compiled_view) as (keyof typeof compiled_view)[]) {
    const compiled_items: unknown[] = compiled_view[key];
    const expanded_items: unknown[] = expanded_view[key];
    for (let i = 0; i < Math.max(compiled_items.length, expanded_items.length); i++) {
      const compiled_item = JSON.stringify(compiled_items[i]);
      const expanded_item = JSON.stringify(expanded_items[i]);
      if (compiled_item !== expanded_item)
        throw new Error(
          `"${compiled.script_name}": the stored data does not give back ${key}[${i}]\n` +
            `  compiled: ${compiled_item}\n  expanded: ${expanded_item}`
        );
    }
  }
}

/** Dev mode: the krama key, the type and the unicode escapes next to the texts, for easy
 * comparision and verification (these fields are not in the schema) */
function add_dev_info(stored: OutputScriptData, compiled: ExpandedScriptData) {
  const krama_types = get_krama_types(compiled);
  return {
    ...stored,
    text_to_krama_map: stored.text_to_krama_map.map(([text, value]) => [
      text,
      { ...value, uni: toUnicodeEscapes(text) }
    ]),
    krama_text_arr_dev: stored.krama_text_arr.map((text, i) => [
      i,
      KramaKeysArray[i],
      text,
      toUnicodeEscapes(text),
      krama_types[i]
    ])
  };
}

/** Stable sort (new array) by the text at index `0`, using UTF-16 code unit order */
function sortByText<T extends readonly [string, ...unknown[]]>(arr: readonly T[]): T[] {
  return [...arr].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
}

/**
 * Krama of an intermediate typing prefix (not a Normal text itself) for an `other` script.
 * Runs of letters are split greedily (longest first) into Normal texts, `aiI` -> `ai` + `I`
 * (for a text listed more than once the first krama index wins, as in `kramaKeyIndex`).
 * Other characters, like the `.` of the standalone mAtrA keys (`.ai`, `.L`), are only part
 * of the key and are left out. Returns `null` if a run of letters cannot be split.
 */
function other_script_typing_prefix_krama(
  text: string,
  normal_krama_text_arr: ExpandedScriptData['krama_text_arr']
): number[] | null {
  const krama: number[] = [];
  for (const [letters] of text.matchAll(/[a-zA-Z]+/g)) {
    let start = 0;
    while (start < letters.length) {
      let end = letters.length;
      let found = -1;
      while (end > start) {
        const piece = letters.substring(start, end);
        found = normal_krama_text_arr.findIndex((item) => item[0] === piece);
        if (found !== -1) break;
        end--;
      }
      if (found === -1) return null;
      krama.push(found);
      start = end;
    }
  }
  return krama.length > 0 ? krama : null;
}

function get_out_script_data(
  input_script_data: InputScriptInfoType,
  NormalOutputData?: ExpandedScriptData
) {
  let res: ExpandedScriptData;
  if (input_script_data.script_type === 'brahmic') {
    res = {
      script_type: 'brahmic',
      script_name: input_script_data.script_name,
      script_id: input_script_data.script_id,
      halant: input_script_data.halant,
      nuqta: input_script_data.nuqta ?? undefined,
      schwa_property: input_script_data.schwa_property,
      text_to_krama_map: [],
      list: [],
      krama_text_arr: [],
      typing_text_to_krama_map: [],
      custom_script_chars_arr: []
    };
  } else {
    res = {
      script_type: 'other',
      script_name: input_script_data.script_name,
      script_id: input_script_data.script_id,
      schwa_character: input_script_data.schwa_character,
      text_to_krama_map: [],
      list: [],
      krama_text_arr: [],
      typing_text_to_krama_map: [],
      custom_script_chars_arr: []
    };
  }
  // initialize krama key map as an empty starting array
  res.krama_text_arr = Array.from({ length: KramaKeysArray.length }, () => ['', null]);

  // prefill the text_to_krama_map with the manual_krama_text_map
  // as it has a lower precedence

  function add_to_text_to_krama_map(
    text: string,
    val: number[],
    fallback_list_ref?: number | null,
    add_in: 'text_to_krama_map' | 'typing_text_to_krama_map' = 'text_to_krama_map'
  ) {
    const add_in_map =
      add_in === 'text_to_krama_map' ? res.text_to_krama_map : res.typing_text_to_krama_map;
    // if (input_script_data.script_name === 'Siddham' && text.length === 2) {
    //   console.log(text, text.split(''), val, fallback_list_ref);
    // }
    // step by step create entries for the text mapping
    for (let i = 0; i < text.length; i++) {
      const codePoint = text.codePointAt(i);
      const char = codePoint !== undefined ? String.fromCodePoint(codePoint) : '';
      if (char.length > 1) i++;
      const text_char = text.substring(0, i + 1); // from start to the current index
      const next_codePoint = text.codePointAt(i + 1);
      const next_char =
        next_codePoint !== undefined ? String.fromCodePoint(next_codePoint) : undefined;
      const existing_entry_index = add_in_map.findIndex((item) => item[0] === text_char);
      // if next_char is surroage lead then ignore it
      if (
        next_codePoint !== undefined &&
        next_codePoint >= LEAD_SURROGATE_RANGE[0] &&
        next_codePoint <= LEAD_SURROGATE_RANGE[1]
      ) {
        i++;
        continue;
      }
      if (existing_entry_index !== -1) {
        const current_next = add_in_map[existing_entry_index][1].next;
        if (next_char)
          add_in_map[existing_entry_index][1].next =
            current_next !== null && current_next !== undefined
              ? current_next.indexOf(next_char) === -1
                ? // if the next char is not in the current next, then add it to the current next
                  // else ignore it
                  [...current_next, next_char]
                : current_next
              : [next_char];
        // mapping the krama index
        if (i === text.length - 1) {
          if (
            !(
              (add_in_map[existing_entry_index][1].krama?.length ?? 0) >= 1 &&
              !(add_in_map[existing_entry_index][1].krama ?? []).some((v) => v === -1) &&
              val.some((v) => v === -1)
              // custom fix to prevent resetting of C to -1 (in Normal) when a valid link exists for C
            )
          ) {
            add_in_map[existing_entry_index][1].krama = val;
          }
          if (
            fallback_list_ref !== undefined &&
            fallback_list_ref !== null &&
            add_in === 'text_to_krama_map'
          )
            add_in_map[existing_entry_index][1].fallback_list_ref = fallback_list_ref;
        }
        continue;
      }
      const new_addition: ExpandedScriptData['text_to_krama_map'][number] = [text_char, {}];
      if (next_char) new_addition[1].next = [next_char];
      if (add_in === 'typing_text_to_krama_map' && i !== text.length - 1) {
        const krama_key_index = NormalOutputData?.krama_text_arr.findIndex(
          (item) => item[0] === text_char
        );
        // In `other` scripts the a-mAtrA, which the per character fallback below resolves
        // unknown characters to, has a visible text (`a` in Romanized): `aiI` was typed as
        // `aaa`, `.L` as `aḷ`. (In brahmic scripts it is empty and the typing relies on it.)
        const other_script_krama =
          res.script_type === 'other' &&
          NormalOutputData !== undefined &&
          (krama_key_index === undefined || krama_key_index === -1)
            ? other_script_typing_prefix_krama(text_char, NormalOutputData.krama_text_arr)
            : null;
        if (
          krama_key_index !== undefined &&
          krama_key_index !== null &&
          krama_key_index !== null &&
          krama_key_index !== -1
        )
          new_addition[1].krama = [krama_key_index];
        else if (other_script_krama !== null) new_addition[1].krama = other_script_krama;
        else {
          // calculate index for individual characters
          const krama_key_index_list = text_char.split('').map((char) => {
            // A char that is neither a krama key nor a label (eg `.` or `a` in `.a`) resolves
            // to `undefined`. The earlier binary search treated `undefined` as equal to every
            // key and so landed on the smallest one, `''` (a-mAtrA, empty output). Kept as is
            // so that the generated typing data does not change.
            const resolved = resolveKramaKeysExtendedType(char as KramaKeysExtendedType) as
              | KramaKeysType
              | undefined;
            return kramaKeyIndex(resolved ?? '');
          });
          new_addition[1].krama = krama_key_index_list;
        }
      }
      add_in_map.push(new_addition);
      // mapping the krama index
      if (i === text.length - 1) {
        add_in_map[add_in_map.length - 1][1].krama = val;
        if (
          fallback_list_ref !== undefined &&
          fallback_list_ref !== null &&
          add_in === 'text_to_krama_map'
        )
          add_in_map[add_in_map.length - 1][1].fallback_list_ref = fallback_list_ref;
      }
    }
  }
  // Part 1: Prefill the krama_text_map using the manual_krama_text_map
  for (const krama_key in input_script_data.manual_krama_text_map ?? {}) {
    const value = input_script_data.manual_krama_text_map![krama_key as KramaKeysType];
    const krama_key_index = kramaKeyIndex(
      resolveKramaKeysExtendedType(krama_key as KramaKeysExtendedType)
    );
    if (value === undefined || value === null || krama_key_index === -1) continue;
    res.krama_text_arr[krama_key_index] = [value, null];
    // skip if the value is already there (like due to repetition)
    if (res.krama_text_arr.findIndex((item) => item[0] === value) === -1) {
      add_to_text_to_krama_map(value, [krama_key_index]);
    }
  }

  // Scan for multiple same text attributes in the list
  if (input_script_data.list && input_script_data.list.length > 0) {
    const duplicateIndexMap = new Map<string, number[]>();
    input_script_data.list.forEach((item, index) => {
      if (!item.text) return;
      const indexes = duplicateIndexMap.get(item.text) ?? [];
      indexes.push(index);
      duplicateIndexMap.set(item.text, indexes);
    });
    for (const [text, indexes] of duplicateIndexMap.entries()) {
      if (indexes.length > 1) {
        console.warn(
          chalk.yellow(
            `⚠️  Duplicate list entries for script "${input_script_data.script_name}" found at indices [${indexes.join(
              ', '
            )}] with text "${text}"`
          )
        );
      }
    }
  }
  for (const item of input_script_data.list ?? []) {
    // Part 2: Start scanning the list to fill krama_key_map and key_to_krama_map
    // Brahmic Scripts Referencing back Portion
    // only reference back only if svara or vyanjana (even if a fallback type) as else not needed
    const key_to_reference_back_list =
      item.type === 'svara' || item.type === 'vyanjana' ? res.list.length : null;
    if (
      res.script_type === 'brahmic' &&
      key_to_reference_back_list !== null &&
      key_to_reference_back_list !== undefined &&
      item.type !== undefined
    ) {
      const krama_key_list = item.text_krama;
      const krama_key_list_index_list = krama_key_list.map((krama_key) =>
        kramaKeyIndex(resolveKramaKeysExtendedType(krama_key as KramaKeysExtendedType))
      );
      // @ts-expect-error the `mAtrA_krama_ref` of a svara is set just below
      res.list.push({
        krama_ref: krama_key_list_index_list,
        type: item.type
      });
      krama_key_list_index_list.forEach((krama_key_index) => {
        // link entries in the krama map to the list
        if (krama_key_index !== -1) {
          res.krama_text_arr[krama_key_index] = [item.text, key_to_reference_back_list];
        }
      });
      if (item.type === 'svara') {
        // handling svara references
        const mAtrA_krama_ref_index_list = item.mAtrA_text_krama.map((mAtrA_text_krama) =>
          kramaKeyIndex(resolveKramaKeysExtendedType(mAtrA_text_krama as KramaKeysExtendedType))
        );
        res.list.push({
          krama_ref: mAtrA_krama_ref_index_list,
          type: 'mAtrA'
        });
        if (res.list[key_to_reference_back_list].type === 'svara') {
          res.list[key_to_reference_back_list].mAtrA_krama_ref = mAtrA_krama_ref_index_list;
        }
        mAtrA_krama_ref_index_list.forEach((mAtrA_krama_ref_index) => {
          if (mAtrA_krama_ref_index !== -1) {
            res.krama_text_arr[mAtrA_krama_ref_index] = [item.mAtrA, res.list.length - 1];
          }
        });
      }
    }

    // Part 3: Duplicate Resolution
    // add check duplicate portion
    // if there are multiple key_krama or mAtrA_key_krama references for duplicate
    // which is rare and should not occur but if it does, then it just
    // refers to the first key_krama or mAtrA_key_krama as all of those will be the same
    if (item.duplicates) {
      for (const duplicate_text of item.duplicates) {
        const krama_key_index = kramaKeyIndex(
          resolveKramaKeysExtendedType(item.text_krama[0] as KramaKeysExtendedType)
        );
        if (krama_key_index !== -1) {
          add_to_text_to_krama_map(duplicate_text, [krama_key_index]);
        }
      }
    }
    if (item.halant_duplicates) {
      const krama_key_index = kramaKeyIndex(
        resolveKramaKeysExtendedType(item.text_krama[0] as KramaKeysExtendedType)
      );
      const halant_index = kramaLabelIndex('halant');
      if (krama_key_index !== -1 && halant_index !== -1) {
        const halant_text = res.script_type === 'brahmic' ? res.halant : '';
        for (const halant_duplicate_text of item.halant_duplicates) {
          add_to_text_to_krama_map(halant_duplicate_text, [krama_key_index, halant_index]);
          // a halant written after it is part of it, not a second one (ൻ്റ is the usual way to
          // write ന്റ)
          if (halant_text)
            add_to_text_to_krama_map(halant_duplicate_text + halant_text, [
              krama_key_index,
              halant_index
            ]);
        }
      }
    }
    if (item.type === 'svara' && item.mAtrA_duplicates) {
      for (const mAtrA_duplicate_text of item.mAtrA_duplicates) {
        const krama_key_index = kramaKeyIndex(
          resolveKramaKeysExtendedType(item.mAtrA_text_krama[0] as KramaKeysExtendedType)
        );
        if (krama_key_index !== -1) {
          add_to_text_to_krama_map(mAtrA_duplicate_text, [krama_key_index]);
        }
      }
    }

    // Part 4: Fallback Resolution
    // add fallback portion
    if (item.fallback && item.text_krama.length === 0) {
      const fallback_key_kram_index_list = item.fallback.map((fallback_key) =>
        kramaKeyIndex(resolveKramaKeysExtendedType(fallback_key as KramaKeysExtendedType))
      );
      add_to_text_to_krama_map(item.text, fallback_key_kram_index_list, key_to_reference_back_list);
    }
  }

  // Scan the krama_text_map for keys which are two characters+
  for (let i = 0; i < res.krama_text_arr.length; i++) {
    const text_krama_item = res.krama_text_arr[i];
    const text = text_krama_item[0];
    // search for the list item using the text key
    const list_item = input_script_data.list?.find(
      (item) => item.text === text || (item.type === 'svara' && item.mAtrA === text)
    );
    if (
      text.length > 1 &&
      // if the list item exists and prevent_auto_matching is not true, then skip
      !(list_item?.prevent_auto_matching === true)
      // expression reduced using boolean algebra
    ) {
      // interate from start to before the final chactacter of the text
      for (let j = 0; j < text.length - 1; j++) {
        const text_char = text.substring(0, j + 1);
        const krama_key_references = (() => {
          const arr: number[] = [];
          for (const char_code_point of text_char) {
            // accessing non-bmp chars via this method does not resolve into surrogate pairs
            arr.push(res.krama_text_arr.findIndex((item) => item[0] === char_code_point));
          }
          return arr;
        })();
        // if the not text_char is not present then add

        // check if the character has a single krama reference, then it means we dont have to assign krama reference for all individual characters
        // like in Romanized : for r̥ is to R but when RR is messes up r̥
        const existsing_text_map_item = res.text_to_krama_map.find((item) => item[0] === text_char);
        if (
          existsing_text_map_item &&
          existsing_text_map_item[1].krama &&
          existsing_text_map_item[1].krama.length === 1 &&
          krama_key_references.length > 1
        ) {
          continue;
        }
        add_to_text_to_krama_map(text_char, krama_key_references);
      }
      const existsing_text_map_item = res.text_to_krama_map.find((item) => item[0] === text);
      // final character addition
      if (!existsing_text_map_item) add_to_text_to_krama_map(text, [i]);
    }
  }

  // Canonically equivalent forms (Unicode NFD / NFC) of a text are read like it. A keyboard or
  // font may store a two-part vowel sign as its parts (Malayalam ൊ as െ + ാ, Tamil ஔ as ஒ + ௗ),
  // NFC keeps some letters decomposed (Gurumukhi ਸ਼ as ਸ + ਼, it is excluded from composition)
  // and NFD splits every Romanized letter with a diacritic (ā as a + U+0304). Only read: the
  // output keeps the script's own form, and a text that already has a mapping keeps it.
  {
    /** text -> its krama entry, the texts that are read */
    const readable = new Map<string, { krama: number[]; fallback_list_ref?: number | null }>();
    for (let i = 0; i < res.krama_text_arr.length; i++) {
      const text = res.krama_text_arr[i][0];
      // the first index wins, like in the runtimes
      if (text && !readable.has(text)) readable.set(text, { krama: [i] });
    }
    for (const [text, value] of res.text_to_krama_map) {
      if (!value.krama?.length || value.krama.includes(-1)) continue;
      readable.set(text, { krama: value.krama, fallback_list_ref: value.fallback_list_ref });
    }
    const variants = new Map<string, { krama: number[]; fallback_list_ref?: number | null }>();
    for (const [text, value] of readable) {
      for (const form of ['NFD', 'NFC'] as const) {
        const variant = text.normalize(form);
        if (variant !== text && !readable.has(variant) && !variants.has(variant))
          variants.set(variant, value);
      }
    }
    for (const [variant, value] of variants) {
      // The matcher does not back out of a longer prefix, a prefix (of two or more code points)
      // that is not read by itself would be emitted as it is. So a variant is only added when
      // each of its prefixes is read: the NFD of Romanized āūṁ (ॐ) would need a◌̄u and a◌̄u◌̄m,
      // it is read letter by letter as आऊं.
      const code_points = [...variant];
      let prefixes_read = true;
      for (let j = 2; j < code_points.length; j++) {
        const prefix = code_points.slice(0, j).join('');
        if (!readable.has(prefix) && !variants.has(prefix)) {
          prefixes_read = false;
          break;
        }
      }
      if (prefixes_read)
        add_to_text_to_krama_map(variant, [...value.krama], value.fallback_list_ref);
    }
  }

  /** index of the `anya` list item that entries point at with `fallback_list_ref`
   * (added on first use) */
  let anya_list_ref: number | null = null;
  const get_anya_list_ref = () => {
    if (anya_list_ref === null) {
      res.list.push({ krama_ref: [], type: 'anya' });
      anya_list_ref = res.list.length - 1;
    }
    return anya_list_ref;
  };

  // An intermediate entry (a prefix of a longer text, not a krama text itself) that is a
  // vyanjana + halant, like Gurumukhi `ੜ੍` of `ੜ੍ਹ`. Runtimes take the type of a match from its
  // first krama entry (the vyanjana), so going to an `other` script an inherent vowel was added
  // after it (`ੜ੍` -> `Dza`, `ੜ੍ਕ` -> `r̤aka`). As `anya` the halant ends the vyanjana.
  if (res.script_type === 'brahmic') {
    const halant_index = kramaLabelIndex('halant');
    for (const [text, value] of res.text_to_krama_map) {
      const krama = value.krama;
      if (
        krama === undefined ||
        krama === null ||
        krama.length < 2 ||
        krama.at(-1) !== halant_index ||
        value.fallback_list_ref != null ||
        res.krama_text_arr.some((item) => item[0] === text)
      )
        continue;
      if (res.list[res.krama_text_arr[krama[0]]?.[1] ?? -1]?.type !== 'vyanjana') continue;
      value.fallback_list_ref = get_anya_list_ref();
    }
  }

  if (input_script_data.script_name !== 'Normal' && NormalOutputData) {
    // typing data genertion

    // Step 1: Extract all the script specific typing data from the input script data
    for (const item of input_script_data.typing_list) {
      if (item.type !== 'custom_script_char') continue;
      // search for a exisitng type reference in the text_to_krama_map and a list ref (arr[2])
      // arr[1] will be added after the `typing_text_to_krama_map` is sorted
      let current_list_ref_index: number | null = null;
      {
        const text_to_krama_item = res.text_to_krama_map.find((v) => v[0] === item.specific_text);
        if (text_to_krama_item) {
          const krama_key_item = res.krama_text_arr[text_to_krama_item[1].krama?.[0] ?? -1];
          // a dead consonant (vyanjana + halant, eg. Malayalam chillu ൻ) is not a vyanjana in
          // the typing context: it takes no halant and no vowel sign after it
          const is_dead_consonant = text_to_krama_item[1].fallback_list_ref != null;
          if (
            !is_dead_consonant &&
            krama_key_item &&
            krama_key_item[1] &&
            res.list[krama_key_item[1]]?.type === 'vyanjana'
          ) {
            current_list_ref_index = krama_key_item[1];
          }
        }
      }
      res.custom_script_chars_arr.push([item.specific_text, current_list_ref_index, null]);
    }
    // sort the array
    res.custom_script_chars_arr = sortByText(res.custom_script_chars_arr);

    /** Points the typing entry of `text` and of each of its intermediate states (prefixes)
     * at an `anya` list item, if it would otherwise resolve to a `mAtrA`
     * (runtimes take the type from `fallback_list_ref`, else from the first krama entry).
     * eg. `.LR` (ॢ) and its intermediate `.L` (`['', ळ]`, starts with the empty a-mAtrA) */
    const mark_typing_entries_as_anya = (text: string) => {
      if (res.script_type !== 'brahmic') return;
      for (let end = 1; end <= text.length; end++) {
        const prefix = text.substring(0, end);
        const entry: ExpandedScriptData['typing_text_to_krama_map'][number] | undefined =
          res.typing_text_to_krama_map.find((v) => v[0] === prefix);
        if (!entry) continue; // middle of a surrogate pair
        const value: ExpandedScriptData['typing_text_to_krama_map'][number][1] = entry[1];
        if (value.fallback_list_ref != null || value.custom_back_ref != null) continue;
        const list_ref = res.krama_text_arr[value.krama?.[0] ?? -1]?.[1];
        if (list_ref == null || res.list[list_ref]?.type !== 'mAtrA') continue;
        value.fallback_list_ref = get_anya_list_ref();
      }
    };

    // Step 2: Add all alternative types and reference for custom_script_chars_arr
    res.typing_text_to_krama_map = deepCopy(NormalOutputData.text_to_krama_map);
    for (const item of input_script_data.typing_list) {
      if (item.type === 'duplicates') {
        const ref_krama_key_index = kramaLabelIndex(item.ref_krama_key);
        for (const duplicate_text of item.duplicates) {
          add_to_text_to_krama_map(
            duplicate_text,
            [ref_krama_key_index],
            undefined,
            'typing_text_to_krama_map'
          );
          if (item.treat_as_anya) mark_typing_entries_as_anya(duplicate_text);
        }
      } else if (item.type === 'krama_sequence') {
        add_to_text_to_krama_map(
          item.text,
          item.krama_keys.map((key) => kramaLabelIndex(key)),
          undefined,
          'typing_text_to_krama_map'
        );
      } else if (item.type === 'custom_script_char') {
        const custom_script_char_index = res.custom_script_chars_arr.findIndex(
          (v) => v[0] === item.specific_text
        );
        add_to_text_to_krama_map(
          item.custom_normal_key,
          [custom_script_char_index],
          undefined,
          'typing_text_to_krama_map'
        );
        delete res.typing_text_to_krama_map[res.typing_text_to_krama_map.length - 1][1].krama;
        res.typing_text_to_krama_map[res.typing_text_to_krama_map.length - 1][1].custom_back_ref =
          custom_script_char_index;
      }
    }
    // sort the array
    res.typing_text_to_krama_map = sortByText(res.typing_text_to_krama_map);

    // Step 3: Reference back the custom normal key mapping to the typing_text_to_krama_map
    for (let i = 0; i < res.custom_script_chars_arr.length; i++) {
      const item = res.custom_script_chars_arr[i];
      const corresponding_normal_text_index = input_script_data.typing_list.findIndex(
        (v) => v.type === 'custom_script_char' && v.specific_text === item[0]
      );
      const corresponding_normal_text =
        input_script_data.typing_list[corresponding_normal_text_index];
      if (corresponding_normal_text && corresponding_normal_text.type === 'custom_script_char') {
        const normal_text_index = res.typing_text_to_krama_map.findIndex(
          (v) => v[0] === corresponding_normal_text.custom_normal_key
        );
        res.custom_script_chars_arr[i][2] = normal_text_index;
      }
    }
  }

  // Part 5: Optmizing the text_to_krama_map

  // Scan for cases where the key exists in krama_text_map but it is not mapped in index
  // This will speed up things in the production as it does not has to scan again in the krama_text_map list
  for (const text_krama_item of res.text_to_krama_map) {
    const text = text_krama_item[0];
    const text_krama_ref = text_krama_item[1].krama;
    const text_index = kramaKeyIndex(text);
    if (
      (text === 'c' &&
        ['Normal', 'Romanized'].includes(input_script_data.script_name) &&
        text_index === -1) ||
      // ^ custom condition for duplicate ch (c intermediate state handled)
      (text_index !== -1 &&
        (text_krama_ref === null || text_krama_ref === undefined || text_krama_ref.length === 0))
    ) {
      text_krama_item[1].krama = [text_index];
    }
  }
  // Romanized `sh` is only a prefix (of `shh` -> ṣ), not a character. The matcher does not
  // backtrack to `s` + `h`, so without a krama `sha` was emitted raw as `shअ`. The halant is
  // part of the krama as the context logic does not add one inside a single match.
  if (input_script_data.script_name === 'Romanized') {
    const sh_item = res.text_to_krama_map.find((item) => item[0] === 'sh');
    if (sh_item && !sh_item[1].krama?.length)
      sh_item[1].krama = [kramaKeyIndex('स'), kramaKeyIndex('्'), kramaKeyIndex('ह')];
  }
  // Scan for cases where the text key is of single character with a len(krama) >= 1 and there is no next in it
  // then we can safely remove it as it directly looked up in the krama array
  // also check if it actaully exists in the krama array (to not disrupt duplicates and mAtrA duplicates)
  const index_to_remove: number[] = [];
  for (let i = 0; i < res.text_to_krama_map.length; i++) {
    const text_krama_item = res.text_to_krama_map[i];
    const text = text_krama_item[0];
    const codePoint = text.codePointAt(0);
    const text_krama_ref = text_krama_item[1].krama;
    const text_krama_arr_index = res.krama_text_arr.findIndex((item) => item[0] === text);
    if (
      // check if its a lead surrogate (as should not be there independently)
      (codePoint !== undefined &&
        codePoint >= LEAD_SURROGATE_RANGE[0] &&
        codePoint <= LEAD_SURROGATE_RANGE[1]) ||
      (text_krama_arr_index !== -1 &&
        (text.length === 1 ||
          (text.length === 2 && codePoint !== undefined && codePoint > BMP_CODE_LAST_INDEX)) &&
        text_krama_ref !== null &&
        text_krama_ref !== undefined &&
        text_krama_ref.length >= 1 &&
        (text_krama_item[1].next === null ||
          text_krama_item[1].next === undefined ||
          text_krama_item[1].next.length === 0))
    ) {
      index_to_remove.push(i);
    }
  }
  res.text_to_krama_map = res.text_to_krama_map.filter((_, i) => !index_to_remove.includes(i));

  // Scan for duplicate keys in the text_to_krama_arr and warn
  if (res.text_to_krama_map.length > 0) {
    const textToKramaDuplicateMap = new Map<string, number[]>();
    res.text_to_krama_map.forEach((item, index) => {
      const [text_key] = item;
      const indexes = textToKramaDuplicateMap.get(text_key) ?? [];
      indexes.push(index);
      textToKramaDuplicateMap.set(text_key, indexes);
    });
    for (const [text_key, indexes] of textToKramaDuplicateMap.entries()) {
      if (indexes.length > 1) {
        console.warn(
          chalk.yellow(
            `⚠️  Dup key "${text_key}" in "${input_script_data.script_name}" at [${indexes.join(', ')}]`
          )
        );
      }
    }
  }

  // Scan for krama keys which did not get mapped to any text and warn
  // nuqta is optional and skipped when not present in the target script
  // a-mAtrA and a1-mAtrA are not expected to be mapped in brahmic scripts
  // halant and saMkShepachihna are not expected to be mapped in Normal and Romanized
  {
    const ignored_krama_labels: string[] = [
      'nuqta',
      ...(res.script_type === 'brahmic'
        ? ['a-mAtrA', 'a1-mAtrA']
        : ['Normal', 'Romanized'].includes(input_script_data.script_name)
          ? ['halant', 'saMkShepachihna']
          : [])
    ];
    const unmapped_krama_keys = res.krama_text_arr
      .map((item, i) => (item[0] === '' ? KramaLabelsArray[i] : null))
      .filter((v) => v !== null && !ignored_krama_labels.includes(v));
    if (unmapped_krama_keys.length > 0) {
      console.warn(
        chalk.yellow(
          `⚠️  ${unmapped_krama_keys.length} unmapped krama keys in "${input_script_data.script_name}": [${unmapped_krama_keys.join(', ')}]`
        )
      );
    }
  }

  res.text_to_krama_map = sortByText(res.text_to_krama_map);

  // Scan for -1 values in text_to_krama_map krama field
  for (let i = 0; i < res.text_to_krama_map.length; i++) {
    const text_krama_item = res.text_to_krama_map[i];
    const text = text_krama_item[0];
    const krama_arr = text_krama_item[1].krama;
    if (krama_arr) {
      const minus_1_count = krama_arr.filter((krama_index) => krama_index === -1).length;
      if (minus_1_count > 1) {
        console.warn(
          chalk.yellow(
            `⚠️  Invalid krama index (-1) found in "${input_script_data.script_name}" at text_to_krama_map[${i}] for text "${text}"`
          )
        );
      }
      // console.warn(
      //   chalk.yellow(
      //     `⚠️  Invalid krama index (-1) found in "${input_script_data.script_name}" at text_to_krama_map[${i}] for text "${text}"`
      //   )
      // );
      // ^ Now we dont have to add the warning as the new expected behaviour is add the text directly if -1
    }
  }
  return res;
}

async function make_custom_option_json() {
  const output: TransOptionsType = {};
  for (const [key, value] of Object.entries(CustomOptionsInput)) {
    const rules: TransOptionsType[keyof TransOptionsType]['rules'] = [];
    for (const rule of value.rules) {
      if (rule.type === 'replace_prev_krama_keys') {
        rules.push({
          type: rule.type,
          check_in: rule.check_in ?? value.check_in,
          use_replace: rule.use_replace ?? value.use_replace,
          prev: rule.prev.map((prev) => kramaKeyIndex(resolveKramaKeysExtendedType(prev))),
          following: rule.following.map((following) =>
            kramaKeyIndex(resolveKramaKeysExtendedType(following))
          ),
          replace_with: rule.replace_with.map((replace_with) =>
            kramaKeyIndex(resolveKramaKeysExtendedType(replace_with))
          )
        });
      } else if (rule.type === 'direct_replace') {
        rules.push({
          type: rule.type,
          check_in: rule.check_in ?? value.check_in,
          use_replace: rule.use_replace ?? value.use_replace,
          to_replace: rule.to_replace.map((to_replace) =>
            to_replace.map((to_replace_item) =>
              kramaKeyIndex(resolveKramaKeysExtendedType(to_replace_item))
            )
          ),
          replace_text: rule.replace_text ? rule.replace_text : undefined,
          replace_with: rule.replace_text
            ? []
            : rule.replace_with.map(
                (replace_with) =>
                  replace_with ? kramaKeyIndex(resolveKramaKeysExtendedType(replace_with)) : -1 // blank space
              )
        });
      }
    }
    output[key as keyof TransOptionsType] = {
      ...value,
      rules: rules
    };
  }

  const jsonOutput = JSON.stringify(output, null, 2);
  fs.writeFileSync(CUSTOM_OPTIONS_OUT_FOLDER, jsonOutput);
}

async function copy_script_data_json() {
  const LIST: {
    target: string;
    minify: boolean;
    single_script_data_file?: boolean;
    cmd?: string;
    id?: string;
  }[] = [
    {
      id: 'rust',
      // JSON input of `lipilekhika-datagen` (gitignored). It writes the committed
      // `src/generated/lipi_data.bin`, `src/scripts.rs` and `src/custom_options.rs`,
      // rewriting a file only when its content changes.
      target: '../rust/data',
      minify: true,
      cmd: 'cd ../rust && cargo run -q -p lipilekhika-datagen'
    },
    {
      id: 'go',
      target: '../go/lipilekhika/data',
      minify: false,
      single_script_data_file: true,
      cmd: 'cd ../go/lipilekhika && go run ./cmd/generate-data'
    }
  ];

  for (const { target, minify, single_script_data_file, cmd, id } of LIST) {
    if (fs.existsSync(path.resolve(target))) {
      for (const entry of fs.readdirSync(path.resolve(target))) {
        // Keep the committed Go gob files: `generate-data` compares against them and only
        // rewrites a file when its content changes (gob bytes can differ for equal data,
        // so regenerating from scratch would add needless binary diffs)
        if (id === 'go' && entry === 'gob') continue;
        fs.rmSync(path.resolve(target, entry), { recursive: true, force: true });
      }
    }
    fs.mkdirSync(target, { recursive: true });
    // Rust and Go read the expanded shape
    if (!single_script_data_file) {
      fs.mkdirSync(target + '/script_data', { recursive: true });
      for (const script of SCRIPT_LIST) {
        fs.writeFileSync(
          `${target}/script_data/${script}.json`,
          JSON.stringify(EXPANDED_SCRIPT_DATA.get(script), null, 2)
        );
      }
    } else {
      const ALL_DATA: Record<string, ExpandedScriptData> = {};
      for (const script of SCRIPT_LIST) ALL_DATA[script] = EXPANDED_SCRIPT_DATA.get(script)!;
      fs.writeFileSync(target + '/script_data.json', JSON.stringify(ALL_DATA, null, 2));
    }
    fs.copyFileSync('src/custom_options.json', target + '/custom_options.json');
    const script_list_data = {
      scripts: script_list_obj,
      langs: lang_list_obj,
      lang_script_map: LANG_SCRIPT_MAP,
      script_alternates_map: ALTERNATE_TO_SCRIPT_MAP
    };
    if (minify) {
      minify_json_file(target + '/custom_options.json');
      fs.readdirSync(target + '/script_data').forEach((file) => {
        minify_json_file(target + '/script_data/' + file);
      });
      fs.writeFileSync(target + '/script_list.json', JSON.stringify(script_list_data));
    } else {
      fs.writeFileSync(target + '/script_list.json', JSON.stringify(script_list_data, null, 2));
    }
    // The Go target folder can be fully regenerated; ensure embed scaffold exists.
    if (id === 'go') {
      fs.mkdirSync(target + '/gob', { recursive: true });
      fs.writeFileSync(
        target + '/embed.go',
        'package data\n\nimport "embed"\n\n// FS contains generated binary artifacts committed to git.\n//\n//go:embed gob/*\nvar FS embed.FS\n'
      );
      fs.writeFileSync(target + '/gob/placeholder.txt', 'generated gob files live here');
    }
    // Generate the committed binary artifacts from the JSON copied above.
    if (cmd) {
      try {
        execSync(cmd, { stdio: 'inherit' });
      } catch (e) {
        console.error(chalk.red(`✖  Error generating ${id} script data`), e);
        if (id === 'rust') {
          // not fatal (the other targets are still generated), but the committed Rust
          // artifacts are now stale, so make that clearly visible
          console.warn(
            chalk.yellow(
              '⚠  The committed Rust data (packages/rust/src/generated/lipi_data.bin, src/scripts.rs, ' +
                'src/custom_options.rs) was NOT updated with the new script data.\n' +
                '   Install Rust/Cargo with the rustfmt component, then rerun `bun run make-script-data` ' +
                '(or `cargo run -p lipilekhika-datagen` in packages/rust).'
            )
          );
        }
      }
    }
  }
}

const PYTHON_TYPES_PY_TEMPLATE = `# This is generated and should not be edited manually
from typing import Literal

ScriptListType = Literal[${SCRIPT_LIST.map((script) => `"${script}"`).join(', ')}]
"""List of all supported script names"""

LangListType = Literal[${LANG_LIST.map((lang) => `"${lang}"`).join(', ')}]
"""List of all supported language names which are mapped to a script"""

ScriptAndLangListType = Literal[${ALL_LANG_SCRIPT_LIST.map((script) => `"${script}"`).join(', ')}]
"""List of all Supported Script/Language"""

ScriptLangType = ScriptAndLangListType | Literal[${Object.keys(ALTERNATE_TO_SCRIPT_MAP)
  .map((script) => `"${script}"`)
  .join(', ')}]
"""Supported script/language identifier types (aliases allowed)"""

TransliterationOptionsType = Literal[${Object.keys(CustomOptionsInput)
  .map((option) => `"${option}"`)
  .join(', ')}]
`;

function generate_python_types_py() {
  const content = PYTHON_TYPES_PY_TEMPLATE;
  fs.writeFileSync(path.resolve('../python/lipilekhika/types.py'), content);
}

function minify_json_file(file: string) {
  const content = fs.readFileSync(file, 'utf-8');
  const minified = JSON.stringify(JSON.parse(content));
  fs.writeFileSync(file, minified, 'utf-8');
}

make_script_data()
  .then(async () => {
    console.log(chalk.green('✔  Script data generated successfully'));
    try {
      // Directory is gitignored; oxfmt only formats those paths when files are listed
      // explicitly (shell globs are unreliable under Bun execSync).
      const scriptDataFiles = fs
        .readdirSync('src/script_data')
        .filter((f) => f.endsWith('.json'))
        .map((f) => path.join('src/script_data', f));
      scriptDataFiles.push(path.relative('.', SHARED_OUT_FILE));
      if (scriptDataFiles.length > 0) {
        execSync(`bunx oxfmt ${scriptDataFiles.join(' ')}`);
      }
    } catch (e) {
      console.error(chalk.red('✖  Error formatting script data'), e);
    }
    // Always copy/generate downstream artifacts even if formatting fails.
    try {
      await copy_script_data_json();
      generate_python_types_py();
    } catch (e) {
      console.error(chalk.red('✖  Error copying script data'), e);
      throw e;
    }
  })
  .catch((err) => {
    console.error(chalk.red('✖  Error generating script data'), err);
  });

make_custom_option_json().catch((err) => {
  console.error(chalk.red('✖  Error generating custom option json'), err);
});
