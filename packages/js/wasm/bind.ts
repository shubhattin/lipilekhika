// binding for vite-node and bun
import init, {
  transliterate_no_options,
  transliterate_with_options,
  initSync
} from './pkg/lipilekhika_wasm.js';
import type { TransliterationOptions } from '../src/index';
import { script_list_obj } from '../src/utils/lang_list';

let initPromise: Promise<void> | null = null;

function scriptId(scriptName: string): number {
  const id = script_list_obj[scriptName as keyof typeof script_list_obj];
  if (id === undefined) {
    throw new Error(`Unknown script: ${scriptName}`);
  }
  return id;
}

/**
 * Initialize the WASM module
 */
async function initWasm(): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // @ts-expect-error Bun is a runtime global when executed under Bun
    const isBun = typeof Bun !== 'undefined';
    if (isBun || import.meta.env.PROD) {
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
  })();

  return initPromise;
}

export async function transliterate(
  text: string,
  from: string,
  to: string,
  trans_options?: TransliterationOptions | null
): Promise<string> {
  await initWasm();
  const fromId = scriptId(from);
  const toId = scriptId(to);

  if (trans_options == null || trans_options == undefined) {
    return transliterate_no_options(text, fromId, toId);
  }

  return transliterate_with_options(text, fromId, toId, trans_options);
}

/**
 * Pre-loads the WASM module for faster first transliteration.
 * This is optional but recommended for better performance.
 */
export async function preloadWasm(): Promise<void> {
  await initWasm();
}
