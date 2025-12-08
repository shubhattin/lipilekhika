#!/usr/bin/env bun

import * as fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { transliterate } from '../index';
import { z } from 'zod';

const TEST_DATA_FOLDER = path.resolve('..', '..', 'test_data', 'transliteration');
const TEST_FILES_TO_IGNORE: string[] = [];

const listYamlFiles = (directory: string): string[] => {
  const collected: string[] = [];
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.resolve(directory, entry.name);
    if (entry.isDirectory()) {
      collected.push(...listYamlFiles(fullPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.yaml')) {
      collected.push(fullPath);
    }
  }
  return collected;
};

const TestDataTypeSchema = z.object({
  index: z.number(),
  from: z.string(),
  to: z.string(),
  input: z.string(),
  output: z.string(),
  reversible: z.boolean().optional()
});

describe('Test Transliteration Function Modules', async () => {
  const yamlFiles = listYamlFiles(TEST_DATA_FOLDER);
  for (const filePath of yamlFiles) {
    const relativePath = path.relative(TEST_DATA_FOLDER, filePath);
    const fileName = path.basename(filePath);
    if (TEST_FILES_TO_IGNORE.includes(relativePath) || TEST_FILES_TO_IGNORE.includes(fileName)) {
      continue;
    }
    const test_data = TestDataTypeSchema.array().parse(parse(fs.readFileSync(filePath, 'utf8')));
    describe(relativePath, async () => {
      for (const test_data_item of test_data) {
        const result = await transliterate(
          test_data_item.input,
          test_data_item.from,
          test_data_item.to
        );
        it(`Index ${test_data_item.index} ${test_data_item.from} ➡ ${test_data_item.to}`, async () => {
          const errorMessage =
            `Transliteration failed:\n` +
            `  From: ${test_data_item.from}\n` +
            `  To: ${test_data_item.to}\n` +
            `  Input: "${test_data_item.input}"\n` +
            `  Expected: "${test_data_item.output}"\n` +
            `  Actual: "${result}"`;
          expect(result, errorMessage).toBe(test_data_item.output);
        });
        if (test_data_item.reversible) {
          it(`Index ${test_data_item.index} ${test_data_item.to} ⬅ ${test_data_item.from}`, async () => {
            const result_reversed = await transliterate(
              result,
              test_data_item.to,
              test_data_item.from
            );
            const errorMessage_reversed =
              `Reversed Transliteration failed:\n` +
              `  From: ${test_data_item.to}\n` +
              `  To: ${test_data_item.from}\n` +
              `  Input: "${result}"\n` +
              `  Original Input: "${test_data_item.input}"\n` +
              `  Reversed Output: "${result_reversed}"`;
            expect(result_reversed, errorMessage_reversed).toBe(test_data_item.input);
          });
        }
      }
    });
  }
});
