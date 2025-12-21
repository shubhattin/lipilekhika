import type { CustomOptionType } from './transliteration/transliterate';
import type {
  lang_list_type,
  script_and_lang_list_type,
  script_list_type
} from './utils/lang_list';
import type { script_input_name_type } from './utils/lang_list/script_normalization';

/**
 * Custom Transliteration Options
 */
export type TransliterationOptions = CustomOptionType;

/** Type of the script list */
export type ScriptListType = script_list_type;
/** Type of the language list */
export type LangListType = lang_list_type;
/** Type of the script and language list */
export type ScriptAndLangListType = script_and_lang_list_type;

/**
 * Supported script/language identifier types
 */
export type ScriptLangType = script_input_name_type;
