// Shared by every WASM binding (base64, `.wasm` module import, manual init):
// the calls into the wasm-bindgen glue once the module is initialized.
import {
  transliterate_no_options,
  transliterate_with_options,
  transliterate_many_no_options,
  transliterate_many_with_options
} from './pkg/lipilekhika_wasm.js';
import type { TransliterationOptions, TransliterateInput, TransliterateOutput } from '../src/types';
import { script_list_obj } from '../src/utils/lang_list';

/** What a binding gives to the public `transliterate_wasm` / `preloadWasm` wrappers. */
export type WasmBackend = {
  transliterate: <T extends TransliterateInput>(
    text: T,
    from: string,
    to: string,
    trans_options?: TransliterationOptions | null
  ) => Promise<TransliterateOutput<T>>;
  preloadWasm: () => Promise<void>;
};

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
const toWellFormed = (text: string) => text.replace(LONE_SURROGATE, '�');

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

function transliterateOne(
  text: string,
  fromId: number,
  toId: number,
  trans_options?: TransliterationOptions | null
): string {
  if (trans_options == null) {
    return transliterate_no_options(text, fromId, toId);
  }
  return transliterate_with_options(text, fromId, toId, trans_options);
}

function transliterateMany(
  texts: string[],
  fromId: number,
  toId: number,
  trans_options?: TransliterationOptions | null
): string[] {
  if (texts.length === 0) {
    return [];
  }
  if (texts.length === 1) {
    return [transliterateOne(texts[0], fromId, toId, trans_options)];
  }

  const { joined, offsets } = packStrings(texts);
  if (trans_options == null) {
    return transliterate_many_no_options(joined, offsets, fromId, toId);
  }
  return transliterate_many_with_options(joined, offsets, fromId, toId, trans_options);
}

/**
 * Makes a binding from a function that initializes the glue (it is called once, on first use).
 */
export function createWasmBackend(init: () => Promise<void> | void): WasmBackend {
  let initPromise: Promise<void> | null = null;
  const initOnce = () => {
    if (!initPromise) {
      // Bun does not keep the event loop alive while `WebAssembly.instantiateStreaming` (used by
      // the glue's `init()`) is pending: with nothing else pending (eg. a script calling
      // `transliterate_wasm` from a function that is not top-level awaited) the process exited
      // silently with code 0 before the module was ready. Hold the loop open with a timer until
      // it is ready. (checked by `scripts/runtime_check.mjs`)
      // @ts-expect-error Bun is a runtime global when executed under Bun
      const keep_alive = typeof Bun !== 'undefined' ? setInterval(() => {}, 1 << 30) : null;
      initPromise = Promise.resolve()
        .then(init)
        .catch((error: unknown) => {
          // let a later call try again (eg. a failed fetch of the `.wasm` file)
          initPromise = null;
          throw error;
        })
        .finally(() => {
          if (keep_alive !== null) clearInterval(keep_alive);
        });
    }
    return initPromise;
  };

  return {
    async transliterate<T extends TransliterateInput>(
      text: T,
      from: string,
      to: string,
      trans_options?: TransliterationOptions | null
    ): Promise<TransliterateOutput<T>> {
      await initOnce();
      const fromId = scriptId(from);
      const toId = scriptId(to);

      if (typeof text === 'string') {
        return transliterateOne(text, fromId, toId, trans_options) as TransliterateOutput<T>;
      }
      return transliterateMany([...text], fromId, toId, trans_options) as TransliterateOutput<T>;
    },
    preloadWasm: initOnce
  };
}
