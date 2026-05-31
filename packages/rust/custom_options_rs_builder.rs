use quote::{format_ident, quote};

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

    let struct_fields = fields.iter().map(|(field_ident, raw_key)| {
        let doc = format!("`{raw_key}`");
        quote! {
            #[doc = #doc]
            pub #field_ident: bool,
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

    let tokens = quote! {
        // generated file, do not edit
        #[rustfmt::skip]
        use derive_builder::Builder;

        /// Returned when [`CustomOptions::try_set`] is called with an unknown option key.
        #[derive(Debug, Clone, Copy, PartialEq, Eq)]
        pub struct UnknownCustomOptionKey;

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

        impl CustomOptions {
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
