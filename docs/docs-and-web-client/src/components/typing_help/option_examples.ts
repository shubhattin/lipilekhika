import type { ScriptListType } from 'lipilekhika';
import { createTypingContext } from 'lipilekhika/typing';

export type TypingOptionExamples = {
  /** what typing `k` gives without / with the inherent vowel */
  vowel: { off: string; on: string } | null;
  /** what typing `1` gives without / with native numerals */
  numerals: { off: string; on: string } | null;
};

const typeKeys = async (
  script: ScriptListType,
  keys: string,
  options: { includeInherentVowel?: boolean; useNativeNumerals?: boolean }
) => {
  const ctx = createTypingContext(script, options);
  await ctx.ready;
  let out = '';
  for (const key of keys) {
    const diff = await ctx.takeKeyInput(key);
    out = out.slice(0, out.length - diff.to_delete_chars_count) + diff.diff_add_text;
  }
  return out;
};

const cache = new Map<ScriptListType, Promise<TypingOptionExamples>>();

/**
 * Real examples of the two typing options in a script, made by typing with each setting.
 * An option that makes no difference in the script (as in the Latin ones) is `null`.
 */
export const getTypingOptionExamples = (script: ScriptListType) => {
  let examples = cache.get(script);
  if (!examples) {
    examples = (async () => {
      const [vowelOff, vowelOn, numOff, numOn] = await Promise.all([
        typeKeys(script, 'k', { includeInherentVowel: false }),
        typeKeys(script, 'k', { includeInherentVowel: true }),
        typeKeys(script, '1', { useNativeNumerals: false }),
        typeKeys(script, '1', { useNativeNumerals: true })
      ]);
      return {
        vowel: vowelOff !== vowelOn ? { off: vowelOff, on: vowelOn } : null,
        numerals: numOff !== numOn ? { off: numOff, on: numOn } : null
      };
    })();
    // a failed load shouldn't stick
    examples.catch(() => cache.delete(script));
    cache.set(script, examples);
  }
  return examples;
};
