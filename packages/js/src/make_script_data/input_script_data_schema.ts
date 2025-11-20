import type { KramaKeysType } from '../interlang_array_keys';
import type { script_list_type } from '../utils/lang_list';

/*
 * These types are not the final types to be used by conversion engine.
 * These are defined for organzing the script data
 * For actual application use it will compiled into a more direct and efficient usable format
 */

export type CommonListTypeAttributes = {
  key: string;
  /** In the post processing step the keys for which it is not mapped shall be left empty.
   * It can map to multiple krama keys
   * Each key should have at least one key krama. Scan for this too in the compilation step.
   */
  key_krama: KramaKeysType[];
  /** This contains duplicates of the key, for eg:- some nuqta sysmbols and mAtrAs.
   * In the processing/compiling step it should be verified are a key of this list, display and throw the error
   */
  duplicates?: string[];
  /** In case if no entry is found for the key in krama even after de-duplication resolution
   * then fallback array will be used. Like for malayalam .100 it can be .1+.0+.0
   */
  fallback?: KramaKeysType[];
};

export type InputBrahmicScriptType = {
  script_name: script_list_type;
  script_id: number;
  script_type: 'brahmic';
  halant: string;
  nuqta?: string;
  /**
   * Schwa deletion indicator for the script(or rather language in most cases).
   * This will be used for live typing and not for conversion.
   * It can be overriden later on provided as a argument in the typing tool
   */
  schwa_property: boolean;
  /**
   * This Has a lower precendence that the auto generated/compiled krama key map from the `list` items. So it will be overwritten by them.
   * Moreover the keys here will not be checked to exist in `list`. This allows direct keymaps and can be useful for scripts like Normal, Romanized
   */
  manual_krama_key_map?: {
    [key in KramaKeysType]: string;
  };
  /** One important need of this list is to just contain information about the keys.
   * The keys for which it does not contain information can be considered as type `anya`.
   * So not all keys need to be present in this list.
   */
  list: (CommonListTypeAttributes &
    (
      | {
          type: 'svara';
          mAtrA: string;
          mAtrA_key_krama: KramaKeysType[];
          mAtrA_duplicates?: string[];
          mAtrA_fallback?: KramaKeysType[];
        }
      | { type: 'vyanjana' | 'anya' }
    ))[];
  /*
   * In Brahmic Scripts
   - svara -> vowels
   - vyanjana -> consonants
   - anya -> other
  */
};

export type InputOtherScriptType = {
  script_name: script_list_type;
  script_id: number;
  script_type: 'other';
  manual_krama_key_map: {
    [key in KramaKeysType]: string;
  };
  /** This might not be needed here usually as most of the work would be done using the `manual_krama_key_map` */
  list?: (CommonListTypeAttributes & {
    /** `type` is kind of redundant here as other scritps dont have a concept of svara and vyanjana */
    type?: 'anya';
  })[];
};

export type InputScriptInfoType = InputBrahmicScriptType | InputOtherScriptType;
