import * as fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { transliterate } from '../../index';
import { getScriptData } from '../../utils/get_script_data';
import { SCRIPT_LIST } from '../../utils/lang_list';
import type { script_list_type } from '../../utils/lang_list';

/**
 * A letter can have more than one spelling in a romanization (ITRANS `A` / `aa`, `kSh` / `x`,
 * IAST `ṃ` / `ṁ`, Romanized `ē` / `e`). Every spelling is read as the same letter, and the
 * letter is written in one standard spelling (the first text of its krama).
 */

/** Spellings that are read differently on purpose, by script.
 * - ITRANS `.` (a danda, like `|`) followed by `a` is `.a` (the avagraha)
 * - ITRANS `AUM` (ॐ, like `OM`) after a consonant is read as its vowels (`kAUM` काऊं), `OM` has
 *   no vowels to be read as
 * - IAST `H`, the capital of `h`: `kH` is not `kh` (ख), only a whole word in capitals (`KH`) or
 *   its first letter (`Kh`) is read as one */
const EXCEPTIONS: Partial<Record<script_list_type, string[]>> = {
  ITRANS: ['.', 'AUM'],
  IAST: ['H']
};

describe('An alternate spelling is read like the standard one', () => {
  for (const script of SCRIPT_LIST) {
    it(script, async () => {
      const data = await getScriptData(script);
      if (data.script_type !== 'other') return;
      // a consonant, so that a vowel is checked as a mAtrA too
      const k = (await transliterate('क', 'Devanagari', script)).replace(/a$/, '');
      const mismatches: string[] = [];
      for (const [text, value] of data.text_to_krama_map) {
        const krama = value.krama;
        if (!krama || krama.length !== 1 || krama[0] === -1) continue;
        const standard = data.krama_text_arr[krama[0]]?.[0];
        if (!standard || standard === text || EXCEPTIONS[script]?.includes(text)) continue;
        for (const [before, after] of [
          ['', ''],
          [k, ''],
          ['', 'a'],
          [k, 'a']
        ]) {
          const actual = await transliterate(before + text + after, script, 'Devanagari');
          const expected = await transliterate(before + standard + after, script, 'Devanagari');
          if (actual !== expected)
            mismatches.push(
              `${JSON.stringify(before + text + after)}: ${actual} (${JSON.stringify(before + standard + after)}: ${expected})`
            );
        }
      }
      expect(mismatches).toEqual([]);
    });
  }
});

/**
 * The standard scheme test data (`std-*`, the vidyut-lipi output) rewritten with an alternate
 * spelling is read as the same Devanagari
 */
const sub = (from: RegExp, to: string | ((...match: string[]) => string)) => (text: string) =>
  text.replace(from, to as string);
const REWRITES: Partial<Record<script_list_type, [string, (text: string) => string][]>> = {
  ITRANS: [
    // (not in aA, RRI, LLI, OM, where the alternate would join with the letter before it)
    ['aa', sub(/(?<!a)A/g, 'aa')],
    ['ii', sub(/(?<!RR|LL)I/g, 'ii')],
    ['ee', sub(/(?<!RR|LL)I/g, 'ee')],
    ['uu', sub(/U/g, 'uu')],
    ['oo', sub(/U/g, 'oo')],
    ['R^i', sub(/RRi/g, 'R^i')],
    ['R^I', sub(/RRI/g, 'R^I')],
    ['.m', sub(/(?<!O)M/g, '.m')],
    ['.n', sub(/(?<!O)M/g, '.n')],
    ['N^', sub(/~N/g, 'N^')],
    ['c', sub(/ch/g, 'c')],
    ['chh', sub(/Ch/g, 'chh')],
    ['C', sub(/Ch/g, 'C')],
    ['JN', sub(/~n/g, 'JN')],
    ['w', sub(/v/g, 'w')],
    ['S', sub(/Sh/g, 'S')],
    ['shh', sub(/Sh/g, 'shh')],
    ['x', sub(/kSh/g, 'x')],
    ['GY', sub(/j~n/g, 'GY')],
    ['dny', sub(/j~n/g, 'dny')],
    ['~', sub(/\.a/g, '~')],
    ['.', sub(/\|/g, '.')],
    ['AUM', sub(/OM/g, 'AUM')],
    ['\\`', sub(/\\_/g, '\\`')],
    ['↓', sub(/\\_/g, '↓')],
    ['↑', sub(/\\'/g, '↑')],
    ['↑↑', sub(/\\"/g, '↑↑')]
  ],
  IAST: [
    ['ṁ', sub(/ṃ/g, 'ṁ')],
    ['r̥', sub(/ṛ/g, 'r̥')],
    ['r̥̄', sub(/ṝ/g, 'r̥̄')],
    ['’', sub(/'/g, '’')],
    ['Title Case', sub(/(^|[\s-])(\p{L}\p{M}*)/gu, (_, a, b) => a + b.toUpperCase())],
    ['UPPER CASE', (text) => text.toUpperCase()]
  ],
  SLP1: [['|', sub(/Lh/g, '|')]]
};

const STD_DATA_FOLDER = path.resolve(__dirname, '../../../../../test_data/transliteration');

describe('The standard scheme test data in its alternate spellings', () => {
  for (const [script, rewrites] of Object.entries(REWRITES) as [
    script_list_type,
    [string, (text: string) => string][]
  ][]) {
    const folder = path.join(STD_DATA_FOLDER, `std-${script.toLowerCase()}`);
    const outputs = fs
      .readdirSync(folder)
      .filter((file) => file.endsWith('.yaml'))
      .flatMap(
        (file) => parse(fs.readFileSync(path.join(folder, file), 'utf8')) as { output: string }[]
      )
      .map(({ output }) => output);
    for (const [name, rewrite] of rewrites) {
      it(`${script} ${name}`, async () => {
        const mismatches: string[] = [];
        let rewritten = 0;
        for (const output of outputs) {
          const alternate = rewrite(output);
          if (alternate === output) continue;
          rewritten++;
          const expected = await transliterate(output, script, 'Devanagari');
          const actual = await transliterate(alternate, script, 'Devanagari');
          if (actual !== expected) {
            const words = alternate.split(/\s+/);
            const i = expected.split(/\s+/).findIndex((w, j) => w !== actual.split(/\s+/)[j]);
            mismatches.push(`${JSON.stringify(words[i])}: ${actual.split(/\s+/)[i]}`);
          }
        }
        expect(rewritten, 'the rewrite changes some of the test data').toBeGreaterThan(0);
        expect(mismatches).toEqual([]);
      });
    }
  }
});
