#!/usr/bin/env bun

import { lipi_parivartak as old_lipi_parivartak } from './tools/old_lipi_lekhika';
import * as fs from 'node:fs';
import { type script_list_type } from '../packages/js/src/utils/lang_list';
import chalk from 'chalk';
import path from 'node:path';

type TestData = {
  index: number;
  from: script_list_type;
  to: script_list_type;
  input: string;
  output: string;
  reversible: boolean;
};

/**
 * Generates test Test Data for transliteration to and from Devangari to other Brahmic scripts
 */
const devangari_other_brahmic_scripts = async () => {
  const OUT_FILE_NAME = 'devangari_other_brahmic_scripts.json';
  const FROM_SCRIPT = 'Devanagari';
  const OTHER_BRAHMI_SCRIPTS = [
    'Gujarati',
    'Bengali',
    'Assamese',
    'Odia',
    'Telugu',
    'Kannada',
    'Malayalam',
    'Sinhala'
  ] satisfies script_list_type[];
  const DEVANAGARI_INPUTS = ['अ'];

  const out_test_data: TestData[] = [];

  let index = 0;
  for (const input of DEVANAGARI_INPUTS) {
    for (const other_script of OTHER_BRAHMI_SCRIPTS) {
      const output = await old_lipi_parivartak(input, FROM_SCRIPT, other_script);
      const test_data: TestData = {
        index: index++,
        from: FROM_SCRIPT,
        to: other_script,
        input: input,
        output: output,
        reversible: true
      };
      out_test_data.push(test_data);
    }
  }
  fs.writeFileSync(
    path.join(__dirname, '..', 'test_data', OUT_FILE_NAME),
    JSON.stringify(out_test_data, null, 2)
  );
  // Using a tick mark sign (✓) in the printed message
  console.log(chalk.green.bold(`✓  Devanagari ⇆ Other Brahmic Scripts`));
};

/**
 * This generates the required test data for the projec
 */
async function main() {
  console.log(chalk.yellow.bold('Generating test data...'));
  await Promise.all([devangari_other_brahmic_scripts()]);
}

main();
