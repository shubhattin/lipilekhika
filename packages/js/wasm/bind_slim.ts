// `lipilekhika/wasm/slim`: nothing is embedded or imported, the caller gives the `.wasm` file
// (`lipilekhika/lipilekhika.wasm` in the package) to `initWasm`.
import init from './pkg/lipilekhika_wasm.js';
import { createWasmBackend } from './core';
import type { WasmSource } from '../src/wasm_api';

let source: WasmSource | null = null;

const backend = createWasmBackend(async () => {
  if (source === null) {
    throw new Error(
      "The WASM module is not initialized: call `initWasm(...)` from 'lipilekhika/wasm/slim' first."
    );
  }
  try {
    // a `WebAssembly.Module` is only instantiated (no compiling: works where compiling from bytes
    // is not allowed, Workers and Vercel Edge), bytes / `Response` / URL are compiled
    await init({ module_or_path: await source });
  } catch (error) {
    // a failed source (eg. a 404 fetch) can be replaced by calling `initWasm` again
    source = null;
    throw error;
  }
});

export function initWasm(wasm: WasmSource): Promise<void> {
  // the first source given is kept (the module is initialized once)
  source ??= wasm;
  return backend.preloadWasm();
}

export const transliterate = backend.transliterate;
export const preloadWasm = backend.preloadWasm;
