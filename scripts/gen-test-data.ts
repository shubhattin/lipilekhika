#!/usr/bin/env bun

import { lipi_parivartak as old_lipi_parivartak } from "./tools/old_lipi_lekhika";
import * as fs from "node:fs";
import { type script_list_type } from "../packages/js/src/utils/lang_list";
import chalk from "chalk";
import path from "node:path";

type TestData = {
  index: number;
  from: script_list_type;
  to: script_list_type;
  input: string;
  output: string;
  reversible: boolean;
};

const DEVANAGARI_INPUTS = [
  "ऋषीणां संनिधौ राजंस्तव पुत्रागमं प्रति ।\nकाश्यपस्य च पुत्रोऽस्ति विभाण्डक इति श्रुतः ॥१-९-३॥",
  "वक्ष्यन्ति ते महीपालं ब्राह्मणा वेदपारगाः ।\nविभाण्डकसुतं राजन् सर्वोपायैरिहानय ॥१-९-१२॥",
  "तां ददर्श महातेजा मेनकां कुशिकात्मजः ।\nरूपेणाप्रतिमां तत्र विद्युतं जलदे यथा ॥१-६३-५॥",
  "इमं विवस्वते योगं प्रोक्तवानहमव्ययम् ।\nविवस्वान्मनवे प्राह मनुरिक्ष्वाकवेऽब्रवीत् ॥४-१॥",
];

const TEST_DATA_OUT_FOLDER = path.join(
  __dirname,
  "..",
  "test_data",
  "transliteration"
);

// Ensure output directory exists
if (!fs.existsSync(TEST_DATA_OUT_FOLDER)) {
  fs.mkdirSync(TEST_DATA_OUT_FOLDER, { recursive: true });
}

/**
 * Generates test Test Data for transliteration to and from Devangari to other Brahmic scripts
 */
const devangari_other_brahmic_scripts = async () => {
  const OUT_FILE_NAME = "auto-devangari_other_brahmic_scripts";
  const FROM_SCRIPT = "Devanagari";
  const OTHER_BRAHMI_SCRIPTS = [
    "Assamese",
    "Bengali",
    "Gurumukhi",
    "Gujarati",
    "Kannada",
    "Odia",
    "Malayalam",
    "Sinhala",
    "Tamil",
    "Telugu",
    "Purna-Devanagari",
  ] satisfies script_list_type[];

  const NOT_REVERSIBLE_SCRIPTS = [
    "Bengali",
    "Gurumukhi",
    "Tamil",
  ] as script_list_type[];

  const out_test_data: TestData[] = [];

  let index = 0;
  for (const input of DEVANAGARI_INPUTS) {
    for (const other_script of OTHER_BRAHMI_SCRIPTS) {
      const output = await old_lipi_parivartak(
        input,
        FROM_SCRIPT,
        other_script
      );
      const test_data: TestData = {
        index: index++,
        from: FROM_SCRIPT,
        to: other_script,
        input: input,
        output: output,
        reversible: !NOT_REVERSIBLE_SCRIPTS.includes(other_script),
      };
      out_test_data.push(test_data);
    }
  }
  fs.writeFileSync(
    path.join(TEST_DATA_OUT_FOLDER, OUT_FILE_NAME + ".yaml"),
    // @ts-ignore
    Bun.YAML.stringify(out_test_data, null, 2)
  );
  // Using a tick mark sign (✓) in the printed message
  console.log(chalk.green.bold(`✓  Devanagari ⇆ Other Brahmic Scripts`));
};

/**
 * Generates test Test Data for transliteration to and from Devangari to non-Brahmic scripts (Normal and Romanized)
 */
const devanagari_non_brahmic_scripts = async () => {
  const OUT_FILE_NAME = "auto-devangari_non_brahmic_scripts";
  const FROM_SCRIPT = "Devanagari";
  const NON_BRAHMI_SCRIPTS = [
    "Normal",
    "Romanized",
  ] satisfies script_list_type[];
  const out_test_data: TestData[] = [];
  let index = 0;
  for (const input of DEVANAGARI_INPUTS) {
    for (const non_brahmic_script of NON_BRAHMI_SCRIPTS) {
      const output = await old_lipi_parivartak(
        input,
        FROM_SCRIPT,
        non_brahmic_script
      );
      out_test_data.push({
        index: index++,
        from: FROM_SCRIPT,
        to: non_brahmic_script,
        input: input,
        output: output.replace(/\.(?=\d)/g, ""), // handling the case of number conversion where १ -> 1 (not .1)
        reversible: false,
      });
      // this version is reversible as १ -> .1 and .1 -> १
      out_test_data.push({
        index: index++,
        from: non_brahmic_script,
        to: FROM_SCRIPT,
        input: output,
        output: input,
        reversible: true,
      });
    }
  }
  fs.writeFileSync(
    path.join(TEST_DATA_OUT_FOLDER, OUT_FILE_NAME + ".yaml"),
    // @ts-ignore
    Bun.YAML.stringify(out_test_data, null, 2)
  );
  // Using a tick mark sign (✓) in the printed message
  console.log(chalk.green.bold(`✓  Devanagari ⇆ Non-Brahmic Scripts`));
};

/**
 * This generates the required test data for the projec
 */
async function main() {
  console.log(chalk.yellow.bold("Generating test data..."));
  await Promise.all([
    devangari_other_brahmic_scripts(),
    devanagari_non_brahmic_scripts(),
  ]);
}

main();
