import path from 'path';
import { emulateTyping, TestDataTypeSchema } from './test_commons';
import { describe, expect, it } from 'vitest';
import YAML from 'yaml';
import * as fs from 'node:fs';
import type { script_and_lang_list_type } from '../utils/lang_list';
import { z } from 'zod';
import { transliterate } from '../index';
import { VEDIC_SVARAS } from './helpers';

const INPUT_FOLDERS = [
  path.join(__dirname, '../../../../test_data/transliteration/auto-nor-brahmic'),
  path.join(__dirname, '../../../../test_data/transliteration/auto-nor-other')
];

const NORMAL_PATCHES = [['`', "''"]] as const;

describe('Emulate Typing', () => {
  for (const folder of INPUT_FOLDERS) {
    const yamlFiles = fs.readdirSync(folder).filter((file) => file.endsWith('.yaml'));
    for (const yamlFile of yamlFiles) {
      const testData = TestDataTypeSchema.array().parse(
        YAML.parse(fs.readFileSync(path.join(folder, yamlFile), 'utf-8'))
      );
      describe(`⌨️ ${yamlFile.split('.')[0]}`, () => {
        for (const test of testData) {
          if (test.from !== 'Normal' || test.to === 'Normal') continue;
          const testFn = test.todo ? it.skip : it;
          testFn(`${test.index} - ${test.to}`, async () => {
            let input = test.input;
            for (const patch of NORMAL_PATCHES) {
              input = input.replaceAll(patch[1], patch[0]);
            }
            let result = await emulateTyping(input, test.to as script_and_lang_list_type);
            const errorMessage =
              `Emulate Typing failed:\n` +
              `  From: ${test.from}\n` +
              `  To: ${test.to}\n` +
              `  Input: "${input}"\n` +
              `  Expected: "${test.output}"\n` +
              `  Actual: "${result}"`;
            if (test.to === 'Romanized') {
              for (const patch of NORMAL_PATCHES) {
                result = result.replaceAll(patch[0], patch[1]);
              }
            }
            if (
              !(
                yamlFile.startsWith('auto') &&
                test.to === 'Tamil-Extended' &&
                VEDIC_SVARAS.some((svara) => result.includes(svara))
              )
            )
              // result = patch_old_tamil_extended_vedic_text(result);
              expect(result, errorMessage).toBe(test.output);
          });
        }
      });
    }
  }
});

const typing_test_data_schema = z.object({
  index: z.number(),
  text: z.string(),
  output: z.string(),
  script: z.string(),
  preserve_check: z.boolean().optional(),
  todo: z.boolean().optional(),
  options: z.record(z.string(), z.any()).optional().nullable()
});

const TEST_DATA_FOLDER = path.join(__dirname, '../../../../test_data/typing');

describe('Typing Mode', () => {
  const yamlFiles = listYamlFiles(TEST_DATA_FOLDER);
  for (const file of yamlFiles) {
    const testData = typing_test_data_schema
      .array()
      .parse(YAML.parse(fs.readFileSync(file, 'utf-8')));
    describe(`${path.basename(file, '.yaml')}`, () => {
      for (const test of testData) {
        const testFn = test.todo ? it.skip : it;
        testFn(`${test.index} - ${test.script}`, async () => {
          const result = await emulateTyping(
            test.text,
            test.script as script_and_lang_list_type,
            test.options ?? undefined
          );
          expect(result).toBe(test.output);
        });
        if (test.preserve_check) {
          testFn(`${test.index} - ${test.script} - preserve check`, async () => {
            const result1 = await emulateTyping(
              test.text,
              test.script as script_and_lang_list_type,
              test.options ?? undefined
            );
            const result = await transliterate(
              result1,
              test.script as script_and_lang_list_type,
              'Normal',
              { 'all_to_normal:preserve_specific_chars': true }
            );
            expect(result).toBe(test.text);
          });
        }
      }
    });
  }
});

const listYamlFiles = (directory: string): string[] => {
  const collected: string[] = [];
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.resolve(directory, entry.name);
    if (entry.isDirectory() && entry.name !== 'context') {
      collected.push(...listYamlFiles(fullPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.yaml')) {
      collected.push(fullPath);
    }
  }
  return collected;
};
