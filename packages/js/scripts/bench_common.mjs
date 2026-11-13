// Shared by the benchmark scripts (`benchmark.mjs`, `bench_suite.mjs`, `complexity.mjs`).
//
// The benchmarks run the **built package** (`dist/esm`, `bun run build:lib`) under plain Node or
// Bun, the code a user of the package runs. They do not run the source through vite-node: it
// turns every import into a getter call, so the time depends on how the code is split into
// files (it showed a refactor that only moved functions between files as 30% slower).

import * as fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parse } from 'yaml';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIST_ESM = path.resolve(HERE, '../dist/esm');
export const TEST_DATA_ROOT = path.resolve(HERE, '../../../test_data');
export const TRANSLITERATION_TEST_DATA = path.join(TEST_DATA_ROOT, 'transliteration');
export const TYPING_TEST_DATA = path.join(TEST_DATA_ROOT, 'typing');

export const RUNTIME =
  typeof Bun !== 'undefined' ? `bun ${Bun.version}` : `node ${process.version}`;

/**
 * The entries of the built package: `lipilekhika` (`main`), `lipilekhika/node` (`node`) and
 * `lipilekhika/typing` (`typing`).
 */
export async function load_lib() {
  for (const name of ['index.mjs', 'node.mjs', 'typing.mjs']) {
    if (!fs.existsSync(path.join(DIST_ESM, name))) {
      throw new Error(
        `dist/esm/${name} not found: build the package first (\`bun run build:lib\`, or run the ` +
          'benchmark through its `bun run` command which does it)'
      );
    }
  }
  const load = (name) => import(pathToFileURL(path.join(DIST_ESM, name)).href);
  const [main, node, typing] = await Promise.all([
    load('index.mjs'),
    load('node.mjs'),
    load('typing.mjs')
  ]);
  return { main, node, typing };
}

/**
 * The cases of all the `.yaml` files below `dir` (files in sorted order).
 * @param {string} dir
 * @param {{ skip_dirs?: string[] }} [opts]
 * @returns {any[]}
 */
export function load_yaml_cases(dir, { skip_dirs = [] } = {}) {
  /** @type {string[]} */
  const files = [];
  const scan = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory() && !skip_dirs.includes(entry.name)) scan(full);
      else if (entry.isFile() && entry.name.endsWith('.yaml')) files.push(full);
    }
  };
  scan(dir);
  return files.sort().flatMap((f) => parse(fs.readFileSync(f, 'utf8')) ?? []);
}

/** The transliteration cases of `test_data` (`bun run gen:test-data` in the repo root) */
export const load_transliteration_cases = () => load_yaml_cases(TRANSLITERATION_TEST_DATA);
/** The typing cases of `test_data` (without the `context` cases) */
export const load_typing_cases = () =>
  load_yaml_cases(TYPING_TEST_DATA, { skip_dirs: ['context'] });

/**
 * Types `text` key by key, keeping the output like an input field would.
 * @param {Function} create `createTypingContext` of `lipilekhika/typing` or `lipilekhika/node`
 */
export async function emulate_typing(create, text, script, options) {
  const ctx = create(script, options ?? undefined);
  await ctx.ready;
  let result = '';
  for (const key of text) {
    const { diff_add_text, to_delete_chars_count } = ctx.takeKeyInput(key);
    if (to_delete_chars_count > 0) result = result.slice(0, -to_delete_chars_count);
    result += diff_add_text;
  }
  return result;
}

/** Value of the command line option `name` (`--json out.json`), `undefined` if not given */
export const arg_value = (name) => {
  const args = process.argv.slice(2);
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};
