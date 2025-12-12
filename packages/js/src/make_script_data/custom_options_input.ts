import type { script_list_type } from '../utils/lang_list';
import type { KramaKeysExtendedType } from './krama_array_keys';

const VARGAS = {
  ka: ['k', 'kz', 'kh', 'khz', 'g', 'gz', 'g1', 'gh'],
  cha: ['C', 'Ch', 'j', 'jz', 'j1', 'jh'],
  Ta: ['T', 'Th', 'D', 'Dz', 'D1', 'Dh', 'Dhz'],
  ta: ['t', 'th', 'd', 'dh'],
  pa: ['p', 'ph', 'b', 'b1', 'bh']
} satisfies Record<string, KramaKeysExtendedType[]>;

// Input types
type ReplacePrevKramaKeysRule = {
  /** in this we check if the string prev_krama_keys combines string appears before any one of the following_krama_keys */
  type: 'replace_prev_krama_keys';
  prev: KramaKeysExtendedType[];
  following: KramaKeysExtendedType[];
  replace_with: KramaKeysExtendedType;
};
type DirectReplaceRule = {
  type: 'direct_replace';
  /** set of inividual krama key combinations to replace */
  to_replace: KramaKeysExtendedType[][];
  replace_with: KramaKeysExtendedType;
};
type InputRuleTypes = ReplacePrevKramaKeysRule | DirectReplaceRule;
type CustomOptionsRecordType = {
  description: string;
  from_script_name?: script_list_type[];
  from_script_type?: 'brahmic' | 'other' | 'all';
  to_script_name?: script_list_type[];
  to_script_type?: 'brahmic' | 'other' | 'all';
  rules: InputRuleTypes[];
};
type InputCustomOptionsType = Record<`${string}:${string}`, CustomOptionsRecordType>;

// Output types
type out_ReplacePrevKramaKeysRule = Pick<ReplacePrevKramaKeysRule, 'type'> & {
  prev: number[];
  following: number[];
  replace_with: number;
};
type out_DirectReplaceRule = Pick<DirectReplaceRule, 'type'> & {
  to_replace: number[][];
  replace_with: number;
};
// Using the krama key index instead of the krama key directly to have support for multiple scripts at a time
// As same corresponding key values will have identical indexes across scripts
/** This is final type that will be actually used by the transliterator */
export type OptionsType = Record<
  `${string}:${string}`,
  Omit<CustomOptionsRecordType, 'rules'> & {
    rules: (out_ReplacePrevKramaKeysRule | out_DirectReplaceRule)[];
  }
>;

export const CustomOptionsInput: InputCustomOptionsType = {
  'all_to_normal:replace_pancham_varga_varna_with_n': {
    from_script_type: 'all',
    to_script_name: ['Normal'],
    description:
      'Replace G and J when preceded by ka varga or cha varga vyanjanas\n' +
      'More natural to read\n' +
      'Example: raJjitiam -> ranjitam, raGgam -> rangam',
    rules: [
      // ka varga
      {
        type: 'replace_prev_krama_keys',
        prev: ['G'],
        following: VARGAS.ka,
        replace_with: 'n'
      },
      // cha varga
      {
        type: 'replace_prev_krama_keys',
        prev: ['J'],
        following: VARGAS.cha,
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
        prev: ['G', 'halant'],
        following: VARGAS.ka,
        replace_with: 'anusvAra'
      },
      // cha varga
      {
        type: 'replace_prev_krama_keys',
        prev: ['J', 'halant'],
        following: VARGAS.cha,
        replace_with: 'anusvAra'
      },
      // Ta varga
      {
        type: 'replace_prev_krama_keys',
        prev: ['N', 'halant'],
        following: VARGAS.Ta,
        replace_with: 'anusvAra'
      },
      // ta varga
      {
        type: 'replace_prev_krama_keys',
        prev: ['n', 'halant'],
        following: VARGAS.ta,
        replace_with: 'anusvAra'
      },
      // pa varga
      {
        type: 'replace_prev_krama_keys',
        prev: ['m', 'halant'],
        following: VARGAS.pa,
        replace_with: 'anusvAra'
      }
    ]
  },
  'all_to_sinhala:use_conjuct_enabling_halant': {
    from_script_type: 'all',
    to_script_name: ['Sinhala'],
    description: 'Use conjunct(saMyuktAkShara) enabling halant (halant + \\u200d)',
    // initially we will implementing this rule manually in the code
    rules: []
  },
  'all_to_normal:remove_virAma_and_double_virAma': {
    from_script_type: 'all',
    to_script_name: ['Normal', 'Romanized'],
    description: 'Remove virAma (.) and pUrNa virAma (..) from the text',
    rules: [
      {
        type: 'direct_replace',
        to_replace: [['virama'], ['double_virama']],
        replace_with: ''
      }
    ]
  },
  'all_to_normal:replace_avagraha_with_a': {
    from_script_type: 'all',
    to_script_name: ['Normal', 'Romanized'],
    description: "Replace avagraha('') with a",
    rules: [
      {
        type: 'direct_replace',
        to_replace: [['avagraha']],
        replace_with: 'a-svara'
      }
    ]
  }
};
