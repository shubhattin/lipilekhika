// Vercel Edge runtime / Next.js `runtime = 'edge'` (`edge-light` condition): like Workers, it
// cannot compile WebAssembly from bytes, the `.wasm` file must be imported with `?module`.
// In the built package this import points at `dist/lipilekhika.wasm?module`.
import wasmModule from './pkg/lipilekhika_wasm_bg.wasm?module';
import { initSync } from './pkg/lipilekhika_wasm.js';
import { createWasmBackend } from './core';

const backend = createWasmBackend(() => {
  initSync({ module: wasmModule });
});

export const transliterate = backend.transliterate;
export const preloadWasm = backend.preloadWasm;
