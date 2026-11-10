// Default binding (`transliterate_wasm` from `lipilekhika` and the `node`/`browser`/default
// conditions of `lipilekhika/wasm`): in the built package the `.wasm` file is inlined as base64,
// so it works with every bundler and runtime that can compile WebAssembly from bytes, with no
// asset handling. Cloudflare Workers and Vercel Edge do not allow that: `lipilekhika/wasm` imports
// the `.wasm` file as a module there (`bind_workerd.ts` / `bind_edge_light.ts`).
// The build writes the module here as base64 decoded to bytes (see `vite.config.ts`): no
// `import.meta.url` (CommonJS has none) and no `fetch` of a `data:` URL (missing in some
// environments, eg. jsdom, and blocked by a Content Security Policy `connect-src` without `data:`).
import init, { initSync } from './pkg/lipilekhika_wasm.js';
import { createWasmBackend } from './core';

/** base64 to bytes (`Uint8Array.fromBase64` where available, else `atob`) */
export function bytesFromBase64(base64: string): Uint8Array<ArrayBuffer> {
  const from_base64 = (Uint8Array as { fromBase64?: (b: string) => Uint8Array<ArrayBuffer> })
    .fromBase64;
  if (typeof from_base64 === 'function') return from_base64(base64);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// The build replaces the `new URL(...)` with `bytesFromBase64('...')`. Called lazily, inside the
// error handling below.
const wasmSource = (): URL | Uint8Array<ArrayBuffer> =>
  new URL('./pkg/lipilekhika_wasm_bg.wasm', import.meta.url);

/** Loads the embedded module into the glue (also the fallback of `bind_browser.ts`). */
export async function loadEmbeddedWasm(): Promise<void> {
  // @ts-expect-error Bun is a runtime global when executed under Bun
  const isBun = typeof Bun !== 'undefined';
  if (isBun || import.meta.env.PROD) {
    // (Bun keeps running while this is pending: see `createWasmBackend`)
    try {
      await init({ module_or_path: wasmSource() });
    } catch (cause) {
      throw new Error(
        'Failed to load the embedded Lipi Lekhika WASM module. On runtimes that do not allow ' +
          "compiling WebAssembly from bytes (Cloudflare Workers, Vercel Edge) use 'lipilekhika/wasm'.",
        { cause }
      );
    }
  } else {
    // fallback to run with `vite-node` "locally"
    const fs = await import('node:fs');
    initSync({ module: fs.readFileSync(wasmSource() as URL) });
  }
}

const backend = createWasmBackend(loadEmbeddedWasm);

export const transliterate = backend.transliterate;
export const preloadWasm = backend.preloadWasm;
