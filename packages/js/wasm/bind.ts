// Default binding (`transliterate_wasm` from `lipilekhika` and the `node`/`browser`/default
// conditions of `lipilekhika/wasm`): in the built package the `.wasm` file is inlined as base64,
// so it works with every bundler and runtime that can compile WebAssembly from bytes, with no
// asset handling.
// For runtimes that load `.wasm` files as modules (Cloudflare Workers, Vercel Edge, which does not
// allow compiling from bytes) `lipilekhika/wasm` uses `bind_workerd.ts` / `bind_edge_light.ts`.
// The build writes the module here as an absolute `data:` URL (see `vite.config.ts`), so no base
// URL is needed: CommonJS and Cloudflare Workers have no `import.meta.url`.
import init, { initSync } from './pkg/lipilekhika_wasm.js';
import { createWasmBackend } from './core';

// built lazily, inside the error handling below (in source runs it needs `import.meta.url`)
const wasmUrl = () => new URL('./pkg/lipilekhika_wasm_bg.wasm', import.meta.url);

const backend = createWasmBackend(async () => {
  // @ts-expect-error Bun is a runtime global when executed under Bun
  const isBun = typeof Bun !== 'undefined';
  if (isBun || import.meta.env.PROD) {
    // (Bun keeps running while this is pending: see `createWasmBackend`)
    try {
      await init({ module_or_path: wasmUrl() });
    } catch (cause) {
      throw new Error(
        'Failed to load the Lipi Lekhika WASM module. Runtimes that do not allow compiling ' +
          "WebAssembly from bytes (eg. Vercel Edge) need `transliterate_wasm` from 'lipilekhika/wasm'.",
        { cause }
      );
    }
  } else {
    // fallback to run with `vite-node` "locally"
    const fs = await import('node:fs');
    initSync({ module: fs.readFileSync(wasmUrl()) });
  }
});

export const transliterate = backend.transliterate;
export const preloadWasm = backend.preloadWasm;
