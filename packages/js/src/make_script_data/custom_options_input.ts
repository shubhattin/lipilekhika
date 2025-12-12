import type { script_list_type } from '../utils/lang_list';
import type { KramaKeysExtendedType } from './krama_array_keys';

type RuleTypes = {
  /** in this we check if the string prev_krama_keys combines string appears before any one of the following_krama_keys */
  type: 'replace_prev_krama_keys';
  prev_krama_keys: KramaKeysExtendedType[];
  following_krama_keys: KramaKeysExtendedType[];
  replace_with: KramaKeysExtendedType;
};

const VARGAS = {
  ka: ['k', 'kz', 'kh', 'khz', 'g', 'gz', 'g1', 'gh'],
  cha: ['C', 'Ch', 'j', 'jz', 'j1', 'jh'],
  Ta: ['T', 'Th', 'D', 'Dz', 'D1', 'Dh', 'Dhz'],
  ta: ['t', 'th', 'd', 'dh'],
  pa: ['p', 'ph', 'b', 'b1', 'bh']
} satisfies Record<string, KramaKeysExtendedType[]>;

type CustomOptionsInput = Record<
  `${string}:${string}`,
  {
    description: string;
    from_script_name?: script_list_type[];
    from_script_type?: 'brahmic' | 'other' | 'all';
    to_script_name?: script_list_type[];
    to_script_type?: 'brahmic' | 'other' | 'all';
    rules: RuleTypes[];
  }
>;

export const CustomOptionsInput: CustomOptionsInput = {
  'all_to_normal:replace_pancham_varga_varna_with_n': {
    from_script_type: 'all',
    to_script_name: ['Normal'],
    description:
      'Replace G and J when preceded by ka varga or cha varga vyanjanas\n' +
      'More natutal to read\n' +
      'Example: raJjitiam -> ranjitam, raGgam -> rangam',
    rules: [
      // ka varga
      {
        type: 'replace_prev_krama_keys',
        prev_krama_keys: ['G'],
        following_krama_keys: VARGAS.ka,
        replace_with: 'n'
      },
      // cha varga
      {
        type: 'replace_prev_krama_keys',
        prev_krama_keys: ['J'],
        following_krama_keys: VARGAS.cha,
        replace_with: 'n'
      }
    ]
  },
  'brahmic_to_brahmic:replace_pancham_varga_varna_with_anuvsvAra': {
    from_script_type: 'brahmic',
    to_script_type: 'brahmic',
    description:
      "Replace the varga's(ka, cha, Ta, ta, pa) pancham varna preceded by other varga vyanjanas with anuvsvAra\n" +
      'Example: kAGkShate(Devanagari) -> kAMkShate(Telugu)',
    rules: [
      // ka varga
      {
        type: 'replace_prev_krama_keys',
        prev_krama_keys: ['G', 'halant'],
        following_krama_keys: VARGAS.ka,
        replace_with: 'anusvAra'
      },
      // cha varga
      {
        type: 'replace_prev_krama_keys',
        prev_krama_keys: ['J', 'halant'],
        following_krama_keys: VARGAS.cha,
        replace_with: 'anusvAra'
      },
      // Ta varga
      {
        type: 'replace_prev_krama_keys',
        prev_krama_keys: ['N', 'halant'],
        following_krama_keys: VARGAS.Ta,
        replace_with: 'anusvAra'
      },
      // ta varga
      {
        type: 'replace_prev_krama_keys',
        prev_krama_keys: ['n', 'halant'],
        following_krama_keys: VARGAS.ta,
        replace_with: 'anusvAra'
      },
      // pa varga
      {
        type: 'replace_prev_krama_keys',
        prev_krama_keys: ['m', 'halant'],
        following_krama_keys: VARGAS.pa,
        replace_with: 'anusvAra'
      }
    ]
  },
  'all_to_sinhala:use_conjuct_enabling_halant': {
    from_script_type: 'all',
    to_script_name: ['Sinhala'],
    description: 'Use conjuct enabling halant (halant + \\u200d)',
    // initially we will implementing this rule manually in the code
    rules: []
  },
  'all_to_normal:remove_virAma_and_double_virAma': {
    from_script_type: 'all',
    to_script_name: ['Normal', 'Romanized'],
    description: 'Remove virAma (.) and pUrNa virAma (..) from the text',
    rules: []
  },
  'all_to_normal:replace_avagraha_with_a': {
    from_script_type: 'all',
    to_script_name: ['Normal', 'Romanized'],
    description: "Replace avagraha('') with a",
    rules: []
  }
};
