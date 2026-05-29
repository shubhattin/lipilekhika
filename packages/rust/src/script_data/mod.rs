mod custom_options;
mod generated;
mod schema;
#[allow(clippy::module_inception)]
mod script_data;
mod script_list;

use std::collections::HashMap;

pub use custom_options::*;
pub use schema::*;
pub use script_list::*;

use crate::scripts::Script;

/// Returns the list of all supported custom options for
/// transliterations for the provided script pair.
pub fn get_all_options(from_script: Script, to_script: Script) -> Vec<String> {
    let from_script_data = ScriptData::get_script_data(&from_script.into());
    let to_script_data = ScriptData::get_script_data(&to_script.into());

    // Create a HashMap with all custom options set to true.
    // `custom_options_map` is insertion-ordered (same as `custom_options.json`),
    // but `HashMap` is not. We only use this for lookup below.
    let custom_options_map = get_custom_options_map();
    let all_options_enabled: HashMap<String, bool> = custom_options_map
        .keys()
        .map(|key| (key.clone(), true))
        .collect();

    let active_options = crate::transliterate::transliterate::get_active_custom_options(
        from_script_data,
        to_script_data,
        Some(&all_options_enabled),
    );

    // Preserve `custom_options.json` order by filtering in that key order.
    let mut ordered: Vec<String> = Vec::new();
    for key in custom_options_map.keys() {
        if active_options.contains_key(key) {
            ordered.push(key.clone());
        }
    }

    ordered
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::scripts::Script;
    use std::str::FromStr;

    #[test]
    fn test_get_all_option_valid_scripts() {
        let _ = get_all_options(Script::Devanagari, Script::Telugu);
    }

    #[test]
    fn test_get_all_option_normalized_names() {
        let from = Script::from_str("dev").unwrap().into();
        let to = Script::from_str("tel").unwrap().into();
        let _ = get_all_options(from, to);
    }
}
