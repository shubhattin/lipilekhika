// Slim binding - does NOT inline WASM as base64.
// Consumer must call initWasm() with the WASM source before using transliterate.
import init, {
  transliterate as wasmTransliterate,
  initSync
} from './pkg/lipilekhika_wasm.js';
import type { InitInput, SyncInitInput } from './pkg/lipilekhika_wasm.js';
import type { TransliterationOptions } from '../src/index';

export type { InitInput, SyncInitInput } from './pkg/lipilekhika_wasm.js';

let initPromise: Promise<void> | null = null;

/**
 * Initialize the WASM module with an external WASM source.
 *
 * In the slim entrypoint the WASM binary is NOT bundled inline.
 * You must call this before using any WASM-backed functions.
 *
 * @example
 * // Vite
 * import wasmUrl from 'lipilekhika/wasm?url';
 * await initWasm(wasmUrl);
 *
 * @example
 * // Next.js / manual fetch
 * await initWasm(fetch('/path/to/lipilekhika_wasm_bg.wasm'));
 *
 * @example
 * // Node.js (fs)
 * import fs from 'node:fs';
 * await initWasm(fs.readFileSync('./lipilekhika_wasm_bg.wasm'));
 *
 * @param wasmSource - A URL string, URL object, Response, fetch() Promise,
 *   ArrayBuffer, or WebAssembly.Module. If omitted, falls back to default
 *   `import.meta.url`-relative resolution (requires the .wasm file to be
 *   co-located with the JS — NOT reliable across all bundlers).
 */
export async function initWasm(wasmSource?: InitInput | SyncInitInput): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (wasmSource !== undefined) {
      // If it's a synchronous buffer, use initSync for zero async overhead
      if (
        wasmSource instanceof ArrayBuffer ||
        ArrayBuffer.isView(wasmSource) ||
        wasmSource instanceof WebAssembly.Module
      ) {
        initSync({ module: wasmSource as SyncInitInput });
      } else {
        await init(wasmSource as InitInput);
      }
    } else {
      // Fallback: attempt default URL resolution (only works if .wasm is co-located)
      await init();
    }
  })();

  return initPromise;
}

/**
 * Pre-loads the WASM module. Same as calling initWasm() manually.
 */
export const preloadWasm = initWasm;

export async function transliterate(
  text: string,
  from: string,
  to: string,
  trans_options?: TransliterationOptions | null
): Promise<string> {
  if (!initPromise) {
    throw new Error(
      '[lipilekhika/slim] WASM not initialized. Call `initWasm(wasmSource)` before using transliterate_wasm.'
    );
  }
  await initPromise;
  return wasmTransliterate(text, from, to, trans_options);
}
