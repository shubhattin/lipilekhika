import {
  transliterate,
  preloadScriptData,
  type ScriptListType,
  SCRIPT_LIST,
  transliterate_wasm,
  preloadWasm
} from '..';
import { transliterate_node, preloadNode } from '../node';
import { performance } from 'node:perf_hooks';
import path from 'node:path';
import {
  TestDataTypeSchema,
  emulateTyping,
  typing_test_data_schema
} from '../transliteration/test_commons';
import * as fs from 'node:fs';
import { z } from 'zod';
import { parse } from 'yaml';
import chalk from 'chalk';

type TransliterationTestData = z.infer<typeof TestDataTypeSchema>;
type TypingTestData = z.infer<typeof typing_test_data_schema>;
type TransliterationOptions = Parameters<typeof transliterate>[3];
type TransliterationFn = (
  text: string,
  from: ScriptListType,
  to: ScriptListType,
  options?: TransliterationOptions
) => Promise<string>;
type BenchmarkRow = {
  Benchmark: string;
  Iterated: string;
  Bulk: string;
};
type TransliterationBatch = {
  key: `${string}-${string}`;
  from: ScriptListType;
  to: ScriptListType;
  input: string;
  size: number;
};
type TypingBatch = {
  script: ScriptListType;
  input: string;
  size: number;
};

const TEST_DATA_FOLDER = path.resolve(__dirname, '../../../../test_data/transliteration');
const TYPING_TEST_DATA_FOLDER = path.join(__dirname, '../../../../test_data/typing');
const TEST_DATA = getTestData();
const TYPING_TEST_DATA = getTypingTestData();
const BULK_SEPARATOR = '\n';
const TRANSLITERATION_BATCHES = buildTransliterationBatches(TEST_DATA);
const TYPING_BATCHES = buildTypingBatches(TEST_DATA, TYPING_TEST_DATA);

function getTestData() {
  const data: TransliterationTestData[][] = [];
  const allYamlFiles: string[] = [];
  function scanYamlFiles(dir: string) {
    const fs = require('fs');
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.resolve(dir, entry.name);
      if (entry.isDirectory()) {
        scanYamlFiles(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.yaml')) {
        allYamlFiles.push(fullPath);
      }
    }
  }
  scanYamlFiles(TEST_DATA_FOLDER);
  for (const yamlFile of allYamlFiles) {
    const testData = TestDataTypeSchema.array().parse(parse(fs.readFileSync(yamlFile, 'utf8')));
    data.push(testData);
  }
  return data.flatMap((item) => item);
}
function getTypingTestData() {
  const data: TypingTestData[][] = [];
  const allYamlFiles: string[] = [];
  function scanYamlFiles(dir: string) {
    const fs = require('fs');
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.resolve(dir, entry.name);
      if (entry.isDirectory() && entry.name !== 'context') {
        scanYamlFiles(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.yaml')) {
        allYamlFiles.push(fullPath);
      }
    }
  }
  scanYamlFiles(TYPING_TEST_DATA_FOLDER);
  for (const yamlFile of allYamlFiles) {
    const testData = typing_test_data_schema
      .array()
      .parse(parse(fs.readFileSync(yamlFile, 'utf8')));
    data.push(testData);
  }
  return data.flatMap((item) => item);
}

function buildTransliterationBatches(testData: TransliterationTestData[]): TransliterationBatch[] {
  const grouped = new Map<`${string}-${string}`, TransliterationTestData[]>();

  for (const item of testData) {
    const groupKey = `${item.from}-${item.to}` as const;
    const batch = grouped.get(groupKey) ?? [];
    batch.push(item);
    grouped.set(groupKey, batch);
  }

  return Array.from(grouped.entries()).map(([key, items]) => ({
    key,
    from: items[0].from as ScriptListType,
    to: items[0].to as ScriptListType,
    input: items.map((item) => item.input).join(BULK_SEPARATOR),
    size: items.length
  }));
}

function buildTypingBatches(
  transliterationTestData: TransliterationTestData[],
  typingTestData: TypingTestData[]
): TypingBatch[] {
  const grouped = new Map<ScriptListType, string[]>();

  for (const item of transliterationTestData) {
    if (item.from !== 'Normal') continue;
    const script = item.to as ScriptListType;
    const batch = grouped.get(script) ?? [];
    batch.push(item.input);
    grouped.set(script, batch);
  }

  for (const item of typingTestData) {
    const script = item.script as ScriptListType;
    const batch = grouped.get(script) ?? [];
    batch.push(item.text);
    grouped.set(script, batch);
  }

  return Array.from(grouped.entries()).map(([script, items]) => ({
    script,
    input: items.join(BULK_SEPARATOR),
    size: items.length
  }));
}

async function measureIndividualTransliteration(transliterateFn: TransliterationFn) {
  const start = performance.now();
  for (let i = 0; i < TEST_DATA.length; i++) {
    const testData = TEST_DATA[i];
    await transliterateFn(
      testData.input,
      testData.from as ScriptListType,
      testData.to as ScriptListType,
      testData.options ?? undefined
    );
  }
  return performance.now() - start;
}

async function measureBulkTransliteration(transliterateFn: TransliterationFn) {
  const start = performance.now();
  for (let i = 0; i < TRANSLITERATION_BATCHES.length; i++) {
    const batch = TRANSLITERATION_BATCHES[i];
    await transliterateFn(batch.input, batch.from, batch.to);
  }
  return performance.now() - start;
}

async function measureTypingEmulation() {
  const normal_to_others_test_data = TEST_DATA.filter((testData) => testData.from === 'Normal');
  const start = performance.now();

  for (let i = 0; i < normal_to_others_test_data.length; i++) {
    const testData = normal_to_others_test_data[i];
    await emulateTyping(testData.input, testData.to as ScriptListType);
  }

  for (let i = 0; i < TYPING_TEST_DATA.length; i++) {
    const testData = TYPING_TEST_DATA[i];
    await emulateTyping(
      testData.text,
      testData.script as ScriptListType,
      testData.options ?? undefined
    );
  }

  return performance.now() - start;
}

async function measureBulkTypingEmulation() {
  const start = performance.now();

  for (let i = 0; i < TYPING_BATCHES.length; i++) {
    const batch = TYPING_BATCHES[i];
    await emulateTyping(batch.input, batch.script);
  }

  return performance.now() - start;
}

function formatDuration(timeMs: number) {
  return `${timeMs.toFixed(2)} ms`;
}

async function benchmark() {
  console.log(chalk.cyan.bold('Benchmark Results'));
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

  await preload_data();
  const transliterationIterated = await measureIndividualTransliteration(transliterate);
  const transliterationBulk = await measureBulkTransliteration(transliterate);

  const typingEmulationIterated = await measureTypingEmulation();
  const typingEmulationBulk = await measureBulkTypingEmulation();

  await preloadWasm();
  const transliterationWasmIterated = await measureIndividualTransliteration(transliterate_wasm);
  const transliterationWasmBulk = await measureBulkTransliteration(transliterate_wasm);

  await preloadNode();
  const transliterationNodeIterated = await measureIndividualTransliteration(transliterate_node);
  const transliterationNodeBulk = await measureBulkTransliteration(transliterate_node);

  const rows: BenchmarkRow[] = [
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
      Benchmark: 'Transliteration Cases (WASM)',
      Iterated: formatDuration(transliterationWasmIterated),
      Bulk: formatDuration(transliterationWasmBulk)
    },
    {
      Benchmark: 'Transliteration Cases (Node / N-API)',
      Iterated: formatDuration(transliterationNodeIterated),
      Bulk: formatDuration(transliterationNodeBulk)
    }
  ];

  console.table(rows);
}

async function preload_data() {
  for (const script of SCRIPT_LIST) {
    await preloadScriptData(script);
  }
}

benchmark();
