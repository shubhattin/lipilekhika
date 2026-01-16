use crate::script_data::ScriptData;
pub use crate::script_data::{
  ScriptListData, get_all_options, get_normalized_script_name, get_script_list_data,
};
use crate::transliterate::transliterate_text;
pub use crate::typing::{
  ListType, ScriptTypingDataMap, TypingDataMapItem, get_script_typing_data_map,
};
use std::collections::HashMap;

mod macros;
mod script_data;
mod transliterate;
mod utils;

// will be publically exported
pub mod typing;

/// Transliterates `text` from `from` to `to`.
///
/// - `from` / `to` can be script or language names/aliases
/// - `trans_options` are the custom transliteration options
///
/// Returns the transliterated text, or an error string if script names are invalid.
pub fn transliterate(
  text: &str,
  from: &str,
  to: &str,
  trans_options: Option<&HashMap<String, bool>>,
) -> Result<String, String> {
  let normalized_from =
    get_normalized_script_name(from).ok_or_else(|| format!("Invalid script name: {}", from))?;
  let normalized_to =
    get_normalized_script_name(to).ok_or_else(|| format!("Invalid script name: {}", to))?;

  if normalized_from == normalized_to {
    return Ok(text.to_string());
  }

  let result = transliterate_text(
    text.to_string(),
    &normalized_from,
    &normalized_to,
    trans_options,
    None,
  )?;

  Ok(result.output)
}

/// Returns the schwa deletion characteristic of the script provided.
pub fn get_schwa_status_for_script(script_name: &str) -> Result<Option<bool>, String> {
  let normalized_script_name = get_normalized_script_name(script_name)
    .ok_or_else(|| format!("Invalid script name: {}", script_name))?;
  let script_data = ScriptData::get_script_data(&normalized_script_name);
  match script_data {
    ScriptData::Brahmic { schwa_property, .. } => Ok(Some(*schwa_property)),
    ScriptData::Other { .. } => Ok(None),
  }
}

/// preload script data
pub fn preload_script_data(_script_name: &str) {
  ScriptData::get_script_data("Devanagari");
}

#[cfg(test)]
mod tests {
  use super::*;

  use owo_colors::OwoColorize;
  use serde::Deserialize;
  use std::fs;
  use std::io::Write;
  use std::path::{Path, PathBuf};
  use std::time::Instant;

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
    index: String,
    from: String,
    to: String,
    input: String,
    output: String,
    #[serde(default)]
    options: Option<HashMap<String, bool>>,
    #[serde(default)]
    reversible: Option<bool>,
    #[serde(default)]
    todo: Option<bool>,
  }

  fn list_yaml_files(dir: &Path, out: &mut Vec<PathBuf>) -> std::io::Result<()> {
    for entry in fs::read_dir(dir)? {
      let entry = entry?;
      let path = entry.path();
      if path.is_dir() {
        list_yaml_files(&path, out)?;
      } else if path.extension().is_some_and(|e| e == "yaml") {
        out.push(path);
      }
    }
    Ok(())
  }

  fn test_data_root() -> PathBuf {
    // `packages/rust` -> `../../test_data/transliteration`
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    manifest_dir
      .join("..")
      .join("..")
      .join("test_data")
      .join("transliteration")
  }

  fn contains_vedic_svara(s: &str) -> bool {
    const VEDIC_SVARAS: [&str; 4] = ["॒", "॑", "᳚", "᳛"];
    VEDIC_SVARAS.iter().any(|sv| s.contains(sv))
  }

  #[derive(Default)]
  struct FileStats {
    total_cases: usize,
    todo_cases: usize,
    auto_vedic_skipped: usize,
    forward_passed: usize,
    reverse_passed: usize,
    forward_asserts: usize,
    reverse_asserts: usize,
    failures_total: usize,
  }

  #[derive(Debug)]
  enum FailureKind {
    ForwardError,
    ForwardMismatch,
    ReverseError,
    ReverseMismatch,
  }

  #[derive(Debug)]
  struct Failure {
    file: String,
    index: String,
    from: String,
    to: String,
    kind: FailureKind,
    input: String,
    expected: Option<String>,
    actual: Option<String>,
    error: Option<String>,
  }

  const MAX_FAILURES_TO_STORE: usize = 400;
  const SUMMARY_LABEL_WIDTH: usize = 12;

  fn push_failure(failures: &mut Vec<Failure>, failure: Failure) {
    if failures.len() < MAX_FAILURES_TO_STORE {
      failures.push(failure);
    }
  }

  // fn plural(n: usize, singular: &'static str, plural: &'static str) -> &'static str {
  //     if n == 1 { singular } else { plural }
  // }

  fn print_summary_line(label: &str, value: String) {
    println!(
      "  {:<width$} {}",
      label.bold(),
      value,
      width = SUMMARY_LABEL_WIDTH
    );
  }

  fn run_yaml_file(file_path: &Path, root: &Path) -> (FileStats, Vec<Failure>) {
    let file_name = file_path
      .file_name()
      .and_then(|n| n.to_str())
      .unwrap_or("<unknown>");
    let rel = file_path.strip_prefix(root).unwrap_or(file_path);
    let rel_s = rel.display().to_string();

    let yaml_text = fs::read_to_string(file_path)
      .unwrap_or_else(|e| panic!("Failed reading YAML file `{}`: {e}", rel.display()));
    let cases: Vec<TransliterationTestCase> = serde_yaml_ng::from_str(&yaml_text)
      .unwrap_or_else(|e| panic!("Failed parsing YAML file `{}`: {e}", rel.display()));

    let mut stats = FileStats::default();
    let mut failures: Vec<Failure> = Vec::new();

    for case in cases {
      stats.total_cases += 1;
      if case.todo.unwrap_or(false) {
        stats.todo_cases += 1;
        continue;
      }

      let result = transliterate(&case.input, &case.from, &case.to, case.options.as_ref());

      let result = match result {
        Ok(r) => r,
        Err(e) => {
          stats.forward_asserts += 1;
          stats.failures_total += 1;
          push_failure(
            &mut failures,
            Failure {
              file: rel_s.clone(),
              index: case.index.clone(),
              from: case.from.clone(),
              to: case.to.clone(),
              kind: FailureKind::ForwardError,
              input: case.input.clone(),
              expected: Some(case.output.clone()),
              actual: None,
              error: Some(e),
            },
          );
          continue;
        }
      };

      if file_name.starts_with("auto")
        && case.to == "Tamil-Extended"
        && contains_vedic_svara(&result)
      {
        stats.auto_vedic_skipped += 1;
        continue;
      }

      stats.forward_asserts += 1;
      if result == case.output {
        stats.forward_passed += 1;
      } else {
        stats.failures_total += 1;
        push_failure(
          &mut failures,
          Failure {
            file: rel_s.clone(),
            index: case.index.clone(),
            from: case.from.clone(),
            to: case.to.clone(),
            kind: FailureKind::ForwardMismatch,
            input: case.input.clone(),
            expected: Some(case.output.clone()),
            actual: Some(result.clone()),
            error: None,
          },
        );
      }

      if case.reversible.unwrap_or(false) {
        stats.reverse_asserts += 1;
        let reversed = transliterate(&result, &case.to, &case.from, case.options.as_ref());

        match reversed {
          Ok(rev) => {
            if rev == case.input {
              stats.reverse_passed += 1;
            } else {
              stats.failures_total += 1;
              push_failure(
                &mut failures,
                Failure {
                  file: rel_s.clone(),
                  index: case.index.clone(),
                  from: case.to.clone(),
                  to: case.from.clone(),
                  kind: FailureKind::ReverseMismatch,
                  input: result.clone(),
                  expected: Some(case.input.clone()),
                  actual: Some(rev),
                  error: None,
                },
              );
            }
          }
          Err(e) => {
            stats.failures_total += 1;
            push_failure(
              &mut failures,
              Failure {
                file: rel_s.clone(),
                index: case.index.clone(),
                from: case.to.clone(),
                to: case.from.clone(),
                kind: FailureKind::ReverseError,
                input: result.clone(),
                expected: Some(case.input.clone()),
                actual: None,
                error: Some(e),
              },
            );
          }
        }
      }
    }

    (stats, failures)
  }

  #[test]
  fn transliteration_yaml_test_data() {
    let started = Instant::now();
    let root = test_data_root();
    let mut files: Vec<PathBuf> = Vec::new();
    list_yaml_files(&root, &mut files)
      .unwrap_or_else(|e| panic!("Failed listing YAML files in `{}`: {e}", root.display()));
    files.sort();

    let file_count = files.len();

    assert!(
      !files.is_empty(),
      "No YAML test files found in `{}`",
      root.display()
    );

    let mut overall = FileStats::default();
    let mut overall_failures: Vec<Failure> = Vec::new();
    let mut failed_files: Vec<(String, FileStats)> = Vec::new();

    for file in files {
      let rel_s = file
        .strip_prefix(&root)
        .unwrap_or(&file)
        .display()
        .to_string();
      let (stats, failures) = run_yaml_file(&file, &root);
      overall.total_cases += stats.total_cases;
      overall.todo_cases += stats.todo_cases;
      overall.auto_vedic_skipped += stats.auto_vedic_skipped;
      overall.forward_passed += stats.forward_passed;
      overall.reverse_passed += stats.reverse_passed;
      overall.forward_asserts += stats.forward_asserts;
      overall.reverse_asserts += stats.reverse_asserts;
      overall.failures_total += stats.failures_total;

      if stats.failures_total == 0 {
        print!("{}", ".".green());
      } else {
        print!("{}", "F".red().bold());
        failed_files.push((rel_s, stats));
      }
      let _ = std::io::stdout().flush();

      for f in failures {
        push_failure(&mut overall_failures, f);
      }
    }

    println!();

    let total_asserts = overall.forward_asserts + overall.reverse_asserts;
    let total_passed = overall.forward_passed + overall.reverse_passed;
    let total_skipped = overall.todo_cases + overall.auto_vedic_skipped;
    let failed_file_count = failed_files.len();
    let passed_file_count = file_count.saturating_sub(failed_file_count);

    if !failed_files.is_empty() {
      println!();
      for (file_rel, stats) in &failed_files {
        let total_asserts = stats.forward_asserts + stats.reverse_asserts;
        let total_passed = stats.forward_passed + stats.reverse_passed;
        let skipped = stats.todo_cases + stats.auto_vedic_skipped;
        println!(
          "{} {}  {} = {}/{}  {} = {}  {} = {}",
          "FAIL".red().bold(),
          file_rel.dimmed(),
          "tests".bold(),
          total_passed,
          total_asserts,
          "failures".bold(),
          stats.failures_total.to_string().red(),
          "skipped".bold(),
          skipped.to_string().yellow()
        );
      }
    }
    {
      println!();
      println!("{}", "Transliteration".bold());

      let test_files_value = if failed_file_count == 0 {
        format!(
          "{} ({})",
          format!("{} passed", file_count).green(),
          file_count
        )
      } else {
        format!(
          "{} ({}), {} ({})",
          format!("{} passed", passed_file_count).green(),
          file_count,
          format!("{} failed", failed_file_count).red(),
          file_count
        )
      };
      print_summary_line("Test Files", test_files_value);

      let tests_value = if overall.failures_total == 0 {
        format!(
          "{} ({})",
          format!("{} passed", total_passed).green(),
          total_asserts
        )
      } else {
        format!(
          "{} ({}), {} ({})",
          format!("{} passed", total_passed).green(),
          total_asserts,
          format!("{} failed", overall.failures_total).red(),
          total_asserts
        )
      };
      print_summary_line("Tests", tests_value);

      if total_skipped > 0 {
        print_summary_line(
          "Skipped",
          format!(
            "{} (todo: {}, auto-vedic: {})",
            total_skipped.to_string().yellow(),
            overall.todo_cases.to_string().yellow(),
            overall.auto_vedic_skipped.to_string().yellow()
          ),
        );
      }

      print_summary_line(
        "Duration",
        format!("{:.2?}", started.elapsed()).dimmed().to_string(),
      );
    }

    // Always write a one-line summary to a log file so it's visible even when tests succeed.
    let summary = {
      let total_asserts = overall.forward_asserts + overall.reverse_asserts;
      let total_passed = overall.forward_passed + overall.reverse_passed;
      let total_skipped = overall.todo_cases + overall.auto_vedic_skipped;
      format!(
        "Transliteration: files_total={}, files_passed={}, files_failed={}, tests_total={}, tests_passed={}, tests_failed={}, tests_skipped={}",
        file_count,
        passed_file_count,
        failed_file_count,
        total_asserts,
        total_passed,
        overall.failures_total,
        total_skipped
      )
    };

    let _ = std::fs::create_dir_all("test_log");
    if let Ok(mut file) = std::fs::OpenOptions::new()
      .create(true)
      .write(true)
      .truncate(true)
      .open("test_log/transliteration_summary.txt")
    {
      let _ = writeln!(file, "{}", summary);
    }

    if overall.failures_total > 0 {
      let mut msg = String::new();
      msg.push_str(&format!(
        "Transliteration had {} failing assertions (showing up to {}).\n",
        overall.failures_total, MAX_FAILURES_TO_STORE
      ));

      for (i, f) in overall_failures.iter().enumerate() {
        msg.push_str(&format!("\n{}. File: {}\n", i + 1, f.file));
        msg.push_str(&format!("   Index: {}\n", f.index));

        match f.kind {
          FailureKind::ForwardMismatch => {
            msg.push_str("   Transliteration failed:\n");
            msg.push_str(&format!("     From: {}\n", f.from));
            msg.push_str(&format!("     To: {}\n", f.to));
            msg.push_str(&format!("     Input: \"{}\"\n", f.input));
            if let (Some(expected), Some(actual)) = (&f.expected, &f.actual) {
              msg.push_str(&format!("     Expected: \"{}\"\n", expected));
              msg.push_str(&format!("     Actual: \"{}\"\n", actual));
            }
          }
          FailureKind::ReverseMismatch => {
            msg.push_str("   Reversed Transliteration failed:\n");
            msg.push_str(&format!("     From: {}\n", f.from));
            msg.push_str(&format!("     To: {}\n", f.to));
            msg.push_str(&format!("     Input: \"{}\"\n", f.input));
            if let (Some(expected), Some(actual)) = (&f.expected, &f.actual) {
              msg.push_str(&format!("     Original Input: \"{}\"\n", expected));
              msg.push_str(&format!("     Reversed Output: \"{}\"\n", actual));
            }
          }
          FailureKind::ForwardError => {
            msg.push_str("   Transliteration error:\n");
            msg.push_str(&format!("     From: {}\n", f.from));
            msg.push_str(&format!("     To: {}\n", f.to));
            msg.push_str(&format!("     Input: \"{}\"\n", f.input));
            if let Some(error) = &f.error {
              msg.push_str(&format!("     Error: {}\n", error));
            }
          }
          FailureKind::ReverseError => {
            msg.push_str("   Reverse transliteration error:\n");
            msg.push_str(&format!("     From: {}\n", f.from));
            msg.push_str(&format!("     To: {}\n", f.to));
            msg.push_str(&format!("     Input: \"{}\"\n", f.input));
            if let Some(error) = &f.error {
              msg.push_str(&format!("     Error: {}\n", error));
            }
          }
        }
      }

      use std::fs::OpenOptions;
      use std::io::Write;

      let _ = std::fs::create_dir_all("test_log");
      if let Ok(mut file) = OpenOptions::new()
        .create(true)
        .append(false)
        .write(true)
        .truncate(true)
        .open("test_log/transliteration.txt")
      {
        let _ = file.write_all(msg.as_bytes());
      }
      panic!("failed");
    }
  }
}
