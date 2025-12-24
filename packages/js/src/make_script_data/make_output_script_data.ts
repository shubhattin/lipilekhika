// Run this from the root of the js project using `vite-node`
import * as fs from 'node:fs';
import path from 'node:path';
import { argv } from 'node:process';
import type { InputScriptInfoType } from './input_script_data_schema';
import type { OutputScriptData } from './output_script_data_schema';
import {
  KramaKeysArray,
  KramaKeysIndexB,
  resolveKramaKeysExtendedType,
  type KramaKeysExtendedType,
  type KramaKeysType
} from './krama_array_keys';
import {
  binarySearchLowerWithIndex,
  createSearchIndex,
  sortArray
} from '../utils/binary_search/binary_search';
import chalk from 'chalk';
import { toUnicodeEscapes } from '../tools/kry';
import { execSync } from 'child_process';
import { BMP_CODE_LAST_INDEX, LEAD_SURROGATE_RANGE } from '../utils/non_bmp';
import { type OptionsType, CustomOptionsInput } from './custom_options_input';

const IS_DEV_MODE = argv.at(-1) === '--dev';
const OUT_FOLDER = path.resolve('./src/script_data');
const CUSTOM_OPTIONS_OUT_FOLDER = path.resolve('./src/custom_options.json');

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
  const NormalOutputData = get_out_scrit_data(NormalInputData!);
  {
    const jsonOutput = JSON.stringify(NormalOutputData, null, 2).replace(
      /\\\\u([0-9a-fA-F]{4})/g,
      '\\u$1'
    );
    fs.writeFileSync(path.resolve(OUT_FOLDER, `Normal.json`), jsonOutput);
  }
  for (const input_script_data of script_data_list) {
    if (input_script_data.script_name === 'Normal') continue;
    const res = get_out_scrit_data(input_script_data);
    const jsonOutput = JSON.stringify(res, null, 2).replace(/\\\\u([0-9a-fA-F]{4})/g, '\\u$1');
    fs.writeFileSync(path.resolve(OUT_FOLDER, `${input_script_data.script_name}.json`), jsonOutput);
  }
}

function get_out_scrit_data(input_script_data: InputScriptInfoType) {
  let res: OutputScriptData;
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
      krama_text_arr_index: [],
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
      krama_text_arr_index: [],
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
    fallback_list_ref?: number | null
  ) {
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
      const existing_entry_index = res.text_to_krama_map.findIndex((item) => item[0] === text_char);
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
        const current_next = res.text_to_krama_map[existing_entry_index][1].next;
        if (next_char)
          res.text_to_krama_map[existing_entry_index][1].next =
            current_next !== null && current_next !== undefined
              ? current_next.indexOf(next_char) === -1
                ? // if the next char is not in the current next, then add it to the current next
                  // else ignore it
                  [...current_next, next_char]
                : current_next
              : [next_char];
        // mapping the krama index
        if (i === text.length - 1) {
          res.text_to_krama_map[existing_entry_index][1].krama = val;
          if (fallback_list_ref !== undefined && fallback_list_ref !== null)
            res.text_to_krama_map[existing_entry_index][1].fallback_list_ref = fallback_list_ref;
        }
        continue;
      }
      res.text_to_krama_map.push([text_char, { ...(next_char ? { next: [next_char] } : {}) }]);
      // mapping the krama index
      if (i === text.length - 1) {
        res.text_to_krama_map[res.text_to_krama_map.length - 1][1].krama = val;
        if (fallback_list_ref !== undefined && fallback_list_ref !== null)
          res.text_to_krama_map[res.text_to_krama_map.length - 1][1].fallback_list_ref =
            fallback_list_ref;
      }
    }
  }
  // Part 1: Prefill the krama_text_map using the manual_krama_text_map
  for (const krama_key in input_script_data.manual_krama_text_map ?? {}) {
    const value = input_script_data.manual_krama_text_map![krama_key as KramaKeysType];
    const krama_key_index = binarySearchLowerWithIndex(
      KramaKeysArray,
      KramaKeysIndexB,
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
        binarySearchLowerWithIndex(
          KramaKeysArray,
          KramaKeysIndexB,
          resolveKramaKeysExtendedType(krama_key as KramaKeysExtendedType)
        )
      );
      res.list.push({
        // @ts-ignore
        ...(IS_DEV_MODE ? { text: item.text } : {}),
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
          binarySearchLowerWithIndex(
            KramaKeysArray,
            KramaKeysIndexB,
            resolveKramaKeysExtendedType(mAtrA_text_krama as KramaKeysExtendedType),
            {
              accessor: (arr, i) => arr[i]
            }
          )
        );
        res.list.push({
          // @ts-ignore
          ...(IS_DEV_MODE ? { text: item.mAtrA } : {}),
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
        const krama_key_index = binarySearchLowerWithIndex(
          KramaKeysArray,
          KramaKeysIndexB,
          resolveKramaKeysExtendedType(item.text_krama[0] as KramaKeysExtendedType)
        );
        if (krama_key_index !== -1) {
          add_to_text_to_krama_map(duplicate_text, [krama_key_index]);
        }
      }
    }
    if (item.type === 'svara' && item.mAtrA_duplicates) {
      for (const mAtrA_duplicate_text of item.mAtrA_duplicates) {
        const krama_key_index = binarySearchLowerWithIndex(
          KramaKeysArray,
          KramaKeysIndexB,
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
        binarySearchLowerWithIndex(
          KramaKeysArray,
          KramaKeysIndexB,
          resolveKramaKeysExtendedType(fallback_key as KramaKeysExtendedType)
        )
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
          for (let char_code_point of text_char) {
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

  // Part 5: Optmizing the text_to_krama_map

  // Scan for cases where the key exists in krama_text_map but it is not mapped in index
  // This will speed up things in the production as it does not has to scan again in the krama_text_map list
  for (const text_krama_item of res.text_to_krama_map) {
    const text = text_krama_item[0];
    const text_krama_ref = text_krama_item[1].krama;
    const text_index = binarySearchLowerWithIndex(KramaKeysArray, KramaKeysIndexB, text);
    if (
      text_index !== -1 &&
      (text_krama_ref === null || text_krama_ref === undefined || text_krama_ref.length === 0)
    ) {
      text_krama_item[1].krama = [text_index];
    }
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

  // In Dev mode add the original krama key at the third index for easy comparision and verification
  // and also add unicode escaped strings for better debugging (hopefully)
  if (IS_DEV_MODE) {
    for (let i = 0; i < res.text_to_krama_map.length; i++) {
      // @ts-ignore
      res.text_to_krama_map[i][1].uni = toUnicodeEscapes(res.text_to_krama_map[i][0]);
    }
    for (let i = 0; i < res.list.length; i++) {
      // @ts-ignore
      res.list[i].text_uni = toUnicodeEscapes(res.list[i].text);
    }
    for (let i = 0; i < KramaKeysArray.length; i++) {
      res.krama_text_arr[i].push(KramaKeysArray[i]);
      res.krama_text_arr[i].push(toUnicodeEscapes(res.krama_text_arr[i][0]));
      res.krama_text_arr[i].push(i);
    }
  }

  res.krama_text_arr_index = createSearchIndex(res.krama_text_arr, {
    accessor: (arr, i) => arr[i][0]
  });
  res.text_to_krama_map = sortArray(res.text_to_krama_map, {
    accessor: (arr, i) => arr[i][0]
  });

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
  const output: OptionsType = {};
  for (const [key, value] of Object.entries(CustomOptionsInput)) {
    const rules: OptionsType[keyof OptionsType]['rules'] = [];
    for (const rule of value.rules) {
      if (rule.type === 'replace_prev_krama_keys') {
        rules.push({
          type: rule.type,
          check_in: rule.check_in ?? value.check_in,
          use_replace: rule.use_replace ?? value.use_replace,
          prev: rule.prev.map((prev) =>
            binarySearchLowerWithIndex(
              KramaKeysArray,
              KramaKeysIndexB,
              resolveKramaKeysExtendedType(prev)
            )
          ),
          following: rule.following.map((following) =>
            binarySearchLowerWithIndex(
              KramaKeysArray,
              KramaKeysIndexB,
              resolveKramaKeysExtendedType(following)
            )
          ),
          replace_with: rule.replace_with.map((replace_with) =>
            binarySearchLowerWithIndex(
              KramaKeysArray,
              KramaKeysIndexB,
              resolveKramaKeysExtendedType(replace_with)
            )
          )
        });
      } else if (rule.type === 'direct_replace') {
        rules.push({
          type: rule.type,
          check_in: rule.check_in ?? value.check_in,
          use_replace: rule.use_replace ?? value.use_replace,
          to_replace: rule.to_replace.map((to_replace) =>
            to_replace.map((to_replace_item) =>
              binarySearchLowerWithIndex(
                KramaKeysArray,
                KramaKeysIndexB,
                resolveKramaKeysExtendedType(to_replace_item)
              )
            )
          ),
          replace_text: rule.replace_text ? rule.replace_text : undefined,
          replace_with: rule.replace_text
            ? []
            : rule.replace_with.map(
                (replace_with) =>
                  replace_with
                    ? binarySearchLowerWithIndex(
                        KramaKeysArray,
                        KramaKeysIndexB,
                        resolveKramaKeysExtendedType(replace_with)
                      )
                    : -1 // blank space
              )
        });
      }
    }
    output[key as keyof OptionsType] = {
      ...value,
      rules: rules
    };
  }

  const jsonOutput = JSON.stringify(output, null, 2);
  fs.writeFileSync(CUSTOM_OPTIONS_OUT_FOLDER, jsonOutput);
}

make_script_data()
  .then(() => {
    console.log(chalk.green('✔  Script data generated successfully'));
    try {
      execSync('npx prettier --write ./src/script_data');
    } catch (e) {
      console.error(chalk.red('✖  Error formatting script data'), e);
    }
  })
  .catch((err) => {
    console.error(chalk.red('✖  Error generating script data'), err);
  });

make_custom_option_json().catch((err) => {
  console.error(chalk.red('✖  Error generating custom option json'), err);
});
