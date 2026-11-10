// Cloudflare Workers (`workerd` condition): the `.wasm` file is imported as a module, which
// Wrangler, the Cloudflare Vite plugin and the Astro / SvelteKit / Nuxt / ... Cloudflare adapters
// give as a `WebAssembly.Module` (no base64 copy in the Worker's JavaScript, nothing compiled from
// bytes). In the built package this import points at `dist/lipilekhika.wasm`.
import wasmModule from './pkg/lipilekhika_wasm_bg.wasm';
import init from './pkg/lipilekhika_wasm.js';
import { createWasmBackend } from './core';

// the async `init` (`WebAssembly.instantiate`), not `initSync`: in the Next.js edge sandbox the
// imported module comes from another realm, which fails the glue's `instanceof WebAssembly.Module`
// check in `initSync` (it then tries `new WebAssembly.Module(module)`, which throws)
const backend = createWasmBackend(async () => {
  await init({ module_or_path: wasmModule });
});

export const transliterate = backend.transliterate;
export const preloadWasm = backend.preloadWasm;
