/**
 * Statistical benchmark suite (mitata): warm-up, many samples, avg / min…max / p75 / p99.
 *
 * Same workloads as the rust criterion bench (`packages/rust/src/benches/benchmark.rs`),
 * each measuring one full pass over the `test_data` cases, for the JS, WASM and N-API variants.
 *
 *   Node:  bun run bench:suite        (vite-node)
 *   Bun:   bun run bench:suite:bun
 *
 * Optional: `--filter <regex>` to run the matching groups only, `--json <file>` to also save the
 * raw results (e.g. to compare two versions).
 *
 * Needs the WASM and N-API builds (`./get_bindings.sh`).
 */
import { bench, do_not_optimize, group, run, summary } from 'mitata';
import * as fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { z } from 'zod';
import {
  preloadScriptData,
  preloadWasm,
  SCRIPT_LIST,
  transliterate,
  transliterate_wasm,
  type ScriptListType
} from '..';
import {
  createTypingContext as createTypingContextNode,
  preloadNode,
  transliterate_node
} from '../node';
import { createTypingContext } from '../typing';
import { TestDataTypeSchema, typing_test_data_schema } from '../transliteration/test_commons';

const TEST_DATA_ROOT = path.resolve(import.meta.dirname, '../../../../test_data');

function load_yaml_cases<T extends z.ZodType<{ todo?: boolean }>>(
  dir: string,
  schema: T
): z.infer<T>[] {
  const files: string[] = [];
  const scan = (d: string) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory() && entry.name !== 'context') scan(full);
      else if (entry.isFile() && entry.name.endsWith('.yaml')) files.push(full);
    }
  };
  scan(dir);
  return files
    .sort()
    .flatMap((f) => z.array(schema).parse(parse(fs.readFileSync(f, 'utf8'))))
    .filter((c) => !c.todo);
}

const TRANSLITERATION_CASES = load_yaml_cases(
  path.join(TEST_DATA_ROOT, 'transliteration'),
  TestDataTypeSchema
);
const TYPING_CASES = load_yaml_cases(path.join(TEST_DATA_ROOT, 'typing'), typing_test_data_schema);
const NORMAL_TO_OTHERS = TRANSLITERATION_CASES.filter((c) => c.from === 'Normal');

type TransliterateFn = (
  text: string,
  from: ScriptListType,
  to: ScriptListType,
  options?: Record<string, boolean>
) => Promise<string>;
type CreateTypingContext = typeof createTypingContext | typeof createTypingContextNode;

async function transliteration_pass(fn: TransliterateFn) {
  for (const c of TRANSLITERATION_CASES) {
    do_not_optimize(
      await fn(c.input, c.from as ScriptListType, c.to as ScriptListType, c.options ?? undefined)
    );
  }
}

/** Types `text` key by key, keeping the output like an input field would. */
async function emulate_typing(
  create: CreateTypingContext,
  text: string,
  script: ScriptListType,
  options?: Parameters<typeof createTypingContext>[1]
) {
  const ctx = create(script, options as never);
  await ctx.ready;
  let result = '';
  for (const key of text) {
    const { diff_add_text, to_delete_chars_count } = ctx.takeKeyInput(key);
    if (to_delete_chars_count > 0) result = result.slice(0, -to_delete_chars_count);
    result += diff_add_text;
  }
  return result;
}

async function typing_normal_to_others_pass(create: CreateTypingContext) {
  for (const c of NORMAL_TO_OTHERS) {
    do_not_optimize(await emulate_typing(create, c.input, c.to as ScriptListType));
  }
}

async function typing_cases_pass(create: CreateTypingContext) {
  for (const c of TYPING_CASES) {
    do_not_optimize(
      await emulate_typing(create, c.text, c.script as ScriptListType, c.options ?? undefined)
    );
  }
}

const args = process.argv.slice(2);
const arg_value = (name: string) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};

async function main() {
  for (const script of SCRIPT_LIST) await preloadScriptData(script);
  await preloadWasm();
  await preloadNode();

  const bun = (globalThis as { Bun?: { version: string } }).Bun;
  const runtime = bun ? `bun ${bun.version}` : `node ${process.version}`;
  console.log(
    `${runtime} | ${TRANSLITERATION_CASES.length} transliteration cases, ` +
      `${NORMAL_TO_OTHERS.length} Normal -> others typing cases, ${TYPING_CASES.length} typing cases\n`
  );

  const groups: { name: string; benches: [name: string, fn: () => Promise<void>][] }[] = [
    {
      name: 'transliteration_all_cases',
      benches: [
        ['js', () => transliteration_pass(transliterate)],
        ['wasm', () => transliteration_pass(transliterate_wasm)],
        ['napi', () => transliteration_pass(transliterate_node)]
      ]
    },
    {
      name: 'typing_emulation_normal_to_others',
      benches: [
        ['js', () => typing_normal_to_others_pass(createTypingContext)],
        ['napi', () => typing_normal_to_others_pass(createTypingContextNode)]
      ]
    },
    {
      name: 'typing_emulation_typing_cases',
      benches: [
        ['js', () => typing_cases_pass(createTypingContext)],
        ['napi', () => typing_cases_pass(createTypingContextNode)]
      ]
    }
  ];
  const filter = arg_value('--filter');
  const filter_re = filter ? new RegExp(filter) : undefined;
  /** group of each registered benchmark, in registration order (mitata keeps that order) */
  const registered: { group: string; name: string }[] = [];
  for (const g of groups) {
    if (filter_re && !filter_re.test(g.name)) continue;
    group(g.name, () => {
      summary(() => {
        for (const [name, fn] of g.benches) {
          bench(name, fn);
          registered.push({ group: g.name, name });
        }
      });
    });
  }

  const result = await run();

  const json_out = arg_value('--json');
  if (json_out) {
    const rows = result.benchmarks.flatMap((trial, i) =>
      trial.runs.map((r) => ({
        ...registered[i],
        avg_ms: r.stats ? r.stats.avg / 1e6 : null,
        min_ms: r.stats ? r.stats.min / 1e6 : null,
        p75_ms: r.stats ? r.stats.p75 / 1e6 : null,
        p99_ms: r.stats ? r.stats.p99 / 1e6 : null,
        samples: r.stats ? r.stats.samples.length : null
      }))
    );
    fs.writeFileSync(json_out, JSON.stringify({ runtime, rows }, null, 2));
    console.log(`\nsaved ${json_out}`);
  }
}

main();
