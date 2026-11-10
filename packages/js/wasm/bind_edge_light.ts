// Vercel Edge runtime / Next.js `runtime = 'edge'` (`edge-light` condition): like Workers, it
// cannot compile WebAssembly from bytes, the `.wasm` file must be imported with `?module`.
// In the built package this import points at `dist/lipilekhika.wasm?module`.
import wasmModule from './pkg/lipilekhika_wasm_bg.wasm?module';
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
