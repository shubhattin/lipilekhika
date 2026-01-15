import type { TransliterationOptions } from '../src/index';

/**
 * Universal WASM binding for lipilekhika
 * Works with: Vite, vite-node, and Bun
 * Uses vite-plugin-wasm for seamless WASM imports
 */

// Direct import - vite-plugin-wasm handles the WASM loading
import init, { transliterate as wasmTransliterate, initSync } from './pkg/lipilekhika_wasm.js';

let initialized = false;

/**
 * Initialize the WASM module
 */
async function initWasm(): Promise<void> {
  if (initialized) return;

  // @ts-ignore - Check for Bun runtime
  if (typeof Bun !== 'undefined') {
    // For Bun, use the async init which fetches via URL
    await init();
  } else {
    // For vite-node, dynamically import node modules to avoid build warnings
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

/**
 * Transliterates text from one script to another.
 *
 * - `text`: The text to transliterate
 * - `from`: Source script name/alias
 * - `to`: Target script name/alias
 * - `trans_options`: Optional JSON object with transliteration options
 *
 * Returns the transliterated text or throws an error if script names are invalid.
 */
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
