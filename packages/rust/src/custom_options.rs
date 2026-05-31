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
    ///`all_to_normal:replace_pancham_varga_varna_with_n`
    pub all_to_normal_replace_pancham_varga_varna_with_n: bool,
    ///`brahmic_to_brahmic:replace_pancham_varga_varna_with_anusvAra`
    pub brahmic_to_brahmic_replace_pancham_varga_varna_with_anusvAra: bool,
    ///`all_to_sinhala:use_conjunct_enabling_halant`
    pub all_to_sinhala_use_conjunct_enabling_halant: bool,
    ///`all_to_normal:remove_virAma_and_double_virAma`
    pub all_to_normal_remove_virAma_and_double_virAma: bool,
    ///`all_to_normal:replace_avagraha_with_a`
    pub all_to_normal_replace_avagraha_with_a: bool,
    ///`normal_to_all:use_typing_chars`
    pub normal_to_all_use_typing_chars: bool,
    ///`all_to_normal:preserve_specific_chars`
    pub all_to_normal_preserve_specific_chars: bool,
}
/// Returned when [`CustomOptions::try_set`] or [`CustomOptions::get`] is called with an unknown option key.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct UnknownCustomOptionKey;
impl CustomOptions {
    /// Number of supported custom options.
    pub const ENTRY_COUNT: usize = 7;
    /// Canonical keys in `custom_options.json` insertion order.
    pub const KEYS: &'static [&'static str] = &[
        "all_to_normal:replace_pancham_varga_varna_with_n",
        "brahmic_to_brahmic:replace_pancham_varga_varna_with_anusvAra",
        "all_to_sinhala:use_conjunct_enabling_halant",
        "all_to_normal:remove_virAma_and_double_virAma",
        "all_to_normal:replace_avagraha_with_a",
        "normal_to_all:use_typing_chars",
        "all_to_normal:preserve_specific_chars",
    ];
    /// Sets an option by its canonical `category:option` key.
    #[inline]
    pub fn try_set(
        &mut self,
        key: &str,
        value: bool,
    ) -> Result<(), UnknownCustomOptionKey> {
        match key {
            "all_to_normal:replace_pancham_varga_varna_with_n" => {
                self.all_to_normal_replace_pancham_varga_varna_with_n = value;
                Ok(())
            }
            "brahmic_to_brahmic:replace_pancham_varga_varna_with_anusvAra" => {
                self.brahmic_to_brahmic_replace_pancham_varga_varna_with_anusvAra = value;
                Ok(())
            }
            "all_to_sinhala:use_conjunct_enabling_halant" => {
                self.all_to_sinhala_use_conjunct_enabling_halant = value;
                Ok(())
            }
            "all_to_normal:remove_virAma_and_double_virAma" => {
                self.all_to_normal_remove_virAma_and_double_virAma = value;
                Ok(())
            }
            "all_to_normal:replace_avagraha_with_a" => {
                self.all_to_normal_replace_avagraha_with_a = value;
                Ok(())
            }
            "normal_to_all:use_typing_chars" => {
                self.normal_to_all_use_typing_chars = value;
                Ok(())
            }
            "all_to_normal:preserve_specific_chars" => {
                self.all_to_normal_preserve_specific_chars = value;
                Ok(())
            }
            _ => Err(UnknownCustomOptionKey),
        }
    }
    /// Reads an option by its canonical `category:option` key.
    #[inline]
    pub fn get(&self, key: &str) -> Result<bool, UnknownCustomOptionKey> {
        match key {
            "all_to_normal:replace_pancham_varga_varna_with_n" => {
                Ok(self.all_to_normal_replace_pancham_varga_varna_with_n)
            }
            "brahmic_to_brahmic:replace_pancham_varga_varna_with_anusvAra" => {
                Ok(self.brahmic_to_brahmic_replace_pancham_varga_varna_with_anusvAra)
            }
            "all_to_sinhala:use_conjunct_enabling_halant" => {
                Ok(self.all_to_sinhala_use_conjunct_enabling_halant)
            }
            "all_to_normal:remove_virAma_and_double_virAma" => {
                Ok(self.all_to_normal_remove_virAma_and_double_virAma)
            }
            "all_to_normal:replace_avagraha_with_a" => {
                Ok(self.all_to_normal_replace_avagraha_with_a)
            }
            "normal_to_all:use_typing_chars" => Ok(self.normal_to_all_use_typing_chars),
            "all_to_normal:preserve_specific_chars" => {
                Ok(self.all_to_normal_preserve_specific_chars)
            }
            _ => Err(UnknownCustomOptionKey),
        }
    }
    /// Fixed-size array of canonical key/value pairs (`&opts.as_entries()` for a slice).
    #[inline]
    pub fn as_entries(&self) -> [(&'static str, bool); Self::ENTRY_COUNT] {
        [
            (
                "all_to_normal:replace_pancham_varga_varna_with_n",
                self.all_to_normal_replace_pancham_varga_varna_with_n,
            ),
            (
                "brahmic_to_brahmic:replace_pancham_varga_varna_with_anusvAra",
                self.brahmic_to_brahmic_replace_pancham_varga_varna_with_anusvAra,
            ),
            (
                "all_to_sinhala:use_conjunct_enabling_halant",
                self.all_to_sinhala_use_conjunct_enabling_halant,
            ),
            (
                "all_to_normal:remove_virAma_and_double_virAma",
                self.all_to_normal_remove_virAma_and_double_virAma,
            ),
            (
                "all_to_normal:replace_avagraha_with_a",
                self.all_to_normal_replace_avagraha_with_a,
            ),
            ("normal_to_all:use_typing_chars", self.normal_to_all_use_typing_chars),
            (
                "all_to_normal:preserve_specific_chars",
                self.all_to_normal_preserve_specific_chars,
            ),
        ]
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
