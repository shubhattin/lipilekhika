import type { ScriptListType } from 'lipilekhika';

export const CATEGORIES = {
  modern: 'Modern Indian Scripts',
  romanized: 'Romanization',
  standard: 'Standard Schemes',
  ancient: 'Ancient Scripts'
} as const;

/** Short labels for chips / tabs / rails */
export const CATEGORY_SHORT: Record<CategoryType, string> = {
  modern: 'Modern',
  romanized: 'Roman',
  standard: 'Schemes',
  ancient: 'Ancient'
};

export type CategoryType = keyof typeof CATEGORIES;

/**
 * Used both for categorization and custom ordering of scripts.
 */
export const SCRIPT_CATEGORY: Record<ScriptListType, CategoryType> = {
  Devanagari: 'modern',
  Telugu: 'modern',
  Tamil: 'modern',
  Bengali: 'modern',
  Kannada: 'modern',
  Gujarati: 'modern',
  Malayalam: 'modern',
  Odia: 'modern',
  Gurumukhi: 'modern',
  Assamese: 'modern',
  Sinhala: 'modern',
  'Tamil-Extended': 'modern',
  'Purna-Devanagari': 'modern',
  // romanized
  Normal: 'romanized',
  Romanized: 'romanized',
  // standard romanization schemes
  IAST: 'standard',
  ITRANS: 'standard',
  'Harvard-Kyoto': 'standard',
  SLP1: 'standard',
  // ancient
  Brahmi: 'ancient',
  Sharada: 'ancient',
  Granth: 'ancient',
  Modi: 'ancient',
  Siddham: 'ancient'
};

/** A short line under the script name; also searched */
export const SCRIPT_HINT: Partial<Record<ScriptListType, string>> = {
  Devanagari: 'Hindi, Sanskrit, Marathi, Nepali',
  Gurumukhi: 'Punjabi',
  Bengali: 'Bangla',
  Odia: 'Oriya',
  'Tamil-Extended': 'Tamil with superscript marks',
  'Purna-Devanagari': 'Devanagari for all Indian scripts',
  Normal: 'Plain English letters',
  Romanized: 'With diacritics',
  IAST: 'kṛṣṇa',
  ITRANS: 'kRRiShNa',
  'Harvard-Kyoto': 'kRSNa',
  SLP1: 'kfzRa'
};

/** Extra search terms that are not shown (codes and aliases) */
const SCRIPT_KEYWORDS: Partial<Record<ScriptListType, string[]>> = {
  Devanagari: ['dev', 'hi', 'hin', 'sa', 'san', 'mar', 'ne', 'nep'],
  Telugu: ['te', 'tel'],
  Tamil: ['tam', 'ta'],
  'Tamil-Extended': ['tam-ext', 'ta-ext'],
  Bengali: ['ben', 'be'],
  Kannada: ['ka', 'kan'],
  Gujarati: ['gu', 'guj'],
  Malayalam: ['mal'],
  Odia: ['or', 'od'],
  Sinhala: ['si', 'sin', 'sinh', 'sinhalese'],
  Gurumukhi: ['gur', 'pun', 'gurmukhi'],
  Assamese: ['as'],
  Normal: ['en', 'eng', 'english', 'latin', 'ascii'],
  Romanized: ['rom', 'roman'],
  'Harvard-Kyoto': ['hk'],
  SLP1: ['slp'],
  Granth: ['grantha']
};

export const SCRIPT_ORDER = Object.keys(SCRIPT_CATEGORY) as ScriptListType[];

export const listScripts = (have_normal_script: boolean) =>
  SCRIPT_ORDER.filter((s) => have_normal_script || s !== 'Normal');

const norm = (s: string) => s.toLowerCase().replace(/[\s_-]+/g, '');

/**
 * Ranks a script against a query: 0 = no match, higher is better.
 * Name prefix > alias exact > name/hint contains.
 */
export const scoreScript = (script: ScriptListType, query: string): number => {
  const q = norm(query);
  if (!q) return 1;
  const name = norm(script);
  if (name === q) return 100;
  if (name.startsWith(q)) return 80;
  const keywords = SCRIPT_KEYWORDS[script] ?? [];
  if (keywords.some((k) => norm(k) === q)) return 70;
  const hint = SCRIPT_HINT[script] ?? '';
  const hintWords = hint.split(/[\s,]+/).map(norm);
  if (hintWords.some((w) => w.startsWith(q))) return 60;
  if (keywords.some((k) => norm(k).startsWith(q))) return 50;
  if (name.includes(q)) return 40;
  if (norm(hint).includes(q)) return 20;
  return 0;
};

/** Scripts matching `query`, in display order */
export const filterScripts = (scripts: ScriptListType[], query: string) =>
  scripts.filter((s) => scoreScript(s, query) > 0);

export const groupByCategory = (scripts: ScriptListType[]) =>
  (Object.keys(CATEGORIES) as CategoryType[])
    .map((category) => ({
      category,
      scripts: scripts.filter((s) => SCRIPT_CATEGORY[s] === category)
    }))
    .filter((g) => g.scripts.length > 0);

/**
 * Centres the item with `data-value=value` inside `list` by scrolling only the list
 * (`scrollIntoView` would also scroll the page).
 */
export const centerItemInList = (list: HTMLElement | null, value: string) => {
  const el = list?.querySelector<HTMLElement>(`[role="option"][data-value="${CSS.escape(value)}"]`);
  if (!list || !el) return;
  const l = list.getBoundingClientRect();
  const e = el.getBoundingClientRect();
  list.scrollTop += e.top - l.top - (list.clientHeight - e.height) / 2;
};
