// binding for vite-node and bun
import init, {
  transliterate_no_options,
  transliterate_with_options,
  transliterate_many_no_options,
  transliterate_many_with_options,
  initSync
} from './pkg/lipilekhika_wasm.js';
import type { TransliterationOptions } from '../src/index';
import type { TransliterateInput, TransliterateOutput } from '../src/types';
import { script_list_obj } from '../src/utils/lang_list';

let initPromise: Promise<void> | null = null;

function scriptId(scriptName: string): number {
  const id = script_list_obj[scriptName as keyof typeof script_list_obj];
  if (id === undefined) {
    throw new Error(`Unknown script: ${scriptName}`);
  }
  return id;
}

const utf8Encoder = new TextEncoder();

/** UTF-8 byte length; wasm-bindgen passes `&str` as UTF-8, so offsets must be byte-based. */
function utf8ByteLength(text: string): number {
  return utf8Encoder.encode(text).length;
}

const LONE_SURROGATE = /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g;

/** A lone surrogate becomes U+FFFD, as when a single string is passed to WASM. Otherwise a piece
 * ending in a high surrogate and the next one starting with a low one join into one character,
 * and the byte offsets of the pieces measured on their own are no longer char boundaries. */
const toWellFormed = (text: string) => text.replace(LONE_SURROGATE, '\ufffd');

/** Pack strings into one buffer + [start, end) UTF-8 byte offset pairs for a single WASM crossing. */
function packStrings(texts: readonly string[]): { joined: string; offsets: Uint32Array } {
  const offsets = new Uint32Array(texts.length * 2);
  let pos = 0;
  const parts: string[] = [];
  for (let i = 0; i < texts.length; i++) {
    const t = toWellFormed(texts[i]);
    const byteLen = utf8ByteLength(t);
    offsets[i * 2] = pos;
    offsets[i * 2 + 1] = pos + byteLen;
    pos += byteLen;
    parts.push(t);
  }
  return { joined: parts.join(''), offsets };
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
      //
      // Bun does not keep the event loop alive while `WebAssembly.instantiateStreaming` (used by
      // `init()`) is pending: with nothing else pending (eg. a script calling `transliterate_wasm`
      // from a function that is not top-level awaited) the process exited silently with code 0
      // before the module was ready. Hold the loop open with a timer until it resolves.
      // (checked by `scripts/runtime_check.mjs`)
      const keep_alive = isBun ? setInterval(() => {}, 1 << 30) : null;
      try {
        await init();
      } finally {
        if (keep_alive !== null) clearInterval(keep_alive);
      }
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

async function transliterateOne(
  text: string,
  fromId: number,
  toId: number,
  trans_options?: TransliterationOptions | null
): Promise<string> {
  if (trans_options == null) {
    return transliterate_no_options(text, fromId, toId);
  }
  return transliterate_with_options(text, fromId, toId, trans_options);
}

async function transliterateMany(
  texts: string[],
  fromId: number,
  toId: number,
  trans_options?: TransliterationOptions | null
): Promise<string[]> {
  if (texts.length === 0) {
    return [];
  }
  if (texts.length === 1) {
    return [await transliterateOne(texts[0], fromId, toId, trans_options)];
  }

  const { joined, offsets } = packStrings(texts);
  if (trans_options == null) {
    return transliterate_many_no_options(joined, offsets, fromId, toId);
  }
  return transliterate_many_with_options(joined, offsets, fromId, toId, trans_options);
}

export async function transliterate<T extends TransliterateInput>(
  text: T,
  from: string,
  to: string,
  trans_options?: TransliterationOptions | null
): Promise<TransliterateOutput<T>> {
  await initWasm();
  const fromId = scriptId(from);
  const toId = scriptId(to);

  if (typeof text === 'string') {
    return (await transliterateOne(text, fromId, toId, trans_options)) as TransliterateOutput<T>;
  }

  return (await transliterateMany(
    [...text],
    fromId,
    toId,
    trans_options
  )) as TransliterateOutput<T>;
}

/**
 * Pre-loads the WASM module for faster first transliteration.
 * This is optional but recommended for better performance.
 */
export async function preloadWasm(): Promise<void> {
  await initWasm();
}
