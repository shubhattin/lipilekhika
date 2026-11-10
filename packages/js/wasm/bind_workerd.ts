// Cloudflare Workers (`workerd` condition): the `.wasm` file is imported as a module, which
// Wrangler, the Cloudflare Vite plugin and the Astro / SvelteKit / Nuxt / ... Cloudflare adapters
// give as a `WebAssembly.Module` (no base64 copy in the Worker's JavaScript, nothing compiled from
// bytes). In the built package this import points at `dist/lipilekhika.wasm`.
import wasmModule from './pkg/lipilekhika_wasm_bg.wasm';
import { initSync } from './pkg/lipilekhika_wasm.js';
import { createWasmBackend } from './core';

const backend = createWasmBackend(() => {
  initSync({ module: wasmModule });
});

export const transliterate = backend.transliterate;
export const preloadWasm = backend.preloadWasm;
