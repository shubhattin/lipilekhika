// Cold single-pass benchmark: one timed pass without warm-up (JIT warm-up is included), printing
// the same iterated / bulk table as the other languages. Runs the **built package** (see
// `bench_common.mjs`).
//
//   Node:  bun run bench        (builds `dist/esm`, then `node scripts/benchmark.mjs`)
//   Bun:   bun run bench:bun    (builds `dist/esm`, then `bun scripts/benchmark.mjs`)
//
// Needs the WASM and N-API builds (`./get_bindings.sh`).

import { performance } from 'node:perf_hooks';
import chalk from 'chalk';
import {
  RUNTIME,
  emulate_typing,
  load_lib,
  load_transliteration_cases,
  load_typing_cases
} from './bench_common.mjs';

const TEST_DATA = load_transliteration_cases();
const TYPING_TEST_DATA = load_typing_cases();
const BULK_SEPARATOR = '\n';
const TRANSLITERATION_BATCHES = buildTransliterationBatches(TEST_DATA);
const TYPING_BATCHES = buildTypingBatches(TEST_DATA, TYPING_TEST_DATA);

/** The inputs of each script pair joined into one text (custom options ignored) */
function buildTransliterationBatches(testData) {
  /** @type {Map<string, any[]>} */
  const grouped = new Map();
  for (const item of testData) {
    const groupKey = `${item.from}-${item.to}`;
    const batch = grouped.get(groupKey) ?? [];
    batch.push(item);
    grouped.set(groupKey, batch);
  }
  return Array.from(grouped.entries()).map(([key, items]) => ({
    key,
    from: items[0].from,
    to: items[0].to,
    input: items.map((item) => item.input).join(BULK_SEPARATOR),
    size: items.length
  }));
}

/** The typed texts of each target script joined into one text (options ignored) */
function buildTypingBatches(transliterationTestData, typingTestData) {
  /** @type {Map<string, string[]>} */
  const grouped = new Map();
  for (const item of transliterationTestData) {
    if (item.from !== 'Normal') continue;
    const batch = grouped.get(item.to) ?? [];
    batch.push(item.input);
    grouped.set(item.to, batch);
  }
  for (const item of typingTestData) {
    const batch = grouped.get(item.script) ?? [];
    batch.push(item.text);
    grouped.set(item.script, batch);
  }
  return Array.from(grouped.entries()).map(([script, items]) => ({
    script,
    input: items.join(BULK_SEPARATOR),
    size: items.length
  }));
}

async function measureIndividualTransliteration(transliterateFn) {
  const start = performance.now();
  for (let i = 0; i < TEST_DATA.length; i++) {
    const testData = TEST_DATA[i];
    await transliterateFn(
      testData.input,
      testData.from,
      testData.to,
      testData.options ?? undefined
    );
  }
  return performance.now() - start;
}

async function measureBulkTransliteration(transliterateFn) {
  const start = performance.now();
  for (let i = 0; i < TRANSLITERATION_BATCHES.length; i++) {
    const batch = TRANSLITERATION_BATCHES[i];
    await transliterateFn(batch.input, batch.from, batch.to);
  }
  return performance.now() - start;
}

async function measureTypingEmulation(createTypingContext) {
  const normal_to_others_test_data = TEST_DATA.filter((testData) => testData.from === 'Normal');
  const start = performance.now();
  for (let i = 0; i < normal_to_others_test_data.length; i++) {
    const testData = normal_to_others_test_data[i];
    await emulate_typing(createTypingContext, testData.input, testData.to);
  }
  for (let i = 0; i < TYPING_TEST_DATA.length; i++) {
    const testData = TYPING_TEST_DATA[i];
    await emulate_typing(createTypingContext, testData.text, testData.script, testData.options);
  }
  return performance.now() - start;
}

async function measureBulkTypingEmulation(createTypingContext) {
  const start = performance.now();
  for (let i = 0; i < TYPING_BATCHES.length; i++) {
    const batch = TYPING_BATCHES[i];
    await emulate_typing(createTypingContext, batch.input, batch.script);
  }
  return performance.now() - start;
}

const formatDuration = (timeMs) => `${timeMs.toFixed(2)} ms`;

async function benchmark() {
  const { main: lib, node, typing } = await load_lib();

  console.log(chalk.cyan.bold(`Benchmark Results (${RUNTIME}, built package)`));
  console.log(
    chalk.gray(
      `Precomputed ${TRANSLITERATION_BATCHES.length} bulk batches from ${TEST_DATA.length} transliteration cases by from-to, ignoring custom options.`
    )
  );
  console.log(
    chalk.gray(
      `Precomputed ${TYPING_BATCHES.length} typing bulk batches, grouped by target script and ignoring custom options.`
    )
  );

  for (const script of lib.SCRIPT_LIST) await lib.preloadScriptData(script);
  const transliterationIterated = await measureIndividualTransliteration(lib.transliterate);
  const transliterationBulk = await measureBulkTransliteration(lib.transliterate);

  const typingEmulationIterated = await measureTypingEmulation(typing.createTypingContext);
  const typingEmulationBulk = await measureBulkTypingEmulation(typing.createTypingContext);

  await lib.preloadWasm();
  const transliterationWasmIterated = await measureIndividualTransliteration(
    lib.transliterate_wasm
  );
  const transliterationWasmBulk = await measureBulkTransliteration(lib.transliterate_wasm);

  await node.preloadNode();
  const transliterationNodeIterated = await measureIndividualTransliteration(
    node.transliterate_node
  );
  const transliterationNodeBulk = await measureBulkTransliteration(node.transliterate_node);
  const typingNodeIterated = await measureTypingEmulation(node.createTypingContext);
  const typingNodeBulk = await measureBulkTypingEmulation(node.createTypingContext);

  console.table([
    {
      Benchmark: 'Transliteration Cases',
      Iterated: formatDuration(transliterationIterated),
      Bulk: formatDuration(transliterationBulk)
    },
    {
      Benchmark: 'Typing Emulation',
      Iterated: formatDuration(typingEmulationIterated),
      Bulk: formatDuration(typingEmulationBulk)
    },
    {
      Benchmark: 'Typing Emulation (Node / N-API)',
      Iterated: formatDuration(typingNodeIterated),
      Bulk: formatDuration(typingNodeBulk)
    },
    {
      Benchmark: 'Transliteration Cases (WASM)',
      Iterated: formatDuration(transliterationWasmIterated),
      Bulk: formatDuration(transliterationWasmBulk)
    },
    {
      Benchmark: 'Transliteration Cases (Node / N-API)',
      Iterated: formatDuration(transliterationNodeIterated),
      Bulk: formatDuration(transliterationNodeBulk)
    }
  ]);
}

benchmark().catch((err) => {
  console.error(err);
  process.exit(1);
});
