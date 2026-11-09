import { describe, expect, it } from 'vitest';
import { createTypingContext, type TypingDiff } from './typing';

/** A high surrogate not followed by a low one, or a low surrogate not preceded by a high one */
const LONE_SURROGATE = /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/;

const typeKeys = async (keys: string[], script: Parameters<typeof createTypingContext>[0]) => {
  const ctx = createTypingContext(script);
  await ctx.ready;
  let result = '';
  const diffs: TypingDiff[] = [];
  for (const key of keys) {
    const diff = ctx.takeKeyInput(key);
    diffs.push(diff);
    if (diff.to_delete_chars_count > 0) result = result.slice(0, -diff.to_delete_chars_count);
    result += diff.diff_add_text;
  }
  return { result, diffs };
};

describe('Typing with characters outside the BMP (#155)', () => {
  it('takes a non-BMP key as one key, not only its high surrogate', async () => {
    expect((await typeKeys(['k', '😀'], 'Devanagari')).result).toBe('क्😀');
    expect((await typeKeys(['k', 'a', '😀', 'a'], 'Devanagari')).result).toBe('क😀अ');
  });

  it('takes only the first code point of a longer key', async () => {
    expect((await typeKeys(['😀😀'], 'Devanagari')).result).toBe('😀');
  });

  it('never splits a surrogate pair in the diff', async () => {
    for (const [keys, script] of [
      ['ki', 'Brahmi'],
      ['namaste kRShNa', 'Siddham'],
      ['ki😀 kRShNa', 'Brahmi']
    ] as const) {
      const { diffs } = await typeKeys([...keys], script);
      for (const { diff_add_text } of diffs) {
        expect(LONE_SURROGATE.test(diff_add_text), JSON.stringify(diff_add_text)).toBe(false);
      }
    }
  });

  it('counts to_delete_chars_count in UTF-16 code units', async () => {
    // `k` -> `𑀓𑁆` (2 code points, 4 UTF-16 units), then `i` -> `𑀓𑀺`: the virama is replaced
    const { diffs, result } = await typeKeys(['k', 'i'], 'Brahmi');
    expect(diffs[1]).toMatchObject({ to_delete_chars_count: 2, diff_add_text: '𑀺' });
    expect(result).toBe('𑀓𑀺');
  });
});
