// Browsers (`browser` condition of `lipilekhika/wasm`): the `.wasm` file is fetched (and compiled
// while streaming) from next to this module, `new URL('../lipilekhika.wasm', import.meta.url)` in
// the built package. Bundlers that handle this pattern (Vite, webpack 5, Rspack, Parcel) emit the
// file as an asset; without a bundler (CDN, `<script type="module">`) it is fetched as is.
//
// Where the file is not where the URL points (esbuild, which leaves the URL as is; Vite <= 7 in
// dev, whose dependency pre-bundling moves the module but not the file) the fetch fails, and the
// embedded (base64) module of `bind.ts` is used instead. That chunk is only loaded in this case.
import init from './pkg/lipilekhika_wasm.js';
import { createWasmBackend } from './core';

const backend = createWasmBackend(async () => {
  try {
    // written as `new URL('../lipilekhika.wasm', import.meta.url)` by the build (`vite.config.ts`)
    await init({ module_or_path: new URL('./pkg/lipilekhika_wasm_bg.wasm', import.meta.url) });
  } catch (error) {
    console.warn(
      'lipilekhika: could not load the `.wasm` file next to `lipilekhika/wasm`, using the embedded ' +
        'module instead. With Vite <= 7 add `optimizeDeps: { exclude: ["lipilekhika"] }`, with ' +
        'other bundlers serve `lipilekhika/lipilekhika.wasm` or use `lipilekhika/wasm/slim`.',
      error
    );
    // loads the module into the shared wasm-bindgen glue, which `core.ts` calls into (directly,
    // not through `bind.ts`'s own `preloadWasm`, which would wait for this load to finish)
    const { loadEmbeddedWasm } = await import('./bind');
    await loadEmbeddedWasm();
  }
});

export const transliterate = backend.transliterate;
export const preloadWasm = backend.preloadWasm;
