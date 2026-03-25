use napi::bindgen_prelude::Result;
use napi::Error;
use napi_derive::napi;
use std::collections::HashMap;

#[napi]
pub fn transliterate(
  text: String,
  from: String,
  to: String,
  trans_options: Option<HashMap<String, bool>>,
) -> Result<String> {
  lipilekhika::transliterate(&text, &from, &to, trans_options.as_ref()).map_err(Error::from_reason)
}
