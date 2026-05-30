import { describe, expect, it } from 'vitest';
import { transliterate_node, createTypingContext } from '../src/node';
import { transliterate, transliterate_wasm } from '../src/index';

const EXAMPLES = {
  transliterate: [
    {
      text: 'गङ्गा',
      from: 'Devanagari',
      to: 'Gujarati',
      output: 'ગઙ્ગા'
    },
    {
      text: '𑀕𑀗𑁆𑀕𑀸',
      from: 'Brahmi',
      to: 'Gujarati',
      output: 'ગઙ્ગા'
    },
    {
      text: 'गङ्गा',
      from: 'Devanagari',
      to: 'Brahmi',
      output: '𑀕𑀗𑁆𑀕𑀸'
    }
  ],
  emulateTyping: [
    {
      script: 'Devanagari',
      text: 'na jAyatE mriyate vA',
      out: 'न जायते म्रियते वा'
    }
  ]
} as const;

describe('node binding smoke checks', () => {
  it('exports expected functions', () => {
    expect(typeof transliterate_node).toBe('function');
    expect(typeof createTypingContext).toBe('function');
  });

  it('transliterate_node works for a basic case', async () => {
    for (const { text, from, to, output } of EXAMPLES.transliterate) {
      const res = await transliterate_node(text, from, to);
      expect(res).toBe(output);
    }
  });

  it('createTypingContext works for a basic typing case', async () => {
    for (const { script, text, out } of EXAMPLES.emulateTyping) {
      const ctx = createTypingContext(script);
      await ctx.ready;
      let result = '';
      for (const ch of text) {
        const { diff_add_text, to_delete_chars_count } = ctx.takeKeyInput(ch);
        if (to_delete_chars_count > 0) {
          result = result.slice(0, -to_delete_chars_count);
        }
        result += diff_add_text;
      }
      expect(result).toBe(out);
    }
  });
});

describe('wasm binding smoke check', () => {
  it('exports transliterate_wasm and returns output', async () => {
    expect(typeof transliterate_wasm).toBe('function');
    for (const { text, from, to, output } of EXAMPLES.transliterate) {
      const res = await transliterate_wasm(text, from, to);
      expect(res).toBe(output);
    }
  });

  describe('transliterate_wasm works for an array of strings', () => {
    it('returns an array of results', async () => {
      const out_arr = await transliterate_wasm(
        EXAMPLES.transliterate.map(({ text }) => text),
        'Devanagari',
        'Gujarati'
      );
      expect(out_arr).toEqual(EXAMPLES.transliterate.map(({ output }) => output));
    });
  });
  describe('general transliterate works for an array of strings', () => {
    it('returns an array of results', async () => {
      const out_arr = await transliterate(
        EXAMPLES.transliterate.map(({ text }) => text),
        'Devanagari',
        'Gujarati'
      );
      expect(out_arr).toEqual(EXAMPLES.transliterate.map(({ output }) => output));
    });
  });
});
