/**
 * Empirical time-complexity analysis for `transliterate`.
 *
 * Builds inputs of increasing size from the same transliteration YAML fixtures
 * used by benchmarks/tests, measures wall time, then fits against common
 * Big-O models via least-squares R².
 *
 * Run: bun run complexity
 *   or: vite-node src/scripts/complexity.ts
 */
import {
  transliterate,
  preloadScriptData,
  type ScriptListType,
  SCRIPT_LIST,
  transliterate_wasm,
  preloadWasm
} from '..';
import { transliterate_node, preloadNode } from '../node';
import { performance } from 'node:perf_hooks';
import path from 'node:path';
import { TestDataTypeSchema } from '../transliteration/test_commons';
import * as fs from 'node:fs';
import { z } from 'zod';
import { parse } from 'yaml';
import chalk from 'chalk';

type TransliterationTestData = z.infer<typeof TestDataTypeSchema>;
type TransliterationOptions = Parameters<typeof transliterate>[3];
type TransliterationFn = (
  text: string,
  from: ScriptListType,
  to: ScriptListType,
  options?: TransliterationOptions
) => Promise<string>;

type ComplexityModel = {
  name: string;
  /** Transform input size n into the model's independent variable. */
  f: (n: number) => number;
};

type FitResult = {
  name: string;
  r2: number;
  slope: number;
  intercept: number;
};

type SizeSample = {
  chars: number;
  timeMs: number;
  iterations: number;
};

const TEST_DATA_FOLDER = path.resolve(__dirname, '../../../../test_data/transliteration');
const BULK_SEPARATOR = '\n';

/** Scale factors applied to the base bulk corpus (character count grows ~linearly). */
const SCALE_FACTORS = [1, 2, 4, 8, 16, 32] as const;

/** Minimum total measured time per size point (ms) — repeats until reached. */
const MIN_SAMPLE_MS = 80;

/** Warmup passes before measuring each size. */
const WARMUP_PASSES = 2;

const COMPLEXITY_MODELS: ComplexityModel[] = [
  { name: 'O(1)', f: () => 1 },
  { name: 'O(log n)', f: (n) => Math.log2(Math.max(n, 2)) },
  { name: 'O(n)', f: (n) => n },
  { name: 'O(n log n)', f: (n) => n * Math.log2(Math.max(n, 2)) },
  { name: 'O(n²)', f: (n) => n * n },
  { name: 'O(n³)', f: (n) => n * n * n }
];

function getTestData(): TransliterationTestData[] {
  const allYamlFiles: string[] = [];
  function scanYamlFiles(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.resolve(dir, entry.name);
      if (entry.isDirectory()) {
        scanYamlFiles(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.yaml')) {
        allYamlFiles.push(fullPath);
      }
    }
  }
  scanYamlFiles(TEST_DATA_FOLDER);
  const data: TransliterationTestData[] = [];
  for (const yamlFile of allYamlFiles) {
    data.push(...TestDataTypeSchema.array().parse(parse(fs.readFileSync(yamlFile, 'utf8'))));
  }
  return data;
}

/**
 * Group fixtures by from→to (ignoring custom options, same as benchmark bulk)
 * and join inputs into one string per pair.
 */
function buildBaseBatches(testData: TransliterationTestData[]) {
  const grouped = new Map<string, { from: ScriptListType; to: ScriptListType; parts: string[] }>();

  for (const item of testData) {
    const key = `${item.from}-${item.to}`;
    const batch = grouped.get(key) ?? {
      from: item.from as ScriptListType,
      to: item.to as ScriptListType,
      parts: []
    };
    batch.parts.push(item.input);
    grouped.set(key, batch);
  }

  return Array.from(grouped.values()).map((batch) => ({
    from: batch.from,
    to: batch.to,
    input: batch.parts.join(BULK_SEPARATOR)
  }));
}

function scaleInput(base: string, factor: number): string {
  if (factor === 1) return base;
  return Array.from({ length: factor }, () => base).join(BULK_SEPARATOR);
}

async function measureScaled(
  transliterateFn: TransliterationFn,
  batches: { from: ScriptListType; to: ScriptListType; input: string }[],
  scale: number
): Promise<SizeSample> {
  const scaled = batches.map((b) => ({
    from: b.from,
    to: b.to,
    input: scaleInput(b.input, scale)
  }));
  const chars = scaled.reduce((sum, b) => sum + b.input.length, 0);

  const runOnce = async () => {
    for (const batch of scaled) {
      await transliterateFn(batch.input, batch.from, batch.to);
    }
  };

  for (let i = 0; i < WARMUP_PASSES; i++) {
    await runOnce();
  }

  let iterations = 0;
  let totalMs = 0;
  while (totalMs < MIN_SAMPLE_MS || iterations < 3) {
    const start = performance.now();
    await runOnce();
    totalMs += performance.now() - start;
    iterations++;
  }

  return { chars, timeMs: totalMs / iterations, iterations };
}

/** Ordinary least squares: time ≈ intercept + slope * f(n). Returns R². */
function fitModel(samples: SizeSample[], model: ComplexityModel): FitResult {
  const xs = samples.map((s) => model.f(s.chars));
  const ys = samples.map((s) => s.timeMs);
  const n = samples.length;

  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;

  let ssxx = 0;
  let ssxy = 0;
  let ssyy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    ssxx += dx * dx;
    ssxy += dx * dy;
    ssyy += dy * dy;
  }

  // Degenerate (constant) model: intercept = meanY, slope = 0
  if (ssxx < 1e-18) {
    const ssRes = ys.reduce((acc, y) => acc + (y - meanY) ** 2, 0);
    const r2 = ssyy < 1e-18 ? 1 : 1 - ssRes / ssyy;
    return { name: model.name, r2, slope: 0, intercept: meanY };
  }

  const slope = ssxy / ssxx;
  const intercept = meanY - slope * meanX;

  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const predicted = intercept + slope * xs[i];
    ssRes += (ys[i] - predicted) ** 2;
  }
  const r2 = ssyy < 1e-18 ? 1 : Math.max(0, 1 - ssRes / ssyy);

  return { name: model.name, r2, slope, intercept };
}

function formatMs(ms: number) {
  return `${ms.toFixed(3)} ms`;
}

function formatChars(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function confidenceLabel(best: FitResult, second: FitResult | undefined): string {
  const gap = second ? best.r2 - second.r2 : best.r2;
  // O(n) vs O(n log n) stay close over a limited size range; high R² still counts.
  if (best.r2 >= 0.995) return gap >= 0.001 ? 'strong' : 'strong (near-linear; hard to split n vs n log n)';
  if (best.r2 >= 0.95 && gap >= 0.01) return 'likely';
  if (best.r2 >= 0.85) return 'plausible';
  return 'weak / noisy';
}

async function analyzeImplementation(
  label: string,
  transliterateFn: TransliterationFn,
  baseBatches: { from: ScriptListType; to: ScriptListType; input: string }[]
) {
  console.log(chalk.cyan.bold(`\n▸ ${label}`));

  const samples: SizeSample[] = [];
  for (const scale of SCALE_FACTORS) {
    const sample = await measureScaled(transliterateFn, baseBatches, scale);
    samples.push(sample);
    console.log(
      chalk.gray(
        `  ×${String(scale).padStart(2)}  ${formatChars(sample.chars).padStart(8)} chars  ` +
          `${formatMs(sample.timeMs).padStart(12)}  (${sample.iterations} iter)`
      )
    );
  }

  const fits = COMPLEXITY_MODELS.map((m) => fitModel(samples, m)).sort((a, b) => b.r2 - a.r2);

  console.log();
  console.table(
    fits.map((f, i) => ({
      Rank: i + 1,
      Model: f.name,
      'R²': f.r2.toFixed(4),
      Slope: f.slope.toExponential(3),
      Intercept: f.intercept.toFixed(4)
    }))
  );

  const best = fits[0];
  const second = fits[1];
  const confidence = confidenceLabel(best, second);

  console.log(
    chalk.green(
      `  Best fit: ${chalk.bold(best.name)}  (R²=${best.r2.toFixed(4)}, confidence: ${confidence})`
    )
  );
  if (second) {
    console.log(chalk.gray(`  Runner-up: ${second.name}  (R²=${second.r2.toFixed(4)})`));
  }

  // Throughput at largest size
  const largest = samples[samples.length - 1];
  const charsPerSec = (largest.chars / largest.timeMs) * 1000;
  console.log(
    chalk.gray(
      `  Throughput @ ×${SCALE_FACTORS[SCALE_FACTORS.length - 1]}: ` +
        `${formatChars(Math.round(charsPerSec))} chars/s`
    )
  );

  return { label, best, samples, fits };
}

async function preload_data() {
  for (const script of SCRIPT_LIST) {
    await preloadScriptData(script);
  }
}

async function main() {
  console.log(chalk.cyan.bold('Transliterate — Empirical Time Complexity'));
  console.log(
    chalk.gray(
      'Scales bulk from→to corpora built from the same YAML fixtures as benchmarks/tests,'
    )
  );
  console.log(
    chalk.gray(
      `then fits runtime vs size against: ${COMPLEXITY_MODELS.map((m) => m.name).join(', ')}.`
    )
  );

  const testData = getTestData();
  const baseBatches = buildBaseBatches(testData);
  const baseChars = baseBatches.reduce((sum, b) => sum + b.input.length, 0);

  console.log(
    chalk.gray(
      `\nLoaded ${testData.length} cases → ${baseBatches.length} from→to batches, ` +
        `${formatChars(baseChars)} chars at ×1.`
    )
  );
  console.log(
    chalk.gray(
      `Scales: ${SCALE_FACTORS.join('×, ')}×  |  min sample ${MIN_SAMPLE_MS}ms  |  warmup ${WARMUP_PASSES}`
    )
  );

  await preload_data();
  await analyzeImplementation('JS (TypeScript)', transliterate, baseBatches);

  await preloadWasm();
  await analyzeImplementation('WASM', transliterate_wasm, baseBatches);

  await preloadNode();
  await analyzeImplementation('Node / N-API', transliterate_node, baseBatches);

  console.log(
    chalk.yellow(
      '\nNote: empirical fit estimates observed scaling on this corpus — not a formal proof.'
    )
  );
  console.log(
    chalk.yellow(
      'Fixed per-call overhead (script load already preloaded) can inflate smaller sizes toward O(1).'
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
