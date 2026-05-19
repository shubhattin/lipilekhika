use thiserror::Error;

#[derive(Error, Debug, Clone, PartialEq)]
#[non_exhaustive]
pub enum TransliterationError {
  #[error("Invalid script name: {0}")]
  InvalidScriptName(String),
}
