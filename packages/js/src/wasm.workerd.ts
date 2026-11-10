// `lipilekhika/wasm` for the `workerd` export condition: the `.wasm` file is imported as a module.
// Same API as `src/wasm.ts` (whose types are used for every condition).
import type { ScriptLangType } from './index_main';
import type { CustomOptionType } from './transliteration/transliterate';
import type { TransliterateInput, TransliterateOutput } from './types';
import { createWasmApi } from './wasm_api';
import * as backend from '../wasm/bind_workerd';

const api = createWasmApi(() => backend);

export function transliterate_wasm<T extends TransliterateInput>(
  text: T,
  from: ScriptLangType,
  to: ScriptLangType,
  trans_options?: CustomOptionType
): Promise<TransliterateOutput<T>> {
  return api.transliterate_wasm(text, from, to, trans_options);
}

export const preloadWasm: () => Promise<void> = api.preloadWasm;
