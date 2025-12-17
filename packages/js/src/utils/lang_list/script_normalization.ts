import {
  type lang_list_type,
  type script_and_lang_list_type,
  type script_list_type,
  LANG_LIST,
  LANG_SCRIPT_MAP,
  SCRIPT_LIST
} from '.';

const ALTERNATES = [
  /* Script Alternates */
  'dev', // Devanagari
  'te', // Telugu
  'tel', // Telugu
  'tam', // Tamil
  'tam-ex', // Tamil-Extended
  'ben', // Bengali
  'be', // Bengali
  'ka', // Kannada
  'kan', // Kannada
  'gu', // Gujarati
  'guj', // Gujarati
  'mal', // Malayalam
  'or', // Odia
  'od', // Odia
  'oriya', // Odia
  'si', // Sinhala
  'sinh', // Sinhala
  'sin', // Sinhala
  'en', // Normal
  'eng', // Normal
  'la', // Normal
  'lat', // Normal
  'rom', // romanized
  'gur', // Gurumukhi
  'as', // Assamese

  /* Language Alternates (Do not repeat) */
  'sa', // Devanagari (Sanskrit)
  'san', // Devanagari (Sanskrit)
  'hin', // Devanagari (Hindi)
  'hi', // Devanagari (Hindi)
  'mar', // Devanagari (Marathi)
  'ne', // Devanagari (Nepali)
  'nep', // Devanagari (Nepali)
  'pun' // Gurumukhi (Punjabi)
] as const;

export type alternate_script_type = (typeof ALTERNATES)[number];

const ALTERNATE_TO_SCRIPT_MAP: Record<alternate_script_type, script_list_type> = {
  dev: 'Devanagari',
  te: 'Telugu',
  tel: 'Telugu',
  tam: 'Tamil',
  'tam-ex': 'Tamil-Extended',
  ben: 'Bengali',
  be: 'Bengali',
  ka: 'Kannada',
  kan: 'Kannada',
  gu: 'Gujarati',
  guj: 'Gujarati',
  mal: 'Malayalam',
  or: 'Odia',
  od: 'Odia',
  oriya: 'Odia',
  si: 'Sinhala',
  sinh: 'Sinhala',
  sin: 'Sinhala',
  en: 'Normal',
  eng: 'Normal',
  la: 'Normal',
  lat: 'Normal',
  rom: 'Romanized',
  gur: 'Gurumukhi',
  as: 'Assamese',
  sa: 'Devanagari',
  san: 'Devanagari',
  hin: 'Devanagari',
  hi: 'Devanagari',
  mar: 'Devanagari',
  ne: 'Devanagari',
  nep: 'Devanagari',
  pun: 'Gurumukhi'
} as const;

function capitalizeFirstAndAfterDash(str: string): string {
  // Lowercase the string first, then capitalize first and after dash
  return str.toLowerCase().replace(/(^|-)([a-z])/g, (_, p1, p2) => p1 + p2.toUpperCase());
}

export type script_input_name_type = alternate_script_type | script_and_lang_list_type;

export const getNormalizedScriptName = (name: script_input_name_type): script_list_type | null => {
  const capitalizedName = capitalizeFirstAndAfterDash(name);
  if (SCRIPT_LIST.includes(capitalizedName as script_list_type))
    return capitalizedName as script_list_type;
  if (LANG_LIST.includes(capitalizedName as lang_list_type))
    return LANG_SCRIPT_MAP[capitalizedName as lang_list_type];
  if (name.toLocaleLowerCase() in ALTERNATE_TO_SCRIPT_MAP)
    return ALTERNATE_TO_SCRIPT_MAP[name.toLocaleLowerCase() as alternate_script_type];
  return null;
};
