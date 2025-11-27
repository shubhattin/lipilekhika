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
  reversible?: boolean;
};

const DEVANAGARI_INPUTS = fs
  .readFileSync(path.join(__dirname, "devanagari-inputs.txt"), "utf-8")
  .split("\n\n")
  .map((line) => line.trim());

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
    // Ancient Scripts
    "Brahmi",
  ] satisfies script_list_type[];

  const NOT_REVERSIBLE_SCRIPTS = [
    "Bengali",
    "Gurumukhi",
    "Tamil",
    "Telugu", // as it lacks Dhz,Dz etc
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
  const OUT_FILE_NAME1 = "auto-normal_other_scripts";
  const FROM_SCRIPT = "Devanagari";
  const NON_BRAHMI_SCRIPTS = [
    "Normal",
    "Romanized",
  ] satisfies script_list_type[];
  const out_test_data: TestData[] = [];
  const out_test_data1: TestData[] = [];
  let index = 0;
  let index1 = 0;
  for (const input of DEVANAGARI_INPUTS) {
    for (const non_brahmic_script of NON_BRAHMI_SCRIPTS) {
      let output = await old_lipi_parivartak(
        input,
        FROM_SCRIPT,
        non_brahmic_script
      );
      if (
        non_brahmic_script === "Romanized" ||
        non_brahmic_script === "Normal"
      ) {
        output = output.replaceAll("chh", "Ch");
        output = output.replaceAll("ch", "C");
      }
      out_test_data.push({
        index: index++,
        from: FROM_SCRIPT,
        to: non_brahmic_script,
        input: input,
        output: output.replace(/\.(?=\d)/g, ""), // handling the case of number conversion where १ -> 1 (not .1)
        reversible: true,
      });
      if (non_brahmic_script === "Normal") {
        for (const other_script of NON_BRAHMI_SCRIPTS) {
          if (other_script === "Normal") continue;
          const output1 = await old_lipi_parivartak(
            output,
            non_brahmic_script,
            other_script
          );
          out_test_data1.push({
            index: index1++,
            from: non_brahmic_script,
            to: other_script,
            input: output,
            output: output1,
            reversible: true,
          });
        }
      }
    }
  }
  fs.writeFileSync(
    path.join(TEST_DATA_OUT_FOLDER, OUT_FILE_NAME + ".yaml"),
    // @ts-ignore
    Bun.YAML.stringify(out_test_data, null, 2)
  );
  fs.writeFileSync(
    path.join(TEST_DATA_OUT_FOLDER, OUT_FILE_NAME1 + ".yaml"),
    // @ts-ignore
    Bun.YAML.stringify(out_test_data1, null, 2)
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
