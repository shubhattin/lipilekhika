import type { ScriptLangType } from './index_main';
import type { CustomOptionType } from './transliteration/transliterate';
import type { TransliterateInput, TransliterateOutput } from './types';
import { createWasmApi } from './wasm_api';
import * as backend from '../wasm/bind_slim';
import type { WasmSource } from './wasm_api';

export type { WasmSource };

const api = createWasmApi(() => backend);

/**
 * Initializes the WASM module from the `.wasm` file shipped as `lipilekhika/lipilekhika.wasm`.
 * Call it once before `transliterate_wasm`; later calls return the same initialization.
 *
 * @example
 * ```ts
 * // Vite (the file is emitted as an asset)
 * import wasmUrl from 'lipilekhika/lipilekhika.wasm?url';
 * await initWasm(wasmUrl);
 * // Cloudflare Workers / tooling that imports `.wasm` as a `WebAssembly.Module`
 * import wasmModule from 'lipilekhika/lipilekhika.wasm';
 * await initWasm(wasmModule);
 * // any runtime, from a CDN
 * // (the same version as the installed package)
 * await initWasm(fetch('https://cdn.jsdelivr.net/npm/lipilekhika@1.1.0/dist/lipilekhika.wasm'));
 * ```
 * @param wasm - A `WebAssembly.Module`, the bytes, a `Response`, or a URL to fetch (or a promise of one)
 */
export const initWasm: (wasm: WasmSource) => Promise<void> = backend.initWasm;

/**
 * WASM(Rust) based transliteration, after `initWasm` was called.
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
  return api.transliterate_wasm(text, from, to, trans_options);
}
