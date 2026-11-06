//! Generates `src/scripts.rs` (the `Script` / `ScriptListEnum` enums) from `script_list.json`.

use proc_macro2::TokenStream;
use quote::{format_ident, quote};
use std::collections::HashSet;

use crate::schema::ScriptListDataJson;

pub fn render_scripts_rs(script_list: &ScriptListDataJson) -> Result<TokenStream, String> {
    validate(script_list)?;

    let mut used_script_idents = HashSet::new();
    let script_variants: Vec<_> = script_list
        .scripts
        .iter()
        .map(|(name, id)| {
            (
                format_ident!(
                    "{}",
                    make_unique_variant_ident(name, &mut used_script_idents)
                ),
                name.as_str(),
                proc_macro2::Literal::u8_unsuffixed(*id),
            )
        })
        .collect();

    // scripts, then langs, then aliases; first occurrence of a label wins
    let mut seen_labels = HashSet::new();
    let script_lang_labels: Vec<&str> = script_list
        .scripts
        .keys()
        .chain(script_list.langs.keys())
        .chain(script_list.script_alternates_map.keys())
        .map(String::as_str)
        .filter(|label| seen_labels.insert(*label))
        .collect();

    let mut used_script_lang_idents = HashSet::new();
    let script_lang_variants: Vec<_> = script_lang_labels
        .into_iter()
        .map(|label| {
            (
                format_ident!(
                    "{}",
                    make_unique_variant_ident(label, &mut used_script_lang_idents)
                ),
                label,
            )
        })
        .collect();

    let script_enum_variants = script_variants.iter().map(|(variant, label, _)| {
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

    let mut from_script_lang_arms = Vec::with_capacity(script_lang_variants.len());
    for (lang_variant, label) in &script_lang_variants {
        let script_name = resolve_to_script_name(label, script_list)?;
        let script_variant = script_variants
            .iter()
            .find(|(_, name, _)| *name == script_name)
            .map(|(variant, _, _)| variant)
            .ok_or_else(|| {
                format!("{label:?} resolved to {script_name:?}, which is not a listed script")
            })?;
        from_script_lang_arms.push(quote! {
            Script::#lang_variant => ScriptListEnum::#script_variant,
        });
    }

    let from_id_arms: Vec<_> = script_variants
        .iter()
        .map(|(variant, _, id)| quote! { #id => Some(Self::#variant), })
        .collect();

    let scripts_const = id_pairs(&script_list.scripts);
    let langs_const = id_pairs(&script_list.langs);
    let lang_script_map_const = script_list
        .lang_script_map
        .iter()
        .map(|(lang, script)| quote! { (#lang, #script), });
    let script_alternates_map_const = script_list
        .script_alternates_map
        .iter()
        .map(|(alias, script)| quote! { (#alias, #script), });

    Ok(quote! {
        use strum::{AsRefStr, Display, EnumString};

        /// The list of all supported scripts (internal resolved type)
        #[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, AsRefStr, Display, EnumString)]
        #[strum(ascii_case_insensitive)]
        pub enum ScriptListEnum {
            #(#script_enum_variants)*
        }

        impl ScriptListEnum {
            /// Resolves a canonical `script_list.json` script id to the internal script enum.
            #[inline]
            pub const fn from_id(id: u8) -> Option<Self> {
                match id {
                    #(#from_id_arms)*
                    _ => None,
                }
            }
        }

        /// List of all supported scripts, languages and their aliases
        #[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, AsRefStr, Display, EnumString)]
        #[strum(ascii_case_insensitive)]
        pub enum Script {
            #(#script_lang_enum_variants)*
        }

        impl Script {
            /// Resolves a canonical `script_list.json` script id to the canonical script variant.
            #[inline]
            pub const fn from_id(id: u8) -> Option<Self> {
                match id {
                    #(#from_id_arms)*
                    _ => None,
                }
            }
        }

        impl From<Script> for ScriptListEnum {
            fn from(lang: Script) -> Self {
                match lang {
                    #(#from_script_lang_arms)*
                }
            }
        }

        /// `(script name, script id)` in `script_list.json` order (= `ScriptListEnum` order).
        pub(crate) const SCRIPTS: &[(&str, u8)] = &[#(#scripts_const)*];
        /// `(language name, language id)` in `script_list.json` order.
        pub(crate) const LANGS: &[(&str, u8)] = &[#(#langs_const)*];
        /// `(language name, script name)` pairs.
        pub(crate) const LANG_SCRIPT_MAP: &[(&str, &str)] = &[#(#lang_script_map_const)*];
        /// `(alias, script name)` pairs.
        pub(crate) const SCRIPT_ALTERNATES_MAP: &[(&str, &str)] = &[#(#script_alternates_map_const)*];
    })
}

fn id_pairs<'a>(list: impl IntoIterator<Item = (&'a String, &'a u8)>) -> Vec<TokenStream> {
    list.into_iter()
        .map(|(name, id)| {
            let id = proc_macro2::Literal::u8_unsuffixed(*id);
            quote! { (#name, #id), }
        })
        .collect()
}

fn validate(script_list: &ScriptListDataJson) -> Result<(), String> {
    let mut ids = HashSet::new();
    for (name, id) in &script_list.scripts {
        if !ids.insert(*id) {
            return Err(format!("duplicate script id {id} ({name:?})"));
        }
    }
    for (section, map) in [
        ("lang_script_map", &script_list.lang_script_map),
        ("script_alternates_map", &script_list.script_alternates_map),
    ] {
        for (key, script) in map {
            if !script_list.scripts.contains_key(script) {
                return Err(format!(
                    "{section}: {key:?} points to {script:?}, which is not a listed script"
                ));
            }
        }
    }
    Ok(())
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

    // PascalCase forms of (strict + reserved) keywords
    if matches!(
        ident.as_str(),
        "As" | "Break"
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
        ident.push('_');
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

/// Mirrors `get_normalized_script_name` of the JS package: script name, then language
/// name (via `lang_script_map`), then alias (via `script_alternates_map`).
fn resolve_to_script_name(label: &str, script_list: &ScriptListDataJson) -> Result<String, String> {
    let capitalized_name = capitalize_first_and_after_dash(label);

    if script_list.scripts.contains_key(&capitalized_name) {
        return Ok(capitalized_name);
    }

    if script_list.langs.contains_key(&capitalized_name)
        && let Some(script) = script_list.lang_script_map.get(&capitalized_name)
    {
        return Ok(script.clone());
    }

    let lower_name = label.to_lowercase();
    if let Some(script) = script_list.script_alternates_map.get(&lower_name) {
        return Ok(script.clone());
    }

    Err(format!(
        "{label:?} does not resolve to a script \
         (checked scripts, langs + lang_script_map, script_alternates_map)"
    ))
}
