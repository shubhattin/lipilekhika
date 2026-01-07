use serde::Deserialize;
use std::collections::HashMap;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct ScriptListDataBuild {
  scripts: HashMap<String, u8>,
  langs: HashMap<String, u8>,
  lang_script_map: HashMap<String, String>,
  script_alternates_map: HashMap<String, String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "lowercase")]
enum CustomOptionScriptTypeEnumBuild {
  Brahmic,
  Other,
  All,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "lowercase")]
enum CheckInEnumBuild {
  Input,
  Output,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
enum RuleBuild {
  #[serde(rename = "replace_prev_krama_keys")]
  ReplacePrevKramaKeys {
    #[serde(default)]
    use_replace: Option<bool>,
    prev: Vec<i16>,
    following: Vec<i16>,
    replace_with: Vec<i16>,
    check_in: Option<CheckInEnumBuild>,
  },
  #[serde(rename = "direct_replace")]
  DirectReplace {
    #[serde(default)]
    use_replace: Option<bool>,
    to_replace: Vec<Vec<i16>>,
    replace_with: Vec<i16>,
    replace_text: Option<String>,
    check_in: Option<CheckInEnumBuild>,
  },
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct CustomOptionsBuild {
  from_script_name: Option<Vec<String>>,
  from_script_type: Option<CustomOptionScriptTypeEnumBuild>,
  to_script_name: Option<Vec<String>>,
  to_script_type: Option<CustomOptionScriptTypeEnumBuild>,
  check_in: CheckInEnumBuild,
  rules: Vec<RuleBuild>,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct CommonScriptAttrBuild {
  script_name: String,
  script_id: u8,
  krama_text_arr: Vec<(String, Option<i16>)>,
  krama_text_arr_index: Vec<usize>,
  text_to_krama_map: Vec<(String, TextToKramaMapBuild)>,
  typing_text_to_krama_map: Vec<(String, TextToKramaMapBuild)>,
  custom_script_chars_arr: Vec<(String, Option<i16>, Option<i16>)>,
  list: Vec<ListBuild>,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct TextToKramaMapBuild {
  next: Option<Vec<String>>,
  krama: Option<Vec<i16>>,
  fallback_list_ref: Option<i16>,
  custom_back_ref: Option<i16>,
}

#[derive(Debug, Deserialize, Clone, PartialEq)]
#[serde(tag = "type")]
enum ListBuild {
  #[serde(rename = "anya")]
  Anya { krama_ref: Vec<i16> },
  #[serde(rename = "vyanjana")]
  Vyanjana { krama_ref: Vec<i16> },
  #[serde(rename = "mAtrA")]
  Matra { krama_ref: Vec<i16> },
  #[serde(rename = "svara")]
  Svara {
    krama_ref: Vec<i16>,
    #[serde(rename = "mAtrA_krama_ref")]
    matra_krama_ref: Vec<i16>,
  },
}

#[derive(Debug, Deserialize)]
#[serde(tag = "script_type")]
enum ScriptDataBuild {
  #[serde(rename = "brahmic")]
  Brahmic {
    #[serde(flatten)]
    common_script_attr: CommonScriptAttrBuild,
    schwa_property: bool,
    halant: String,
    nuqta: Option<String>,
  },
  #[serde(rename = "other")]
  Other {
    #[serde(flatten)]
    common_script_attr: CommonScriptAttrBuild,
    schwa_character: String,
  },
}

fn main() {
  // Ensure rebuilds when data files change.
  println!("cargo:rerun-if-changed=src/data/script_list.json");
  println!("cargo:rerun-if-changed=src/data/custom_options.json");
  println!("cargo:rerun-if-changed=src/data/script_data");

  let manifest_dir = PathBuf::from(env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR"));
  let out_dir = PathBuf::from(env::var("OUT_DIR").expect("OUT_DIR"));

  let data_dir = manifest_dir.join("src/data");
  let script_data_dir = data_dir.join("script_data");

  // script_list.json
  let script_list_path = data_dir.join("script_list.json");
  let script_list_data: ScriptListDataBuild = read_json(&script_list_path);
  write_generated(
    &out_dir.join("generated_script_list.rs"),
    &generate_script_list_rs(&script_list_data),
  );

  // custom_options.json
  let custom_options_path = data_dir.join("custom_options.json");
  let custom_options_map: HashMap<String, CustomOptionsBuild> = read_json(&custom_options_path);
  write_generated(
    &out_dir.join("generated_custom_options.rs"),
    &generate_custom_options_rs(&custom_options_map),
  );

  // script_data/*.json
  let mut entries: Vec<PathBuf> = fs::read_dir(&script_data_dir)
    .unwrap_or_else(|e| panic!("Failed to read {}: {e}", script_data_dir.display()))
    .filter_map(|e| e.ok().map(|e| e.path()))
    .filter(|p| p.extension().and_then(|s| s.to_str()) == Some("json"))
    .collect();

  entries.sort();

  for p in &entries {
    let rel = Path::new("src/data/script_data").join(
      p.file_name()
        .unwrap_or_else(|| panic!("Missing filename for {}", p.display())),
    );
    println!("cargo:rerun-if-changed={}", rel.display());
  }

  let mut all_scripts: Vec<(String, ScriptDataBuild)> = Vec::with_capacity(entries.len());
  for p in entries {
    let file_stem = p
      .file_stem()
      .and_then(|s| s.to_str())
      .unwrap_or_else(|| panic!("Invalid filename: {}", p.display()))
      .to_string();
    let parsed: ScriptDataBuild = read_json(&p);
    all_scripts.push((file_stem, parsed));
  }

  write_generated(
    &out_dir.join("generated_script_data.rs"),
    &generate_script_data_rs(&all_scripts),
  );
}

fn read_json<T: for<'de> Deserialize<'de>>(path: &Path) -> T {
  let raw =
    fs::read_to_string(path).unwrap_or_else(|e| panic!("Failed to read {}: {e}", path.display()));
  serde_json::from_str(&raw)
    .unwrap_or_else(|e| panic!("JSON parse error in {}: {e}", path.display()))
}

fn write_generated(path: &Path, content: &str) {
  fs::write(path, content).unwrap_or_else(|e| panic!("Failed to write {}: {e}", path.display()));
}

fn lit_str(s: &str) -> String {
  // Rust string literal via Debug escaping.
  format!("{s:?}")
}

fn push_string_expr(out: &mut String, s: &str) {
  out.push_str("String::from(");
  out.push_str(&lit_str(s));
  out.push(')');
}

fn push_opt_string_expr(out: &mut String, s: &Option<String>) {
  match s {
    Some(v) => {
      out.push_str("Some(");
      push_string_expr(out, v);
      out.push(')');
    }
    None => out.push_str("None"),
  }
}

fn push_opt_bool_expr(out: &mut String, b: &Option<bool>) {
  match b {
    Some(v) => {
      out.push_str("Some(");
      out.push_str(if *v { "true" } else { "false" });
      out.push(')');
    }
    None => out.push_str("None"),
  }
}

fn push_opt_i16_expr(out: &mut String, n: &Option<i16>) {
  match n {
    Some(v) => {
      out.push_str("Some(");
      out.push_str(&v.to_string());
      out.push(')');
    }
    None => out.push_str("None"),
  }
}

fn push_vec_usize_expr(out: &mut String, v: &[usize]) {
  out.push_str("vec![");
  for (i, n) in v.iter().enumerate() {
    if i != 0 {
      out.push_str(", ");
    }
    out.push_str(&n.to_string());
  }
  out.push(']');
}

fn push_vec_i16_expr(out: &mut String, v: &[i16]) {
  out.push_str("vec![");
  for (i, n) in v.iter().enumerate() {
    if i != 0 {
      out.push_str(", ");
    }
    out.push_str(&n.to_string());
  }
  out.push(']');
}

fn push_vec_vec_i16_expr(out: &mut String, v: &[Vec<i16>]) {
  out.push_str("vec![");
  for (i, inner) in v.iter().enumerate() {
    if i != 0 {
      out.push_str(", ");
    }
    push_vec_i16_expr(out, inner);
  }
  out.push(']');
}

fn push_opt_checkin_expr(out: &mut String, v: &Option<CheckInEnumBuild>) {
  match v {
    Some(CheckInEnumBuild::Input) => out.push_str("Some(CheckInEnum::Input)"),
    Some(CheckInEnumBuild::Output) => out.push_str("Some(CheckInEnum::Output)"),
    None => out.push_str("None"),
  }
}

fn push_checkin_expr(out: &mut String, v: &CheckInEnumBuild) {
  match v {
    CheckInEnumBuild::Input => out.push_str("CheckInEnum::Input"),
    CheckInEnumBuild::Output => out.push_str("CheckInEnum::Output"),
  }
}

fn push_opt_script_type_expr(out: &mut String, v: &Option<CustomOptionScriptTypeEnumBuild>) {
  match v {
    Some(CustomOptionScriptTypeEnumBuild::Brahmic) => {
      out.push_str("Some(CustomOptionScriptTypeEnum::Brahmic)")
    }
    Some(CustomOptionScriptTypeEnumBuild::Other) => {
      out.push_str("Some(CustomOptionScriptTypeEnum::Other)")
    }
    Some(CustomOptionScriptTypeEnumBuild::All) => {
      out.push_str("Some(CustomOptionScriptTypeEnum::All)")
    }
    None => out.push_str("None"),
  }
}

fn push_vec_string_expr(out: &mut String, v: &[String]) {
  out.push_str("vec![");
  for (i, s) in v.iter().enumerate() {
    if i != 0 {
      out.push_str(", ");
    }
    push_string_expr(out, s);
  }
  out.push(']');
}

fn push_opt_vec_string_expr(out: &mut String, v: &Option<Vec<String>>) {
  match v {
    Some(inner) => {
      out.push_str("Some(");
      push_vec_string_expr(out, inner);
      out.push(')');
    }
    None => out.push_str("None"),
  }
}

fn push_text_to_krama_map_expr(out: &mut String, m: &TextToKramaMapBuild) {
  out.push_str("TextToKramaMap { ");
  out.push_str("next: ");
  push_opt_vec_string_expr(out, &m.next);
  out.push_str(", krama: ");
  match &m.krama {
    Some(v) => {
      out.push_str("Some(");
      push_vec_i16_expr(out, v);
      out.push(')');
    }
    None => out.push_str("None"),
  }
  out.push_str(", fallback_list_ref: ");
  push_opt_i16_expr(out, &m.fallback_list_ref);
  out.push_str(", custom_back_ref: ");
  push_opt_i16_expr(out, &m.custom_back_ref);
  out.push_str(" }");
}

fn push_list_expr(out: &mut String, l: &ListBuild) {
  match l {
    ListBuild::Anya { krama_ref } => {
      out.push_str("List::Anya { krama_ref: ");
      push_vec_i16_expr(out, krama_ref);
      out.push_str(" }");
    }
    ListBuild::Vyanjana { krama_ref } => {
      out.push_str("List::Vyanjana { krama_ref: ");
      push_vec_i16_expr(out, krama_ref);
      out.push_str(" }");
    }
    ListBuild::Matra { krama_ref } => {
      out.push_str("List::Matra { krama_ref: ");
      push_vec_i16_expr(out, krama_ref);
      out.push_str(" }");
    }
    ListBuild::Svara {
      krama_ref,
      matra_krama_ref,
    } => {
      out.push_str("List::Svara { krama_ref: ");
      push_vec_i16_expr(out, krama_ref);
      out.push_str(", matra_krama_ref: ");
      push_vec_i16_expr(out, matra_krama_ref);
      out.push_str(" }");
    }
  }
}

fn push_common_script_attr_expr(out: &mut String, c: &CommonScriptAttrBuild) {
  out.push_str("CommonScriptAttr { ");
  out.push_str("script_name: ");
  push_string_expr(out, &c.script_name);
  out.push_str(", script_id: ");
  out.push_str(&c.script_id.to_string());
  out.push_str(", krama_text_arr: ");
  out.push_str("vec![");
  for (i, (s, opt)) in c.krama_text_arr.iter().enumerate() {
    if i != 0 {
      out.push_str(", ");
    }
    out.push('(');
    push_string_expr(out, s);
    out.push_str(", ");
    push_opt_i16_expr(out, opt);
    out.push(')');
  }
  out.push_str("], krama_text_arr_index: ");
  push_vec_usize_expr(out, &c.krama_text_arr_index);
  out.push_str(", text_to_krama_map: ");
  out.push_str("vec![");
  for (i, (k, v)) in c.text_to_krama_map.iter().enumerate() {
    if i != 0 {
      out.push_str(", ");
    }
    out.push('(');
    push_string_expr(out, k);
    out.push_str(", ");
    push_text_to_krama_map_expr(out, v);
    out.push(')');
  }
  out.push_str("], typing_text_to_krama_map: ");
  out.push_str("vec![");
  for (i, (k, v)) in c.typing_text_to_krama_map.iter().enumerate() {
    if i != 0 {
      out.push_str(", ");
    }
    out.push('(');
    push_string_expr(out, k);
    out.push_str(", ");
    push_text_to_krama_map_expr(out, v);
    out.push(')');
  }
  out.push_str("], custom_script_chars_arr: ");
  out.push_str("vec![");
  for (i, (s, a, b)) in c.custom_script_chars_arr.iter().enumerate() {
    if i != 0 {
      out.push_str(", ");
    }
    out.push('(');
    push_string_expr(out, s);
    out.push_str(", ");
    push_opt_i16_expr(out, a);
    out.push_str(", ");
    push_opt_i16_expr(out, b);
    out.push(')');
  }
  out.push_str("], list: ");
  out.push_str("vec![");
  for (i, l) in c.list.iter().enumerate() {
    if i != 0 {
      out.push_str(", ");
    }
    push_list_expr(out, l);
  }
  out.push_str("] }");
}

fn push_script_data_expr(out: &mut String, d: &ScriptDataBuild) {
  match d {
    ScriptDataBuild::Brahmic {
      common_script_attr,
      schwa_property,
      halant,
      nuqta,
    } => {
      out.push_str("ScriptData::Brahmic { common_script_attr: ");
      push_common_script_attr_expr(out, common_script_attr);
      out.push_str(", schwa_property: ");
      out.push_str(if *schwa_property { "true" } else { "false" });
      out.push_str(", halant: ");
      push_string_expr(out, halant);
      out.push_str(", nuqta: ");
      push_opt_string_expr(out, nuqta);
      out.push_str(" }");
    }
    ScriptDataBuild::Other {
      common_script_attr,
      schwa_character,
    } => {
      out.push_str("ScriptData::Other { common_script_attr: ");
      push_common_script_attr_expr(out, common_script_attr);
      out.push_str(", schwa_character: ");
      push_string_expr(out, schwa_character);
      out.push_str(" }");
    }
  }
}

fn generate_script_list_rs(data: &ScriptListDataBuild) -> String {
  let mut out = String::new();
  out.push_str("// @generated by build.rs. Do not edit.\n");
  out.push_str("use super::*;\n");
  out.push_str("use std::collections::HashMap;\n\n");
  out.push_str("pub fn build_script_list_data() -> ScriptListData {\n");
  out.push_str("  ScriptListData {\n");

  // scripts
  out.push_str("    scripts: {\n");
  out.push_str("      let mut m: HashMap<String, u8> = HashMap::with_capacity(");
  out.push_str(&data.scripts.len().to_string());
  out.push_str(");\n");
  let mut keys: Vec<_> = data.scripts.keys().collect();
  keys.sort();
  for k in keys {
    let v = data.scripts.get(k).unwrap();
    out.push_str("      m.insert(String::from(");
    out.push_str(&lit_str(k));
    out.push_str("), ");
    out.push_str(&format!("{v}u8"));
    out.push_str(");\n");
  }
  out.push_str("      m\n");
  out.push_str("    },\n");

  // langs
  out.push_str("    langs: {\n");
  out.push_str("      let mut m: HashMap<String, u8> = HashMap::with_capacity(");
  out.push_str(&data.langs.len().to_string());
  out.push_str(");\n");
  let mut keys: Vec<_> = data.langs.keys().collect();
  keys.sort();
  for k in keys {
    let v = data.langs.get(k).unwrap();
    out.push_str("      m.insert(String::from(");
    out.push_str(&lit_str(k));
    out.push_str("), ");
    out.push_str(&format!("{v}u8"));
    out.push_str(");\n");
  }
  out.push_str("      m\n");
  out.push_str("    },\n");

  // lang_script_map
  out.push_str("    lang_script_map: {\n");
  out.push_str("      let mut m: HashMap<String, String> = HashMap::with_capacity(");
  out.push_str(&data.lang_script_map.len().to_string());
  out.push_str(");\n");
  let mut keys: Vec<_> = data.lang_script_map.keys().collect();
  keys.sort();
  for k in keys {
    let v = data.lang_script_map.get(k).unwrap();
    out.push_str("      m.insert(String::from(");
    out.push_str(&lit_str(k));
    out.push_str("), String::from(");
    out.push_str(&lit_str(v));
    out.push_str("));\n");
  }
  out.push_str("      m\n");
  out.push_str("    },\n");

  // script_alternates_map
  out.push_str("    script_alternates_map: {\n");
  out.push_str("      let mut m: HashMap<String, String> = HashMap::with_capacity(");
  out.push_str(&data.script_alternates_map.len().to_string());
  out.push_str(");\n");
  let mut keys: Vec<_> = data.script_alternates_map.keys().collect();
  keys.sort();
  for k in keys {
    let v = data.script_alternates_map.get(k).unwrap();
    out.push_str("      m.insert(String::from(");
    out.push_str(&lit_str(k));
    out.push_str("), String::from(");
    out.push_str(&lit_str(v));
    out.push_str("));\n");
  }
  out.push_str("      m\n");
  out.push_str("    },\n");

  out.push_str("  }\n");
  out.push_str("}\n");
  out
}

fn push_rule_expr(out: &mut String, r: &RuleBuild) {
  match r {
    RuleBuild::ReplacePrevKramaKeys {
      use_replace,
      prev,
      following,
      replace_with,
      check_in,
    } => {
      out.push_str("Rule::ReplacePrevKramaKeys { use_replace: ");
      push_opt_bool_expr(out, use_replace);
      out.push_str(", prev: ");
      push_vec_i16_expr(out, prev);
      out.push_str(", following: ");
      push_vec_i16_expr(out, following);
      out.push_str(", replace_with: ");
      push_vec_i16_expr(out, replace_with);
      out.push_str(", check_in: ");
      push_opt_checkin_expr(out, check_in);
      out.push_str(" }");
    }
    RuleBuild::DirectReplace {
      use_replace,
      to_replace,
      replace_with,
      replace_text,
      check_in,
    } => {
      out.push_str("Rule::DirectReplace { use_replace: ");
      push_opt_bool_expr(out, use_replace);
      out.push_str(", to_replace: ");
      push_vec_vec_i16_expr(out, to_replace);
      out.push_str(", replace_with: ");
      push_vec_i16_expr(out, replace_with);
      out.push_str(", replace_text: ");
      match replace_text {
        Some(s) => {
          out.push_str("Some(");
          push_string_expr(out, s);
          out.push(')');
        }
        None => out.push_str("None"),
      }
      out.push_str(", check_in: ");
      push_opt_checkin_expr(out, check_in);
      out.push_str(" }");
    }
  }
}

fn push_custom_options_expr(out: &mut String, c: &CustomOptionsBuild) {
  out.push_str("CustomOptions { from_script_name: ");
  match &c.from_script_name {
    Some(v) => {
      out.push_str("Some(");
      push_vec_string_expr(out, v);
      out.push(')');
    }
    None => out.push_str("None"),
  }
  out.push_str(", from_script_type: ");
  push_opt_script_type_expr(out, &c.from_script_type);
  out.push_str(", to_script_name: ");
  match &c.to_script_name {
    Some(v) => {
      out.push_str("Some(");
      push_vec_string_expr(out, v);
      out.push(')');
    }
    None => out.push_str("None"),
  }
  out.push_str(", to_script_type: ");
  push_opt_script_type_expr(out, &c.to_script_type);
  out.push_str(", check_in: ");
  push_checkin_expr(out, &c.check_in);
  out.push_str(", rules: ");
  out.push_str("vec![");
  for (i, r) in c.rules.iter().enumerate() {
    if i != 0 {
      out.push_str(", ");
    }
    push_rule_expr(out, r);
  }
  out.push_str("] }");
}

fn generate_custom_options_rs(map: &HashMap<String, CustomOptionsBuild>) -> String {
  let mut out = String::new();
  out.push_str("// @generated by build.rs. Do not edit.\n");
  out.push_str("use super::*;\n");
  out.push_str("use std::collections::HashMap;\n\n");
  out.push_str("pub fn build_custom_options_map() -> CustomOptionMap {\n");
  out.push_str("  let mut m: CustomOptionMap = HashMap::with_capacity(");
  out.push_str(&map.len().to_string());
  out.push_str(");\n");

  let mut keys: Vec<_> = map.keys().collect();
  keys.sort();
  for k in keys {
    let v = map.get(k).unwrap();
    out.push_str("  m.insert(String::from(");
    out.push_str(&lit_str(k));
    out.push_str("), ");
    let mut expr = String::new();
    push_custom_options_expr(&mut expr, v);
    out.push_str(&expr);
    out.push_str(");\n");
  }

  out.push_str("  m\n");
  out.push_str("}\n");
  out
}

fn generate_script_data_rs(all: &[(String, ScriptDataBuild)]) -> String {
  let mut out = String::new();
  out.push_str("// @generated by build.rs. Do not edit.\n");
  out.push_str("use super::*;\n");
  out.push_str("use std::collections::HashMap;\n\n");
  out.push_str("pub fn build_all_script_data() -> HashMap<String, ScriptData> {\n");
  out.push_str("  let mut m: HashMap<String, ScriptData> = HashMap::with_capacity(");
  out.push_str(&all.len().to_string());
  out.push_str(");\n");

  for (k, v) in all {
    out.push_str("  m.insert(String::from(");
    out.push_str(&lit_str(k));
    out.push_str("), ");
    let mut expr = String::new();
    push_script_data_expr(&mut expr, v);
    out.push_str(&expr);
    out.push_str(");\n");
  }

  out.push_str("  m\n");
  out.push_str("}\n");
  out
}
