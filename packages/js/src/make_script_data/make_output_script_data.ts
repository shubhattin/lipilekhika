// Run this form the root of the js project
import * as fs from 'node:fs';
import path from 'node:path';
// import { argv } from 'node:process';
import type { InputScriptInfoType } from './input_script_data_schema';
import type { OutputScriptData } from './output_script_data_schema';
import { KramaKeysArray } from './interlang_array_keys';

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

main();
