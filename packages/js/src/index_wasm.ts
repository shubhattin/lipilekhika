import { getNormalizedScriptName, type ScriptLangType } from './index_main';
import type { CustomOptionType } from './transliteration/transliterate';

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
 * @param text - The text to transliterate
 * @param from - The script/language to transliterate from
 * @param to - The script/language to transliterate to
 * @param trans_options - The custom transliteration options to use for the transliteration
 * @returns The transliterated text
 */
export async function transliterate_wasm(
  text: string,
  from: ScriptLangType,
  to: ScriptLangType,
  trans_options?: CustomOptionType
) {
  const normalized_from = getNormalizedScriptName(from);
  if (!normalized_from) {
    throw new Error(`Invalid script name: ${from}`);
  }
  const normalized_to = getNormalizedScriptName(to);
  if (!normalized_to) {
    throw new Error(`Invalid script name: ${to}`);
  }
  if (normalized_from === normalized_to) return text;
  const wasm_mod = await loadWasmModule();
  const result = await wasm_mod.transliterate(text, normalized_from, normalized_to, trans_options);
  return result;
}

/**
 * Preload the WASM module.
 */
export const preloadWasm = async () => {
  const wasm_mod = await loadWasmModule();
  await wasm_mod.preloadWasm();
};
