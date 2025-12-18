import { transliterate_text } from './transliterate';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import YAML from 'yaml';
import z from 'zod';

const schema = z.object({
  index: z.number(),
  text: z.string(),
  // context length
  context: z.number()
});

const data_folder = path.join('..', '..', 'test_data', 'typing', 'context');

describe('Context Clear (Typing Mode)', () => {
  for (let file of fs.readdirSync(data_folder)) {
    if (!file.endsWith('.yaml')) continue;
    describe(`${file.split('.')[0]}`, () => {
      const test_data = schema
        .array()
        .parse(YAML.parse(fs.readFileSync(path.join(data_folder, file), 'utf-8')));
      test_data.forEach((test_case) => {
        it(`${test_case.index} - "${test_case.text}"`, async () => {
          const result = await transliterate_text(test_case.text, 'Normal', 'Devanagari', {}, true);
          expect(result.context_length).toBe(test_case.context);
        });
      });
    });
  }
});
