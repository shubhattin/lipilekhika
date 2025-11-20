import type { InputBrahmicScriptType, InputOtherScriptType } from './input_script_data_schema';

type CommonScriptData = {
  /** Stores the key of the current script along with the reference to the index in `list` for info about the key
   * `string` is the actual key, number(nullable) is the index of the key in the compiled `list`
   */
  krama_text_map: [string, number | null][];
  /** To be used for binary search on the `krama_key_map` */
  krama_text_map_index: number[];
  /** `string` used for search. Usable for Duplication Remova, Fallback Behaviour
   * and for `other` scripts type. Like Normal */
  text_to_krama_map: [string, { next?: string | null; kram_index?: number[] | null }][];
  /** To be used for binary search on the `key_to_krama_map` */
  text_to_krama_map_index: number[];
};

export type OutputBrahmicScriptData = Pick<
  InputBrahmicScriptType,
  'script_name' | 'script_id' | 'halant' | 'nuqta' | 'schwa_property' | 'script_type'
> &
  CommonScriptData & {
    list: {
      /** Indexes of the the corresponding entries in `krama_key_map` corresponding to the `key_krama` */
      krama_ref: number[];
      type: InputBrahmicScriptType['list'][number]['type'];
      /** Only defined for type `svara` */
      mAtrA_krama_ref?: number[];
    }[];
  };

export type OutputOtherScriptData = Pick<
  InputOtherScriptType,
  'script_name' | 'script_id' | 'script_type'
> &
  CommonScriptData & {
    list: {
      /** Indexes of the the corresponding entries in `krama_key_map` corresponding to the `key_krama` */
      krama_ref: number[];
      type?: NonNullable<InputOtherScriptType['list']>[number]['type'];
    }[];
  };

export type OutputScriptData = OutputBrahmicScriptData | OutputOtherScriptData;
