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
  /** Bulk cases: every item shares the same from/to script pair. */
  batchTransliterate: [
    {
      texts: ['गङ्गा', 'नमस्ते 𑀫 as', 'गङ्गा'],
      from: 'Devanagari',
      to: 'Gujarati',
      outputs: ['ગઙ્ગા', 'નમસ્તે 𑀫 as', 'ગઙ્ગા']
    },
    {
      texts: ['𑀕𑀗𑁆𑀕𑀸 👨‍👩‍👧‍👦 m', '𑀦𑀫'],
      from: 'Brahmi',
      to: 'Devanagari',
      outputs: ['गङ्गा 👨‍👩‍👧‍👦 m', 'नम']
    },
    {
      texts: ['गङ्गा 🕉️ 𑀫 as', '🎉नम🎉'],
      from: 'Devanagari',
      to: 'Brahmi',
      outputs: ['𑀕𑀗𑁆𑀕𑀸 🕉️ 𑀫 as', '🎉𑀦𑀫🎉']
    }
  ],
  /**
   * Strings with mixed UTF-8 widths (3-byte Indic, 4-byte ancient scripts, emoji/ZWJ).
   * Round-trip via from === to verifies pack/unpack byte offsets at the WASM FFI boundary.
   */
  wasmBoundary: [
    'गङ्गा',
    '𑀕𑀗𑁆𑀕𑀸',
    '𑆑𑆮',
    'hello',
    '😀🎉',
    '👨‍👩‍👧‍👦',
    '🇮🇳',
    '🙏🏽',
    'mixed: 🕉️ 𑀕 गङ्गा abc'
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

  it('preserves mixed-width strings through the WASM FFI boundary', async () => {
    const texts = [...EXAMPLES.wasmBoundary];
    const out = await transliterate_wasm(texts, 'Devanagari', 'Devanagari');
    expect(out).toEqual(texts);
  });

  describe('transliterate_wasm works for an array of strings', () => {
    it.each(EXAMPLES.batchTransliterate)(
      'returns an array of results for $from -> $to',
      async ({ texts, from, to, outputs }) => {
        const out_arr = await transliterate_wasm(texts, from, to);
        expect(out_arr).toEqual(outputs);
      }
    );
  });

  describe('general transliterate works for an array of strings', () => {
    it.each(EXAMPLES.batchTransliterate)(
      'returns an array of results for $from -> $to',
      async ({ texts, from, to, outputs }) => {
        const out_arr = await transliterate(texts, from, to);
        expect(out_arr).toEqual(outputs);
      }
    );
  });
});
