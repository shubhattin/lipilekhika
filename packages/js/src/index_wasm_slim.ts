import { getNormalizedScriptName, type ScriptLangType } from './index_main';
import type { CustomOptionType } from './transliteration/transliterate';

// Re-export initWasm and preloadWasm through the lazy loader to avoid
// dual static+dynamic import of bind_slim in the same module.
export type { InitInput } from '../wasm/bind_slim';

let wasmModulePromise: Promise<typeof import('../wasm/bind_slim')> | null = null;
const loadWasmModule = () => {
  if (!wasmModulePromise) {
    wasmModulePromise = import('../wasm/bind_slim');
  }
  return wasmModulePromise;
};

export const initWasm: typeof import('../wasm/bind_slim')['initWasm'] = (source) =>
  loadWasmModule().then((m) => m.initWasm(source));

export const preloadWasm: typeof import('../wasm/bind_slim')['preloadWasm'] = (source) =>
  loadWasmModule().then((m) => m.preloadWasm(source));

/**
 * WASM(Rust) based transliteration — slim variant.
 *
 * You MUST call `initWasm(wasmSource)` before using this function.
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
