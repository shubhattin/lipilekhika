// binding for vite-node and bun
import init, { transliterate as wasmTransliterate, initSync } from './pkg/lipilekhika_wasm.js';
import type { TransliterationOptions } from '../src/index';

let initialized = false;

/**
 * Initialize the WASM module
 */
async function initWasm(): Promise<void> {
  if (initialized) return;
  // @ts-ignore
  if (typeof Bun !== 'undefined') {
    // this approach is also used in prod as it converts the wasm to base64 in bundling step
    await init();
  } else {
    // fallback to run with `vite-node` "locally"
    const [fs, path, url] = await Promise.all([
      import('node:fs'),
      import('node:path'),
      import('node:url')
    ]);

    const __filename = url.fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const wasmPath = path.join(__dirname, 'pkg', 'lipilekhika_wasm_bg.wasm');

    const wasmBuffer = fs.readFileSync(wasmPath);
    initSync({ module: wasmBuffer });
  }

  initialized = true;
}

export async function transliterate(
  text: string,
  from: string,
  to: string,
  trans_options?: TransliterationOptions | null
): Promise<string> {
  await initWasm();
  return wasmTransliterate(text, from, to, trans_options);
}

/**
 * Pre-loads the WASM module for faster first transliteration.
 * This is optional but recommended for better performance.
 */
export async function preloadWasm(): Promise<void> {
  await initWasm();
}
