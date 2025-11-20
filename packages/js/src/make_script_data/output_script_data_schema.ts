import type { InputBrahmicScriptType, InputOtherScriptType } from './input_script_data_schema';

type CommonScriptData = {
  /** Stores the key of the current script along with the reference to the index in `list` for info about the key
   * `string` is the actual key, number(nullable) is the index of the key in the compiled `list`
   */
  krama_key_map: [string, number | null][];
  /** To be used for binary search on the `krama_key_map` */
  krama_key_map_index: number[];
  /** `string` used for search. Usable for Duplication Remova, Fallback Behaviour
   * and for `other` scripts type. Like Normal */
  key_to_krama_map: [string, { next?: string | null; kram_index?: number[] | null }][];
  /** To be used for binary search on the `key_to_krama_map` */
  key_to_krama_map_index: number[];
};

export type OutputBrahmicScriptData = Pick<
  InputBrahmicScriptType,
  'script_name' | 'script_id' | 'halant' | 'nuqta' | 'schwa_property' | 'script_type'
> &
  CommonScriptData & {
    list: {
      /** Index of the the corresponding entry in `krama_key_map` */
      krama_ref: number;
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
      /** Index of the the corresponding entry in `krama_key_map` */
      krama_ref: number;
      type?: NonNullable<InputOtherScriptType['list']>[number]['type'];
    }[];
  };

export type OutputScriptData = OutputBrahmicScriptData | OutputOtherScriptData;
