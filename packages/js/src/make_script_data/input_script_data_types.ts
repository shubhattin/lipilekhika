import type { KramaKeysType } from '../interlang_array_keys';
import type { script_list_type } from '../utils/lang_list';

/*
 * These types are not the final types to be used by conversion engine.
 * These are defined for organzing the script data
 * For actual application use it will compiled into a more direct and efficient usable format
 */

type BrahmicScriptType = {
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
  schwa: boolean;
  list: ({
    key: string;
    /** In the post processing step the keys for which it is not mapped shall be left empty */
    key_krama: KramaKeysType;
    /** This contains duplicates of the key, for eg:- some nuqta sysmbols and mAtrAs.
     * In the processing/compiling step it should be verified are a key of this list, display and throw the error
     */
    duplicates?: string[];
    /** In case if no entry is found for the key in krama even after de-duplication resolution
     * then fallback array will be used. Like for malayalam .100 it can be .1+.0+.0
     */
    fallback?: KramaKeysType[];
  } & (
    | { type: 'svara'; mAtrA: string; mAtrA_duplicates?: string[] }
    | { type: 'vyanjana' | 'anya' }
  ))[];
  /*
   * In Brahmic Scripts
   - svara -> vowels
   - vyanjana -> consonants
   - anya -> other
  */
};

type OtherScriptType = {
  script_name: script_list_type;
  script_id: number;
  script_type: 'other';
  list: { key: string }[];
};

export type ScriptInfoType = BrahmicScriptType | OtherScriptType;
