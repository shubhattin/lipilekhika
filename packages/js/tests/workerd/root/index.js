// `transliterate_wasm` from `lipilekhika` (embedded base64 module): Workers do not allow compiling
// WebAssembly from bytes, so it must fail and point to `lipilekhika/wasm`
import { transliterate_wasm } from 'lipilekhika';
import { handle } from '../cases.js';

export default handle(async () => ({
  results: [],
  error: await transliterate_wasm('namaskAra', 'Normal', 'Devanagari').then(
    (out) => `loaded (${out})`,
    (e) => String(e?.message ?? e)
  )
}));
