use super::CustomOptionMap;
use super::data_blob::get_lipi_data;

/// Returns the custom option rules, keyed in `custom_options.json` order.
#[inline]
pub fn get_custom_options_map() -> &'static CustomOptionMap {
    &get_lipi_data().custom_options
}

#[cfg(test)]
mod tests {
    use super::*;
    use alloc::vec::Vec;

    #[test]
    fn custom_option_keys_match_custom_options_struct() {
        let keys: Vec<&str> = get_custom_options_map()
            .keys()
            .map(|k| k.as_str())
            .collect();
        assert_eq!(keys, crate::CustomOptions::KEYS);
    }
}
