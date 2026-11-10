import type { InputBrahmicScriptType, InputOtherScriptType } from './input_script_data_schema';

/*
 * Three shapes are defined here:
 *
 * - `OutputScriptData`: what is written to `src/script_data/<script>.json`. Only what is
 *   specific to the script is stored.
 * - `SharedScriptData`: what is written to `src/shared_script_data.json`. The data which is the
 *   same in (nearly) every script, stored once.
 * - `ExpandedScriptData`: the shape the transliteration works on. It is not stored, it is built
 *   from the two above with `expand_script_data` (`utils/get_script_data/expand_script_data.ts`).
 *
 * The generator checks that expanding the stored data gives back what it compiled from the input.
 */

/** Type of a krama entry, or of a matched text, in a brahmic script */
export type KramaType = 'svara' | 'mAtrA' | 'vyanjana' | 'anya';

/** `next`: the characters that can follow the text to form a longer text which is also in the map */
type TextToKramaValue = {
  next?: string[];
  /** Multiple krama index references are useful to some intermediate states. For eg:- Normal A -> A, AU -> A, U and AUM -> AUM
   * This will be useful only when there are more than two transition states. As double transition state outputs dont need multiple krama references.
   * For eg -> The Bengali kz (actually k + nukta) will be a two step mapping, k -> k (next :nukta,... ) and k+nukta->kz krama reference in the main transliteration array
   * There is also an option to prevent this auto behaviour. Like for tamil we dont iru in tamil to map to R in krama key so we manually disable it
   * This can also be used to define the fallback combination. The array allows a multiple krama keys to be combined together to form a fallback
   * Like .100 = .1+.0+.0
   */
  krama?: number[];
  /** Type of the text as a whole. When it is not set the type of the first krama index is used.
   *
   * Set for a fallback which is a svara or a vyanjana (eg. the Sinhala prenasalized consonants)
   * and for a dead consonant (vyanjana + halant, eg. the Malayalam chillu ൻ) which is an `anya`.
   */
  type?: KramaType;
  /** Only with the `svara` type: krama index of the mAtrA of the svara */
  mAtrA_krama?: number;
};

type TypingTextToKramaValue = {
  next?: string[];
  krama?: number[];
  /** Index of a custom script character of the script (in `custom_script_chars_arr`) */
  custom_back_ref?: number;
  /** Only set (as `anya`) for the `treat_as_anya` typing keys (eg. `.A`, `.LR` and their
   * intermediate states like `.L`), so the typing context does not treat them as a `mAtrA` of
   * the previous vyanjana */
  type?: KramaType;
};

/**
 * The data shared by the scripts, stored once.
 */
export type SharedScriptData = {
  /** Type of each krama index in a brahmic script, `null` if it has none (signs, numerals).
   *
   * The type belongs to the krama position and not to the script (eg. the krama index of क is a
   * `vyanjana` in every script). A script which differs lists it in its `krama_type_overrides`.
   * `other` scripts have no types.
   *
   * The mAtrA of a `svara` is the next krama index (see `krama_array_keys.ts`), unless the script
   * lists it in its `svara_mAtrA_krama_overrides`.
   */
  krama_type_arr: (KramaType | null)[];
  /** The typing map entries which most scripts have in common (Normal's `text_to_krama_map` and
   * the common typing keys). The `typing_text_to_krama_map` of a script is applied over it.
   *
   * Sorted by text.
   */
  typing_text_to_krama_map: [text: string, TypingTextToKramaValue][];
};

type CommonScriptData = {
  /** Text of each krama key in the script, at the index of the key in the krama array.
   * Empty if the script does not have it.
   *
   * For lookups runtimes build a hash map from it, the first index of a text wins.
   */
  krama_text_arr: string[];
  /** `string` used for search. Usable for Duplication Remova, Fallback Behaviour
   * and for `other` scripts type. Like Normal
   * Sorted by text (runtimes load it into a hash map) */
  text_to_krama_map: [text: string, TextToKramaValue][];
  /**
   * The map used instead of Normal's `text_to_krama_map` for typing mode. Only the difference
   * from `SharedScriptData.typing_text_to_krama_map` is stored: an entry replaces the shared entry
   * of that text (or adds a new one), `null` removes it. The typing map of the script is the
   * result sorted by text.
   *
   * Not present for a script without a typing map (Normal, it is the typing input itself).
   *
   * Sorted by text.
   */
  typing_text_to_krama_map?: [text: string, TypingTextToKramaValue | null][];
  /** Custom Script Characters not present in the common krama key data
   *
   * This will be a sorted array.
   */
  custom_script_chars_arr: [
    text: string,
    /** Type of the custom script character, `null` if it is not a vyanjana. A dead consonant
     * (vyanjana + halant, eg:- Malayalam chillu ൻ) is not one, as it takes no halant and no
     * vowel sign after it */
    type: KramaType | null,
    /** The Normal text key of the custom script character (a key of the typing map of the script).
     *
     * This is needed here as there is no equivalent of it present in the krama data
     */
    normal_key: string | null
  ][];
};

export type OutputBrahmicScriptData = Pick<
  InputBrahmicScriptType,
  'script_name' | 'script_id' | 'halant' | 'nuqta' | 'schwa_property' | 'script_type'
> &
  CommonScriptData & {
    /** Krama indexes whose type in this script is not the one in
     * `SharedScriptData.krama_type_arr` */
    krama_type_overrides?: [krama_index: number, type: KramaType | null][];
    /** The svara whose mAtrA is not the next krama index. Needed in other -> brahmic conversion.
     * `-1` if the svara has no mAtrA.
     *
     * Eg. Brahmi writes both आ krama keys as 𑀆, with the mAtrA 𑀸 of the first one */
    svara_mAtrA_krama_overrides?: [svara_krama_index: number, mAtrA_krama_index: number][];
    /** Index in `text_to_krama_map` of a sign written as a consonant + halant (the Tamil anusvAra
     * ம்). Where the sign cannot be it is that consonant + halant. Not present if the script has none */
    dead_consonant_sign_index?: number;
  };

export type OutputOtherScriptData = Pick<
  InputOtherScriptType,
  'script_name' | 'script_id' | 'script_type' | 'schwa_character'
> &
  CommonScriptData;

/** The stored data of a script (`src/script_data/<script>.json`) */
export type OutputScriptData = OutputBrahmicScriptData | OutputOtherScriptData;

// ---------------------------------------------------------------------------------------------
// Expanded shape (not stored)
// ---------------------------------------------------------------------------------------------

type ExpandedCommonScriptData = {
  /** Stores the key of the current script along with the reference to the index in `list` for info about the key
   * `string` is the actual key, number(nullable) is the index of the key in the compiled `list`
   */
  krama_text_arr: [krama_key: string, list_arr_ref: number | null][];
  /** Same as in `OutputScriptData`, with the type as a reference to a `list` item */
  text_to_krama_map: [
    text: string,
    {
      next?: string[] | null;
      krama?: number[] | null;
      /** This will be useful to get info related to the fallback if they happen to be a svara or a vyanjana
       * eg. The Malayalam .n,.N, etc
       */
      fallback_list_ref?: number | null;
    }
  ][];
  /** Type info of the krama keys and of the matched texts. Only the `type` (and the
   * `mAtrA_krama_ref` of a svara) is read. */
  list: {
    /** Indexes of the entries in `krama_text_arr` which refer to this item */
    krama_ref: number[];
    type: NonNullable<NonNullable<InputOtherScriptType['list']>[number]['type']>;
  }[];
  /**
   * This map is a alternate map to be used instead of Normal's `text_to_krama_map` for typing mode.
   * It contains references to both `list` (for `type` info) and also to `custom_script_chars`
   *
   * This will be a sorted array
   */
  typing_text_to_krama_map: [
    text: string,
    {
      next?: string[] | null;
      krama?: number[] | null;
      /** Reference to a custom script character of that script */
      custom_back_ref?: number | null;
      /** Only set for the `treat_as_anya` typing keys (eg. `.A`, `.LR` and their intermediate
       * states like `.L`): points to an `anya` list item, so the typing context does not treat
       * them as a `mAtrA` of the previous vyanjana */
      fallback_list_ref?: number | null;
    }
  ][];
  /** Custom Script Characters not present in the common krama key data
   *
   * This will be a sorted array.
   */
  custom_script_chars_arr: [
    text: string,
    /** This will be used to deterime the type of the custom script character, `null` if
     * it is not a vyanjana. A dead consonant (vyanjana + halant, eg:- Malayalam chillu ൻ)
     * is not one, as it takes no halant and no vowel sign after it */
    list_ref: number | null,
    /** Index in `typing_text_to_krama_map` of the Normal text key of the custom script character.
     *
     * This is needed here as there is no equivalent of it present in the krama data
     */
    custom_ref: number | null
  ][];
};

export type ExpandedBrahmicScriptData = Pick<
  InputBrahmicScriptType,
  'script_name' | 'script_id' | 'halant' | 'nuqta' | 'schwa_property' | 'script_type'
> &
  Omit<ExpandedCommonScriptData, 'list'> & {
    list: (Pick<ExpandedCommonScriptData['list'][number], 'krama_ref'> &
      (
        | {
            type: Exclude<InputBrahmicScriptType['list'][number]['type'] | 'mAtrA', 'svara'>;
          }
        | {
            type: 'svara';
            mAtrA_krama_ref: number[];
            // ^ needed in other -> brahmic conversion
          }
      ))[];
  };

export type ExpandedOtherScriptData = Pick<
  InputOtherScriptType,
  'script_name' | 'script_id' | 'script_type' | 'schwa_character'
> &
  ExpandedCommonScriptData;

/** The shape the transliteration works on, built with `expand_script_data` */
export type ExpandedScriptData = ExpandedBrahmicScriptData | ExpandedOtherScriptData;
