#!/usr/bin/env bun

import { lipi_parivartak as old_lipi_parivartak } from "./tools/old_lipi_lekhika";
import * as fs from "node:fs";
import { type script_list_type } from "../packages/js/src/utils/lang_list";
import chalk from "chalk";
import path from "node:path";
import {
  type KramaKeysLabelType,
  resolveKramaKeysExtendedType,
} from "../packages/js/src/make_script_data/krama_array_keys";

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

/**
 * Generates test Test Data for transliteration to and from Devangari to other Brahmic scripts
 */
const sanskrit_other_brahmic_scripts = async () => {
  const OUT_FILE_SANS_TO_BRAHMIC = "auto-san-brahmic";
  const OUT_FILE_NORM_TO_BRAHMIC = "auto-nor-brahmic";
  const FROM_SCRIPT = "Devanagari";

  const sans_to_brahmic_data: TestData[] = [];
  const norm_to_brahmic_data: TestData[] = [];

  let index = 0;
  let index1 = 0;
  let sans_to_normal_done = false;
  for (const other_script of OTHER_BRAHMI_SCRIPTS) {
    const SCRIPT_IGNORE_RULE = NON_REVERSIBLE_SCRIPT_IGNORE_MAP[other_script];
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
      const reversible = !(SCRIPT_IGNORE_RULE ?? []).some((rule) =>
        input.includes(rule)
      );
      // ^ expression simlified using boolean algebra
      sans_to_brahmic_data.push({
        index: index++,
        from: FROM_SCRIPT,
        to: other_script,
        input,
        output,
        reversible,
      });

      // getting normal output from original devanagari input
      // it should also output same `output` as the original devanagari input
      const dot_free_input = input.replaceAll(".", "");
      const dot_free_output = await old_lipi_parivartak(
        dot_free_input,
        FROM_SCRIPT,
        other_script
      );
      const norm_output = (
        await old_lipi_parivartak(dot_free_input, FROM_SCRIPT, "Normal")
      )
        .replaceAll(/\.(?=\d)/g, "")
        .replaceAll("chh", "Ch")
        .replaceAll("ch", "C");
      if (!sans_to_normal_done) {
        norm_to_brahmic_data.push({
          index: index1++,
          from: "Normal",
          to: FROM_SCRIPT,
          input: norm_output,
          output: dot_free_input,
          reversible: true,
        });
      }
      if (other_script !== "Tamil-Extended") {
        norm_to_brahmic_data.push({
          index: index1++,
          // using Nomral -> Brahmic to verify typing tool functionality
          from: "Normal",
          to: other_script,
          input: norm_output,
          output: dot_free_output,
          reversible,
        });
      }

      if (!reversible) {
        const input1 = await old_lipi_parivartak(
          output,
          other_script,
          FROM_SCRIPT
        );
        if (
          input1 !== input &&
          !(other_script === "Gurumukhi" && output.includes("ਰੀ"))
          // ^ Edge case due to improper handling of this case in old lipi lekhika
        ) {
          sans_to_brahmic_data.push({
            index: index++,
            from: other_script,
            to: FROM_SCRIPT,
            input: output,
            output: input1,
            reversible: true,
          });
        }

        // const input_norm1 = await old_lipi_parivartak(
        //   output,
        //   other_script,
        //   "Normal"
        // );
        // if (input_norm1 !== norm_output) {
        //   sans_to_brahmic_data.push({
        //     index: index++,
        //     from: other_script,
        //     to: "Normal",
        //     input: output,
        //     output: input_norm1,
        //     reversible: false,
        //   });
        // }
      }
    }
    sans_to_normal_done = true;
  }
  writeTestDataFiles(sans_to_brahmic_data, OUT_FILE_SANS_TO_BRAHMIC);
  writeTestDataFiles(norm_to_brahmic_data, OUT_FILE_NORM_TO_BRAHMIC);
  // Using a tick mark sign (✓) in the printed message
  console.log(chalk.green.bold(`✓  Devanagari ⇆ Other Brahmic Scripts`));
};

/**
 * Generates test Test Data for transliteration to and from Devangari to non-Brahmic scripts (Normal and Romanized)
 */
const sanskrit_non_brahmic_scripts = async () => {
  const OUT_FILE_SANS_OTHER = "auto-san-other";
  const OUT_FILE_NORM_OTHR = "auto-nor-other";
  const FROM_SCRIPT = "Devanagari";
  const NON_BRAHMI_SCRIPTS = [
    "Normal",
    "Romanized",
  ] satisfies script_list_type[];
  const sans_other_data: TestData[] = [];
  const norm_other_data: TestData[] = [];
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
      sans_other_data.push({
        index: index++,
        from: FROM_SCRIPT,
        to: non_brahmic_script,
        input: input,
        output: output.replaceAll(/\.(?=\d)/g, ""), // handling the case of number conversion where १ -> 1 (not .1)
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
          norm_other_data.push({
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
  writeTestDataFiles(sans_other_data, OUT_FILE_SANS_OTHER);
  writeTestDataFiles(norm_other_data, OUT_FILE_NORM_OTHR);
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

const _NON_REVERSIBLE_SCRIPT_IGNORE_MAP: {
  [script in script_list_type]?: KramaKeysLabelType[];
} = {
  Siddham: ["L"],
  Telugu: ["Dhz", "Dz"],
  Bengali: ["v"],
  Gurumukhi: [
    "Sh",
    "L",
    "R-svara",
    "R-mAtrA",
    "RR-svara",
    "RR-mAtrA",
    "LR-svara",
    "LR-mAtrA",
    "LRR-svara",
    "LRR-mAtrA",
  ],
  Tamil: [
    "kh",
    "g",
    "gh",
    "Ch",
    "jh",
    "Th",
    "D",
    "Dh",
    "Dz",
    "Dhz",
    "th",
    "d",
    "dh",
    "ph",
    "b",
    "bh",
  ],
};
/** Non Reversible in certain cases */
const NON_REVERSIBLE_SCRIPT_IGNORE_MAP = Object.fromEntries(
  Object.entries(_NON_REVERSIBLE_SCRIPT_IGNORE_MAP).map(([script, arr]) => [
    script,
    arr.map((item) => resolveKramaKeysExtendedType(item)),
  ])
) as {
  [script in script_list_type]?: string[];
};

main();
