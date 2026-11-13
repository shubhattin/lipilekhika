import { describe, expect, it } from 'vitest';
import { transliterate } from '../../index';
import { getScriptData } from '../../utils/get_script_data';
import { SCRIPT_LIST } from '../../utils/lang_list';
import { kramaLabelIndex } from '@lipilekhika/script-data/krama_array_keys';
import { emulateTyping } from '../test_commons';
import { getScriptTypingDataMap } from '../../typing';

/**
 * Alternate krama keys (A1, u1, g1, ...) have a distinct form only in some scripts
 * (Purna-Devanagari has all of them). Elsewhere they fall back to the plain key.
 *
 * - an alternate key is written in its own form only where the script has one, else as the plain key
 * - an alternate form is read back as the alternate key (round trip)
 * - a plain key is never read back as an alternate one
 *
 * `[alternate key, plain key, alternate text, plain text]`, texts in Purna-Devanagari
 */
const ALTERNATE_KEYS: [string, string, string, string][] = [
  ['a1-svara', 'a-svara', 'ॳ', 'अ'],
  ['a1-mAtrA', 'a-mAtrA', 'कऺ', 'क'],
  ['A1-svara', 'A-svara', 'ॴ', 'आ'],
  ['A1-mAtrA', 'A-mAtrA', 'कऻ', 'का'],
  ['u1-svara', 'u-svara', 'ॶ', 'उ'],
  ['u1-mAtrA', 'u-mAtrA', 'कॖ', 'कु'],
  ['U1-svara', 'U-svara', 'ॷ', 'ऊ'],
  ['U1-mAtrA', 'U-mAtrA', 'कॗ', 'कू'],
  ['g1', 'g', 'ॻ', 'ग'],
  ['j1', 'j', 'ॼ', 'ज'],
  ['D1', 'D', 'ॾ', 'ड'],
  ['b1', 'b', 'ॿ', 'ब']
];

const FROM = 'Purna-Devanagari';

describe('Alternate krama keys', () => {
  for (const script of SCRIPT_LIST) {
    if (script === FROM) continue;
    describe(script, () => {
      for (const [alt_key, plain_key, alt_text, plain_text] of ALTERNATE_KEYS) {
        it(`${alt_key} / ${plain_key}`, async () => {
          const data = await getScriptData(script);
          const alt_form = data.krama_text_arr[kramaLabelIndex(alt_key)][0];
          const plain_form = data.krama_text_arr[kramaLabelIndex(plain_key)][0];
          const has_distinct_form = alt_form !== plain_form;

          const alt_out = await transliterate(alt_text, FROM, script);
          const plain_out = await transliterate(plain_text, FROM, script);
          if (has_distinct_form) {
            expect(alt_out, `${alt_text} has its own form in ${script}`).not.toBe(plain_out);
            expect(await transliterate(alt_out, script, FROM)).toBe(alt_text);
          } else {
            expect(alt_out, `${alt_text} falls back to ${plain_text} in ${script}`).toBe(plain_out);
          }
          expect(await transliterate(plain_out, script, FROM)).not.toBe(alt_text);
        });
      }
    });
  }
});

/**
 * Standalone mAtrA typing keys of the alternate mAtrAs (`.a1`, `.A1`, ...): typed in the
 * script's own form where it has one, else the same as the plain key (`.a1` as `.a`)
 *
 * `[alternate key, plain key, alternate typing key, plain typing key]`
 */
const ALTERNATE_MATRA_TYPING_KEYS: [string, string, string, string][] = [
  ['a1-mAtrA', 'a-mAtrA', '.a1', '.a'],
  ['A1-mAtrA', 'A-mAtrA', '.A1', '.A'],
  ['u1-mAtrA', 'u-mAtrA', '.u1', '.u'],
  ['U1-mAtrA', 'U-mAtrA', '.U1', '.U']
];

describe('Alternate mAtrA typing keys', () => {
  for (const script of SCRIPT_LIST) {
    if (script === 'Normal') continue;
    describe(script, () => {
      for (const [
        alt_key,
        plain_key,
        alt_typing_key,
        plain_typing_key
      ] of ALTERNATE_MATRA_TYPING_KEYS) {
        it(`${alt_typing_key} / ${plain_typing_key}`, async () => {
          const data = await getScriptData(script);
          const alt_form = data.krama_text_arr[kramaLabelIndex(alt_key)][0];
          const plain_form = data.krama_text_arr[kramaLabelIndex(plain_key)][0];
          const alt_out = await emulateTyping(alt_typing_key, script);
          if (alt_form !== plain_form) {
            expect(alt_out, `${alt_typing_key} types ${alt_form} in ${script}`).toBe(alt_form);
          } else {
            expect(alt_out, `${alt_typing_key} is typed as ${plain_typing_key} in ${script}`).toBe(
              await emulateTyping(plain_typing_key, script)
            );
          }
        });
      }
    });
  }
});

describe('Typing data map', () => {
  // `.a1` falls back to the empty a mAtrA in scripts without an a1 mAtrA (Devanagari)
  it('has no empty texts in the common krama map', async () => {
    for (const script of SCRIPT_LIST) {
      if (script === 'Normal') continue;
      const { common_krama_map } = await getScriptTypingDataMap(script);
      expect(
        common_krama_map.filter(([text]) => text === ''),
        script
      ).toEqual([]);
    }
  });
});

describe('Typing data map lists every typable key', () => {
  // `x` types क्ष (a sequence of k, halant, Sh) and was not listed, as only the keys of a single
  // krama were (#186)
  it('lists x as the conjunct it types', async () => {
    // (all the letters of Romanized are `anya`)
    const expected: Record<string, [string, string]> = {
      Devanagari: ['क्ष', 'vyanjana'],
      Telugu: ['క్ష', 'vyanjana'],
      Malayalam: ['ക്ഷ', 'vyanjana'],
      Brahmi: ['𑀓𑁆𑀱', 'vyanjana'],
      Romanized: ['kṣ', 'anya']
    };
    for (const [script, [text, type]] of Object.entries(expected)) {
      const { common_krama_map } = await getScriptTypingDataMap(script as 'Devanagari');
      const item = common_krama_map.find(([, , keys]) => keys.includes('x'));
      expect(item, script).toEqual([text, type, ['x']]);
    }
  });

  it('lists every key which types a text', async () => {
    for (const script of SCRIPT_LIST) {
      if (script === 'Normal') continue;
      const [map, data] = await Promise.all([
        getScriptTypingDataMap(script),
        getScriptData(script)
      ]);
      const listed = new Set(
        [...map.common_krama_map, ...map.script_specific_krama_map].flatMap(([, , keys]) => keys)
      );
      const missing: string[] = [];
      for (const [key, value] of data.typing_text_to_krama_map) {
        // a prefix of longer keys (`AU` of `AUM`) is not a key of its own
        if (key === '' || value.next?.length) continue;
        const text =
          value.custom_back_ref !== undefined && value.custom_back_ref !== null
            ? data.custom_script_chars_arr[value.custom_back_ref][0]
            : (value.krama ?? []).map((i) => data.krama_text_arr[i]?.[0] ?? '').join('');
        // the context clearing `q`, and `.a1` in a script without the a1 mAtrA
        if (text === '') continue;
        if (!listed.has(key)) missing.push(`${key} (${text})`);
      }
      expect(missing, script).toEqual([]);
    }
  });
});
