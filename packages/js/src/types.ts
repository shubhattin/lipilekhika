import type { KramaKeysType } from './interlang_array_keys';

/*
 * These types are not the final types to be used by conversion engine.
 * These are defined for organzing the script data
 * For actual application use it will compiled into a more direct usable format
 */

type BrahmicScriptType = {
  script_type: 'brahmic';
  halant: string;
  nuqta?: string;
  list: ({
    key: string;
    /** This containts duplicates of the key, for eg:- some nuqta sysmbols and mAtrAs */
    duplicates?: string[];
    /** In case if no entry is found for the key in krama even after deplucation resolution
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
  script_type: 'other';
  list: { key: string }[];
};

export type ScriptInfoType = BrahmicScriptType | OtherScriptType;
