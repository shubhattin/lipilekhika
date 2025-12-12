import { expect, it } from 'vitest';
import { get_active_custom_options } from './transliterate';
import { getScriptData } from '../utils/get_script_data';
import type { script_list_type } from '../utils/lang_list';
import type { CustomOptionList, CustomOptionType } from './transliterate';

const COMBINATIONS: [script_list_type, script_list_type, CustomOptionType, CustomOptionList[]][] = [
  // All to Normal
  [
    'Devanagari',
    'Normal',
    { 'all_to_normal:remove_virAma_and_double_virAma': true },
    ['all_to_normal:remove_virAma_and_double_virAma']
  ],
  [
    'Telugu',
    'Normal',
    {
      'all_to_normal:remove_virAma_and_double_virAma': true,
      'all_to_normal:replace_avagraha_with_a': true,
      'all_to_sinhala:use_conjuct_enabling_halant': true
    },
    ['all_to_normal:remove_virAma_and_double_virAma', 'all_to_normal:replace_avagraha_with_a']
  ],
  [
    'Romanized',
    'Normal',
    { 'all_to_normal:replace_avagraha_with_a': true },
    ['all_to_normal:replace_avagraha_with_a']
  ],

  // Brahmic to Brahmic
  [
    'Devanagari',
    'Telugu',
    {
      'brahmic_to_brahmic:replace_pancham_varga_varna_with_anuvsvAra': true,
      'all_to_sinhala:use_conjuct_enabling_halant': true
    },
    ['brahmic_to_brahmic:replace_pancham_varga_varna_with_anuvsvAra']
  ],
  [
    'Romanized',
    'Tamil',
    {
      'brahmic_to_brahmic:replace_pancham_varga_varna_with_anuvsvAra': true
    },
    []
  ],

  // to Sinhala
  [
    'Normal',
    'Sinhala',
    {
      'all_to_sinhala:use_conjuct_enabling_halant': true
    },
    ['all_to_sinhala:use_conjuct_enabling_halant']
  ],
  [
    'Romanized',
    'Sinhala',
    {
      'all_to_sinhala:use_conjuct_enabling_halant': true
    },
    ['all_to_sinhala:use_conjuct_enabling_halant']
  ],
  [
    'Telugu',
    'Sinhala',
    {
      'all_to_sinhala:use_conjuct_enabling_halant': true,
      'all_to_normal:remove_virAma_and_double_virAma': true
    },
    ['all_to_sinhala:use_conjuct_enabling_halant']
  ]
];

it('Active Options Resolver', async () => {
  for (const [
    from_script_name,
    to_script_name,
    input_options,
    custom_option_list
  ] of COMBINATIONS) {
    const options = await get_custom_options(from_script_name, to_script_name, input_options);
    const match = check_array_match(options, custom_option_list);
    expect(match).toBe(true);
  }
});

const get_custom_options = async (
  from_script_name: script_list_type,
  to_script_name: script_list_type,
  input_options?: CustomOptionType
) => {
  const from_script_data = await getScriptData(from_script_name);
  const to_script_data = await getScriptData(to_script_name);
  const options = get_active_custom_options(from_script_data, to_script_data, input_options);
  return Object.keys(options) as CustomOptionList[];
};

const check_array_match = (arr1: string[], arr2: string[]) => {
  return arr1.length === arr2.length && arr1.every((item) => arr2.includes(item));
};
