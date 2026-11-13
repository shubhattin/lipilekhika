import type { KramaKeysExtendedType, KramaKeysLabelType } from './krama_array_keys';
import type { script_list_type } from './lang_list';

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
  /** Other texts that are read as this key (read only, the output uses `text`). Eg:- Romanized
   * capitals (`Ā` of `ā`), alternate spellings (ISO `r̥` of `ṛ`), characters of older versions.
   *
   * The canonically equivalent forms (Unicode NFD / NFC) of `text` are added automatically, eg.
   * `क़` as `क` + `़`, they need not be listed here. Only a form that normalization does not give
   * from `text` is listed: Gurumukhi `ਲ਼` (U+0A33) of `ਲ` + `਼`, as U+0A33 is not composed back.
   * In the processing/compiling step it should be verified as a key of this list, display and throw the error
   */
  duplicates?: string[];
  /** Texts that are this key followed by a halant, a dead consonant (only for a `vyanjana`).
   * Eg. Malayalam chillu letters :- ൻ is ന് (न्)
   */
  halant_duplicates?: string[];
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
      /** Treat the duplicate keys (and their intermediate typing states) as `anya` in the
       * typing context, where they would otherwise resolve to a `mAtrA`.
       *
       * Used for the standalone mAtrA keys like `.A` -> `ा`: they are not attached to the
       * previous vyanjana (`k.A` -> `क्ा`, or `का` with inherent vowel), like any other anya.
       * Implemented as a `fallback_list_ref` to an `anya` list item (brahmic scripts only).
       */
      treat_as_anya?: boolean;
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
    }
  | {
      type: 'krama_sequence';
      /** The typing key */
      text: string;
      /** The krama keys it types, as one match: `x` -> `k halant Sh` (क्ष).
       * Its type in the typing context is the one of the first krama key (`k`, a vyanjana).
       */
      krama_keys: KramaKeysLabelType[];
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
  // ranges?: [[number, number][]];
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
          /** Other texts that are read as the mAtrA (read only), like `duplicates`. Its
           * canonically equivalent forms (eg. Malayalam `ൊ` as `െ` + `ാ`) are added
           * automatically, they need not be listed. */
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
  /** Read the capital forms of the texts too (only read, the output stays as it is): the first
   * letter capital (`Kh`, `Ā`) and all of them (`KH`, `AI`). For a scheme where capital letters
   * have no meaning of their own, like IAST (`Kṛṣṇa`, `RĀMA`). Not for one that uses them as
   * letters (Harvard-Kyoto `T` ट, SLP1 `K` ख). A capital form that is already a text keeps it.
   */
  case_insensitive?: boolean;
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
