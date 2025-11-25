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
import { execSync } from 'child_process';

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
    res.krama_text_map = Array.from({ length: KramaKeysArray.length }, () => ['', null, null]);

    // prefill the text_to_krama_map with the manual_krama_text_map
    // as it has a lower precedence

    function add_to_text_to_krama_map(
      text: string,
      val: number[],
      fallback_list_ref?: number | null
    ) {
      // step by step create entries for the text mapping
      for (let i = 0; i < text.length; i++) {
        const text_char = text.substring(0, i + 1); // from start to the current index
        const next_char = text[i + 1] as string | undefined;
        const existing_entry_index = res.text_to_krama_map.findIndex(
          (item) => item[0] === text_char
        );
        if (existing_entry_index !== -1) {
          const current_next = res.text_to_krama_map[existing_entry_index][1].next;
          if (next_char)
            res.text_to_krama_map[existing_entry_index][1].next =
              current_next !== null && current_next !== undefined
                ? current_next.indexOf(next_char) === -1
                  ? // if the next char is not in the current next, then add it to the current next
                    // else ignore it
                    current_next + next_char
                  : current_next
                : next_char;
          // mapping the krama index
          if (i === text.length - 1) {
            res.text_to_krama_map[existing_entry_index][1].krama = val;
            if (fallback_list_ref !== undefined && fallback_list_ref !== null)
              res.text_to_krama_map[existing_entry_index][1].fallback_list_ref = fallback_list_ref;
          }
          continue;
        }
        res.text_to_krama_map.push([text_char, { ...(next_char ? { next: next_char } : {}) }]);
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
      const krama_key_index = binarySearchWithIndex(
        KramaKeysArray,
        KramaKeysIndexB,
        resolveKramaKeysExtendedType(krama_key as KramaKeysExtendedType)
      );
      if (value === undefined || value === null || krama_key_index === -1) continue;
      res.krama_text_map[krama_key_index] = [value, null, null];
      // step by step create entries for the text mapping
      add_to_text_to_krama_map(value, [krama_key_index]);
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
          binarySearchWithIndex(
            KramaKeysArray,
            KramaKeysIndexB,
            resolveKramaKeysExtendedType(krama_key as KramaKeysExtendedType)
          )
        );
        res.list.push({
          krama_ref: krama_key_list_index_list,
          type: item.type,
          // @ts-ignore
          ...(IS_DEV_MODE ? { text: item.text } : {})
        });
        krama_key_list_index_list.forEach((krama_key_index) => {
          // link entries in the krama map to the list
          if (krama_key_index !== -1) {
            res.krama_text_map[krama_key_index] = [item.text, key_to_reference_back_list, null];
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
              res.krama_text_map[mAtrA_krama_ref_index] = [
                item.mAtrA,
                key_to_reference_back_list,
                null
              ];
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
            add_to_text_to_krama_map(duplicate_text, [krama_key_index]);
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
              add_to_text_to_krama_map(mAtrA_duplicate_text, [krama_key_index]);
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
        add_to_text_to_krama_map(
          item.text,
          fallback_key_kram_index_list,
          key_to_reference_back_list
        );
      }
    }

    // Scan the krama_text_map for keys which are two characters
    for (let i = 0; i < res.krama_text_map.length; i++) {
      const text_krama_item = res.krama_text_map[i];
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
          const krama_key_references = text_char
            .split('')
            .map((char) => res.krama_text_map.findIndex((item) => item[0] === char));
          add_to_text_to_krama_map(text_char, krama_key_references);
        }
        // final character addition
        add_to_text_to_krama_map(text, [i]);
      }
    }

    // Resolving same keys pointing to multiple items in krama_text_map
    // we scan before the current index and link to the first occurence if found
    for (let i = 0; i < res.krama_text_map.length; i++) {
      const text_krama_item = res.krama_text_map[i];
      for (let j = 0; j < i; j++) {
        const text_krama_item_j = res.krama_text_map[j];
        if (text_krama_item[0] === text_krama_item_j[0]) {
          text_krama_item[2] = j; // link to the first occurence
          break;
        }
      }
    }

    // Part 5: Optmizing the text_to_krama_map

    // Scan for cases where the key exists in krama_text_map but it is not mapped in index
    // This will speed up things in the production as it does not has to scan again in the krama_text_map list
    for (const text_krama_item of res.text_to_krama_map) {
      const text = text_krama_item[0];
      const text_krama_ref = text_krama_item[1].krama;
      const text_index = binarySearchWithIndex(KramaKeysArray, KramaKeysIndexB, text);
      if (text_index !== -1 && (text_krama_ref === null || text_krama_ref === undefined)) {
        text_krama_item[1].krama = [text_index];
      }
    }
    // Scan for cases where the text key is of single character with a len(krama) >= 1 and there is no next in it
    // then we can safely remove it as it directly looked up in the krama array
    const index_to_remove: number[] = [];
    for (let i = 0; i < res.text_to_krama_map.length; i++) {
      const text_krama_item = res.text_to_krama_map[i];
      const text = text_krama_item[0];
      const text_krama_ref = text_krama_item[1].krama;
      if (
        text.length === 1 &&
        text_krama_ref !== null &&
        text_krama_ref !== undefined &&
        text_krama_ref.length >= 1 &&
        (text_krama_item[1].next === null || text_krama_item[1].next === undefined)
      ) {
        index_to_remove.push(i);
      }
    }
    res.text_to_krama_map = res.text_to_krama_map.filter((_, i) => !index_to_remove.includes(i));

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
        res.krama_text_map[i].push(i);
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
    try {
      execSync('npx prettier --write ./src/script_data');
    } catch (e) {
      console.error(chalk.red('✖  Error formatting script data'), e);
    }
  })
  .catch((err) => {
    console.error(chalk.red('✖  Error generating script data'), err);
  });
