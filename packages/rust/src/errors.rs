use thiserror::Error;

#[derive(Error, Debug, PartialEq)]
pub enum TransliterationError {
  #[error("Invalid script name: {0}")]
  InvalidScriptName(String),
}
