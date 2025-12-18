import path from 'path';
import { TestDataTypeSchema } from './test_commons';
import { describe, expect, it } from 'vitest';
import YAML from 'yaml';
import * as fs from 'node:fs';
import { emulateTyping } from '../index';
import type { script_and_lang_list_type } from '../utils/lang_list';

const INPUT_FOLDERS = [
  path.join(__dirname, '../../../../test_data/transliteration/auto-nor-brahmic'),
  path.join(__dirname, '../../../../test_data/transliteration/auto-nor-other')
];

describe('Emulate Typing', () => {
  for (const folder of INPUT_FOLDERS) {
    const yamlFiles = fs.readdirSync(folder).filter((file) => file.endsWith('.yaml'));
    for (const yamlFile of yamlFiles) {
      const testData = TestDataTypeSchema.array().parse(
        YAML.parse(fs.readFileSync(path.join(folder, yamlFile), 'utf-8'))
      );
      describe(`⌨️ ${yamlFile.split('.')[0]}`, () => {
        for (const test of testData) {
          if (test.todo || test.from !== 'Normal' || test.to === 'Normal') continue;
          it(`${test.index} - ${test.input}`, async () => {
            const result = await emulateTyping(test.input, test.to as script_and_lang_list_type);
            expect(result).toBe(test.output);
          });
        }
      });
    }
  }
});
