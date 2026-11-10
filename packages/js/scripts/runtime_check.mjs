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

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
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
  const wasm_mod = await import(USE_DIST ? 'lipilekhika/wasm' : target('', '../src/wasm.ts'));
  const [text, from, to] = CASES[0];
  check(
    `wasm (lipilekhika/wasm)`,
    await wasm_mod.transliterate_wasm(text, from, to),
    await main_mod.transliterate(text, from, to)
  );

  // CommonJS (`require`): its own module graph, so it loads the module again
  if (USE_DIST) {
    const require = createRequire(import.meta.url);
    const cjs_root = require('../dist/cjs/index.cjs');
    const cjs_wasm = require('lipilekhika/wasm');
    const expected = await main_mod.transliterate(text, from, to);
    check('wasm cjs (lipilekhika)', await cjs_root.transliterate_wasm(text, from, to), expected);
    check(
      'wasm cjs (lipilekhika/wasm)',
      await cjs_wasm.transliterate_wasm(text, from, to),
      expected
    );
  }

  // Every WASM entry shares one wasm-bindgen instance: once one has loaded it, the others reuse
  // it and load nothing. So each other way of loading is checked in a fresh process.
  if (USE_DIST) {
    for (const mode of Object.keys(ISOLATED_CHECKS)) {
      const res = spawnSync(
        process.execPath,
        [fileURLToPath(import.meta.url), '--dist', `--isolated=${mode}`],
        { encoding: 'utf8' }
      );
      process.stdout.write(res.stdout);
      if (res.status !== 0) {
        throw new Error(`isolated check ${mode} failed:\n${res.stderr}`);
      }
    }
  }

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

const WASM_BYTES = () => readFileSync(new URL('../dist/lipilekhika.wasm', import.meta.url));
/** run alone in a process each (dist), see `main` */
const ISOLATED_CHECKS = {
  'slim (WebAssembly.Module)': async (slim) => {
    await slim.initWasm(new WebAssembly.Module(WASM_BYTES()));
  },
  'slim (bytes)': async (slim) => {
    await slim.initWasm(WASM_BYTES());
  },
  // the `browser` build fetches `../lipilekhika.wasm`: Bun can fetch a file URL, Node can not and
  // falls back to the embedded module
  browser: null,
  // `lipilekhika` and `slim` called at the same time: the module is instantiated once (the second
  // entry waits for the first one's load)
  'shared load': null
};

async function isolated(mode) {
  const [text, from, to] = CASES[0];
  const { transliterate } = await import(target('../dist/esm/index.mjs', ''));
  const expected = await transliterate(text, from, to);
  let actual;
  let loaded = 'file';
  if (mode === 'shared load') {
    let instantiated = 0;
    const instantiate = WebAssembly.instantiate;
    WebAssembly.instantiate = (...args) => {
      // only lipilekhika's module (its wasm-bindgen imports): Node 22's own `fetch` (undici)
      // instantiates its HTTP parser module when the global `Response` is first used
      if (args[1]?.['./lipilekhika_wasm_bg.js']) instantiated++;
      return instantiate.apply(WebAssembly, args);
    };
    const root = await import(target('../dist/esm/index.mjs', ''));
    const slim = await import(target('../dist/esm/wasm_slim.mjs', ''));
    const [a, b] = await Promise.all([
      root.transliterate_wasm(text, from, to),
      slim.initWasm(WASM_BYTES()).then(() => slim.transliterate_wasm(text, from, to))
    ]);
    check('wasm shared load (lipilekhika + slim)', a, expected);
    check('wasm shared load (slim)', b, expected);
    check('wasm shared load: instantiated', instantiated, 1);
    process.exitCode = 0;
    return;
  }
  if (mode === 'browser') {
    const warn = console.warn;
    console.warn = () => (loaded = 'embedded fallback');
    const mod = await import(target('../dist/esm/wasm.browser.mjs', ''));
    actual = await mod.transliterate_wasm(text, from, to);
    console.warn = warn;
  } else {
    const slim = await import(target('../dist/esm/wasm_slim.mjs', ''));
    await ISOLATED_CHECKS[mode](slim);
    actual = await slim.transliterate_wasm(text, from, to);
  }
  check(`wasm ${mode}${mode === 'browser' ? ` (${loaded})` : ''}`, actual, expected);
  process.exitCode = 0;
}

const ISOLATED_MODE = process.argv.find((a) => a.startsWith('--isolated='))?.split('=')[1];

// not awaited on purpose (see the note at the top)
(ISOLATED_MODE ? isolated(ISOLATED_MODE) : main()).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
