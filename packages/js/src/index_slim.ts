export * from './index_main';
export * from './index_wasm_slim';

// Slim entrypoint — WASM binary is NOT embedded inline.
// Ship/co-locate `lipilekhika_wasm_bg.wasm` alongside the JS, or pass
// the source explicitly via initWasm().
