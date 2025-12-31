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
  /** will be combined to a single string.
   * Replaces the previous
   */
  replace_with: KramaKeysExtendedType[];
};
type DirectReplaceRule = {
  type: 'direct_replace';
  /** set of individual krama key combinations to replace */
  to_replace: KramaKeysExtendedType[][];
  replace_with: (KramaKeysExtendedType | null)[];
  /** If this is present it will take precedence over the replace_with array.
   * Text here will be directly without any krama mappings
   */
  replace_text?: string;
};
type CommonRuleTypeAttributes = {
  /** Specifies if the pattern has to checked in input or output text */
  check_in: 'input' | 'output';
  /** Use `replaceAll` to directly replace the pattern with the replace_with string
   *
   * **Note** :- Avoid using this pattern as much as possible it can be slower for large inputs
   *
   * When the `check_in` is `input` then we replace before the process and
   * when it is `output` then we replace after the process.
   *
   * Always fall back to `use_replace` only when implementation becomes too complex or otherwise.
   * The *Aim* should be to develop techniques so we dont have to rely on it too much.
   */
  use_replace?: boolean;
};
type InputRuleTypes = Omit<CommonRuleTypeAttributes, 'check_in'> & {
  check_in?: CommonRuleTypeAttributes['check_in'];
} & (ReplacePrevKramaKeysRule | DirectReplaceRule);
type CustomOptionsRecordType = {
  from_script_name?: script_list_type[];
  from_script_type?: 'brahmic' | 'other' | 'all';
  to_script_name?: script_list_type[];
  to_script_type?: 'brahmic' | 'other' | 'all';
  rules: InputRuleTypes[];
} & CommonRuleTypeAttributes;
type InputCustomOptionsType = Record<`${string}:${string}`, CustomOptionsRecordType>;

// Output types
type out_ReplacePrevKramaKeysRule = Pick<ReplacePrevKramaKeysRule, 'type'> & {
  prev: number[];
  following: number[];
  replace_with: number[];
};
type out_DirectReplaceRule = Pick<DirectReplaceRule, 'type'> & {
  to_replace: number[][];
  replace_with: number[];
  replace_text?: string;
};
// Using the krama key index instead of the krama key directly to have support for multiple scripts at a time
// As same corresponding key values will have identical indexes across scripts
/** This is final type that will be actually used by the transliterator */
export type TransOptionsType = Record<
  `${string}:${string}`,
  Omit<CustomOptionsRecordType, 'rules'> & {
    rules: (CommonRuleTypeAttributes & (out_ReplacePrevKramaKeysRule | out_DirectReplaceRule))[];
  }
>;

export const CustomOptionsInput: InputCustomOptionsType = {
  /**
   * Replace G and J with n
   * Its more natural to read
   *
   * Example: raJjitiam -> ranjitam, raGgam -> rangam
   */
  'all_to_normal:replace_pancham_varga_varna_with_n': {
    from_script_type: 'all',
    to_script_name: ['Normal'],
    check_in: 'output',
    rules: [
      // ka varga
      // {
      //   type: 'replace_prev_krama_keys',
      //   prev: ['G'],
      //   following: VARGAS.ka,
      //   replace_with: ['n']
      // },
      // // cha varga
      // {
      //   type: 'replace_prev_krama_keys',
      //   prev: ['J'],
      //   following: VARGAS.cha,
      //   replace_with: ['n']
      // },

      // We can also directly replace G and J with n
      // Also accommodates for ज्ञ (jJ -> jn)
      {
        type: 'direct_replace',
        to_replace: [['G'], ['J']],
        replace_with: ['n']
      }
    ]
  },
  /**
   * Replace the varga's(ka, cha, Ta, ta, pa) pancham varna preceded by other varga vyanjanas with anuvsvAra
   *
   * Example: kAGkShate(Devanagari) -> kAMkShate(Telugu)
   */
  'brahmic_to_brahmic:replace_pancham_varga_varna_with_anusvAra': {
    from_script_type: 'brahmic',
    to_script_type: 'brahmic',
    check_in: 'input',
    rules: [
      // ka varga
      {
        type: 'replace_prev_krama_keys',
        prev: ['G', 'halant'],
        following: VARGAS.ka,
        replace_with: ['anusvAra']
      },
      // cha varga
      {
        type: 'replace_prev_krama_keys',
        prev: ['J', 'halant'],
        following: VARGAS.cha,
        replace_with: ['anusvAra']
      },
      // Ta varga
      {
        type: 'replace_prev_krama_keys',
        prev: ['N', 'halant'],
        following: VARGAS.Ta,
        replace_with: ['anusvAra']
      },
      // ta varga
      {
        type: 'replace_prev_krama_keys',
        prev: ['n', 'halant'],
        following: VARGAS.ta,
        replace_with: ['anusvAra']
      },
      // pa varga
      {
        type: 'replace_prev_krama_keys',
        prev: ['m', 'halant'],
        following: VARGAS.pa,
        replace_with: ['anusvAra']
      }
    ]
  },
  /** Use conjunct(saMyuktAkShara) enabling halant (halant + \u200d) */
  'all_to_sinhala:use_conjunct_enabling_halant': {
    from_script_type: 'all',
    to_script_name: ['Sinhala'],
    check_in: 'output',
    rules: [
      {
        type: 'direct_replace',
        to_replace: [['halant']],
        replace_with: [],
        replace_text: '්' + '\u200d'
      }
    ]
  },
  /** Remove virAma (.) and pUrNa virAma (..) from the text */
  'all_to_normal:remove_virAma_and_double_virAma': {
    from_script_type: 'all',
    to_script_name: ['Normal', 'Romanized'],
    check_in: 'output',
    rules: [
      {
        type: 'direct_replace',
        to_replace: [['double_virama'], ['virama']],
        replace_with: [null]
      }
    ]
  },
  /** Replace avagraha('') with a */
  'all_to_normal:replace_avagraha_with_a': {
    from_script_type: 'all',
    to_script_name: ['Normal', 'Romanized'],
    check_in: 'output',
    rules: [
      {
        type: 'direct_replace',
        to_replace: [['avagraha']],
        replace_with: ['a-svara']
      }
    ]
  },

  // Typing Options

  /** This option will be enabled in typing mode.
   * Can also be provided as a custom transliteration option.
   *
   * This mode uses duplicate alternatives for typing + typing script specific characters
   */
  'normal_to_all:use_typing_chars': {
    from_script_name: ['Normal'],
    to_script_type: 'all',
    // ^ 'all` is the typing script target
    check_in: 'output',
    // ^ only a label, does not mean anything for this options
    rules: []
  },
  /**
   * Duplicate alternatives will be mapped to their base forms and
   * script specific charcaters will use the custom normal key
   */
  'all_to_normal:preserve_specific_chars': {
    from_script_type: 'all',
    to_script_name: ['Normal'],
    check_in: 'output',
    rules: []
  }
};
