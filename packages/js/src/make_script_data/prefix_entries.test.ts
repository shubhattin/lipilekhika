import { describe, expect, it } from 'vitest';
import { getScriptData } from '../utils/get_script_data';
import { SCRIPT_LIST } from '../utils/lang_list';
import { KramaKeysArray } from './krama_array_keys';

/** A Devanagari consonant (the krama keys of the vyanjanas) */
const isVyanjanaKramaKey = (krama_index: number) => {
  const cp = KramaKeysArray[krama_index]?.codePointAt(0) ?? -1;
  return (
    KramaKeysArray[krama_index]?.length === 1 &&
    ((cp >= 0x915 && cp <= 0x939) || (cp >= 0x958 && cp <= 0x95f) || (cp >= 0x979 && cp <= 0x97f))
  );
};

describe('Prefix entries of other scripts', () => {
  // One match is not split by the runtimes, so the halant between two consonants has to be in
  // its krama: ITRANS LL (of LLi) was read as ळळ, not ळ्ळ
  for (const script of SCRIPT_LIST) {
    it(`${script}: no two consonants without a halant in one entry`, async () => {
      const data = await getScriptData(script);
      if (data.script_type !== 'other') return;
      const joined = data.text_to_krama_map
        .filter(([, { krama }]) =>
          (krama ?? []).some(
            (k, i) => i > 0 && isVyanjanaKramaKey(krama![i - 1]) && isVyanjanaKramaKey(k)
          )
        )
        .map(([text]) => text);
      expect(joined).toEqual([]);
    });
  }
});
