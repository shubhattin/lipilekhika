// Empirical time-complexity analysis for `transliterate`.
//
// Builds inputs of increasing size from the same transliteration YAML fixtures
// used by benchmarks/tests, measures wall time, then fits against common
// Big-O models via least-squares R². Runs the **built package** (see `bench_common.mjs`).
//
// Run: bun run complexity   (builds `dist/esm`, then `node scripts/complexity.mjs`)

import { performance } from 'node:perf_hooks';
import chalk from 'chalk';
import { RUNTIME, load_lib, load_transliteration_cases } from './bench_common.mjs';

const BULK_SEPARATOR = '\n';

/** Scale factors applied to the base bulk corpus (character count grows ~linearly). */
const SCALE_FACTORS = [1, 2, 4, 8, 16, 32];

/** Minimum total measured time per size point (ms) — repeats until reached. */
const MIN_SAMPLE_MS = 80;

/** Warmup passes before measuring each size. */
const WARMUP_PASSES = 2;

/** @type {{ name: string, f: (n: number) => number }[]} */
const COMPLEXITY_MODELS = [
  { name: 'O(1)', f: () => 1 },
  { name: 'O(log n)', f: (n) => Math.log2(Math.max(n, 2)) },
  { name: 'O(n)', f: (n) => n },
  { name: 'O(n log n)', f: (n) => n * Math.log2(Math.max(n, 2)) },
  { name: 'O(n²)', f: (n) => n * n },
  { name: 'O(n³)', f: (n) => n * n * n }
];

/**
 * Group fixtures by from→to (ignoring custom options, same as benchmark bulk)
 * and join inputs into one string per pair.
 */
function buildBaseBatches(testData) {
  /** @type {Map<string, { from: string, to: string, parts: string[] }>} */
  const grouped = new Map();

  for (const item of testData) {
    const key = `${item.from}-${item.to}`;
    const batch = grouped.get(key) ?? {
      from: item.from,
      to: item.to,
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

function scaleInput(base, factor) {
  if (factor === 1) return base;
  return Array.from({ length: factor }, () => base).join(BULK_SEPARATOR);
}

async function measureScaled(transliterateFn, batches, scale) {
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
function fitModel(samples, model) {
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

function formatMs(ms) {
  return `${ms.toFixed(3)} ms`;
}

function formatChars(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function confidenceLabel(best, second) {
  const gap = second ? best.r2 - second.r2 : best.r2;
  // O(n) vs O(n log n) stay close over a limited size range; high R² still counts.
  if (best.r2 >= 0.995)
    return gap >= 0.001 ? 'strong' : 'strong (near-linear; hard to split n vs n log n)';
  if (best.r2 >= 0.95 && gap >= 0.01) return 'likely';
  if (best.r2 >= 0.85) return 'plausible';
  return 'weak / noisy';
}

async function analyzeImplementation(label, transliterateFn, baseBatches) {
  console.log(chalk.cyan.bold(`\n▸ ${label}`));

  const samples = [];
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

async function main() {
  console.log(
    chalk.cyan.bold(`Transliterate — Empirical Time Complexity (${RUNTIME}, built package)`)
  );
  console.log(
    chalk.gray('Scales bulk from→to corpora built from the same YAML fixtures as benchmarks/tests,')
  );
  console.log(
    chalk.gray(
      `then fits runtime vs size against: ${COMPLEXITY_MODELS.map((m) => m.name).join(', ')}.`
    )
  );

  const { main: lib, node } = await load_lib();
  const testData = load_transliteration_cases();
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

  for (const script of lib.SCRIPT_LIST) await lib.preloadScriptData(script);
  await analyzeImplementation('JS', lib.transliterate, baseBatches);

  await lib.preloadWasm();
  await analyzeImplementation('WASM', lib.transliterate_wasm, baseBatches);

  await node.preloadNode();
  await analyzeImplementation('Node / N-API', node.transliterate_node, baseBatches);

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
