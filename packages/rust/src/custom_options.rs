#[rustfmt::skip]
use derive_builder::Builder;
/// Enabled/disabled flags for each transliteration custom option key
///
/// Use [`CustomOptionsBuilder::default`] and `<category>_<option>(bool)` setters, or
/// [`CustomOptions::default`] for all options disabled.
///
/// for list of supported options you can visit [Custom Options](https://lipilekhika.in/reference/custom_trans_options/)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Builder)]
#[builder(no_std, default, pattern = "owned", build_fn(name = "try_build"))]
#[allow(non_snake_case)]
pub struct CustomOptions {
    pub all_to_normal_replace_pancham_varga_varna_with_n: bool,
    pub brahmic_to_brahmic_replace_pancham_varga_varna_with_anusvAra: bool,
    pub all_to_sinhala_use_conjunct_enabling_halant: bool,
    pub all_to_normal_remove_virAma_and_double_virAma: bool,
    pub all_to_normal_replace_avagraha_with_a: bool,
    pub normal_to_all_use_typing_chars: bool,
    pub all_to_normal_preserve_specific_chars: bool,
}
impl CustomOptionsBuilder {
    /// Infallible build: every field has a `bool` default via [`Default`].
    #[inline]
    pub fn build(self) -> CustomOptions {
        self.try_build()
            .expect("CustomOptionsBuilder: infallible with `#[builder(default)]`")
    }
}
