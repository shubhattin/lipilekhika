//! CLI benchmark mirroring `packages/python/scripts/benchmark.py` (iterated vs bulk).
//! Dev-only: uses `serde_yaml_ng` from [dev-dependencies].
//!
//! Run: `cargo run --example bench --release -p lipilekhika`
//! (from workspace root; from `packages/rust` omit `-p lipilekhika` if that crate is default).

use indexmap::IndexMap;
use lipilekhika::get_script_list_data;
use lipilekhika::preload_script_data;
use lipilekhika::transliterate;
use lipilekhika::typing::{TypingContextOptions, emulate_typing};
use serde::Deserialize;
use std::collections::HashMap;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::Instant;

const BULK_SEPARATOR: &str = "\n";

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
  options: Option<HashMap<String, bool>>,
  #[serde(default)]
  #[allow(dead_code)]
  todo: Option<bool>,
}

#[derive(Clone, Debug, Deserialize, Default)]
struct TypingOptionsYaml {
  #[serde(rename = "useNativeNumerals")]
  use_native_numerals: Option<bool>,

  #[serde(rename = "includeInherentVowel")]
  include_inherent_vowel: Option<bool>,

  #[serde(rename = "autoContextTClearTimeMs")]
  auto_context_clear_time_ms: Option<u64>,
}

#[derive(Debug, Deserialize)]
struct TypingTestCase {
  #[allow(dead_code)]
  index: i64,
  text: String,
  #[allow(dead_code)]
  output: String,
  script: String,
  #[serde(default)]
  #[allow(dead_code)]
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
  let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
  manifest_dir
    .join("..")
    .join("..")
    .join("test_data")
    .join("transliteration")
}

fn typing_test_data_root() -> PathBuf {
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
    let mut cases: Vec<TransliterationTestCase> =
      yaml::from_str(&s).unwrap_or_else(|e| panic!("Failed parsing `{}`: {e}", file.display()));
    data.append(&mut cases);
  }
  data
}

fn get_typing_test_data() -> Vec<TypingTestCase> {
  use serde_yaml_ng as yaml;

  let root = typing_test_data_root();
  let mut files: Vec<PathBuf> = Vec::new();
  list_yaml_files_typing(&root, &mut files)
    .unwrap_or_else(|e| panic!("Failed listing YAML files in `{}`: {e}", root.display()));
  files.sort();

  assert!(
    !files.is_empty(),
    "No YAML typing test files in `{}`",
    root.display()
  );

  let mut data = Vec::new();
  for file in files {
    let s = fs::read_to_string(&file)
      .unwrap_or_else(|e| panic!("Failed reading `{}`: {e}", file.display()));
    let mut cases: Vec<TypingTestCase> =
      yaml::from_str(&s).unwrap_or_else(|e| panic!("Failed parsing `{}`: {e}", file.display()));
    data.append(&mut cases);
  }
  data
}

// ----------------------------
// Batches (mirrors Python)
// ----------------------------

struct TransliterationBatch {
  from: String,
  to: String,
  input: String,
}

fn build_transliteration_batches(
  test_data: &[TransliterationTestCase],
) -> Vec<TransliterationBatch> {
  let mut grouped: IndexMap<String, Vec<&TransliterationTestCase>> = IndexMap::new();
  for item in test_data {
    let key = format!("{}-{}", item.from, item.to);
    grouped.entry(key).or_default().push(item);
  }
  grouped
    .into_values()
    .map(|items| TransliterationBatch {
      from: items[0].from.clone(),
      to: items[0].to.clone(),
      input: items
        .iter()
        .map(|i| i.input.as_str())
        .collect::<Vec<_>>()
        .join(BULK_SEPARATOR),
    })
    .collect()
}

struct TypingBatch {
  script: String,
  input: String,
}

fn build_typing_batches(
  transliteration_test_data: &[TransliterationTestCase],
  typing_test_data: &[TypingTestCase],
) -> Vec<TypingBatch> {
  let mut grouped: IndexMap<String, Vec<String>> = IndexMap::new();
  for item in transliteration_test_data {
    if item.from != "Normal" {
      continue;
    }
    grouped
      .entry(item.to.clone())
      .or_default()
      .push(item.input.clone());
  }
  for item in typing_test_data {
    grouped
      .entry(item.script.clone())
      .or_default()
      .push(item.text.clone());
  }
  grouped
    .into_iter()
    .map(|(script, parts)| TypingBatch {
      script,
      input: parts.join(BULK_SEPARATOR),
    })
    .collect()
}

// ----------------------------
// Timing
// ----------------------------

fn preload_data() {
  for script in &get_script_list_data().scripts {
    preload_script_data(script);
  }
}

fn measure_individual_transliteration(test_data: &[TransliterationTestCase]) -> f64 {
  let start = Instant::now();
  for td in test_data {
    let _ = transliterate(&td.input, &td.from, &td.to, td.options.as_ref());
  }
  start.elapsed().as_secs_f64() * 1000.0
}

fn measure_bulk_transliteration(batches: &[TransliterationBatch]) -> f64 {
  let start = Instant::now();
  for batch in batches {
    let _ = transliterate(&batch.input, &batch.from, &batch.to, None);
  }
  start.elapsed().as_secs_f64() * 1000.0
}

fn measure_individual_typing(
  test_data: &[TransliterationTestCase],
  typing_test_data: &[TypingTestCase],
) -> f64 {
  let start = Instant::now();
  for case in test_data {
    if case.from == "Normal" {
      let _ = emulate_typing(&case.input, &case.to, None);
    }
  }
  for case in typing_test_data {
    let opts = build_typing_options(&case.options);
    let _ = emulate_typing(&case.text, &case.script, opts);
  }
  start.elapsed().as_secs_f64() * 1000.0
}

fn measure_bulk_typing(batches: &[TypingBatch]) -> f64 {
  let start = Instant::now();
  for batch in batches {
    let _ = emulate_typing(&batch.input, &batch.script, None);
  }
  start.elapsed().as_secs_f64() * 1000.0
}

fn format_ms(ms: f64) -> String {
  format!("{ms:.2} ms")
}

fn main() {
  let test_data = get_test_data();
  let typing_test_data = get_typing_test_data();
  let transliteration_batches = build_transliteration_batches(&test_data);
  let typing_batches = build_typing_batches(&test_data, &typing_test_data);

  println!("Benchmark Results");
  println!(
    "Precomputed {} bulk batches from {} transliteration cases by from-to, ignoring custom options.",
    transliteration_batches.len(),
    test_data.len()
  );
  println!(
    "Precomputed {} typing bulk batches, grouped by target script and ignoring custom options.",
    typing_batches.len()
  );
  let _ = std::io::stdout().flush();

  preload_data();

  let transliteration_iterated = measure_individual_transliteration(&test_data);
  let transliteration_bulk = measure_bulk_transliteration(&transliteration_batches);

  let typing_iterated = measure_individual_typing(&test_data, &typing_test_data);
  let typing_bulk = measure_bulk_typing(&typing_batches);

  println!();
  println!("{:<32} {:>12} {:>12}", "Benchmark", "Iterated", "Bulk");
  println!("{:-<32} {:-<12} {:-<12}", "", "", "");
  println!(
    "{:<32} {:>12} {:>12}",
    "Transliteration Cases",
    format_ms(transliteration_iterated),
    format_ms(transliteration_bulk)
  );
  println!(
    "{:<32} {:>12} {:>12}",
    "Typing Emulation",
    format_ms(typing_iterated),
    format_ms(typing_bulk)
  );
}
