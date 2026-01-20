import type { ScriptListType } from "lipilekhika";

/**
 * Category names for script grouping
 */
export const CATEGORIES = {
  modern: "Modern Indian Scripts",
  romanized: "Romanization Scripts",
  ancient: "Ancient Scripts",
} as const;

export type CategoryKey = keyof typeof CATEGORIES;

/**
 * Script to category mapping for custom ordering
 */
export const SCRIPT_CATEGORIES: Record<ScriptListType, CategoryKey> = {
  Devanagari: "modern",
  Telugu: "modern",
  Tamil: "modern",
  Bengali: "modern",
  Kannada: "modern",
  Gujarati: "modern",
  Malayalam: "modern",
  Odia: "modern",
  Gurumukhi: "modern",
  Assamese: "modern",
  Sinhala: "modern",
  "Tamil-Extended": "modern",
  "Purna-Devanagari": "modern",
  // romanized
  Normal: "romanized",
  Romanized: "romanized",
  // ancient
  Brahmi: "ancient",
  Sharada: "ancient",
  Granth: "ancient",
  Modi: "ancient",
  Siddham: "ancient",
};

/**
 * Get scripts grouped by category
 */
export const getScriptsByCategory = (
  category: CategoryKey,
): ScriptListType[] => {
  return (Object.entries(SCRIPT_CATEGORIES) as [ScriptListType, CategoryKey][])
    .filter(([, cat]) => cat === category)
    .map(([script]) => script);
};

/**
 * Get all scripts in order (by category)
 */
export const getAllScriptsOrdered = (): ScriptListType[] => {
  const categories: CategoryKey[] = ["modern", "romanized", "ancient"];
  return categories.flatMap(getScriptsByCategory);
};
