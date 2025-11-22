#!/usr/bin/env bun

import { format_string_text } from '../src/tools/kry';
import * as fs from 'node:fs';
import { type InputBrahmicScriptType } from '../src/make_script_data/input_script_data_schema';
import {
  KramaLabelsArray,
  KramaKeysArray,
  KramaKeysIndexB
} from '../src/make_script_data/krama_array_keys';
import { SCRIPT_LIST, script_list_obj } from '../src/utils/lang_list';
import { script_list_type } from '../src/utils/lang_list';
import { binarySearchWithIndex } from '../src/utils/binary_search/binary_search';
import { execSync } from 'child_process';

const DEVANAGARI_KRAMA = [
  'ॐ',
  'अ',
  'अ',
  1,
  'आ',
  'ा',
  'आ',
  'ा',
  'इ',
  'ि',
  'ई',
  'ी',
  'उ',
  'ु',
  'उ',
  'ु',
  'ऊ',
  'ू',
  'ऊ',
  'ू',
  'ए',
  'े',
  'ए',
  'े',
  'ऐ',
  'ै',
  'ऐ',
  'ै',
  'ओ',
  'ो',
  'ओ',
  'ो',
  'औ',
  'ौ',
  'औ',
  'ौ',
  'ऋ',
  'ृ',
  'ॠ',
  'ॄ',
  'ऌ',
  'ॢ',
  'ॡ',
  'ॣ',
  'ं',
  'ँ',
  'ः',
  'ऽ',
  '्',
  '़',
  '॰',
  'क',
  'क',
  'ख',
  'ख',
  'ग',
  'ग',
  'ग',
  'घ',
  'ङ',
  'च',
  'च',
  'छ',
  'छ',
  'ज',
  'ज',
  'ज',
  'झ',
  'ञ',
  'त',
  'थ',
  'द',
  'ध',
  'न',
  'ऩ',
  'ट',
  'ठ',
  'ड',
  'ड',
  'ड',
  'ढ',
  'ढ',
  'ण',
  'प',
  'फ',
  'फ',
  'ब',
  'ब',
  'भ',
  'म',
  'य',
  'य',
  'व',
  'र',
  'ऱ',
  'ल',
  'ळ',
  'ऴ',
  'ह',
  'स',
  'श',
  'ष',
  '॒',
  '॑',
  '᳚',
  '᳛',
  '०',
  '१',
  '२',
  '३',
  '४',
  '५',
  '६',
  '७',
  '८',
  '९'
];

const template = `
import { script_list_obj } from '../../utils/lang_list';
import type { InputBrahmicScriptType } from '../input_script_data_schema';

const {script_name} = {script_json} satisfies InputBrahmicScriptType;

export default {script_name};
`;

for (const lang of SCRIPT_LIST) {
  if (!fs.existsSync(`../tmp/${lang}.json`)) {
    continue;
  }
  const data = JSON.parse(fs.readFileSync(`../tmp/${lang}.json`, 'utf8'))[0];
  const out = get_script_data(lang as script_list_type, data);
  let str_out = format_string_text(template, {
    script_json: JSON.stringify(out, null, 2),
    script_name: lang.replace('-', '_')
  });
  str_out = str_out.replace(
    `"script_id": ${script_list_obj[lang]},`,
    `"script_id": script_list_obj['${lang}'],`
  );
  // replacing the direct script code
  fs.writeFileSync(`../src/make_script_data/input_data/${lang}.ts`, str_out);
}
// Run Prettier to format the ./src/make_script_data/input_data directory
try {
  execSync('npx prettier --write ../src/make_script_data/input_data', { stdio: 'inherit' });
} catch (e) {
  console.error('Prettier format failed:', e);
}

function get_script_data(lang: script_list_type, data: any) {
  const out: InputBrahmicScriptType = {
    script_type: 'brahmic',
    script_name: lang,
    script_id: script_list_obj[lang],
    halant: data['.']['.x'][0],
    nuqta: data['.']['.z']?.[0] ?? undefined,
    schwa_property: false,
    manual_krama_text_map: {},
    list: []
  };

  for (const key in data) {
    if (['range', 'sa', 'antar', 'kram'].includes(key)) continue;
    for (const [char, value] of Object.entries(data[key]) as unknown as [string, any[]]) {
      // determining the type
      if (value.at(-1) === 2) {
        // anya
        const code = value[0];
        const krama_key = get_krama_key_from_antar_key(data['kram'].indexOf(code));
        if (krama_key !== null) {
          out.manual_krama_text_map![krama_key] = code;
        } else {
          // shall be removed after inspection
          out.list.push({
            text: code,
            type: 'anya',
            text_krama: []
          });
        }
      } else if (value.at(-1) === 0) {
        // svara
        const code = value[0];
        const mAtrA = value[1];
        const krama_key = get_krama_key_from_antar_key(data['kram'].indexOf(code));
        const krama_mAtrA_key = get_krama_key_from_antar_key(data['kram'].indexOf(mAtrA));

        out.list.push({
          text: code,
          type: 'svara',
          text_krama: krama_key !== null ? [krama_key] : [],
          mAtrA: mAtrA,
          mAtrA_text_krama: krama_mAtrA_key !== null ? [krama_mAtrA_key] : []
        });
      } else if (value.at(-1) === 1) {
        // vyanjana
        const code = value[0];
        const krama_key = get_krama_key_from_antar_key(data['kram'].indexOf(code));
        out.list.push({
          text: code,
          type: 'vyanjana',
          text_krama: krama_key !== null ? [krama_key] : []
        });
      }
    }
  }
  return out;
}

function get_krama_key_from_antar_key(old_lang_key_index: number) {
  if (old_lang_key_index === -1) return null;
  const devanagari_old_key = DEVANAGARI_KRAMA[old_lang_key_index];
  const new_index = binarySearchWithIndex(KramaKeysArray, KramaKeysIndexB, devanagari_old_key);
  if (new_index !== -1) {
    return KramaLabelsArray[new_index];
  }
  return null;
}
