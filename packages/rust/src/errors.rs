use thiserror::Error;

#[derive(Error, Debug)]
pub enum TransliterationError {
  #[error("Invalid script name: {0}")]
  InvalidScriptName(String),
}
