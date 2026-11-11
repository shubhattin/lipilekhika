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
    await init({ module_or_path: asBytes(await source) });
  } catch (error) {
    // a failed source (eg. a 404 fetch) can be replaced by calling `initWasm` again
    source = null;
    throw error;
  }
});

/** `WebAssembly.instantiate` takes an `ArrayBuffer` or a typed array, not a `DataView` */
const asBytes = <T>(wasm: T) =>
  ArrayBuffer.isView(wasm) && !(wasm instanceof Uint8Array)
    ? new Uint8Array(wasm.buffer, wasm.byteOffset, wasm.byteLength)
    : wasm;

export function initWasm(wasm: WasmSource): Promise<void> {
  if (
    wasm === null ||
    wasm === undefined ||
    (typeof wasm !== 'object' && typeof wasm !== 'string')
  ) {
    return Promise.reject(
      new TypeError(
        'initWasm needs the WASM module: a WebAssembly.Module, its bytes, a Response or a URL ' +
          '(eg. of the file `lipilekhika/lipilekhika.wasm`), got ' +
          String(wasm)
      )
    );
  }
  // the first source given is kept (the module is initialized once)
  source ??= wasm;
  return backend.preloadWasm();
}

export const transliterate = backend.transliterate;
export const preloadWasm = backend.preloadWasm;
