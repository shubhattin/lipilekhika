//! Procedural macros used internally by the [`lipilekhika`](https://crates.io/crates/lipilekhika) crate.
//!
//! `lipilekhika-datagen` writes `src/scripts.rs` and `src/custom_options.rs` as plain data
//! (a single invocation of [`script_list!`] / [`custom_options!`]). These macros turn that data
//! into the public `Script`, `ScriptListEnum` and `CustomOptions` types, so the committed
//! generated files stay small and readable, and invalid data fails at compile time.
//!
//! The expansions refer to `strum` and `derive_builder`, which the calling crate must depend on.

use std::collections::HashSet;

use proc_macro::TokenStream;
use proc_macro2::{Span, TokenStream as TokenStream2};
use quote::{format_ident, quote};
use syn::parse::{Parse, ParseStream};
use syn::punctuated::Punctuated;
use syn::{Ident, LitInt, LitStr, Token, braced};

// ---------------------------------------------------------------------------
// script_list!
// ---------------------------------------------------------------------------

/// Expands the contents of `script_list.json` into the script/language enums.
///
/// ```ignore
/// lipilekhika_macros::script_list! {
///     scripts: { "Devanagari" = 1, "Telugu" = 2 },
///     langs: { "Sanskrit" = 2, "Telugu" = 4 },
///     lang_script_map: { "Sanskrit" => "Devanagari", "Telugu" => "Telugu" },
///     script_alternates_map: { "dev" => "Devanagari", "te" => "Telugu" },
/// }
/// ```
///
/// Generates:
/// - `ScriptListEnum`: the canonical scripts (declaration order = `scripts` order)
/// - `Script`: every script, language and alias, accepted by `FromStr` (case-insensitive)
/// - `From<Script> for ScriptListEnum`, `from_id` on both enums
/// - `pub(crate)` constants `SCRIPTS`, `LANGS`, `LANG_SCRIPT_MAP`, `SCRIPT_ALTERNATES_MAP`
///   holding the raw lists in their original order
#[proc_macro]
pub fn script_list(input: TokenStream) -> TokenStream {
    let input = syn::parse_macro_input!(input as ScriptListInput);
    match expand_script_list(&input) {
        Ok(tokens) => tokens.into(),
        Err(err) => err.to_compile_error().into(),
    }
}

struct IdEntry {
    name: LitStr,
    id: LitInt,
}

impl Parse for IdEntry {
    fn parse(input: ParseStream) -> syn::Result<Self> {
        let name = input.parse()?;
        input.parse::<Token![=]>()?;
        let id: LitInt = input.parse()?;
        id.base10_parse::<u8>()?;
        Ok(Self { name, id })
    }
}

struct MapEntry {
    key: LitStr,
    value: LitStr,
}

impl Parse for MapEntry {
    fn parse(input: ParseStream) -> syn::Result<Self> {
        let key = input.parse()?;
        input.parse::<Token![=>]>()?;
        let value = input.parse()?;
        Ok(Self { key, value })
    }
}

struct ScriptListInput {
    scripts: Vec<IdEntry>,
    langs: Vec<IdEntry>,
    lang_script_map: Vec<MapEntry>,
    script_alternates_map: Vec<MapEntry>,
}

/// Parses `<name>: { <entries> }` followed by an optional comma.
fn parse_section<T: Parse>(input: ParseStream, name: &str) -> syn::Result<Vec<T>> {
    let ident: Ident = input.parse()?;
    if ident != name {
        return Err(syn::Error::new(
            ident.span(),
            format!("expected section `{name}`"),
        ));
    }
    input.parse::<Token![:]>()?;
    let content;
    braced!(content in input);
    let entries = Punctuated::<T, Token![,]>::parse_terminated(&content)?;
    if !input.is_empty() {
        input.parse::<Token![,]>()?;
    }
    Ok(entries.into_iter().collect())
}

impl Parse for ScriptListInput {
    fn parse(input: ParseStream) -> syn::Result<Self> {
        let parsed = Self {
            scripts: parse_section(input, "scripts")?,
            langs: parse_section(input, "langs")?,
            lang_script_map: parse_section(input, "lang_script_map")?,
            script_alternates_map: parse_section(input, "script_alternates_map")?,
        };
        if !input.is_empty() {
            return Err(input.error("unexpected tokens after `script_alternates_map`"));
        }
        Ok(parsed)
    }
}

fn check_unique<'a>(keys: impl Iterator<Item = &'a LitStr>, section: &str) -> syn::Result<()> {
    let mut seen = HashSet::new();
    for key in keys {
        if !seen.insert(key.value()) {
            return Err(syn::Error::new(
                key.span(),
                format!("duplicate key {:?} in `{section}`", key.value()),
            ));
        }
    }
    Ok(())
}

fn check_points_to_script(entries: &[MapEntry], scripts: &HashSet<String>) -> syn::Result<()> {
    for entry in entries {
        if !scripts.contains(&entry.value.value()) {
            return Err(syn::Error::new(
                entry.value.span(),
                format!(
                    "{:?} is not a script listed in `scripts`",
                    entry.value.value()
                ),
            ));
        }
    }
    Ok(())
}

fn expand_script_list(input: &ScriptListInput) -> syn::Result<TokenStream2> {
    check_unique(input.scripts.iter().map(|e| &e.name), "scripts")?;
    check_unique(input.langs.iter().map(|e| &e.name), "langs")?;
    check_unique(
        input.lang_script_map.iter().map(|e| &e.key),
        "lang_script_map",
    )?;
    check_unique(
        input.script_alternates_map.iter().map(|e| &e.key),
        "script_alternates_map",
    )?;
    let script_names: HashSet<String> = input.scripts.iter().map(|e| e.name.value()).collect();
    check_points_to_script(&input.lang_script_map, &script_names)?;
    check_points_to_script(&input.script_alternates_map, &script_names)?;
    {
        let mut seen_ids = HashSet::new();
        for entry in &input.scripts {
            if !seen_ids.insert(entry.id.base10_parse::<u8>()?) {
                return Err(syn::Error::new(entry.id.span(), "duplicate script id"));
            }
        }
    }

    let mut used_script_idents = HashSet::new();
    let script_variants: Vec<(Ident, &LitStr)> = input
        .scripts
        .iter()
        .map(|entry| {
            let ident = make_unique_variant_ident(&entry.name.value(), &mut used_script_idents);
            (Ident::new(&ident, Span::call_site()), &entry.name)
        })
        .collect();

    // scripts, then langs, then aliases; first occurrence of a label wins
    let mut seen_labels = HashSet::new();
    let script_lang_labels: Vec<&LitStr> = input
        .scripts
        .iter()
        .map(|e| &e.name)
        .chain(input.langs.iter().map(|e| &e.name))
        .chain(input.script_alternates_map.iter().map(|e| &e.key))
        .filter(|label| seen_labels.insert(label.value()))
        .collect();

    let mut used_script_lang_idents = HashSet::new();
    let script_lang_variants: Vec<(Ident, &LitStr)> = script_lang_labels
        .into_iter()
        .map(|label| {
            let ident = make_unique_variant_ident(&label.value(), &mut used_script_lang_idents);
            (Ident::new(&ident, Span::call_site()), label)
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

    let mut from_script_lang_arms = Vec::with_capacity(script_lang_variants.len());
    for (lang_variant, label) in &script_lang_variants {
        let script_name = resolve_to_script_name(label, input)?;
        let script_variant = script_variants
            .iter()
            .find(|(_, name)| name.value() == script_name)
            .map(|(variant, _)| variant)
            .ok_or_else(|| {
                syn::Error::new(
                    label.span(),
                    format!(
                        "{:?} resolved to {script_name:?}, which is not in `scripts`",
                        label.value()
                    ),
                )
            })?;
        from_script_lang_arms.push(quote! {
            Script::#lang_variant => ScriptListEnum::#script_variant,
        });
    }

    let from_id_arms: Vec<_> = script_variants
        .iter()
        .zip(&input.scripts)
        .map(|((variant, _), entry)| {
            let id = entry.id.base10_parse::<u8>().expect("validated above");
            quote! { #id => Some(Self::#variant), }
        })
        .collect();

    let scripts_const = input.scripts.iter().map(|e| {
        let (name, id) = (&e.name, e.id.base10_parse::<u8>().expect("validated above"));
        quote! { (#name, #id), }
    });
    let langs_const = input.langs.iter().map(|e| {
        let (name, id) = (&e.name, e.id.base10_parse::<u8>().expect("validated above"));
        quote! { (#name, #id), }
    });
    let lang_script_map_const = input.lang_script_map.iter().map(|e| {
        let (key, value) = (&e.key, &e.value);
        quote! { (#key, #value), }
    });
    let script_alternates_map_const = input.script_alternates_map.iter().map(|e| {
        let (key, value) = (&e.key, &e.value);
        quote! { (#key, #value), }
    });

    Ok(quote! {
        use strum::{AsRefStr, Display, EnumString};

        // `EnumString` automatically implements `FromStr` for the enum.
        // which allows calling `Script::from_str("script")` -> `Result<Script, Error>``

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
        #[allow(dead_code)]
        pub(crate) const SCRIPTS: &[(&str, u8)] = &[#(#scripts_const)*];
        /// `(language name, language id)` in `script_list.json` order.
        #[allow(dead_code)]
        pub(crate) const LANGS: &[(&str, u8)] = &[#(#langs_const)*];
        /// `(language name, script name)` pairs.
        #[allow(dead_code)]
        pub(crate) const LANG_SCRIPT_MAP: &[(&str, &str)] = &[#(#lang_script_map_const)*];
        /// `(alias, script name)` pairs.
        #[allow(dead_code)]
        pub(crate) const SCRIPT_ALTERNATES_MAP: &[(&str, &str)] = &[#(#script_alternates_map_const)*];
    })
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
fn resolve_to_script_name(label: &LitStr, input: &ScriptListInput) -> syn::Result<String> {
    let label_value = label.value();
    let capitalized_name = capitalize_first_and_after_dash(&label_value);

    if input
        .scripts
        .iter()
        .any(|e| e.name.value() == capitalized_name)
    {
        return Ok(capitalized_name);
    }

    if input
        .langs
        .iter()
        .any(|e| e.name.value() == capitalized_name)
        && let Some(entry) = input
            .lang_script_map
            .iter()
            .find(|e| e.key.value() == capitalized_name)
    {
        return Ok(entry.value.value());
    }

    let lower_name = label_value.to_lowercase();
    if let Some(entry) = input
        .script_alternates_map
        .iter()
        .find(|e| e.key.value() == lower_name)
    {
        return Ok(entry.value.value());
    }

    Err(syn::Error::new(
        label.span(),
        format!(
            "{label_value:?} does not resolve to a script \
             (checked `scripts`, `langs` + `lang_script_map`, `script_alternates_map`)"
        ),
    ))
}

// ---------------------------------------------------------------------------
// custom_options!
// ---------------------------------------------------------------------------

/// Expands the list of custom option keys (`custom_options.json` order) into the
/// `CustomOptions` struct, its builder and helpers.
///
/// ```ignore
/// lipilekhika_macros::custom_options! {
///     "all_to_normal:replace_avagraha_with_a",
///     "normal_to_all:use_typing_chars",
/// }
/// ```
///
/// Each `category:option` key becomes a `bool` field named `category_option`.
#[proc_macro]
pub fn custom_options(input: TokenStream) -> TokenStream {
    let keys =
        syn::parse_macro_input!(input with Punctuated::<LitStr, Token![,]>::parse_terminated);
    match expand_custom_options(keys.into_iter().collect()) {
        Ok(tokens) => tokens.into(),
        Err(err) => err.to_compile_error().into(),
    }
}

fn expand_custom_options(keys: Vec<LitStr>) -> syn::Result<TokenStream2> {
    check_unique(keys.iter(), "custom_options")?;

    let mut fields: Vec<(Ident, &LitStr)> = Vec::with_capacity(keys.len());
    for key in &keys {
        let field_name = key.value().replace(':', "_");
        let ident = syn::parse_str::<Ident>(&field_name).map_err(|_| {
            syn::Error::new(
                key.span(),
                format!(
                    "{:?} is not a valid field name once `:` becomes `_`",
                    key.value()
                ),
            )
        })?;
        fields.push((format_ident!("{}", ident, span = Span::call_site()), key));
    }

    let entry_count = fields.len();

    let struct_fields = fields.iter().map(|(field_ident, raw_key)| {
        let doc = format!("`{}`", raw_key.value());
        quote! {
            #[doc = #doc]
            pub #field_ident: bool,
        }
    });

    let option_keys = fields.iter().map(|(_, raw_key)| quote! { #raw_key, });

    let entry_tuples = fields.iter().map(|(field_ident, raw_key)| {
        quote! {
            (#raw_key, self.#field_ident),
        }
    });

    let try_set_arms = fields.iter().map(|(field_ident, raw_key)| {
        quote! {
            #raw_key => {
                self.#field_ident = value;
                Ok(())
            }
        }
    });

    let get_arms = fields.iter().map(|(field_ident, raw_key)| {
        quote! {
            #raw_key => Ok(self.#field_ident),
        }
    });

    let all_enabled_fields = fields.iter().map(|(field_ident, _)| {
        quote! {
            #field_ident: true,
        }
    });

    Ok(quote! {
        use alloc::string::{String, ToString};
        use derive_builder::Builder;

        /// Custom transliteration options struct
        ///
        /// Use [`CustomOptionsBuilder::default`] and `<category>_<option>(bool)` setters, or
        /// [`CustomOptions::default`] for all options disabled.
        ///
        /// For a list of supported options visit [Custom Options](https://lipilekhika.in/reference/custom_trans_options/).
        #[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Builder)]
        #[builder(no_std, default, pattern = "owned", build_fn(name = "try_build"))]
        #[allow(non_snake_case)]
        pub struct CustomOptions {
            #(#struct_fields)*
        }

        /// Returned when [`CustomOptions::try_set`] or [`CustomOptions::get`] is called with an unknown option key.
        #[derive(Debug, Clone, Copy, PartialEq, Eq)]
        pub struct UnknownCustomOptionKey;

        impl CustomOptions {
            /// Number of supported custom options.
            pub const ENTRY_COUNT: usize = #entry_count;

            /// Canonical keys in `custom_options.json` insertion order.
            pub const KEYS: &'static [&'static str] = &[#(#option_keys)*];

            /// Every option enabled (no runtime key lookup).
            #[inline]
            pub const fn all_enabled() -> Self {
                Self {
                    #(#all_enabled_fields)*
                }
            }

            /// Sets an option by its canonical `category:option` key.
            #[inline]
            pub fn try_set(&mut self, key: &str, value: bool) -> Result<(), UnknownCustomOptionKey> {
                match key {
                    #(#try_set_arms)*
                    _ => Err(UnknownCustomOptionKey),
                }
            }

            /// Reads an option by its canonical `category:option` key.
            #[inline]
            pub fn get(&self, key: &str) -> Result<bool, UnknownCustomOptionKey> {
                match key {
                    #(#get_arms)*
                    _ => Err(UnknownCustomOptionKey),
                }
            }

            /// Fixed-size array of canonical key/value pairs (`&opts.as_entries()` for a slice).
            #[inline]
            pub fn as_entries(&self) -> [(&'static str, bool); Self::ENTRY_COUNT] {
                [#(#entry_tuples)*]
            }

            /// Builds a hash map from canonical option keys (supports any `FromIterator<(String, bool)>` map, e.g. hashbrown or std).
            #[inline]
            pub fn to_options_map<M>(&self) -> M
            where
                M: FromIterator<(String, bool)>,
            {
                self.as_entries()
                    .iter()
                    .copied()
                    .map(|(key, enabled)| (key.to_string(), enabled))
                    .collect()
            }

            /// Builds [`CustomOptions`] from any map-like `(key, enabled)` source.
            ///
            /// Accepts [`hashbrown::HashMap`](hashbrown::HashMap), [`std::collections::HashMap`](std::collections::HashMap),
            /// iterators of pairs, and other collections via [`IntoIterator`].
            pub fn try_from_map<M, K, V>(map: M) -> Result<Self, UnknownCustomOptionKey>
            where
                M: IntoIterator<Item = (K, V)>,
                K: AsRef<str>,
                V: core::borrow::Borrow<bool>,
            {
                let mut options = Self::default();
                for (key, enabled) in map {
                    options.try_set(key.as_ref(), *enabled.borrow())?;
                }
                Ok(options)
            }

            /// Builds [`CustomOptions`] from a list of `(key, enabled)` pairs.
            #[inline]
            pub fn try_from_pairs<I, S>(pairs: I) -> Result<Self, UnknownCustomOptionKey>
            where
                I: IntoIterator<Item = (S, bool)>,
                S: AsRef<str>,
            {
                Self::try_from_map(pairs)
            }

            /// Builds [`CustomOptions`] from an optional map-like source.
            #[inline]
            pub fn try_from_optional_map<M, K, V>(
                map: Option<M>,
            ) -> Result<Option<Self>, UnknownCustomOptionKey>
            where
                M: IntoIterator<Item = (K, V)>,
                K: AsRef<str>,
                V: core::borrow::Borrow<bool>,
            {
                map.map(Self::try_from_map).transpose()
            }
        }

        impl CustomOptionsBuilder {
            /// Infallible build: every field has a `bool` default via [`Default`].
            #[inline]
            pub fn build(self) -> CustomOptions {
                self.try_build()
                    .expect("CustomOptionsBuilder: infallible with `#[builder(default)]`")
            }
        }
    })
}
