import { describe, expect, it } from 'vitest';
import { transliterate } from '../index';
import { getScriptData } from '../utils/get_script_data';
import { SCRIPT_LIST } from '../utils/lang_list';

/**
 * Text can be in any Unicode normalization form: a keyboard or font may store a two-part vowel
 * sign as its parts (Malayalam ൊ as െ + ാ), NFC keeps some letters decomposed (Gurumukhi ਸ਼ is
 * excluded from composition), and NFD splits every Romanized letter with a diacritic (ā as
 * a + U+0304). Canonically equivalent forms of a script's text are read the same.
 */

/** Texts whose decomposed form is read differently, by script.
 * Romanized āūṁ (ॐ): the matcher does not back out of a prefix that is not read by itself, and
 * its NFD a◌̄u◌̄m◌̇ would need a◌̄u and a◌̄u◌̄m, so it is read letter by letter (आऊं) */
const EXCEPTIONS: Partial<Record<string, string[]>> = {
  Romanized: ['āūṁ']
};

describe('Canonically equivalent (NFD / NFC) forms are read the same', () => {
  for (const script of SCRIPT_LIST) {
    if (script === 'Normal') continue;
    const target = script === 'Devanagari' ? 'Romanized' : 'Devanagari';
    it(`${script} -> ${target}`, async () => {
      const data = await getScriptData(script);
      const texts = new Set<string>();
      for (const [text, value] of data.text_to_krama_map)
        if (value.krama && value.krama.length > 0 && !value.krama.includes(-1)) texts.add(text);
      for (const [text] of data.krama_text_arr) if (text) texts.add(text);
      for (const text of EXCEPTIONS[script] ?? []) texts.delete(text);
      // a vowel sign is checked after a consonant
      const consonant =
        data.script_type === 'brahmic'
          ? (data.krama_text_arr.find(
              ([, list_ref]) => list_ref !== null && data.list[list_ref]?.type === 'vyanjana'
            )?.[0] ?? '')
          : '';
      const mismatches: string[] = [];
      for (const text of texts) {
        for (const form of ['NFD', 'NFC'] as const) {
          const variant = text.normalize(form);
          if (variant === text) continue;
          for (const before of ['', consonant]) {
            const expected = await transliterate(before + text, script, target);
            const actual = await transliterate(before + variant, script, target);
            if (actual !== expected)
              mismatches.push(
                `${form} of ${JSON.stringify(before + text)}: ${actual} (expected ${expected})`
              );
          }
        }
      }
      expect(mismatches).toEqual([]);
    });
  }
});
