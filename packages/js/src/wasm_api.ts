import { getNormalizedScriptName } from './utils/lang_list/script_normalization';
import type { CustomOptionType } from './transliteration/transliterate';
import type { ScriptLangType, TransliterateInput, TransliterateOutput } from './types';
import { validate_trans_options } from './utils/validate_trans_options';
import { validate_text } from './utils/validate_input';
import type { WasmBackend } from '../wasm/core';

/**
 * What `initWasm` accepts: a compiled `WebAssembly.Module`, the bytes of the `.wasm` file, a
 * `Response` (eg. from `fetch`), or a URL to fetch it from. A promise of any of these is awaited.
 */
export type WasmSource =
  | WebAssembly.Module
  | BufferSource
  | Response
  | URL
  | string
  | Promise<WebAssembly.Module | BufferSource | Response | URL | string>;

/**
 * The public `transliterate_wasm` / `preloadWasm` over a binding. Every entry (`lipilekhika`,
 * `lipilekhika/wasm` per runtime, `lipilekhika/wasm/slim`) shares the same checks and behaviour,
 * only the way the `.wasm` module is loaded differs.
 */
export function createWasmApi(loadBackend: () => Promise<WasmBackend> | WasmBackend) {
  let backendPromise: Promise<WasmBackend> | null = null;
  const getBackend = () => (backendPromise ??= Promise.resolve().then(loadBackend));

  async function transliterate_wasm<T extends TransliterateInput>(
    text: T,
    from: ScriptLangType,
    to: ScriptLangType,
    trans_options_?: CustomOptionType
  ): Promise<TransliterateOutput<T>> {
    validate_text(text);
    const trans_options = validate_trans_options(trans_options_);
    const normalized_from = getNormalizedScriptName(from);
    if (!normalized_from) {
      throw new Error(`Invalid script name: ${String(from)}`);
    }
    const normalized_to = getNormalizedScriptName(to);
    if (!normalized_to) {
      throw new Error(`Invalid script name: ${String(to)}`);
    }

    if (normalized_from === normalized_to) {
      return (typeof text === 'string' ? text : [...text]) as TransliterateOutput<T>;
    }

    const backend = await getBackend();
    return backend.transliterate(text, normalized_from, normalized_to, trans_options);
  }

  const preloadWasm = async () => {
    const backend = await getBackend();
    await backend.preloadWasm();
  };

  return { transliterate_wasm, preloadWasm };
}
