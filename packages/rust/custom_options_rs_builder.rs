use quote::{format_ident, quote};
use syn::Index;

use crate::schema::CustomOptionMapJson;

/// Generate the contents of `src/custom_options.rs` from parsed `custom_options.json`.
pub fn render_custom_options_rs(custom_options: &CustomOptionMapJson) -> String {
    let fields: Vec<_> = custom_options
        .keys()
        .map(|key| {
            let ident = format_ident!("{}", key.replace(':', "_"));
            (ident, key.as_str())
        })
        .collect();

    let entry_count = fields.len();
    let entry_count_lit = Index::from(entry_count);

    let struct_fields = fields.iter().map(|(field_ident, raw_key)| {
        let doc = format!("`{raw_key}`");
        quote! {
            #[doc = #doc]
            pub #field_ident: bool,
        }
    });

    let option_keys = fields.iter().map(|(_, raw_key)| quote! { #raw_key, });

    let entry_tuples: Vec<_> = fields
        .iter()
        .map(|(field_ident, raw_key)| {
            quote! {
                (#raw_key, self.#field_ident),
            }
        })
        .collect();

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

    let tokens = quote! {
        // generated file, do not edit
        #[rustfmt::skip]
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
            pub const ENTRY_COUNT: usize = #entry_count_lit;

            /// Canonical keys in `custom_options.json` insertion order.
            pub const KEYS: &'static [&'static str] = &[#(#option_keys)*];

            /// Sets an option by its canonical `category:option` key.
            #[inline]
            pub fn try_set(
                &mut self,
                key: &str,
                value: bool,
            ) -> Result<(), UnknownCustomOptionKey> {
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
        }

        impl CustomOptionsBuilder {
            /// Infallible build: every field has a `bool` default via [`Default`].
            #[inline]
            pub fn build(self) -> CustomOptions {
                self.try_build()
                    .expect("CustomOptionsBuilder: infallible with `#[builder(default)]`")
            }
        }
    };

    let syntax_tree: syn::File = syn::parse2(tokens).expect("Generated invalid Rust syntax");
    prettyplease::unparse(&syntax_tree)
}
