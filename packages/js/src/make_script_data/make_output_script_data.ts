// Run this form the root of the js project
import * as fs from 'node:fs';
import path from 'node:path';
// import { argv } from 'node:process';
import type { InputScriptInfoType } from './input_script_data_schema';
import type { OutputScriptData } from './output_script_data_schema';
import { KramaKeysArray, KramaKeysIndexB, type KramaKeysType } from './interlang_array_keys';
import { binarySearchWithIndex } from '../utils/binary_search/binary_search';
import chalk from 'chalk';

// const IS_DEV_MODE = argv[2] === '--dev';
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
        schwa_property: input_script_data.schwa_property,
        list: [],
        krama_text_map: [],
        krama_text_map_index: [],
        text_to_krama_map: [],
        text_to_krama_map_index: []
      };
    } else {
      res = {
        script_type: 'other',
        script_name: input_script_data.script_name,
        script_id: input_script_data.script_id,
        list: [],
        krama_text_map: [],
        krama_text_map_index: [],
        text_to_krama_map: [],
        text_to_krama_map_index: []
      };
    }
    // initialize krama key map as an empty starting array
    res.krama_text_map = Array.from({ length: KramaKeysArray.length }, () => ['', null]);

    // prefill the text_to_krama_map with the manual_krama_text_map
    // as it has a lower precedence
    const keys_text_to_krama_map: string[] = [];
    for (const krama_key in input_script_data.manual_krama_text_map ?? {}) {
      const value = input_script_data.manual_krama_text_map?.[krama_key as KramaKeysType];
      const krama_key_index = binarySearchWithIndex(KramaKeysArray, KramaKeysIndexB, krama_key);
      if (value === undefined || value === null || krama_key_index === -1) continue;
      // step by step create entries for the text mapping
      for (let i = 0; i < value.length; i++) {
        const text_char = value.substring(0, i + 1); // from start to the current index
        const next_char = value[i + 1] as string | undefined;
        const existing_entry_index = keys_text_to_krama_map.indexOf(text_char);
        if (existing_entry_index !== -1 && next_char) {
          res.text_to_krama_map[existing_entry_index][1].next =
            (res.text_to_krama_map[existing_entry_index][1].next ?? '') + next_char;
          // mapping the krama index
          if (i === value.length - 1)
            res.text_to_krama_map[existing_entry_index][1].kram_index = [krama_key_index];
          continue;
        }
        keys_text_to_krama_map.push(text_char);
        res.text_to_krama_map.push([
          text_char,
          { ...(next_char ? { next: next_char } : {}), kram_index: null }
        ]);
        // mapping the krama index
        if (i === value.length - 1)
          res.text_to_krama_map[keys_text_to_krama_map.length - 1][1].kram_index = [
            krama_key_index
          ];
      }
    }

    // start scanning the list to fill krama_key_map and key_to_krama_map
    for (const item of input_script_data.list ?? []) {
      item.text;
      // if (item.type === 'svara') {
      //   res.krama_key_map[KramaKeysIndexB.get(item.key)] = [item.key, null];
      // } else {
      //   res.key_to_krama_map[item.key] = [item.key, { next: null, kram_index: null }];
      // }
    }

    fs.writeFileSync(
      path.resolve(OUT_FOLDER, `${input_script_data.script_name}.json`),
      JSON.stringify(res, null, 2)
    );
  }
}

main()
  .then(() => {
    console.log(chalk.green('✔  Script data generated successfully'));
  })
  .catch((err) => {
    console.error(chalk.red('✖ Error generating script data'), err);
  });
