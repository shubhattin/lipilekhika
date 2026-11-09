import { describe, expect, it } from 'vitest';
import { transliterate_node, createTypingContext } from '../src/node';
import { transliterate, transliterate_wasm } from '../src/index';
import { transliterate as transliterate_wasm_bind } from '../wasm/bind';
import { createTypingContext as createTypingContextTs } from '../src/typing';
import { typing_test_data_schema } from '../src/transliteration/test_commons';
import YAML from 'yaml';
import * as fs from 'node:fs';
import path from 'node:path';

const PACHAM_VARGA_AS_ANUSVARA = {
  'brahmic_to_brahmic:replace_pancham_varga_varna_with_anusvAra': true
} as const;

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
  wasmBoundary: ['गङ्गा', '𑀕𑀗𑁆𑀕𑀸', '𑆑𑆮', 'hello', '😀🎉', '👨‍👩‍👧‍👦', '🇮🇳', '🙏🏽', 'mixed: 🕉️ 𑀕 गङ्गा abc'],
  wasmBoundaryWithEmpty: ['', 'गङ्गा', '', '𑀕𑀗𑁆𑀕𑀸', '👨‍👩‍👧‍👦', '', 'mixed: 🕉️ 𑀕 गङ्गा abc', ''],
  batchTransliterateWithOptions: {
    texts: ['गङ्गा', '', 'गङ्गा 🎉'],
    from: 'Devanagari',
    to: 'Gujarati',
    outputs: ['ગંગા', '', 'ગંગા 🎉']
  },
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

  describe('transliterate_node works for an array of strings', () => {
    it.each(EXAMPLES.batchTransliterate)(
      'returns an array of results for $from -> $to',
      async ({ texts, from, to, outputs }) => {
        const out_arr = await transliterate_node(texts, from, to);
        expect(out_arr).toEqual(outputs);
      }
    );
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

describe('node binding typing matches the TS typing diffs (#155)', () => {
  const TYPING_DIR = path.join(__dirname, '../../../test_data/typing');
  const files = fs
    .readdirSync(TYPING_DIR)
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => path.join(TYPING_DIR, f));
  for (const file of files) {
    const cases = typing_test_data_schema.array().parse(YAML.parse(fs.readFileSync(file, 'utf-8')));
    describe(path.basename(file, '.yaml'), () => {
      for (const test of cases) {
        if (test.todo) continue;
        it(`${test.index} - ${test.script}`, async () => {
          const script = test.script as Parameters<typeof createTypingContext>[0];
          const options = test.options ?? undefined;
          const ctx = createTypingContext(script, options);
          const ctx_ts = createTypingContextTs(script, options);
          await Promise.all([ctx.ready, ctx_ts.ready]);
          let result = '';
          for (const ch of test.text) {
            const diff = ctx.takeKeyInput(ch);
            // `to_delete_chars_count` is in UTF-16 code units, as JS strings are sliced
            expect(diff, `key ${JSON.stringify(ch)}`).toEqual(ctx_ts.takeKeyInput(ch));
            if (diff.to_delete_chars_count > 0) {
              result = result.slice(0, -diff.to_delete_chars_count);
            }
            result += diff.diff_add_text;
          }
          expect(result).toBe(test.output);
        });
      }
    });
  }
});

describe('node binding typing: an empty key does not change the context (#155)', () => {
  it('Brahmi k, (empty), i', async () => {
    const ctx = createTypingContext('Brahmi');
    await ctx.ready;
    let result = '';
    for (const key of ['k', '', 'i']) {
      const { to_delete_chars_count, diff_add_text } = ctx.takeKeyInput(key);
      if (to_delete_chars_count > 0) result = result.slice(0, -to_delete_chars_count);
      result += diff_add_text;
    }
    expect(result).toBe('𑀓𑀺');
  });
});

describe('node binding typing: auto clear and empty key', () => {
  it('clears the context after a pause longer than autoContextClearTimeMs', async () => {
    const ctx = createTypingContext('Devanagari', { autoContextClearTimeMs: 50 });
    await ctx.ready;
    let result = '';
    for (const key of ['k', 'a']) {
      const { to_delete_chars_count, diff_add_text } = ctx.takeKeyInput(key);
      if (to_delete_chars_count > 0) result = result.slice(0, -to_delete_chars_count);
      result += diff_add_text;
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    expect(result).toBe('क्अ');
  });

  it('reads out of range auto clear times like the TS context', async () => {
    // TS: `elapsed > time`, so NaN / Infinity never clear and a negative time clears at any pause
    for (const [time, expected] of [
      [Infinity, 'क'],
      [NaN, 'क'],
      [2 ** 32, 'क'],
      [-1, 'क्अ']
    ] as const) {
      const ctx = createTypingContext('Devanagari', { autoContextClearTimeMs: time });
      await ctx.ready;
      let result = '';
      for (const key of ['k', 'a']) {
        const { to_delete_chars_count, diff_add_text } = ctx.takeKeyInput(key);
        if (to_delete_chars_count > 0) result = result.slice(0, -to_delete_chars_count);
        result += diff_add_text;
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      expect(result, `autoContextClearTimeMs ${time}`).toBe(expected);
    }
  });

  it('an empty key returns the current context length like the TS context', async () => {
    const ctx = createTypingContext('Devanagari');
    const ctx_ts = createTypingContextTs('Devanagari');
    await Promise.all([ctx.ready, ctx_ts.ready]);
    for (const key of ['k', '', 'a', '']) {
      expect(ctx.takeKeyInput(key), `key ${JSON.stringify(key)}`).toEqual(ctx_ts.takeKeyInput(key));
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

  it('preserves mixed-width strings through the direct WASM FFI boundary', async () => {
    const texts = [...EXAMPLES.wasmBoundary];
    const out = await transliterate_wasm_bind(texts, 'Devanagari', 'Devanagari');
    expect(out).toEqual(texts);
  });

  it('preserves empty and mixed-width strings through the direct WASM FFI boundary', async () => {
    const texts = [...EXAMPLES.wasmBoundaryWithEmpty];
    const out = await transliterate_wasm_bind(texts, 'Devanagari', 'Devanagari');
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

  describe('transliterate works with custom options', () => {
    it('returns an array of results for $from -> $to', async () => {
      {
        const result = await transliterate_node(
          'गङ्गा',
          'Devanagari',
          'Gujarati',
          PACHAM_VARGA_AS_ANUSVARA
        );
        expect(result).toBe('ગંગા');
      }
      {
        const result = await transliterate_wasm(
          'गङ्गा',
          'Devanagari',
          'Gujarati',
          PACHAM_VARGA_AS_ANUSVARA
        );
        expect(result).toBe('ગંગા');
      }
    });

    it('supports array transliteration with custom options in the WASM bulk path', async () => {
      const { texts, from, to, outputs } = EXAMPLES.batchTransliterateWithOptions;
      const result = await transliterate_wasm(texts, from, to, PACHAM_VARGA_AS_ANUSVARA);
      expect(result).toEqual(outputs);
    });
  });
});
