// Run this form the root of the js project
import * as fs from 'node:fs';
import path from 'node:path';
import type { InputScriptInfoType } from './input_script_data_schema';
import type { OutputScriptData } from './output_script_data_schema';

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
        krama_key_map: [],
        krama_key_map_index: [],
        key_to_krama_map: [],
        key_to_krama_map_index: []
      };
    } else {
      res = {
        script_type: 'other',
        script_name: input_script_data.script_name,
        script_id: input_script_data.script_id,
        list: [],
        krama_key_map: [],
        krama_key_map_index: [],
        key_to_krama_map: [],
        key_to_krama_map_index: []
      };
    }
    fs.writeFileSync(
      path.resolve(OUT_FOLDER, `${input_script_data.script_name}.json`),
      JSON.stringify(res, null, 2)
    );
  }
}

main();
