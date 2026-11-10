// Runtime check: loads the JS, WASM and N-API variants and verifies that they work and agree.
//
// Run against the source (needs the built `wasm/pkg` and `binding/pkg`):
//   bunx vite-node scripts/runtime_check.mjs
//   bun scripts/runtime_check.mjs
// Run against the built package (`bun run build` first):
//   node scripts/runtime_check.mjs --dist
//   bun scripts/runtime_check.mjs --dist
//
// The work deliberately runs in a function that is NOT top-level awaited. Top-level await keeps
// the module evaluation pending, which hides runtimes exiting early while a load is pending
// (Bun did not keep the event loop alive during `WebAssembly.instantiateStreaming`, so it exited
// silently with code 0 before the WASM module was ready). The exit code starts as a failure and
// is only cleared after every check passed, so such a silent early exit fails this script.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

process.exitCode = 1;

const USE_DIST = process.argv.includes('--dist');
/** dist: file URL (node, bun); source: absolute path (vite-node does not resolve computed relative imports) */
const target = (dist_path, source_path) =>
  USE_DIST
    ? new URL(dist_path, import.meta.url).href
    : fileURLToPath(new URL(source_path, import.meta.url));
const RUNTIME = typeof Bun !== 'undefined' ? `bun ${Bun.version}` : `node ${process.version}`;

const CASES = [
  ['namaskAra', 'Normal', 'Devanagari'],
  ['rAmaH', 'Normal', 'Telugu'],
  ['कृष्णः', 'Devanagari', 'Normal'],
  ['ಶಙ್ಖ', 'Kannada', 'Brahmi'],
  ['𑀕𑀗𑁆𑀕𑀸', 'Brahmi', 'Tamil']
];
const TYPING_INPUT = 'namaskAra';

async function emulateTyping(createTypingContext, text, script) {
  const ctx = createTypingContext(script);
  await ctx.ready;
  let result = '';
  for (const key of text) {
    const { diff_add_text, to_delete_chars_count } = ctx.takeKeyInput(key);
    // to_delete_chars_count is in UTF-16 code units (JS and N-API alike)
    if (to_delete_chars_count > 0) result = result.slice(0, -to_delete_chars_count);
    result += diff_add_text;
  }
  return result;
}

function check(label, actual, expected) {
  if (actual !== expected) {
    throw new Error(
      `${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
  console.log(`  ok  ${label} -> ${JSON.stringify(actual)}`);
}

async function main() {
  const main_mod = await import(target('../dist/esm/index.mjs', '../src/index.ts'));
  const node_mod = await import(target('../dist/esm/node.mjs', '../src/node.ts'));
  console.log(`Runtime check (${RUNTIME}, ${USE_DIST ? 'dist' : 'source'})`);

  await main_mod.preloadWasm();
  await node_mod.preloadNode();

  for (const [text, from, to] of CASES) {
    const expected = await main_mod.transliterate(text, from, to);
    check(`wasm   ${from} -> ${to}`, await main_mod.transliterate_wasm(text, from, to), expected);
    check(`napi   ${from} -> ${to}`, await node_mod.transliterate_node(text, from, to), expected);
  }

  // array input (single WASM / N-API call for many texts)
  const texts = CASES.filter((c) => c[1] === 'Normal').map((c) => c[0]);
  const expected_many = await main_mod.transliterate(texts, 'Normal', 'Devanagari');
  check(
    'wasm   many',
    (await main_mod.transliterate_wasm(texts, 'Normal', 'Devanagari')).join('|'),
    expected_many.join('|')
  );
  check(
    'napi   many',
    (await node_mod.transliterate_node(texts, 'Normal', 'Devanagari')).join('|'),
    expected_many.join('|')
  );

  // `lipilekhika/wasm` (dist: through the package's own `exports`, as a consumer resolves it)
  // and `lipilekhika/wasm/slim` given the `.wasm` file as bytes and as a compiled module
  const wasm_mod = await import(USE_DIST ? 'lipilekhika/wasm' : target('', '../src/wasm.ts'));
  const wasm_bytes = readFileSync(
    new URL(
      USE_DIST ? '../dist/lipilekhika.wasm' : '../wasm/pkg/lipilekhika_wasm_bg.wasm',
      import.meta.url
    )
  );
  const slim_url = target('../dist/esm/wasm_slim.mjs', '../src/wasm_slim.ts');
  const slim_mod = await import(slim_url);
  // a second copy of the slim module (own state) for the `WebAssembly.Module` source
  const slim_mod_2 = await import(`${USE_DIST ? slim_url : `file://${slim_url}`}?second`);
  await slim_mod.initWasm(wasm_bytes);
  await slim_mod_2.initWasm(new WebAssembly.Module(wasm_bytes));
  const [text, from, to] = CASES[0];
  const expected = await main_mod.transliterate(text, from, to);
  check(`wasm (lipilekhika/wasm)`, await wasm_mod.transliterate_wasm(text, from, to), expected);
  check(`wasm slim (bytes)`, await slim_mod.transliterate_wasm(text, from, to), expected);
  check(`wasm slim (Module)`, await slim_mod_2.transliterate_wasm(text, from, to), expected);

  // typing: JS context vs N-API context
  const typing_mod = await import(target('../dist/esm/typing.mjs', '../src/typing.ts'));
  const typed_js = await emulateTyping(typing_mod.createTypingContext, TYPING_INPUT, 'Devanagari');
  check(
    'napi   typing',
    await emulateTyping(node_mod.createTypingContext, TYPING_INPUT, 'Devanagari'),
    typed_js
  );

  process.exitCode = 0;
  console.log('Runtime check passed');
}

// not awaited on purpose (see the note at the top)
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
