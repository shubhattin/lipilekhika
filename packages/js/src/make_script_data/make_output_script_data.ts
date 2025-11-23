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
  binarySearchWithIndex,
  createSearchIndex,
  sortArray
} from '../utils/binary_search/binary_search';
import chalk from 'chalk';
import { toUnicodeEscapes } from '../tools/kry';

const IS_DEV_MODE = argv.at(-1) === '--dev';
const OUT_FOLDER = path.resolve('.', 'src', 'script_data');

async function main() {
  // reset output folder
  if (fs.existsSync(OUT_FOLDER)) fs.rmSync(OUT_FOLDER, { recursive: true });
  fs.mkdirSync(OUT_FOLDER, { recursive: true });

  const script_data_list = Object.values(
    import.meta.glob('./input_data/*.ts', {
      eager: true,
      import: 'default'
    })
  ) as InputScriptInfoType[];
  for (const input_script_data of script_data_list) {
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
        krama_text_map: [],
        krama_text_map_index: []
      };
    } else {
      res = {
        script_type: 'other',
        script_name: input_script_data.script_name,
        script_id: input_script_data.script_id,
        text_to_krama_map: [],
        list: [],
        krama_text_map: [],
        krama_text_map_index: []
      };
    }
    // initialize krama key map as an empty starting array
    res.krama_text_map = Array.from({ length: KramaKeysArray.length }, () => ['', null]);

    // prefill the text_to_krama_map with the manual_krama_text_map
    // as it has a lower precedence

    type fallback_info_type = NonNullable<
      Extract<
        OutputScriptData,
        { script_type: 'brahmic' }
      >['text_to_krama_map'][number][1]['fallback_info']
    >;
    function add_to_text_to_krama_map(text: string, val: number | fallback_info_type) {
      // step by step create entries for the text mapping
      for (let i = 0; i < text.length; i++) {
        const text_char = text.substring(0, i + 1); // from start to the current index
        const next_char = text[i + 1] as string | undefined;
        const existing_entry_index = keys_text_to_krama_map.indexOf(text_char);
        if (existing_entry_index !== -1 && next_char) {
          const current_next = res.text_to_krama_map[existing_entry_index][1].next;
          res.text_to_krama_map[existing_entry_index][1].next =
            current_next !== null && current_next !== undefined
              ? current_next.indexOf(next_char) === -1
                ? // if the next char is not in the current next, then add it to the current next
                  // else ignore it
                  current_next + next_char
                : current_next
              : next_char;
          // mapping the krama index
          if (i === text.length - 1)
            if (typeof val === 'number')
              res.text_to_krama_map[existing_entry_index][1].kram_index = val;
            else res.text_to_krama_map[existing_entry_index][1].fallback_info = val;
          continue;
        }
        keys_text_to_krama_map.push(text_char);
        res.text_to_krama_map.push([text_char, { ...(next_char ? { next: next_char } : {}) }]);
        // mapping the krama index
        if (i === text.length - 1)
          if (typeof val === 'number')
            res.text_to_krama_map[keys_text_to_krama_map.length - 1][1].kram_index = val;
          else res.text_to_krama_map[keys_text_to_krama_map.length - 1][1].fallback_info = val;
      }
    }
    // Part 1: Prefill the krama_text_map using the manual_krama_text_map
    const keys_text_to_krama_map: string[] = [];
    for (const krama_key in input_script_data.manual_krama_text_map ?? {}) {
      const value = input_script_data.manual_krama_text_map![krama_key as KramaKeysType];
      const krama_key_index = binarySearchWithIndex(
        KramaKeysArray,
        KramaKeysIndexB,
        resolveKramaKeysExtendedType(krama_key as KramaKeysExtendedType)
      );
      if (value === undefined || value === null || krama_key_index === -1) continue;
      res.krama_text_map[krama_key_index] = [value, null];
      // step by step create entries for the text mapping
      add_to_text_to_krama_map(value, krama_key_index);
    }

    const keys_krama_text_map: string[] = [];
    for (const item of input_script_data.list ?? []) {
      // Part 2: Start scanning the list to fill krama_key_map and key_to_krama_map
      // Brahmic Scripts Referencing back Portion
      // only reference back only if svara or vyanjana (even if a fallback type) as else not needed
      const key_to_reference_back_list =
        item.type === 'svara' || item.type === 'vyanjana' ? keys_krama_text_map.length : null;
      if (
        res.script_type === 'brahmic' &&
        key_to_reference_back_list !== null &&
        key_to_reference_back_list !== undefined &&
        item.type !== undefined
      ) {
        const krama_key_list = item.text_krama;
        const krama_key_list_index_list = krama_key_list.map((krama_key) =>
          binarySearchWithIndex(
            KramaKeysArray,
            KramaKeysIndexB,
            resolveKramaKeysExtendedType(krama_key as KramaKeysExtendedType)
          )
        );
        keys_krama_text_map.push(item.text);
        res.list.push({
          krama_ref: krama_key_list_index_list,
          type: item.type,
          // @ts-ignore
          ...(IS_DEV_MODE ? { text: item.text } : {})
        });
        krama_key_list_index_list.forEach((krama_key_index) => {
          // link entries in the krama map to the list
          if (krama_key_index !== -1) {
            res.krama_text_map[krama_key_index] = [item.text, key_to_reference_back_list];
          }
        });
        if (item.type === 'svara') {
          // handling svara references
          const mAtrA_krama_ref_index_list = item.mAtrA_text_krama.map((mAtrA_text_krama) =>
            binarySearchWithIndex(
              KramaKeysArray,
              KramaKeysIndexB,
              resolveKramaKeysExtendedType(mAtrA_text_krama as KramaKeysExtendedType),
              {
                accessor: (arr, i) => arr[i]
              }
            )
          );
          res.list[key_to_reference_back_list].mAtrA_krama_ref = mAtrA_krama_ref_index_list;
          if (IS_DEV_MODE)
            // @ts-ignore
            res.list[key_to_reference_back_list].mAtrA = item.mAtrA;
          mAtrA_krama_ref_index_list.forEach((mAtrA_krama_ref_index) => {
            if (mAtrA_krama_ref_index !== -1) {
              res.krama_text_map[mAtrA_krama_ref_index] = [item.mAtrA, key_to_reference_back_list];
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
          const krama_key_index = binarySearchWithIndex(
            KramaKeysArray,
            KramaKeysIndexB,
            resolveKramaKeysExtendedType(item.text_krama[0] as KramaKeysExtendedType)
          );
          if (krama_key_index !== -1) {
            add_to_text_to_krama_map(duplicate_text, krama_key_index);
          }
        }
        if (item.type === 'svara' && item.mAtrA_duplicates) {
          for (const mAtrA_duplicate_text of item.mAtrA_duplicates) {
            const krama_key_index = binarySearchWithIndex(
              KramaKeysArray,
              KramaKeysIndexB,
              resolveKramaKeysExtendedType(item.mAtrA_text_krama[0] as KramaKeysExtendedType)
            );
            if (krama_key_index !== -1) {
              add_to_text_to_krama_map(mAtrA_duplicate_text, krama_key_index);
            }
          }
        }
      }

      // Part 4: Fallback Resolution
      // add fallback portion
      if (item.fallback && item.text_krama.length === 0) {
        const fallback_key_kram_index_list = item.fallback.map((fallback_key) =>
          binarySearchWithIndex(
            KramaKeysArray,
            KramaKeysIndexB,
            resolveKramaKeysExtendedType(fallback_key as KramaKeysExtendedType)
          )
        );
        add_to_text_to_krama_map(item.text, {
          krama_combination: fallback_key_kram_index_list,
          ...(key_to_reference_back_list !== null && key_to_reference_back_list !== undefined
            ? { list_ref: key_to_reference_back_list }
            : {})
        });
      }
    }

    // Part 5: Optmizing the text_to_krama_map
    // Scan for cases where the key exists in krama_text_map but it is not mapped in index
    // This will speed up things in the production as it does not has to scan again in the krama_text_map list
    for (const text_krama_item of res.text_to_krama_map) {
      const text = text_krama_item[0];
      const text_krama_ref = text_krama_item[1].kram_index;
      const text_index = binarySearchWithIndex(KramaKeysArray, KramaKeysIndexB, text);
      if (text_index !== -1 && (text_krama_ref === null || text_krama_ref === undefined)) {
        text_krama_item[1].kram_index = text_index;
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
        if (res.list[i].type === 'svara') {
          // @ts-ignore
          res.list[i].mAtrA_uni = toUnicodeEscapes(res.list[i].mAtrA);
        }
      }
      for (let i = 0; i < KramaKeysArray.length; i++) {
        res.krama_text_map[i].push(KramaKeysArray[i]);
        res.krama_text_map[i].push(toUnicodeEscapes(res.krama_text_map[i][0]));
      }
    }

    res.krama_text_map_index = createSearchIndex(res.krama_text_map, {
      accessor: (arr, i) => arr[i][0]
    });
    res.text_to_krama_map = sortArray(res.text_to_krama_map, {
      accessor: (arr, i) => arr[i][0]
    });

    const jsonOutput = JSON.stringify(res, null, 2).replace(/\\\\u([0-9a-fA-F]{4})/g, '\\u$1');
    fs.writeFileSync(path.resolve(OUT_FOLDER, `${input_script_data.script_name}.json`), jsonOutput);
  }
}

main()
  .then(() => {
    console.log(chalk.green('✔  Script data generated successfully'));
  })
  .catch((err) => {
    console.error(chalk.red('✖  Error generating script data'), err);
  });
