import type { InputBrahmicScriptType, InputOtherScriptType } from './input_script_data_schema';

type CommonScriptData = {
  /** Stores the key of the current script along with the reference to the index in `list` for info about the key
   * `string` is the actual key, number(nullable) is the index of the key in the compiled `list`
   */
  krama_text_arr: [krama_key: string, list_arr_ref: number | null][];
  /** To be used for binary search on the `krama_key_map` */
  krama_text_arr_index: number[];
  /** `string` used for search. Usable for Duplication Remova, Fallback Behaviour
   * and for `other` scripts type. Like Normal
   * This will be a sorted array, so binary search can be directly used in it */
  text_to_krama_map: [
    text: string,
    {
      next?: string[] | null;
      /** Multiple krama index references are useful to some intermediate states. For eg:- Normal A -> A, AU -> A, U and AUM -> AUM
       * This will be useful only when there are more than two transition states. As double transition state outputs dont need multiple krama references.
       * For eg -> The Bengali kz (actually k + nukta) will be a two step mapping, k -> k (next :nukta,... ) and k+nukta->kz krama reference in the main transliteration array
       * There is also an option to prevent this auto behaviour. Like for tamil we dont iru in tamil to map to R in krama key so we manually disable it
       * This can also be used to define the fallback combination. The array allows a multiple krama keys to be combined together to form a fallback
       * Like .100 = .1+.0+.0
       */
      krama?: number[] | null;
      /** This will be useful to get info related to the fallback if they happen to be a svara or a vyanjana
       * eg. The Malayalam .n,.N, etc
       */
      fallback_list_ref?: number | null;
    }
  ][];
  list: {
    /** Indexes of the the corresponding entries in `krama_key_map` corresponding to the `key_krama` */
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
      /** This will not be actually there, but there for type compatibility */
      fallback_list_ref?: number | null;
    }
  ][];
  /** Custom Script Characters not present in the common krama key data
   *
   * This will be a sorted array.
   *
   * For list_ref the element should also be a duplicate in the target script.
   * Check in text_to_krama_map if not display a warning.
   * And for backreferencing in the list use the krama_ref of the base form.
   * Eg :- Malayalam k1 is a duplicate of k, so in back_ref use k's krama_ref
   */
  custom_script_chars_arr: [
    text: string,
    /** This will be used to deterime the type of the custom script character
     * eg:- Malayalam chillu ka is a vyanjana  */
    list_ref: number | null,
    /** This will be used to get the Normal text key of the custom script character.
     *
     * This is needed here as there is no equivalent of it present in the krama data
     */
    custom_ref: number | null
  ][];
};

export type OutputBrahmicScriptData = Pick<
  InputBrahmicScriptType,
  'script_name' | 'script_id' | 'halant' | 'nuqta' | 'schwa_property' | 'script_type'
> &
  Omit<CommonScriptData, 'list'> & {
    list: (Pick<CommonScriptData['list'][number], 'krama_ref'> &
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

export type OutputOtherScriptData = Pick<
  InputOtherScriptType,
  'script_name' | 'script_id' | 'script_type' | 'schwa_character'
> &
  CommonScriptData;

export type OutputScriptData = OutputBrahmicScriptData | OutputOtherScriptData;
