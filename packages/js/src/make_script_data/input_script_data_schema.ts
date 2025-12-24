import type { KramaKeysExtendedType, KramaKeysLabelType } from './krama_array_keys';
import type { script_list_type } from '../utils/lang_list';

/*
 * These types are not the final types to be used by conversion engine.
 * These are defined for organizing the script data
 * For actual application use it will compiled into a more direct and efficient usable format
 */

export type CommonListTypeAttributes = {
  text: string;
  /** In the post processing step the keys for which it is not mapped shall be left empty.
   * It can map to multiple krama keys
   * Each key should have at least one key krama. Scan for this too in the compilation step.
   */
  text_krama: KramaKeysExtendedType[];
  /** This contains duplicates of the key, for eg:- some nuqta symbols and mAtrAs.
   * In the processing/compiling step it should be verified as a key of this list, display and throw the error
   */
  duplicates?: string[];
  /** In case if no entry is found for the key in krama even after de-duplication resolution
   * then fallback array will be used. Like for malayalam .100 it can be .1+.0+.0
   * If the fallback array is not provided, then the key_krama should be empty and will also be ignored
   */
  fallback?: KramaKeysExtendedType[];
  /** Prevent Auto Matching
   * Useful for Cases where we dont want to use the text referenced in the key to be used for transliteration from that script to another script
   * Like when changing from Tamil to Devanagari , kirupA it should be kirupA and not kRpA.
   * So we can prevent the list item "text": iru, krama R) from being used to reduce itself from that form during transliteration
   */
  prevent_auto_matching?: boolean;
};

/**
 * Custom Structure which will be used for typing mode, _`normal_to_all:use_typing_chars`_
 * and _`all_to_normal:preserve_specific_chars`_
 *
 * Eg. :- U -> uu, oo, I -> ii, ee
 */
export type InputTypingListDataType =
  | {
      type: 'duplicates';
      /** This is Normal key for which duplicates have to be defined */
      ref_krama_key: KramaKeysLabelType;
      duplicates: string[];
    }
  | {
      type: 'custom_script_char';
      /** This is the specific text which has to be mapped.
       *
       * Eg. :- Tamil and Malayalam :- 10, 100 and 1000 |
       * Malayalam :- Specific versions of a new characters (Chillu versions nz, N, rz, l, lz and k)
       */
      specific_text: string;
      /** This is the custom normal mapping that will be used for reverse mapping also
       * as for this no equivalent krama key mapping exists
       */
      custom_normal_key: string;
    };

export type InputBrahmicScriptType = {
  script_name: script_list_type;
  script_id: number;
  script_type: 'brahmic';
  /**
   * An attribute for some ancient scripts which use 4 byte utf-8 representation.
   * Instead of the usual 3 byte for most modern indian scripts.
   * Examples(non-bmp scripts): Brahmi, Grantha, Siddham, Sharada, Modi, etc.
   *
   * BMP (Basic Multilingual Plane)
   */
  non_bmp_script?: boolean;
  /**
   * A sorted range array. Used to check if the incomming character has to be processed or can be ignored.
   * Main Ranges will be specified manually (Like for a Brahmic Script). And Ranges for Additional charcters used shall be added manually
   *
   * This will help us more strictly specify what to process and what not to.
   * In future this will be a mandatory field and ?
   */
  ranges?: [[number, number][]];
  halant: string;
  nuqta?: string;
  /**
   * Schwa deletion indicator for the script(or rather language in most cases).
   * This will be used for live typing and not for conversion.
   * It can be overriden later on provided as a argument in the typing tool
   */
  schwa_property: boolean;
  /**
   * This has a lower precedence than the auto generated/compiled krama key map from the `list` items. So it will be overwritten by them.
   * Moreover the keys here will not be checked to exist in `list`. This allows direct keymaps and can be useful for scripts like Normal, Romanized
   * Intermediate steps will be auto generated. Eg. for Normal ख : kh will add both k (next h) and kh in the
   */
  manual_krama_text_map?: {
    [key in KramaKeysExtendedType]?: string;
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
          mAtrA_text_krama: KramaKeysExtendedType[];
          mAtrA_duplicates?: string[];
          mAtrA_fallback?: KramaKeysExtendedType[];
        }
      | { type: 'vyanjana' | 'anya' }
    ))[];
  /*
   * In Brahmic Scripts
   - svara -> vowels
   - vyanjana -> consonants
   - anya -> other
  */
  typing_list: InputTypingListDataType[];
};

export type InputOtherScriptType = {
  script_name: script_list_type;
  script_id: number;
  script_type: 'other';
  /** Schwa deletion character, usually `a` */
  schwa_character: string;
  manual_krama_text_map: {
    [key in KramaKeysExtendedType]?: string;
  };
  /** This might not be needed here usually as most of the work would be done using the `manual_krama_text_map` */
  list?: (CommonListTypeAttributes & {
    /** `type` is kind of redundant here as other scripts don't have a concept of svara and vyanjana */
    type?: 'anya';
  })[];
  typing_list: InputTypingListDataType[];
};

export type InputScriptInfoType = InputBrahmicScriptType | InputOtherScriptType;
