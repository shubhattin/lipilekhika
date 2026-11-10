import type { ScriptLangType } from './index_main';
import type { CustomOptionType } from './transliteration/transliterate';
import type { TransliterateInput, TransliterateOutput } from './types';
import { createWasmApi } from './wasm_api';

// the base64 module is a separate chunk, loaded on first use
const api = createWasmApi(() => import('../wasm/bind'));

/**
 * WASM(Rust) based transliteration.
 *
 * Transliterates `text` from `from` to `to`.
 *
 * The WASM module is embedded (base64), so it works with every bundler and in Node.js, Bun, Deno,
 * and browsers with no setup. On Cloudflare Workers and Vercel Edge (no compiling WebAssembly
 * from bytes) import it from `lipilekhika/wasm`.
 * @param text - `string | string[]` — text to transliterate (same options for all items in an array)
 * @param from - The script/language to transliterate from
 * @param to - The script/language to transliterate to
 * @param trans_options - The custom transliteration options to use for the transliteration
 * @returns `string` or `string[]` — same shape as `text`
 */
export function transliterate_wasm<T extends TransliterateInput>(
  text: T,
  from: ScriptLangType,
  to: ScriptLangType,
  trans_options?: CustomOptionType
): Promise<TransliterateOutput<T>> {
  return api.transliterate_wasm(text, from, to, trans_options);
}

/**
 * Preload the WASM module.
 */
export const preloadWasm: () => Promise<void> = api.preloadWasm;
