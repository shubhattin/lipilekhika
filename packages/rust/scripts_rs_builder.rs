use quote::{format_ident, quote};
use std::collections::HashSet;

use crate::schema::ScriptListDataJson;

/// Generate the contents of `src/scripts.rs` from parsed `script_list.json`.
pub fn render_scripts_rs(script_list: &ScriptListDataJson) -> String {
  let mut used_script_idents = HashSet::new();
  let script_variants: Vec<_> = script_list
    .scripts
    .keys()
    .map(|name| {
      (
        format_ident!(
          "{}",
          make_unique_variant_ident(name, &mut used_script_idents)
        ),
        name.as_str(),
      )
    })
    .collect();

  let mut script_lang_values: Vec<&str> = Vec::new();
  let mut seen_script_lang_values = HashSet::new();
  for value in script_list
    .scripts
    .keys()
    .map(String::as_str)
    .chain(script_list.langs.keys().map(String::as_str))
    .chain(script_list.script_alternates_map.keys().map(String::as_str))
  {
    if seen_script_lang_values.insert(value) {
      script_lang_values.push(value);
    }
  }

  let mut used_script_lang_idents = HashSet::new();
  let script_lang_variants: Vec<_> = script_lang_values
    .into_iter()
    .map(|value| {
      (
        format_ident!(
          "{}",
          make_unique_variant_ident(value, &mut used_script_lang_idents)
        ),
        value,
      )
    })
    .collect();

  let script_enum_variants = script_variants.iter().map(|(variant, label)| {
    quote! {
      #[strum(serialize = #label)]
      #variant,
    }
  });

  let script_lang_enum_variants = script_lang_variants.iter().map(|(variant, label)| {
    quote! {
      #[strum(serialize = #label)]
      #variant,
    }
  });

  let from_script_lang_arms = script_lang_variants.iter().map(|(lang_variant, label)| {
    let script_name = resolve_to_script_name(label, script_list);
    let script_variant = script_variants
      .iter()
      .find(|(_, name)| *name == script_name.as_str())
      .map(|(variant, _)| variant)
      .unwrap_or_else(|| {
        panic!(
          "scripts_rs_builder: resolved script name {script_name:?} for ScriptLangEnum label {label:?} \
           has no matching Script variant"
        )
      });
    quote! {
      Script::#lang_variant => ScriptListEnum::#script_variant,
    }
  });

  let tokens = quote! {
    use strum::{AsRefStr, Display, EnumString};

    // `EnumString` automatically implements `FromStr` for the enum.
    // which allows calling `Script::from_str("script")` -> `Result<Script, Error>``

    /// The list of all supported scripts (interal resolved type)
    #[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, AsRefStr, Display, EnumString)]
    #[strum(ascii_case_insensitive)]
    pub enum ScriptListEnum {
      #(#script_enum_variants)*
    }

    /// List of all supported scripts, languages and their aliases
    #[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, AsRefStr, Display, EnumString)]
    #[strum(ascii_case_insensitive)]
    pub enum Script {
      #(#script_lang_enum_variants)*
    }

    impl From<Script> for ScriptListEnum {
      fn from(lang: Script) -> Self {
        match lang {
          #(#from_script_lang_arms)*
        }
      }
    }
  };

  // Parse into a syntax tree structure
  let syntax_tree: syn::File = syn::parse2(tokens).expect("Generated invalid Rust syntax");
  prettyplease::unparse(&syntax_tree)
}

fn to_pascal_case_ident(value: &str) -> String {
  let mut ident = String::new();
  let mut uppercase_next = true;

  for ch in value.chars() {
    if ch.is_ascii_alphanumeric() {
      if uppercase_next {
        ident.push(ch.to_ascii_uppercase());
        uppercase_next = false;
      } else {
        ident.push(ch.to_ascii_lowercase());
      }
    } else {
      uppercase_next = true;
    }
  }

  if ident.is_empty() {
    ident.push_str("Value");
  }

  if ident
    .chars()
    .next()
    .is_some_and(|first| first.is_ascii_digit())
  {
    ident.insert_str(0, "Value");
  }

  if matches!(
    ident.as_str(),
    "As"
      | "Break"
      | "Const"
      | "Continue"
      | "Crate"
      | "Else"
      | "Enum"
      | "Extern"
      | "False"
      | "Fn"
      | "For"
      | "If"
      | "Impl"
      | "In"
      | "Let"
      | "Loop"
      | "Match"
      | "Mod"
      | "Move"
      | "Mut"
      | "Pub"
      | "Ref"
      | "Return"
      | "Self"
      | "SelfType"
      | "Static"
      | "Struct"
      | "Super"
      | "Trait"
      | "True"
      | "Type"
      | "Unsafe"
      | "Use"
      | "Where"
      | "While"
      | "Async"
      | "Await"
      | "Dyn"
      | "Abstract"
      | "Become"
      | "Box"
      | "Do"
      | "Final"
      | "Macro"
      | "Override"
      | "Priv"
      | "Try"
      | "Typeof"
      | "Unsized"
      | "Virtual"
      | "Yield"
  ) {
    ident.insert_str(0, "Value");
  }

  ident
}

fn make_unique_variant_ident(value: &str, used: &mut HashSet<String>) -> String {
  let base = to_pascal_case_ident(value);
  let mut candidate = base.clone();
  let mut suffix = 2usize;

  while used.contains(&candidate) {
    candidate = format!("{base}{suffix}");
    suffix += 1;
  }

  used.insert(candidate.clone());
  candidate
}

fn capitalize_first_and_after_dash(input: &str) -> String {
  let mut result = String::with_capacity(input.len());
  let mut capitalize_next = true;

  for ch in input.chars() {
    if ch == '-' {
      capitalize_next = true;
      result.push(ch);
    } else if capitalize_next && ch.is_ascii_alphabetic() {
      result.push(ch.to_ascii_uppercase());
      capitalize_next = false;
    } else {
      result.push(ch.to_ascii_lowercase());
      capitalize_next = false;
    }
  }

  result
}

/// Mirrors `get_normalized_script_name` in `script_list.rs` (without error path).
fn resolve_to_script_name(label: &str, script_list: &ScriptListDataJson) -> String {
  let capitalized_name = capitalize_first_and_after_dash(label);

  if script_list.scripts.contains_key(&capitalized_name) {
    return capitalized_name;
  }

  if script_list.langs.contains_key(&capitalized_name)
    && let Some(script) = script_list.lang_script_map.get(&capitalized_name)
  {
    return script.clone();
  }

  let lower_name = label.to_lowercase();
  if let Some(script) = script_list.script_alternates_map.get(&lower_name) {
    return script.clone();
  }

  panic!(
    "scripts_rs_builder: ScriptLangEnum label {label:?} did not resolve to a script \
     (scripts / langs / script_alternates_map)"
  );
}
