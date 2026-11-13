import * as fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { transliterate } from '../../index';
import type { script_list_type } from '../../utils/lang_list';

/**
 * Between two romanizations, at least one of them a standard scheme, the text is transliterated
 * like it is through Devanagari (the Devanagari inputs of the standard scheme test data)
 */
const SCHEMES: script_list_type[] = ['SLP1', 'Harvard-Kyoto', 'ITRANS', 'IAST'];
const ROMANIZATIONS: script_list_type[] = [...SCHEMES, 'Romanized', 'Normal'];

const folder = path.resolve(__dirname, '../../../../../test_data/transliteration/std-slp1');
const inputs = fs
  .readdirSync(folder)
  .filter((file) => file.endsWith('.yaml'))
  .flatMap((file) => parse(fs.readFileSync(path.join(folder, file), 'utf8')) as { input: string }[])
  .map(({ input }) => input);

describe('Between the romanizations like through Devanagari', () => {
  for (const from of ROMANIZATIONS)
    for (const to of ROMANIZATIONS) {
      if (from === to || (!SCHEMES.includes(from) && !SCHEMES.includes(to))) continue;
      it(`${from} -> ${to}`, async () => {
        const mismatches: string[] = [];
        for (const input of inputs) {
          const text = await transliterate(input, 'Devanagari', from);
          const direct = await transliterate(text, from, to);
          const through = await transliterate(
            await transliterate(text, from, 'Devanagari'),
            'Devanagari',
            to
          );
          if (direct !== through) {
            const words = text.split(/\s+/);
            const i = through.split(/\s+/).findIndex((w, j) => w !== direct.split(/\s+/)[j]);
            mismatches.push(
              `${JSON.stringify(words[i])}: ${direct.split(/\s+/)[i]} (${through.split(/\s+/)[i]})`
            );
          }
        }
        expect(mismatches).toEqual([]);
      });
    }
});
