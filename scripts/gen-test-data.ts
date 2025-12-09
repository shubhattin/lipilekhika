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

const MAX_ARRAY_TEST_SIZE = 41;

const chunkArray = <T>(items: T[], chunkSize: number): T[][] => {
  if (chunkSize <= 0) {
    throw new Error("chunkSize must be greater than 0");
  }
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
};

const purgeTestDataFolders = (baseFileName: string) => {
  if (!fs.existsSync(TEST_DATA_OUT_FOLDER)) {
    return;
  }
  const existingEntries = fs.readdirSync(TEST_DATA_OUT_FOLDER, {
    withFileTypes: true,
  });
  existingEntries
    .filter(
      (entry) => entry.isDirectory() && entry.name.startsWith(baseFileName)
    )
    .forEach((dir) => {
      fs.rmSync(path.join(TEST_DATA_OUT_FOLDER, dir.name), {
        recursive: true,
        force: true,
      });
    });
};

const writeTestDataFiles = <T extends { index: number }>(
  items: T[],
  baseFileName: string
) => {
  purgeTestDataFolders(baseFileName);
  const baseOutputDir = path.join(TEST_DATA_OUT_FOLDER, baseFileName);
  fs.mkdirSync(baseOutputDir, { recursive: true });
  const chunks =
    items.length === 0
      ? ([[]] as T[][])
      : chunkArray(items, MAX_ARRAY_TEST_SIZE);
  chunks.forEach((chunk, idx) => {
    const suffix = chunks.length > 1 ? `-${idx + 1}` : "";
    const reindexedChunk = chunk.map((entry, chunkIndex) => ({
      ...entry,
      index: chunkIndex,
    })) as T[];
    const outFilePath = path.join(
      baseOutputDir,
      `${baseFileName}${suffix}.yaml`
    );
    fs.writeFileSync(
      outFilePath,
      // @ts-ignore
      Bun.YAML.stringify(reindexedChunk, null, 2)
    );
  });
};

const DEVANAGARI_INPUTS = fs
  .readFileSync(path.join(__dirname, "sanskrit-inputs.txt"), "utf-8")
  .split("\n\n")
  .map((line) => line.trim());
const VEDIC_INPUTS = fs
  .readFileSync(path.join(__dirname, "vedic-inputs.txt"), "utf-8")
  .split("\n\n")
  .map((line) => line.trim());
const COMBINED_INPUTS = [...DEVANAGARI_INPUTS, ...VEDIC_INPUTS];

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
const sanskrit_other_brahmic_scripts = async () => {
  const OUT_FILE_NAME = "auto-san-brahmic";
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
    "Tamil-Extended",
    // Ancient Scripts
    "Brahmi",
    "Granth",
    "Modi",
    "Sharada",
    "Siddham",
  ] satisfies script_list_type[];

  const NOT_REVERSIBLE_SCRIPTS = [
    "Bengali",
    "Gurumukhi",
    "Tamil",
    "Telugu", // as it lacks Dhz,Dz etc
    "Siddham", // there is no L in Siddham, only l present
  ] as script_list_type[];

  const out_test_data: TestData[] = [];

  let index = 0;
  for (const other_script of OTHER_BRAHMI_SCRIPTS) {
    for (const _input of COMBINED_INPUTS) {
      let input = _input;
      if (
        other_script === "Modi" ||
        other_script === "Sharada" ||
        other_script === "Siddham"
      ) {
        input = input.replaceAll("॥", "");
        // double danda transliteration issue in converter script
        // data is fine so we bypass it, otherwise verified working fine
      }
      let output = await old_lipi_parivartak(input, FROM_SCRIPT, other_script);
      let test_data: TestData = {
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
  writeTestDataFiles(out_test_data, OUT_FILE_NAME);
  // Using a tick mark sign (✓) in the printed message
  console.log(chalk.green.bold(`✓  Devanagari ⇆ Other Brahmic Scripts`));
};

/**
 * Generates test Test Data for transliteration to and from Devangari to non-Brahmic scripts (Normal and Romanized)
 */
const sanskrit_non_brahmic_scripts = async () => {
  const OUT_FILE_NAME = "auto-san-other";
  const OUT_FILE_NAME1 = "auto-nor-other";
  const FROM_SCRIPT = "Devanagari";
  const NON_BRAHMI_SCRIPTS = [
    "Normal",
    "Romanized",
  ] satisfies script_list_type[];
  const out_test_data: TestData[] = [];
  const out_test_data1: TestData[] = [];
  let index = 0;
  let index1 = 0;
  for (const non_brahmic_script of NON_BRAHMI_SCRIPTS) {
    for (const input of COMBINED_INPUTS) {
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
        reversible: !input.includes("."), // if .(dot) then not reversible
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
  writeTestDataFiles(out_test_data, OUT_FILE_NAME);
  writeTestDataFiles(out_test_data1, OUT_FILE_NAME1);
  // Using a tick mark sign (✓) in the printed message
  console.log(chalk.green.bold(`✓  Devanagari ⇆ Non-Brahmic Scripts`));
};

/**
 * This generates the required test data for the projec
 */
async function main() {
  console.log(chalk.yellow.bold("Generating test data..."));
  await Promise.all([
    sanskrit_other_brahmic_scripts(),
    sanskrit_non_brahmic_scripts(),
  ]);
}

main();
