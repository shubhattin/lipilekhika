use alloc::boxed::Box;
use once_cell::race::OnceBox;

use super::CustomOptionMap;
use super::generated;

static CUSTOM_OPTIONS_CACHE: OnceBox<CustomOptionMap> = OnceBox::new();

pub fn get_custom_options_map() -> &'static CustomOptionMap {
    CUSTOM_OPTIONS_CACHE.get_or_init(|| {
        let bytes = generated::CUSTOM_OPTIONS_BYTES;
        let (map, _): (CustomOptionMap, usize) =
            bincode::serde::decode_from_slice(bytes, bincode::config::standard())
                .expect("bincode decode failed for custom_options");
        Box::new(map)
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn all_script_data_json_files_must_parse() {
        let _ = get_custom_options_map();
    }
}
