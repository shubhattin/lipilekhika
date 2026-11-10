// `lipilekhika/wasm` (the `node` / `browser` / default conditions, and the types of every
// condition): the same as `transliterate_wasm` from `lipilekhika`, the embedded (base64) module.
// The `workerd` and `edge-light` conditions resolve to `wasm.workerd.ts` / `wasm.edge-light.ts`,
// which import the `.wasm` file as a module.
export { transliterate_wasm, preloadWasm } from './index_wasm';
