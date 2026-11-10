import { describe, expect, it } from 'vitest';
import { getAllOptions, getSchwaStatusForScript, transliterate } from './index';
import { getScriptTypingDataMap } from './typing';

describe('Custom options are validated like in the Rust based bindings', () => {
  it('rejects an unknown option key', async () => {
    await expect(
      transliterate('k', 'Normal', 'Devanagari', { foo: true } as never)
    ).rejects.toThrow('unknown trans_options key: foo');
    // also when the scripts are the same (nothing to transliterate)
    await expect(transliterate('k', 'Hindi', 'Sanskrit', { foo: true } as never)).rejects.toThrow(
      'unknown trans_options key: foo'
    );
  });

  it('rejects a value that is not a boolean', async () => {
    // the string 'false' turned the option on (`!!'false'`)
    await expect(
      transliterate('f', 'Normal', 'Devanagari', {
        'normal_to_all:use_typing_chars': 'false'
      } as never)
    ).rejects.toThrow('trans_options value must be a boolean');
  });

  it('takes an undefined value as not set', async () => {
    expect(
      await transliterate('f', 'Normal', 'Devanagari', {
        'normal_to_all:use_typing_chars': undefined
      } as never)
    ).toBe('f');
  });
});

describe('Script pairs that resolve to the same script', () => {
  it('have no options, the text is returned as it is', async () => {
    expect(await getAllOptions('Hindi', 'Sanskrit')).toEqual([]);
    expect(await getAllOptions('Devanagari', 'Devanagari')).toEqual([]);
  });
});

describe('getSchwaStatusForScript', () => {
  it('accepts language names and aliases', async () => {
    expect(await getSchwaStatusForScript('Hindi' as never)).toBe(false);
    expect(await getSchwaStatusForScript('Bengali')).toBe(true);
    expect(await getSchwaStatusForScript('Normal')).toBe(null);
  });

  it('throws for an invalid script name', async () => {
    await expect(getSchwaStatusForScript('Klingon' as never)).rejects.toThrow(
      'Invalid script name: Klingon'
    );
  });
});

describe('Typing data map', () => {
  type Item = [string, string, string[]];
  const keysOf = (items: Item[], text: string) =>
    items.filter((item) => item[0] === text).flatMap((item) => item[2]);

  it('shows the keys which are read from the Normal krama (not only the typing map)', async () => {
    const { common_krama_map } = await getScriptTypingDataMap('Devanagari');
    expect(keysOf(common_krama_map, 'म')).toEqual(['m']);
    expect(keysOf(common_krama_map, 'ङ')).toEqual(['G']);
    expect(keysOf(common_krama_map, 'ः')).toEqual(['H']);
    expect(keysOf(common_krama_map, 'श')).toContain('sh');
    expect(keysOf(common_krama_map, 'व')).toEqual(expect.arrayContaining(['v', 'w']));
    expect(keysOf(common_krama_map, '०')).toEqual(expect.arrayContaining(['0', '.0']));
    expect(keysOf(common_krama_map, 'य़')).toEqual(['yz']);
    expect(keysOf(common_krama_map, 'ऍ')).toEqual(['aiI']);
    expect(keysOf(common_krama_map, 'ै')).toEqual(['.ai']);
  });

  it('has no item without a text (the context clearing `q`)', async () => {
    for (const script of ['Devanagari', 'Tamil', 'Romanized'] as const) {
      const { common_krama_map, script_specific_krama_map } = await getScriptTypingDataMap(script);
      for (const item of [...common_krama_map, ...script_specific_krama_map])
        expect(item[0], JSON.stringify(item)).not.toBe('');
      expect(keysOf(script_specific_krama_map, 'q')).toEqual(['qq']);
    }
  });
});
