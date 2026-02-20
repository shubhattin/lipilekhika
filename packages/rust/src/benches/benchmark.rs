use criterion::{Criterion, black_box, criterion_group, criterion_main};
use lipilekhika::transliterate;
use lipilekhika::typing::{TypingContextOptions, emulate_typing};
use serde::Deserialize;
use std::collections::HashMap;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::OnceLock;
use std::time::{Duration, Instant};

// ----------------------------
// YAML schemas (mirrors JS + existing Rust YAML tests)
// ----------------------------

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

#[derive(Clone, Debug, Deserialize)]
struct TransliterationTestCase {
  #[serde(deserialize_with = "de_index")]
  #[allow(dead_code)]
  index: String,
  from: String,
  to: String,
  input: String,
  #[serde(default)]
  options: Option<HashMap<String, bool>>,
  #[serde(default)]
  todo: Option<bool>,
}

#[derive(Clone, Debug, Deserialize, Default)]
struct TypingOptionsYaml {
  #[serde(rename = "useNativeNumerals")]
  #[serde(default)]
  use_native_numerals: Option<bool>,

  #[serde(rename = "includeInherentVowel")]
  #[serde(default)]
  include_inherent_vowel: Option<bool>,

  #[serde(rename = "autoContextTClearTimeMs")]
  #[serde(default)]
  auto_context_clear_time_ms: Option<u64>,
}

#[derive(Clone, Debug, Deserialize)]
struct TypingTestCase {
  #[allow(dead_code)]
  index: i64,
  text: String,
  #[allow(dead_code)]
  output: String,
  script: String,
  #[serde(default)]
  todo: bool,
  #[serde(default)]
  options: Option<TypingOptionsYaml>,
}

fn build_typing_options(opts: &Option<TypingOptionsYaml>) -> Option<TypingContextOptions> {
  let some_opts = match opts {
    None => return None,
    Some(o) => o,
  };

  let mut rust_opts = TypingContextOptions::default();
  if let Some(v) = some_opts.use_native_numerals {
    rust_opts.use_native_numerals = v;
  }
  if let Some(v) = some_opts.include_inherent_vowel {
    rust_opts.include_inherent_vowel = v;
  }
  if let Some(v) = some_opts.auto_context_clear_time_ms {
    rust_opts.auto_context_clear_time_ms = v;
  }

  Some(rust_opts)
}

// ----------------------------
// Data loading
// ----------------------------

fn transliteration_test_data_root() -> PathBuf {
  // `packages/rust` -> `../../test_data/transliteration`
  let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
  manifest_dir
    .join("..")
    .join("..")
    .join("test_data")
    .join("transliteration")
}

fn typing_test_data_root() -> PathBuf {
  // `packages/rust` -> `../../test_data/typing`
  let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
  manifest_dir
    .join("..")
    .join("..")
    .join("test_data")
    .join("typing")
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

fn list_yaml_files_typing(dir: &Path, out: &mut Vec<PathBuf>) -> std::io::Result<()> {
  for entry in fs::read_dir(dir)? {
    let entry = entry?;
    let path = entry.path();
    if path.is_dir() {
      if path
        .file_name()
        .and_then(|n| n.to_str())
        .is_some_and(|n| n == "context")
      {
        continue;
      }
      list_yaml_files_typing(&path, out)?;
    } else if path.extension().and_then(|e| e.to_str()) == Some("yaml") {
      out.push(path);
    }
  }
  Ok(())
}

fn load_transliteration_cases() -> Vec<TransliterationTestCase> {
  use serde_yaml_ng as yaml;

  let root = transliteration_test_data_root();
  let mut files: Vec<PathBuf> = Vec::new();
  list_yaml_files_recursive(&root, &mut files)
    .unwrap_or_else(|e| panic!("Failed listing YAML files in `{}`: {e}", root.display()));
  files.sort();

  assert!(
    !files.is_empty(),
    "No YAML transliteration test files found in `{}`",
    root.display()
  );

  let mut all: Vec<TransliterationTestCase> = Vec::new();
  for file in files {
    let yaml_text = fs::read_to_string(&file)
      .unwrap_or_else(|e| panic!("Failed reading `{}`: {e}", file.display()));
    let mut cases: Vec<TransliterationTestCase> = yaml::from_str(&yaml_text)
      .unwrap_or_else(|e| panic!("Failed parsing `{}`: {e}", file.display()));
    all.append(&mut cases);
  }
  all
}

fn load_typing_cases() -> Vec<TypingTestCase> {
  use serde_yaml_ng as yaml;

  let root = typing_test_data_root();
  let mut files: Vec<PathBuf> = Vec::new();
  list_yaml_files_typing(&root, &mut files)
    .unwrap_or_else(|e| panic!("Failed listing YAML files in `{}`: {e}", root.display()));
  files.sort();

  assert!(
    !files.is_empty(),
    "No YAML typing test files found in `{}`",
    root.display()
  );

  let mut all: Vec<TypingTestCase> = Vec::new();
  for file in files {
    let yaml_text = fs::read_to_string(&file)
      .unwrap_or_else(|e| panic!("Failed reading `{}`: {e}", file.display()));
    let mut cases: Vec<TypingTestCase> = yaml::from_str(&yaml_text)
      .unwrap_or_else(|e| panic!("Failed parsing `{}`: {e}", file.display()));
    all.append(&mut cases);
  }
  all
}

static TRANSLIT_CASES: OnceLock<Vec<TransliterationTestCase>> = OnceLock::new();
static TYPING_CASES: OnceLock<Vec<TypingTestCase>> = OnceLock::new();

fn translit_cases() -> &'static [TransliterationTestCase] {
  TRANSLIT_CASES
    .get_or_init(load_transliteration_cases)
    .as_slice()
}

fn typing_cases() -> &'static [TypingTestCase] {
  TYPING_CASES.get_or_init(load_typing_cases).as_slice()
}

// ----------------------------
// Workloads (mirrors `packages/js/src/scripts/benchmark.ts`)
// ----------------------------

fn run_transliteration_pass(cases: &[TransliterationTestCase]) {
  for case in cases {
    if case.todo.unwrap_or(false) {
      continue;
    }
    let out = transliterate(&case.input, &case.from, &case.to, case.options.as_ref());
    black_box(out).ok();
  }
}

fn run_typing_normal_to_others_pass(cases: &[TransliterationTestCase]) {
  for case in cases {
    if case.todo.unwrap_or(false) {
      continue;
    }
    if case.from != "Normal" {
      continue;
    }
    let out = emulate_typing(&case.input, &case.to, None);
    black_box(out).ok();
  }
}

fn run_typing_others_to_normal_pass(cases: &[TypingTestCase]) {
  for case in cases {
    if case.todo {
      continue;
    }
    let opts = build_typing_options(&case.options);
    let out = emulate_typing(&case.text, &case.script, opts);
    black_box(out).ok();
  }
}

// ----------------------------
// Report output: `test_log/benchmark.txt`
// ----------------------------

fn benchmark_log_path() -> PathBuf {
  // keep logs beside the Rust crate (`packages/rust/test_log/benchmark.txt`)
  PathBuf::from(env!("CARGO_MANIFEST_DIR"))
    .join("test_log")
    .join("benchmark.txt")
}

fn fmt_ms(d: Duration) -> String {
  format!("{:.3}", d.as_secs_f64() * 1000.0)
}

fn write_benchmark_report() {
  let translit = translit_cases();
  let typing = typing_cases();

  const ITERATIONS: u32 = 3;
  let mut translit_total_d = Duration::ZERO;
  let mut typing_normal_to_others_total_d = Duration::ZERO;
  let mut typing_others_to_normal_total_d = Duration::ZERO;

  for _ in 0..ITERATIONS {
    let t0 = Instant::now();
    run_transliteration_pass(translit);
    translit_total_d += t0.elapsed();

    let t1 = Instant::now();
    run_typing_normal_to_others_pass(translit);
    typing_normal_to_others_total_d += t1.elapsed();

    let t2 = Instant::now();
    run_typing_others_to_normal_pass(typing);
    typing_others_to_normal_total_d += t2.elapsed();
  }

  let translit_avg = translit_total_d / ITERATIONS;
  let typing_normal_avg = typing_normal_to_others_total_d / ITERATIONS;
  let typing_others_avg = typing_others_to_normal_total_d / ITERATIONS;

  let translit_total = translit.iter().filter(|c| !c.todo.unwrap_or(false)).count();
  let normal_to_others_total = translit
    .iter()
    .filter(|c| !c.todo.unwrap_or(false) && c.from == "Normal")
    .count();
  let others_to_normal_total = typing.iter().filter(|c| !c.todo).count();

  let total_avg_d = translit_avg + typing_normal_avg + typing_others_avg;

  let path = benchmark_log_path();
  if let Some(parent) = path.parent() {
    fs::create_dir_all(parent)
      .unwrap_or_else(|e| panic!("Failed creating dir `{}`: {e}", parent.display()));
  }

  let mut f =
    fs::File::create(&path).unwrap_or_else(|e| panic!("Failed writing `{}`: {e}", path.display()));

  writeln!(
    f,
    "Lipilekhika Rust benchmark (averaged over {} iterations)",
    ITERATIONS
  )
  .ok();
  writeln!(
    f,
    "Transliteration Cases: cases={}, avg_time_ms={}",
    translit_total,
    fmt_ms(translit_avg)
  )
  .ok();
  writeln!(
    f,
    "Typing Emulation (Normal -> others): cases={}, avg_time_ms={}",
    normal_to_others_total,
    fmt_ms(typing_normal_avg)
  )
  .ok();
  writeln!(
    f,
    "Typing Emulation (others -> Normal): cases={}, avg_time_ms={}",
    others_to_normal_total,
    fmt_ms(typing_others_avg)
  )
  .ok();
  writeln!(f, "Total Average: time_ms={}", fmt_ms(total_avg_d)).ok();
}

// ----------------------------
// Criterion entrypoint (`cargo bench`)
// ----------------------------

fn criterion_benchmark(c: &mut Criterion) {
  // Write the requested output file once per `cargo bench` invocation.
  write_benchmark_report();

  let translit = translit_cases();
  let typing = typing_cases();

  c.bench_function("transliteration_all_cases", |b| {
    b.iter(|| run_transliteration_pass(black_box(translit)))
  });

  c.bench_function("typing_emulation_normal_to_others", |b| {
    b.iter(|| run_typing_normal_to_others_pass(black_box(translit)))
  });

  c.bench_function("typing_emulation_others_to_normal", |b| {
    b.iter(|| run_typing_others_to_normal_pass(black_box(typing)))
  });
}

criterion_group! {
    name = benches;
    config = Criterion::default()
        .sample_size(30);
    targets = criterion_benchmark
}
criterion_main!(benches);
