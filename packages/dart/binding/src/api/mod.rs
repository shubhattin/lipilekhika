pub mod main;
pub mod typing;

use lipilekhika::scripts::Script;
use std::str::FromStr;

pub(crate) fn parse_script(label: &str, name: &str) -> Result<Script, String> {
    Script::from_str(name.trim()).map_err(|e| format!("invalid {label}: {e}"))
}
