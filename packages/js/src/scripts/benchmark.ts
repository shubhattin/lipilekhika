import {
  transliterate,
  preloadScriptData,
  type ScriptListType,
  SCRIPT_LIST,
  transliterate_wasm,
  preloadWasm
} from '..';
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

const TEST_DATA_FOLDER = path.resolve(__dirname, '../../../../test_data/transliteration');
const TYPING_TEST_DATA_FOLDER = path.join(__dirname, '../../../../test_data/typing');
const TEST_DATA = getTestData();
const TYPING_TEST_DATA = getTypingTestData();

function getTestData() {
  const data: z.infer<typeof TestDataTypeSchema>[][] = [];
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
  const data: z.infer<typeof typing_test_data_schema>[][] = [];
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

async function benchmark() {
  // Transliteration Cases
  {
    console.log(chalk.cyan.bold('Transliteration Cases: '));
    await preload_data();
    const start = performance.now();
    for (let i = 0; i < TEST_DATA.length; i++) {
      const testData = TEST_DATA[i];
      await transliterate(
        testData.input,
        testData.from as ScriptListType,
        testData.to as ScriptListType,
        testData.options ?? undefined
      );
    }
    const end = performance.now();
    console.log(`Time taken: ` + chalk.yellow(`${end - start} ms`));
  }

  // Typing Emulation

  {
    // 1. Emulate on Normal to others
    const normal_to_others_test_data = TEST_DATA.filter((testData) => testData.from === 'Normal');
    console.log(chalk.cyan.bold('Typing Emulation'));
    const start = performance.now();
    for (let i = 0; i < normal_to_others_test_data.length; i++) {
      const testData = normal_to_others_test_data[i];
      await emulateTyping(testData.input, testData.to as ScriptListType);
    }
    // 2. Emulate on others to Normal
    for (let i = 0; i < TYPING_TEST_DATA.length; i++) {
      const testData = TYPING_TEST_DATA[i];
      await emulateTyping(
        testData.text,
        testData.script as ScriptListType,
        testData.options ?? undefined
      );
    }
    const end = performance.now();
    console.log(`Time taken: ` + chalk.yellow(`${end - start} ms`));
  }

  // Transliteration Cases (WASM)
  {
    console.log(chalk.cyan.bold('Transliteration Cases (WASM): '));
    await preloadWasm();
    const start = performance.now();
    for (let i = 0; i < TEST_DATA.length; i++) {
      const testData = TEST_DATA[i];
      await transliterate_wasm(
        testData.input,
        testData.from as ScriptListType,
        testData.to as ScriptListType,
        testData.options ?? undefined
      );
    }
    const end = performance.now();
    console.log(`Time taken: ` + chalk.yellow(`${end - start} ms`));
  }
}

async function preload_data() {
  for (const script of SCRIPT_LIST) {
    await preloadScriptData(script);
  }
}

benchmark();
