import { getNormalizedScriptName, type ScriptLangType } from './index_main';
import type { CustomOptionType } from './transliteration/transliterate';
import type { TransliterateInput, TransliterateOutput } from './types';

let wasmModulePromise: Promise<typeof import('../wasm/bind')> | null = null;
const loadWasmModule = () => {
  if (!wasmModulePromise) {
    wasmModulePromise = import('../wasm/bind');
  }
  return wasmModulePromise;
};

/**
 * WASM(Rust) based transliteration.
 *
 * Transliterates `text` from `from` to `to`.
 * @param text - `string | string[]` — text to transliterate (same options for all items in an array)
 * @param from - The script/language to transliterate from
 * @param to - The script/language to transliterate to
 * @param trans_options - The custom transliteration options to use for the transliteration
 * @returns `string` or `string[]` — same shape as `text`
 */
export async function transliterate_wasm<T extends TransliterateInput>(
  text: T,
  from: ScriptLangType,
  to: ScriptLangType,
  trans_options?: CustomOptionType
): Promise<TransliterateOutput<T>> {
  const normalized_from = getNormalizedScriptName(from);
  if (!normalized_from) {
    throw new Error(`Invalid script name: ${from}`);
  }
  const normalized_to = getNormalizedScriptName(to);
  if (!normalized_to) {
    throw new Error(`Invalid script name: ${to}`);
  }

  if (normalized_from === normalized_to) {
    return (typeof text === 'string' ? text : [...text]) as TransliterateOutput<T>;
  }

  const wasm_mod = await loadWasmModule();
  return (await wasm_mod.transliterate(
    text,
    normalized_from,
    normalized_to,
    trans_options
  )) as TransliterateOutput<T>;
}

/**
 * Preload the WASM module.
 */
export const preloadWasm = async () => {
  const wasm_mod = await loadWasmModule();
  await wasm_mod.preloadWasm();
};
