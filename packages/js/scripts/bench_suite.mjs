// Statistical benchmark suite (mitata): warm-up, many samples, avg / min…max / p75 / p99.
//
// Same workloads as the rust criterion bench (`packages/rust/src/benches/benchmark.rs`),
// each measuring one full pass over the `test_data` cases, for the JS, WASM and N-API variants
// of the **built package** (see `bench_common.mjs`).
//
//   Node:  bun run bench:suite        (builds `dist/esm`, then `node scripts/bench_suite.mjs`)
//   Bun:   bun run bench:suite:bun    (builds `dist/esm`, then `bun scripts/bench_suite.mjs`)
//
// Optional: `--filter <regex>` to run the matching groups only, `--json <file>` to also save the
// raw results (e.g. to compare two versions).
//
// Needs the WASM and N-API builds (`./get_bindings.sh`).

import { bench, do_not_optimize, group, run, summary } from 'mitata';
import * as fs from 'node:fs';
import {
  RUNTIME,
  arg_value,
  emulate_typing,
  load_lib,
  load_transliteration_cases,
  load_typing_cases
} from './bench_common.mjs';

const TRANSLITERATION_CASES = load_transliteration_cases().filter((c) => !c.todo);
const TYPING_CASES = load_typing_cases().filter((c) => !c.todo);
const NORMAL_TO_OTHERS = TRANSLITERATION_CASES.filter((c) => c.from === 'Normal');

async function transliteration_pass(fn) {
  for (const c of TRANSLITERATION_CASES) {
    do_not_optimize(await fn(c.input, c.from, c.to, c.options ?? undefined));
  }
}

async function typing_normal_to_others_pass(create) {
  for (const c of NORMAL_TO_OTHERS) {
    do_not_optimize(await emulate_typing(create, c.input, c.to));
  }
}

async function typing_cases_pass(create) {
  for (const c of TYPING_CASES) {
    do_not_optimize(await emulate_typing(create, c.text, c.script, c.options));
  }
}

async function main() {
  const { main: lib, node, typing } = await load_lib();
  for (const script of lib.SCRIPT_LIST) await lib.preloadScriptData(script);
  await lib.preloadWasm();
  await node.preloadNode();

  console.log(
    `${RUNTIME} (built package) | ${TRANSLITERATION_CASES.length} transliteration cases, ` +
      `${NORMAL_TO_OTHERS.length} Normal -> others typing cases, ${TYPING_CASES.length} typing cases\n`
  );

  /** @type {{ name: string, benches: [name: string, fn: () => Promise<void>][] }[]} */
  const groups = [
    {
      name: 'transliteration_all_cases',
      benches: [
        ['js', () => transliteration_pass(lib.transliterate)],
        ['wasm', () => transliteration_pass(lib.transliterate_wasm)],
        ['napi', () => transliteration_pass(node.transliterate_node)]
      ]
    },
    {
      name: 'typing_emulation_normal_to_others',
      benches: [
        ['js', () => typing_normal_to_others_pass(typing.createTypingContext)],
        ['napi', () => typing_normal_to_others_pass(node.createTypingContext)]
      ]
    },
    {
      name: 'typing_emulation_typing_cases',
      benches: [
        ['js', () => typing_cases_pass(typing.createTypingContext)],
        ['napi', () => typing_cases_pass(node.createTypingContext)]
      ]
    }
  ];
  const filter = arg_value('--filter');
  const filter_re = filter ? new RegExp(filter) : undefined;
  /** group of each registered benchmark, in registration order (mitata keeps that order) */
  const registered = [];
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
    fs.writeFileSync(json_out, JSON.stringify({ runtime: RUNTIME, rows }, null, 2));
    console.log(`\nsaved ${json_out}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
