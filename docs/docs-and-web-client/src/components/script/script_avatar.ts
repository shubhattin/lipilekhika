import { type ScriptLangType, type ScriptListType, getNormalizedScriptName } from 'lipilekhika';

export const SCRIPT_AVATAR_MAP: Record<ScriptListType, string> = {
  Devanagari: 'अ',
  Telugu: 'అ',
  Tamil: 'அ',
  'Tamil-Extended': 'அ',
  Bengali: 'অ',
  Kannada: 'ಅ',
  Gujarati: 'અ',
  Malayalam: 'അ',
  Odia: 'ଅ',
  Sinhala: 'අ',
  Normal: 'a',
  Romanized: 'ā',
  ITRANS: 'IT',
  'Harvard-Kyoto': 'HK',
  SLP1: 'SL',
  Gurumukhi: 'ਅ',
  Assamese: 'অ',
  Siddham: '𑖀',
  'Purna-Devanagari': 'अ',
  Brahmi: '𑀅',
  Granth: '𑌅',
  Modi: '𑘀',
  Sharada: '𑆃'
};

export const getScriptAvatar = (script: ScriptLangType) => {
  const normalizedScript = getNormalizedScriptName(script);
  if (!normalizedScript) return 'अ';
  return SCRIPT_AVATAR_MAP[normalizedScript];
};
