// `lipilekhika/wasm` resolves to its `workerd` build: the `.wasm` file imported as a module
import { transliterate } from 'lipilekhika';
import { transliterate_wasm } from 'lipilekhika/wasm';
import { compare, handle } from '../cases.js';

export default handle(async () => ({ results: await compare(transliterate, transliterate_wasm) }));
