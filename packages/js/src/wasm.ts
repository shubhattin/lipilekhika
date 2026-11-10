// `lipilekhika/wasm`: the types (and the Node.js / Bun / Deno build) of every export condition.
// The `workerd`, `edge-light` and `browser` conditions resolve to `wasm.workerd.ts`,
// `wasm.edge-light.ts` and `wasm.browser.ts`, which load the `.wasm` file instead.
import type { ScriptLangType } from './index_main';
import type { CustomOptionType } from './transliteration/transliterate';
import type { TransliterateInput, TransliterateOutput } from './types';
import {
  transliterate_wasm as transliterate_embedded,
  preloadWasm as preload_embedded
} from './index_wasm';

/**
 * WASM(Rust) based transliteration, from `lipilekhika/wasm`: the WASM module is loaded the best
 * way for the runtime.
 *
 * - Cloudflare Workers / Vercel Edge: the `.wasm` file imported as a module
 * - Browsers: the `.wasm` file fetched as a separate file (the embedded module if it can not be
 *   loaded)
 * - Node.js, Bun, Deno: the embedded module (the same as `transliterate_wasm` from `lipilekhika`)
 *
 * Transliterates `text` from `from` to `to`.
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
  return transliterate_embedded(text, from, to, trans_options);
}

/**
 * Preload the WASM module of `lipilekhika/wasm` (loaded the best way for the runtime).
 */
export const preloadWasm: () => Promise<void> = preload_embedded;
