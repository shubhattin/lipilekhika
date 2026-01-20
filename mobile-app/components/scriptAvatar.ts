import type { ScriptListType } from "lipilekhika";
import { getNormalizedScriptName, type ScriptLangType } from "lipilekhika";

/**
 * Map of script names to their representative avatar characters
 */
export const SCRIPT_AVATAR_MAP: Record<ScriptListType, string> = {
  Devanagari: "अ",
  Telugu: "అ",
  Tamil: "அ",
  "Tamil-Extended": "அ",
  Bengali: "অ",
  Kannada: "ಅ",
  Gujarati: "અ",
  Malayalam: "അ",
  Odia: "ଅ",
  Sinhala: "අ",
  Normal: "a",
  Romanized: "ā",
  Gurumukhi: "ਅ",
  Assamese: "অ",
  Siddham: "𑖀",
  "Purna-Devanagari": "अ",
  Brahmi: "𑀅",
  Granth: "𑌅",
  Modi: "𑘀",
  Sharada: "𑆃",
};

/**
 * Get the avatar character for a script
 */
export const getScriptAvatar = (script: ScriptLangType): string => {
  const normalizedScript = getNormalizedScriptName(script);
  if (!normalizedScript) return "अ";
  return SCRIPT_AVATAR_MAP[normalizedScript];
};
