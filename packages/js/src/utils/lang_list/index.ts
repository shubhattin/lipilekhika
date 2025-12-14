// ALWAYS BE CAREFUL BEFORE CHANGING LANG JSON
// AS CHNAGE IN PRE-EXISTING LANG IDS WOULD CAUSE DATA MISMATCHs

import langs from './langs.json';
const { script_list, lang_list } = langs;

export type script_list_type = keyof typeof script_list;
export const SCRIPT_LIST = Object.keys(script_list) as script_list_type[];
export const SCRIPT_LIST_IDS = Object.values(script_list);

export const get_script_from_id = (id: number) => {
  return SCRIPT_LIST[SCRIPT_LIST_IDS.indexOf(id)] as script_list_type;
};

export type lang_list_type = keyof typeof lang_list;
// the langs enum in schema.ts has to be updated manually
export const LANG_LIST = Object.keys(lang_list) as lang_list_type[];
export const LANG_LIST_IDS = Object.values(lang_list);

export const get_lang_from_id = (id: number) => {
  return LANG_LIST[LANG_LIST_IDS.indexOf(id)] as lang_list_type;
};

export type script_and_lang_list_type = script_list_type | lang_list_type;
export const ALL_LANG_SCRIPT_LIST = Array.from(
  new Set([...LANG_LIST, ...SCRIPT_LIST])
) as script_and_lang_list_type[];

export { lang_list as lang_list_obj, script_list as script_list_obj };

export const LANG_SCRIPT_MAP: Record<lang_list_type, script_list_type> = {
  Bengali: 'Bengali',
  Gujarati: 'Gujarati',
  Hindi: 'Devanagari',
  Kannada: 'Kannada',
  Malayalam: 'Malayalam',
  Odia: 'Odia',
  Sinhala: 'Sinhala',
  Tamil: 'Tamil',
  Telugu: 'Telugu',
  English: 'Normal',
  Sanskrit: 'Devanagari',
  Marathi: 'Devanagari',
  Nepali: 'Devanagari',
  Punjabi: 'Gurumukhi',
  Assamese: 'Assamese'
};
