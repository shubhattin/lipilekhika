// `lipilekhika/wasm/slim` given the `.wasm` file imported as a `WebAssembly.Module`
import { transliterate } from 'lipilekhika';
import { initWasm, transliterate_wasm } from 'lipilekhika/wasm/slim';
import wasmModule from 'lipilekhika/lipilekhika.wasm';
import { compare, handle } from '../cases.js';

export default handle(async () => {
  // before `initWasm`: must ask for it
  const error = await transliterate_wasm('a', 'Normal', 'Devanagari').then(
    () => null,
    (e) => String(e?.message ?? e)
  );
  await initWasm(wasmModule);
  return { results: await compare(transliterate, transliterate_wasm), error };
});
