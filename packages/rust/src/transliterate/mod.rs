mod context;
mod custom_rules;
pub mod helpers;
mod matcher;
mod options;
mod tamil_ext;
#[allow(clippy::module_inception)]
pub mod transliterate;

pub use transliterate::transliterate_text;
