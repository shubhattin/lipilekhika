import { type ScriptLangType, type ScriptListType, getNormalizedScriptName } from 'lipilekhika';

const FONT_LIST: Record<ScriptListType, string> = {
  Devanagari: 'font-devanagari',
  'Purna-Devanagari': 'font-devanagari',
  Telugu: 'font-telugu',
  Tamil: 'font-tamil',
  'Tamil-Extended': 'font-tamil-extended',
  Bengali: 'font-bengali',
  Assamese: 'font-bengali',
  Kannada: 'font-kannada',
  Gujarati: 'font-gujarati',
  Malayalam: 'font-malayalam',
  Odia: 'font-odia',
  Sinhala: 'font-sinhala',
  Gurumukhi: 'font-gurmukhi',
  //
  Normal: 'font-normal',
  Romanized: 'font-romanized',
  //
  Brahmi: 'font-brahmi',
  Granth: 'font-grantha',
  Modi: 'font-modi',
  Sharada: 'font-sharada',
  Siddham: 'font-siddham'
};

export const getFontClass = (script: ScriptLangType) => {
  return FONT_LIST[getNormalizedScriptName(script) as ScriptListType];
};
