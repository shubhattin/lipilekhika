import { describe, expect, it } from 'vitest';
import { transliterate } from '../index';
import { getScriptData } from '../utils/get_script_data';
import { SCRIPT_LIST } from '../utils/lang_list';
import { kramaLabelIndex } from '../make_script_data/krama_array_keys';

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
