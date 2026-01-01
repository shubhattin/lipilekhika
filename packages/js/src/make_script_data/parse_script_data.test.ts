import { describe, it } from 'vitest';
import { scriptDataSchema } from './_script_data_type';
import * as fs from 'node:fs';
import path from 'node:path';

const SCRIPT_DATA_PATH = path.join('./src/script_data');

describe('Parse Script Data', () => {
  const files = fs.readdirSync(SCRIPT_DATA_PATH);
  for (const file of files) {
    it('Parse ' + file.split('.')[0], () => {
      const data = JSON.parse(
        fs.readFileSync(path.join(SCRIPT_DATA_PATH, file), { encoding: 'utf-8' })
      );

      scriptDataSchema.parse(data);
    });
  }
});
