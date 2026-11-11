// API edges (#185): the pure JS, WASM and N-API functions check their arguments the same way
// and give the same result for the same input.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getNormalizedScriptName, transliterate, transliterate_wasm } from '../src/index';
import { transliterate_node, createTypingContext as createTypingContextNode } from '../src/node';
import { createTypingContext } from '../src/typing';
import { initWasm } from '../src/wasm_slim';

const TRANSLITERATE = {
  js: transliterate,
  wasm: transliterate_wasm,
  napi: transliterate_node
} as const;
const CREATE_TYPING_CONTEXT = { js: createTypingContext, napi: createTypingContextNode } as const;

const TEXT_ERROR = 'text must be a string or an array of strings';

describe.each(Object.entries(TRANSLITERATE))('%s transliterate: arguments', (_, fn) => {
  const tr = fn as (text: unknown, from: unknown, to: unknown, opts?: unknown) => Promise<unknown>;

  it.each([
    ['an array with a number', [5]],
    ['an array with a string and a number', ['ka', 5]],
    // eslint-disable-next-line no-sparse-arrays
    ['a sparse array', [, 'ka']],
    ['a Set', new Set(['ka'])],
    ['a number', 5],
    ['null', null],
    ['undefined', undefined]
  ])('rejects %s as text with a TypeError', async (_, text) => {
    await expect(tr(text, 'Normal', 'Devanagari')).rejects.toThrow(new TypeError(TEXT_ERROR));
    // also for a same-script pair, where nothing is transliterated
    await expect(tr(text, 'Hindi', 'Sanskrit')).rejects.toThrow(new TypeError(TEXT_ERROR));
  });

  it('accepts a string, an array of strings and an empty array', async () => {
    expect(await tr('ka', 'Normal', 'Devanagari')).toBe('क');
    expect(await tr(['ka', 'ga'], 'Normal', 'Devanagari')).toEqual(['क', 'ग']);
    expect(await tr([], 'Normal', 'Devanagari')).toEqual([]);
  });

  it.each([null, undefined, 5, {}])('script name %s is an invalid script name', async (name) => {
    await expect(tr('ka', name, 'Devanagari')).rejects.toThrow(`Invalid script name: ${name}`);
    await expect(tr('ka', 'Normal', name)).rejects.toThrow(`Invalid script name: ${name}`);
  });

  it.each([
    ['an array', []],
    ['a string', 'x'],
    ['a number', 1]
  ])('rejects %s as trans_options', async (_, options) => {
    await expect(tr('ka', 'Normal', 'Devanagari', options)).rejects.toThrow(
      new TypeError('trans_options must be an object')
    );
  });
});

describe('Lone surrogates are read as U+FFFD everywhere (as the Rust crate does)', () => {
  it('in a string', async () => {
    for (const fn of Object.values(TRANSLITERATE)) {
      expect(await fn('ka\ud800kha', 'Normal', 'Devanagari')).toBe('क�ख');
      expect(await fn('\udc00ka', 'Normal', 'Devanagari')).toBe('�क');
    }
  });

  it('in an array, also when a surrogate pair is split over two items', async () => {
    const texts = ['k', '𑀓'[0], '𑀓'[1], 'a'];
    for (const fn of Object.values(TRANSLITERATE)) {
      expect(await fn(texts, 'Normal', 'Brahmi')).toEqual(['𑀓𑁆', '�', '�', '𑀅']);
    }
  });

  it('a well formed text is not changed', async () => {
    for (const fn of Object.values(TRANSLITERATE)) {
      expect(await fn('k😀a', 'Normal', 'Devanagari')).toBe('क्😀अ');
    }
  });

  it.each(Object.entries(CREATE_TYPING_CONTEXT))(
    'typing a lone surrogate key (%s)',
    async (_, create) => {
      const ctx = create('Devanagari');
      await ctx.ready;
      expect(ctx.takeKeyInput('k').diff_add_text).toBe('क्');
      expect(ctx.takeKeyInput('\ud801')).toEqual({
        to_delete_chars_count: 0,
        diff_add_text: '�',
        context_length: 0
      });
    }
  );
});

describe('getNormalizedScriptName', () => {
  it.each([null, undefined, 5, {}, ['Devanagari']])('is null for %s', (name) => {
    expect(getNormalizedScriptName(name as never)).toBe(null);
  });
});

describe.each(Object.entries(CREATE_TYPING_CONTEXT))('%s typing context options', (_, create) => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ['a negative time', { autoContextClearTimeMs: -5 }, RangeError],
    ['NaN', { autoContextClearTimeMs: NaN }, RangeError],
    ['a string', { autoContextClearTimeMs: '20' }, TypeError],
    ['a negative time (deprecated name)', { autoContextTClearTimeMs: -1 }, RangeError]
  ])('rejects %s as autoContextClearTimeMs', (_, options, error) => {
    expect(() => create('Devanagari', options as never)).toThrow(error);
    expect(() => create('Devanagari', options as never)).toThrow(/autoContextClearTimeMs/);
  });

  it('accepts 0 and Infinity as autoContextClearTimeMs', async () => {
    for (const ms of [0, Infinity]) {
      const ctx = create('Devanagari', { autoContextClearTimeMs: ms });
      await ctx.ready;
      expect(ctx.takeKeyInput('k').diff_add_text).toBe('क्');
    }
  });

  it.each([
    ['useNativeNumerals', { useNativeNumerals: 0 }],
    ['includeInherentVowel', { includeInherentVowel: 1 }],
    ['useNativeNumerals', { useNativeNumerals: 'false' }]
  ])('rejects a value of %s that is not a boolean', (name, options) => {
    expect(() => create('Devanagari', options as never)).toThrow(
      new TypeError(`${name} must be a boolean`)
    );
  });

  it('takes an undefined option as not set', async () => {
    const ctx = create('Devanagari', {
      useNativeNumerals: undefined,
      includeInherentVowel: undefined,
      autoContextClearTimeMs: undefined
    });
    await ctx.ready;
    expect(ctx.getUseNativeNumerals()).toBe(true);
    expect(ctx.getIncludeInherentVowel()).toBe(false);
  });

  it('update* with a value that is not a boolean throws and keeps the setting', async () => {
    const ctx = create('Devanagari', { useNativeNumerals: false, includeInherentVowel: true });
    await ctx.ready;
    // `undefined` reset the setting to its default
    expect(() => ctx.updateUseNativeNumerals(undefined as never)).toThrow(
      new TypeError('useNativeNumerals must be a boolean')
    );
    expect(() => ctx.updateIncludeInherentVowel(undefined as never)).toThrow(
      new TypeError('includeInherentVowel must be a boolean')
    );
    expect(() => ctx.updateIncludeInherentVowel(0 as never)).toThrow(TypeError);
    expect(ctx.getUseNativeNumerals()).toBe(false);
    expect(ctx.getIncludeInherentVowel()).toBe(true);
  });

  it('an invalid script name of another type throws Invalid script name', () => {
    expect(() => create(undefined as never)).toThrow('Invalid script name: undefined');
    expect(() => create(5 as never)).toThrow('Invalid script name: 5');
  });
});

describe('Typing auto clear time, measured like the Rust context', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses a monotonic clock in whole milliseconds (0: a key within the same millisecond keeps the context)', async () => {
    let now = 1000.2;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    // the wall clock changing (eg. a time sync) does not clear the context
    vi.spyOn(Date, 'now').mockImplementation(() => 0);
    const ctx = createTypingContext('Devanagari', { autoContextClearTimeMs: 0 });
    await ctx.ready;
    // the context is kept: `kh` is ख्
    ctx.takeKeyInput('k');
    now = 1000.9; // < 1 ms later (Rust: `as_millis()` is 0, not > 0)
    expect(ctx.takeKeyInput('h')).toMatchObject({ to_delete_chars_count: 2, diff_add_text: 'ख्' });
    // the context is cleared: `k` `h` are क्ह्
    ctx.clearContext();
    now = 2000;
    ctx.takeKeyInput('k');
    now = 2001.6; // 1.6 ms later
    expect(ctx.takeKeyInput('h')).toMatchObject({ to_delete_chars_count: 0, diff_add_text: 'ह्' });
  });
});

describe('initWasm (lipilekhika/wasm/slim) argument', () => {
  it.each([null, undefined, 5])('rejects %s with a TypeError', async (source) => {
    await expect(initWasm(source as never)).rejects.toThrow(TypeError);
    await expect(initWasm(source as never)).rejects.toThrow(/initWasm/);
  });
});

// review of #188
describe('Arguments of other types (review)', () => {
  it('a Symbol script name is an invalid script name (not a conversion error)', async () => {
    for (const fn of Object.values(TRANSLITERATE)) {
      await expect(fn('ka', Symbol('x') as never, 'Devanagari')).rejects.toThrow(
        'Invalid script name: Symbol(x)'
      );
    }
    for (const create of Object.values(CREATE_TYPING_CONTEXT)) {
      expect(() => create(Symbol('x') as never)).toThrow('Invalid script name: Symbol(x)');
    }
  });

  it.each(Object.entries(CREATE_TYPING_CONTEXT))(
    'typing options that are not an object throw a TypeError (%s)',
    (_, create) => {
      for (const options of [5, 'x', [], true]) {
        expect(() => create('Devanagari', options as never)).toThrow(
          new TypeError('options must be an object')
        );
      }
      // not set
      expect(() => create('Devanagari', undefined)).not.toThrow();
      expect(() => create('Devanagari', null as never)).not.toThrow();
    }
  );

  it('a trans_options value that is not a boolean is a TypeError', async () => {
    for (const fn of Object.values(TRANSLITERATE)) {
      await expect(
        fn('ka', 'Normal', 'Devanagari', { 'normal_to_all:use_typing_chars': 0 } as never)
      ).rejects.toThrow(new TypeError('trans_options value must be a boolean'));
    }
  });

  it.each([[{}], [[]], [new Map()]])('initWasm rejects %s with a TypeError', async (source) => {
    await expect(initWasm(source as never)).rejects.toThrow(TypeError);
    await expect(initWasm(source as never)).rejects.toThrow(/initWasm/);
  });
});

describe('Runtimes without newer globals (review)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('typing works without the `performance` global', async () => {
    vi.stubGlobal('performance', undefined);
    const ctx = createTypingContext('Devanagari');
    await ctx.ready;
    expect(ctx.takeKeyInput('k').diff_add_text).toBe('क्');
    expect(ctx.takeKeyInput('a').diff_add_text).toBe('');
  });

  it('lone surrogates are replaced without String.prototype.isWellFormed', async () => {
    const proto = String.prototype as { isWellFormed?: unknown; toWellFormed?: unknown };
    const { isWellFormed, toWellFormed } = proto;
    delete proto.isWellFormed;
    delete proto.toWellFormed;
    try {
      expect(await transliterate('ka\ud800kha\udc00😀', 'Normal', 'Devanagari')).toBe('क�ख�😀');
    } finally {
      proto.isWellFormed = isWellFormed;
      proto.toWellFormed = toWellFormed;
    }
  });

  it('the library source has no regex lookbehind (a SyntaxError in Safari < 16.4)', async () => {
    const { readdirSync, readFileSync } = await import('node:fs');
    const path = await import('node:path');
    const files = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory()
          ? files(path.join(dir, e.name))
          : e.name.endsWith('.ts') && !e.name.endsWith('.test.ts')
            ? [path.join(dir, e.name)]
            : []
      );
    const root = path.resolve(__dirname, '..');
    for (const file of [...files(path.join(root, 'src')), ...files(path.join(root, 'wasm'))]) {
      if (file.includes(`${path.sep}pkg${path.sep}`) || file.includes('make_script_data')) continue;
      expect(readFileSync(file, 'utf8').includes('(?<'), file).toBe(false);
    }
  });
});
