//! Empirical time-complexity analysis for `transliterate`.
//!
//! Builds inputs of increasing size from the same transliteration YAML fixtures
//! used by benchmarks/tests, measures wall time, then fits against common
//! Big-O models via least-squares R².
//!
//! Mirrors `packages/js/src/scripts/complexity.ts`.
//!
//! Run: `cargo run --example complexity --release -p lipilekhika`
//! (from workspace root; from `packages/rust` omit `-p lipilekhika` if that crate is default).

use hashbrown::HashMap;
use indexmap::IndexMap;
use lipilekhika::get_script_list_data;
use lipilekhika::preload_script_data;
use lipilekhika::scripts::Script;
use lipilekhika::transliterate;
use owo_colors::OwoColorize;
use serde::Deserialize;
use std::fs;
use std::hint::black_box;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::str::FromStr;
use std::time::{Duration, Instant};

const BULK_SEPARATOR: &str = "\n";

/// Scale factors applied to the base bulk corpus (character count grows ~linearly).
const SCALE_FACTORS: &[usize] = &[1, 2, 4, 8, 16, 32];

/// Minimum total measured time per size point — repeats until reached.
const MIN_SAMPLE: Duration = Duration::from_millis(80);

/// Warmup passes before measuring each size.
const WARMUP_PASSES: usize = 2;

fn parse_script(name: &str) -> Script {
    Script::from_str(name).unwrap_or_else(|e| panic!("invalid script name {name:?}: {e}"))
}

fn de_index<'de, D>(deserializer: D) -> Result<String, D::Error>
where
    D: serde::Deserializer<'de>,
{
    struct IndexVisitor;

    impl serde::de::Visitor<'_> for IndexVisitor {
        type Value = String;

        fn expecting(&self, formatter: &mut std::fmt::Formatter) -> std::fmt::Result {
            formatter.write_str("a yaml index (number or string)")
        }

        fn visit_i64<E>(self, v: i64) -> Result<Self::Value, E>
        where
            E: serde::de::Error,
        {
            Ok(v.to_string())
        }

        fn visit_u64<E>(self, v: u64) -> Result<Self::Value, E>
        where
            E: serde::de::Error,
        {
            Ok(v.to_string())
        }

        fn visit_f64<E>(self, v: f64) -> Result<Self::Value, E>
        where
            E: serde::de::Error,
        {
            Ok(v.to_string())
        }

        fn visit_str<E>(self, v: &str) -> Result<Self::Value, E>
        where
            E: serde::de::Error,
        {
            Ok(v.to_string())
        }

        fn visit_string<E>(self, v: String) -> Result<Self::Value, E>
        where
            E: serde::de::Error,
        {
            Ok(v)
        }
    }

    deserializer.deserialize_any(IndexVisitor)
}

#[derive(Debug, Deserialize)]
struct TransliterationTestCase {
    #[serde(deserialize_with = "de_index")]
    #[allow(dead_code)]
    index: String,
    from: String,
    to: String,
    input: String,
    #[serde(default)]
    #[allow(dead_code)]
    options: Option<HashMap<String, bool>>,
    #[serde(default)]
    #[allow(dead_code)]
    todo: Option<bool>,
}

// ----------------------------
// Data loading
// ----------------------------

fn transliteration_test_data_root() -> PathBuf {
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    manifest_dir
        .join("..")
        .join("..")
        .join("test_data")
        .join("transliteration")
}

fn list_yaml_files_recursive(dir: &Path, out: &mut Vec<PathBuf>) -> std::io::Result<()> {
    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.is_dir() {
            list_yaml_files_recursive(&path, out)?;
        } else if path.extension().is_some_and(|e| e == "yaml") {
            out.push(path);
        }
    }
    Ok(())
}

fn get_test_data() -> Vec<TransliterationTestCase> {
    use serde_yaml_ng as yaml;

    let root = transliteration_test_data_root();
    let mut files: Vec<PathBuf> = Vec::new();
    list_yaml_files_recursive(&root, &mut files)
        .unwrap_or_else(|e| panic!("Failed listing YAML files in `{}`: {e}", root.display()));
    files.sort();

    assert!(
        !files.is_empty(),
        "No YAML transliteration test files in `{}`",
        root.display()
    );

    let mut data = Vec::new();
    for file in files {
        let s = fs::read_to_string(&file)
            .unwrap_or_else(|e| panic!("Failed reading `{}`: {e}", file.display()));
        let mut cases: Vec<TransliterationTestCase> = yaml::from_str(&s)
            .unwrap_or_else(|e| panic!("Failed parsing `{}`: {e}", file.display()));
        data.append(&mut cases);
    }
    data
}

// ----------------------------
// Batches
// ----------------------------

struct TransliterationBatch {
    from: Script,
    to: Script,
    input: String,
}

/// Group fixtures by from→to (ignoring custom options, same as benchmark bulk)
/// and join inputs into one string per pair.
fn build_base_batches(test_data: &[TransliterationTestCase]) -> Vec<TransliterationBatch> {
    let mut grouped: IndexMap<String, Vec<&TransliterationTestCase>> = IndexMap::new();
    for item in test_data {
        let key = format!("{}-{}", item.from, item.to);
        grouped.entry(key).or_default().push(item);
    }
    grouped
        .into_values()
        .map(|items| TransliterationBatch {
            from: parse_script(&items[0].from),
            to: parse_script(&items[0].to),
            input: items
                .iter()
                .map(|i| i.input.as_str())
                .collect::<Vec<_>>()
                .join(BULK_SEPARATOR),
        })
        .collect()
}

fn scale_input(base: &str, factor: usize) -> String {
    if factor == 1 {
        return base.to_string();
    }
    (0..factor)
        .map(|_| base)
        .collect::<Vec<_>>()
        .join(BULK_SEPARATOR)
}

// ----------------------------
// Complexity fitting
// ----------------------------

struct SizeSample {
    chars: usize,
    time_ms: f64,
    iterations: usize,
}

struct FitResult {
    name: &'static str,
    r2: f64,
    slope: f64,
    intercept: f64,
}

type ModelFn = fn(f64) -> f64;

const COMPLEXITY_MODELS: &[(&str, ModelFn)] = &[
    ("O(1)", |_| 1.0),
    ("O(log n)", |n| (n.max(2.0)).log2()),
    ("O(n)", |n| n),
    ("O(n log n)", |n| n * (n.max(2.0)).log2()),
    ("O(n²)", |n| n * n),
    ("O(n³)", |n| n * n * n),
];

/// Ordinary least squares: time ≈ intercept + slope * f(n).
fn fit_model(samples: &[SizeSample], name: &'static str, f: ModelFn) -> FitResult {
    let n = samples.len() as f64;
    let xs: Vec<f64> = samples.iter().map(|s| f(s.chars as f64)).collect();
    let ys: Vec<f64> = samples.iter().map(|s| s.time_ms).collect();

    let mean_x = xs.iter().sum::<f64>() / n;
    let mean_y = ys.iter().sum::<f64>() / n;

    let mut ssxx = 0.0;
    let mut ssxy = 0.0;
    let mut ssyy = 0.0;
    for i in 0..samples.len() {
        let dx = xs[i] - mean_x;
        let dy = ys[i] - mean_y;
        ssxx += dx * dx;
        ssxy += dx * dy;
        ssyy += dy * dy;
    }

    // Degenerate (constant) model
    if ssxx < 1e-18 {
        let ss_res = ys.iter().map(|y| (y - mean_y).powi(2)).sum::<f64>();
        let r2 = if ssyy < 1e-18 {
            1.0
        } else {
            1.0 - ss_res / ssyy
        };
        return FitResult {
            name,
            r2,
            slope: 0.0,
            intercept: mean_y,
        };
    }

    let slope = ssxy / ssxx;
    let intercept = mean_y - slope * mean_x;

    let mut ss_res = 0.0;
    for i in 0..samples.len() {
        let predicted = intercept + slope * xs[i];
        ss_res += (ys[i] - predicted).powi(2);
    }
    let r2 = if ssyy < 1e-18 {
        1.0
    } else {
        (1.0 - ss_res / ssyy).max(0.0)
    };

    FitResult {
        name,
        r2,
        slope,
        intercept,
    }
}

fn confidence_label(best: &FitResult, second: Option<&FitResult>) -> String {
    let gap = second.map(|s| best.r2 - s.r2).unwrap_or(best.r2);
    // O(n) vs O(n log n) stay close over a limited size range; high R² still counts.
    if best.r2 >= 0.995 {
        if gap >= 0.001 {
            "strong".to_string()
        } else {
            "strong (near-linear; hard to split n vs n log n)".to_string()
        }
    } else if best.r2 >= 0.95 && gap >= 0.01 {
        "likely".to_string()
    } else if best.r2 >= 0.85 {
        "plausible".to_string()
    } else {
        "weak / noisy".to_string()
    }
}

// ----------------------------
// Timing
// ----------------------------

fn preload_data() {
    for script in &get_script_list_data().scripts {
        let _ = preload_script_data(parse_script(script));
    }
}

fn run_once(batches: &[TransliterationBatch]) {
    for batch in batches {
        let out = transliterate(&batch.input, batch.from, batch.to, None);
        black_box(out);
    }
}

fn measure_scaled(base_batches: &[TransliterationBatch], scale: usize) -> SizeSample {
    let scaled: Vec<TransliterationBatch> = base_batches
        .iter()
        .map(|b| TransliterationBatch {
            from: b.from,
            to: b.to,
            input: scale_input(&b.input, scale),
        })
        .collect();
    let chars = scaled.iter().map(|b| b.input.chars().count()).sum();

    for _ in 0..WARMUP_PASSES {
        run_once(&scaled);
    }

    let mut iterations = 0usize;
    let mut total = Duration::ZERO;
    while total < MIN_SAMPLE || iterations < 3 {
        let start = Instant::now();
        run_once(&scaled);
        total += start.elapsed();
        iterations += 1;
    }

    SizeSample {
        chars,
        time_ms: total.as_secs_f64() * 1000.0 / iterations as f64,
        iterations,
    }
}

fn format_ms(ms: f64) -> String {
    format!("{ms:.3} ms")
}

fn format_chars(n: usize) -> String {
    if n >= 1_000_000 {
        format!("{:.2}M", n as f64 / 1_000_000.0)
    } else if n >= 1_000 {
        format!("{:.1}k", n as f64 / 1_000.0)
    } else {
        n.to_string()
    }
}

fn analyze(base_batches: &[TransliterationBatch]) {
    println!("\n{}", "▸ Rust (native)".cyan().bold());

    let mut samples = Vec::with_capacity(SCALE_FACTORS.len());
    for &scale in SCALE_FACTORS {
        let sample = measure_scaled(base_batches, scale);
        println!(
            "  ×{:>2}  {:>8} chars  {:>12}  ({} iter)",
            scale,
            format_chars(sample.chars),
            format_ms(sample.time_ms),
            sample.iterations
        );
        let _ = std::io::stdout().flush();
        samples.push(sample);
    }

    let mut fits: Vec<FitResult> = COMPLEXITY_MODELS
        .iter()
        .map(|(name, f)| fit_model(&samples, name, *f))
        .collect();
    fits.sort_by(|a, b| b.r2.partial_cmp(&a.r2).unwrap_or(std::cmp::Ordering::Equal));

    println!();
    println!(
        "  {:>4}  {:<12}  {:>8}  {:>12}  {:>12}",
        "Rank", "Model", "R²", "Slope", "Intercept"
    );
    println!(
        "  {:->4}  {:-<12}  {:->8}  {:->12}  {:->12}",
        "", "", "", "", ""
    );
    for (i, f) in fits.iter().enumerate() {
        println!(
            "  {:>4}  {:<12}  {:>8.4}  {:>12.3e}  {:>12.4}",
            i + 1,
            f.name,
            f.r2,
            f.slope,
            f.intercept
        );
    }

    let best = &fits[0];
    let second = fits.get(1);
    let confidence = confidence_label(best, second);

    println!();
    println!(
        "  Best fit: {}  (R²={:.4}, confidence: {})",
        best.name.green().bold(),
        best.r2,
        confidence
    );
    if let Some(second) = second {
        println!("  Runner-up: {}  (R²={:.4})", second.name, second.r2);
    }

    let largest = samples.last().unwrap();
    let chars_per_sec = (largest.chars as f64 / largest.time_ms) * 1000.0;
    println!(
        "  Throughput @ ×{}: {} chars/s",
        SCALE_FACTORS.last().unwrap(),
        format_chars(chars_per_sec.round() as usize)
    );
}

fn main() {
    println!(
        "{}",
        "Transliterate — Empirical Time Complexity".cyan().bold()
    );
    println!("Scales bulk from→to corpora built from the same YAML fixtures as benchmarks/tests,");
    println!(
        "then fits runtime vs size against: {}.",
        COMPLEXITY_MODELS
            .iter()
            .map(|(n, _)| *n)
            .collect::<Vec<_>>()
            .join(", ")
    );

    let test_data = get_test_data();
    let base_batches = build_base_batches(&test_data);
    let base_chars: usize = base_batches.iter().map(|b| b.input.chars().count()).sum();

    println!(
        "\nLoaded {} cases → {} from→to batches, {} chars at ×1.",
        test_data.len(),
        base_batches.len(),
        format_chars(base_chars)
    );
    println!(
        "Scales: {}×  |  min sample {}ms  |  warmup {}",
        SCALE_FACTORS
            .iter()
            .map(|s| s.to_string())
            .collect::<Vec<_>>()
            .join("×, "),
        MIN_SAMPLE.as_millis(),
        WARMUP_PASSES
    );
    let _ = std::io::stdout().flush();

    preload_data();
    analyze(&base_batches);

    println!();
    println!(
        "{}",
        "Note: empirical fit estimates observed scaling on this corpus — not a formal proof."
            .yellow()
    );
    println!(
        "{}",
        "Fixed per-call overhead (script data already preloaded) can inflate smaller sizes toward O(1)."
            .yellow()
    );
}
