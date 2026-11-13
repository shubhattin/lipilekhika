// Checks the package the way a user gets it: packs it (or takes a packed tarball), installs the
// tarball in a temp project and
// - loads every entry with `import` (ESM) and `require` (CommonJS) under Node and Bun, each entry
//   in its own process (the WASM entries share one wasm-bindgen instance, so a process that used
//   two of them would only ever check the first one's way of loading it): the pure JS, WASM and
//   N-API (native binary of this platform) transliteration and typing agree with the expected text
// - type-checks a consumer of every entry with TypeScript, as an ES module and as CommonJS
//   (`moduleResolution` `nodenext`) and for a bundler (`moduleResolution` `bundler`)
//
//   bun run build && bun run test:package
//   node scripts/package_check.mjs --tarball lipilekhika-1.1.0.tgz   (a tarball packed before)
//   node scripts/package_check.mjs --runtimes node                     (only Node)
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE_ROOT = fileURLToPath(new URL('..', import.meta.url));
const TYPESCRIPT_VERSION = '5.9.3';
const IS_WINDOWS = process.platform === 'win32';

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
};

const TEXT = 'namaskAra';
const EXPECTED = 'नमस्कार';

/** The check of each entry (the module is `m`), the same code for `import` and `require` */
const ENTRIES = {
  lipilekhika: `
    check('transliterate', await m.transliterate(TEXT, 'Normal', 'Devanagari'));
    check('transliterate (array)', (await m.transliterate([TEXT], 'Normal', 'Devanagari'))[0]);
    check('transliterate_wasm', await m.transliterate_wasm(TEXT, 'Normal', 'Devanagari'));
    if (!m.SCRIPT_LIST.includes('Devanagari')) throw new Error('SCRIPT_LIST');`,
  'lipilekhika/node': `
    check('transliterate_node', await m.transliterate_node(TEXT, 'Normal', 'Devanagari'));
    check('typing (N-API)', await type(m.createTypingContext));`,
  'lipilekhika/typing': `
    check('typing', await type(m.createTypingContext));`,
  'lipilekhika/wasm': `
    check('transliterate_wasm', await m.transliterate_wasm(TEXT, 'Normal', 'Devanagari'));`,
  'lipilekhika/wasm/slim': `
    await m.initWasm(readFileSync(requireFromHere.resolve('lipilekhika/lipilekhika.wasm')));
    check('transliterate_wasm', await m.transliterate_wasm(TEXT, 'Normal', 'Devanagari'));`
};

const consumerScript = (entry, kind) => `${
  kind === 'esm'
    ? `import * as m from '${entry}';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const requireFromHere = createRequire(import.meta.url);`
    : `const m = require('${entry}');
const { readFileSync } = require('node:fs');
const requireFromHere = require;`
}
// the exit code is only cleared when every check passed, so a runtime exiting early while a
// load is pending fails too
process.exitCode = 1;
const TEXT = ${JSON.stringify(TEXT)};
const EXPECTED = ${JSON.stringify(EXPECTED)};
const check = (label, actual) => {
  if (actual !== EXPECTED) {
    throw new Error(label + ': expected ' + JSON.stringify(EXPECTED) + ', got ' + JSON.stringify(actual));
  }
};
const type = async (createTypingContext) => {
  const ctx = createTypingContext('Devanagari');
  await ctx.ready;
  let text = '';
  for (const key of TEXT) {
    const diff = ctx.takeKeyInput(key);
    text = text.slice(0, text.length - diff.to_delete_chars_count) + diff.diff_add_text;
  }
  return text;
};
async function main() {${ENTRIES[entry]}
}
main().then(
  () => {
    process.exitCode = 0;
  },
  (error) => {
    console.error(error);
    process.exitCode = 1;
  }
);
`;

/** Every entry's types, as a user writes them */
const TYPES_CONSUMER = `import { transliterate, transliterate_wasm, getAllOptions, type ScriptListType } from 'lipilekhika';
import { transliterate_node, createTypingContext as createNodeTypingContext } from 'lipilekhika/node';
import { createTypingContext, type TypingDiff } from 'lipilekhika/typing';
import { transliterate_wasm as transliterate_wasm_entry } from 'lipilekhika/wasm';
import { initWasm, type WasmSource } from 'lipilekhika/wasm/slim';

export async function use(source: WasmSource) {
  const script: ScriptListType = 'Devanagari';
  const a: string = await transliterate('ka', 'Normal', script);
  const b: string[] = await transliterate_wasm(['ka'], 'Normal', script);
  const c: string = await transliterate_node('ka', 'Normal', script);
  const d: string = await transliterate_wasm_entry('ka', 'Normal', script);
  const options: string[] = await getAllOptions('Normal', script);
  await initWasm(source);
  const diff: TypingDiff = createTypingContext(script).takeKeyInput('k');
  const native: TypingDiff = createNodeTypingContext(script).takeKeyInput('k');
  return [a, b, c, d, options, diff, native];
}
`;
const WASM_MODULE_CONSUMER = `import wasmModule from 'lipilekhika/lipilekhika.wasm';
import { initWasm } from 'lipilekhika/wasm/slim';

const module: WebAssembly.Module = wasmModule;
export const ready = initWasm(module);
`;

function run(command, args, cwd, options = {}) {
  const res = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    shell: IS_WINDOWS && options.shell !== false,
    ...options
  });
  return { ok: res.status === 0, output: `${res.stdout ?? ''}${res.stderr ?? ''}`.trim() };
}

function runOrThrow(command, args, cwd) {
  const res = spawnSync(command, args, { cwd, stdio: 'inherit', shell: IS_WINDOWS });
  if (res.status !== 0) throw new Error(`${command} ${args.join(' ')} failed (${res.status})`);
}

const hasRuntime = (runtime) => run(runtime, ['--version'], process.cwd()).ok;

const tmp = mkdtempSync(path.join(os.tmpdir(), 'lipilekhika-package-'));
let failed = 0;
try {
  let tarball = arg('--tarball');
  if (tarball) {
    tarball = path.resolve(tarball);
  } else {
    runOrThrow('npm', ['pack', '--pack-destination', tmp], PACKAGE_ROOT);
    tarball = path.join(
      tmp,
      readdirSync(tmp).find((f) => f.endsWith('.tgz'))
    );
  }
  const app = path.join(tmp, 'app');
  mkdirSync(app);
  // a CommonJS package (no `"type": "module"`): `.mjs` / `.mts` are ES modules, `.cjs` / `.cts`
  // CommonJS
  writeFileSync(path.join(app, 'package.json'), '{ "private": true }\n');
  runOrThrow(
    'npm',
    ['install', '--no-audit', '--no-fund', tarball, `typescript@${TYPESCRIPT_VERSION}`],
    app
  );

  const runtimes = (arg('--runtimes') ?? 'node,bun').split(',').filter((runtime) => {
    if (hasRuntime(runtime)) return true;
    console.log(`  --  ${runtime} not found, skipped`);
    return false;
  });
  if (runtimes.length === 0) throw new Error('no runtime to run the checks with');

  let i = 0;
  for (const [entry] of Object.entries(ENTRIES)) {
    for (const kind of ['esm', 'cjs']) {
      const file = `check_${i++}.${kind === 'esm' ? 'mjs' : 'cjs'}`;
      writeFileSync(path.join(app, file), consumerScript(entry, kind));
      for (const runtime of runtimes) {
        const label = `${runtime.padEnd(4)} ${kind === 'esm' ? 'import ' : 'require'} ${entry}`;
        const res = run(runtime, [file], app);
        if (res.ok) {
          console.log(`  ok  ${label}`);
        } else {
          failed++;
          console.log(`  FAIL ${label}\n${res.output.replace(/^/gm, '        ')}`);
        }
      }
    }
  }

  // types: ESM and CommonJS (`nodenext`; `node16`, where a CommonJS file can not `require` an ES
  // module, so it needs the CommonJS types of the `require` condition), and a bundler
  writeFileSync(path.join(app, 'types_esm.mts'), TYPES_CONSUMER);
  writeFileSync(path.join(app, 'types_cjs.cts'), TYPES_CONSUMER);
  writeFileSync(path.join(app, 'types_wasm_module.mts'), WASM_MODULE_CONSUMER);
  writeFileSync(path.join(app, 'types_bundler.ts'), TYPES_CONSUMER);
  const tsc = path.join(app, 'node_modules', 'typescript', 'bin', 'tsc');
  const TSC_COMMON = ['--noEmit', '--strict', '--lib', 'es2022,dom'];
  for (const [label, args] of [
    [
      'nodenext (ESM + CommonJS)',
      ['--module', 'nodenext', 'types_esm.mts', 'types_cjs.cts', 'types_wasm_module.mts']
    ],
    ['node16 (ESM + CommonJS)', ['--module', 'node16', 'types_esm.mts', 'types_cjs.cts']],
    ['bundler', ['--module', 'esnext', '--moduleResolution', 'bundler', 'types_bundler.ts']]
  ]) {
    const res = run(process.execPath, [tsc, ...TSC_COMMON, ...args], app, { shell: false });
    if (res.ok) {
      console.log(`  ok  types ${label}`);
    } else {
      failed++;
      console.log(`  FAIL types ${label}\n${res.output.replace(/^/gm, '        ')}`);
    }
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
if (failed > 0) {
  console.error(`package check failed (${failed})`);
  process.exit(1);
}
console.log('package check passed');
