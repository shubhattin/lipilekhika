# Changelog

## Unreleased (rust-lib@v1.0.7)

- Use `HashMap` for faster Performance instead of Sorted array + Binary Search lookup

## rust-lib@v1.0.6

- Added normal capital letters for Romanized to allow capital letter typing
- Add **Major Performance Improvements** in rust version

## rust-lib@v1.0.5

- Added more typing alternatives for Romanized Capital letter forms like aa^ besides A^

## rust-lib@v1.0.4

- Added `get_script_krama_data`
- Added `context_length` to `TypingDiff`
- Replaced `HashMap<String, u8>` with `Vec<String>` in `ScriptListData` for `scripts` and `langs`
- Preserve `custom_options.json` order by filtering in that key order in `get_all_options`

## rust-lib@v1.0.3

- added a new function `get_schwa_status_for_script` to get the schwa deletion characteristic of the script provided.
- added
  - `get_use_native_numerals`
  - `get_include_inherent_vowel`
  - `get_normalized_script`

## rust-lib@v1.0.2

- _New Mappings_ for Romanized
- ऋ -> ṛ
- ढ़ ड़ -> r̤ha r̤a
