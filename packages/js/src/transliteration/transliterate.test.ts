#!/usr/bin/env bun

import * as fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import type { script_list_type } from '../utils/lang_list';
import { transliterate } from '../index';

const TEST_DATA_FOLDER = path.resolve('..', '..', 'test_data', 'transliteration');
const TEST_FILES_TO_IGNORE = ['auto-devangari_non_brahmic_scripts.yaml'];

type TestDataType = {
  index: number;
  from: script_list_type;
  to: script_list_type;
  input: string;
  output: string;
  reversible: boolean;
};

describe('Test Transliteration Function Modules', async () => {
  const file_list = fs.readdirSync(TEST_DATA_FOLDER);
  for (const file of file_list) {
    if (!file.endsWith('.yaml') || TEST_FILES_TO_IGNORE.includes(file)) continue;
    const test_data = parse(
      fs.readFileSync(path.resolve(TEST_DATA_FOLDER, file), 'utf8')
    ) as TestDataType[];
    describe(file, async () => {
      for (const test_data_item of test_data) {
        it(`Index ${test_data_item.index}`, async () => {
          const result = await transliterate(
            test_data_item.input,
            test_data_item.from,
            test_data_item.to
          );
          const errorMessage =
            `Transliteration failed:\n` +
            `  Input: "${test_data_item.input}"\n` +
            `  From: ${test_data_item.from}\n` +
            `  To: ${test_data_item.to}\n` +
            `  Expected: "${test_data_item.output}"\n` +
            `  Actual: "${result}"`;
          expect(result, errorMessage).toBe(test_data_item.output);

          if (test_data_item.reversible) {
            const result_reversed = await transliterate(
              result,
              test_data_item.to,
              test_data_item.from
            );
            const errorMessage_reversed =
              `Reversed Transliteration failed:\n` +
              `  Input: "${result}"\n` +
              `  From: ${test_data_item.to}\n` +
              `  To: ${test_data_item.from}\n` +
              `  Expected: "${test_data_item.input}"\n` +
              `  Actual: "${result_reversed}"`;
            expect(result_reversed, errorMessage_reversed).toBe(test_data_item.input);
          }
        });
      }
    });
  }
});
