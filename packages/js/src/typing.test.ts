import { afterEach, describe, expect, it, vi } from 'vitest';
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

describe('Typing context auto clear and empty key', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  type Step = string | { pause_ms: number } | { include_inherent_vowel: boolean };
  /** Types the steps with a fake clock, a pause moves the clock forward */
  const typeSteps = async (steps: Step[], options?: Parameters<typeof createTypingContext>[1]) => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(1_000_000);
    const ctx = createTypingContext('Devanagari', options);
    await ctx.ready;
    let result = '';
    const diffs: TypingDiff[] = [];
    for (const step of steps) {
      if (typeof step !== 'string') {
        if ('pause_ms' in step) vi.setSystemTime(Date.now() + step.pause_ms);
        else ctx.updateIncludeInherentVowel(step.include_inherent_vowel);
        continue;
      }
      const diff = ctx.takeKeyInput(step);
      diffs.push(diff);
      if (diff.to_delete_chars_count > 0) result = result.slice(0, -diff.to_delete_chars_count);
      result += diff.diff_add_text;
    }
    return { result, diffs };
  };

  it('clears the context after a pause longer than autoContextClearTimeMs', async () => {
    const options = { autoContextClearTimeMs: 1000 };
    expect((await typeSteps(['k', { pause_ms: 1500 }, 'a'], options)).result).toBe('क्अ');
    expect((await typeSteps(['k', { pause_ms: 500 }, 'a'], options)).result).toBe('क');
  });

  it('still accepts the deprecated autoContextTClearTimeMs', async () => {
    const options = { autoContextTClearTimeMs: 1000 };
    expect((await typeSteps(['k', { pause_ms: 1500 }, 'a'], options)).result).toBe('क्अ');
  });

  it('autoContextClearTimeMs 0 clears the context after any pause', async () => {
    const options = { autoContextClearTimeMs: 0 };
    expect((await typeSteps(['k', { pause_ms: 1 }, 'a'], options)).result).toBe('क्अ');
  });

  it('an empty key does not change the context', async () => {
    // the option change applies to the next key, the empty key does not re-render
    const { diffs, result } = await typeSteps(['k', { include_inherent_vowel: true }, '']);
    expect(diffs[1]).toEqual({ to_delete_chars_count: 0, diff_add_text: '', context_length: 1 });
    expect(result).toBe('क्');
  });

  it('an empty key does not restart the idle timer', async () => {
    const options = { autoContextClearTimeMs: 1000 };
    const steps = ['k', { pause_ms: 800 }, '', { pause_ms: 800 }, 'a'];
    expect((await typeSteps(steps, options)).result).toBe('क्अ');
  });
});

describe('Typing a long text without a context break', () => {
  // the context is only cleared at a space or punctuation, so a long run of letters kept
  // the whole run as context and each key re-transliterated all of it
  it('takes linear time', async () => {
    const ctx = createTypingContext('Devanagari');
    await ctx.ready;
    const keys = 'ka'.repeat(10_000);
    let result = '';
    const start = performance.now();
    for (const key of keys) {
      const diff = ctx.takeKeyInput(key);
      if (diff.to_delete_chars_count > 0) result = result.slice(0, -diff.to_delete_chars_count);
      result += diff.diff_add_text;
    }
    const elapsed_ms = performance.now() - start;
    expect(result).toBe('क'.repeat(10_000));
    expect(elapsed_ms).toBeLessThan(2000);
  });
});
