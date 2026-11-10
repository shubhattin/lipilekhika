// `.wasm` imports as given by Cloudflare Workers tooling (`.wasm`) and the Vercel Edge runtime
// (`.wasm?module`): an uninstantiated, compiled module.
declare module '*.wasm' {
  const wasmModule: WebAssembly.Module;
  export default wasmModule;
}
declare module '*.wasm?module' {
  const wasmModule: WebAssembly.Module;
  export default wasmModule;
}
