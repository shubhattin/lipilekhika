# Changelog

## js-lib@1.0.13

- now the `transliterate`, `transliterate_wasm` and `transliterate_node` accept `string | string[]` for `text` input
- Reduced wasm size to 244Kb (base64 gzipped :- 114 kb, gzipped :- 76), as now the `rust-lib` is `no_std` compatible
- The performance of the `napi-rs` and `wasm` bindings have improved

## js-lib@1.0.12

- Added `musl` build targets for napi-rs bindings for nodejs
- Added android support via zig corss compile
- Updated to vite v8 (rollup -> rolldown), _this does not affact bundled package_
- Use updated `wasm` and `napi-rs` bindings (`rust-lib@v1.1.0`)

## js-lib@1.0.11

- fix typing in react apps, handle synthetic events properly

## js-lib@1.0.10

- Improve performance of `transliterate_wasm` and `transliterate/node` (N-API) (Rust based)

## js-lib@v1.0.9

- Added a native `lipilekhika/node` binding for transliterate and create_typing_context functions

## js-lib@v1.0.8

- Improved Performance with Map usage (44%, 650ms -> 450ms)

## js-lib@v1.0.7

- Added normal capital letters for Romanized to allow capital letter typing
- Add **Major Performance Improvements** for `transliterate_wasm`

## js-lib@v1.0.6

- Added more typing alternatives for Romanized Capital letter forms like aa^ besides A^

## js-lib@v1.0.5

- Added `context_length` to `takeKeyInput` return value

## js-lib@v1.0.4

- added a new function `getSchwaStatusForScript` to get the schwa deletion characteristic of the script provided.
- added in typing module
  - `getUseNativeNumerals`
  - `getIncludeInherentVowel`
  - `getNormalizedScript`
- Add WASM-based transliteration support

## js-lib@v1.0.3

- _New Mappings_ for Romanized
- ऋ -> ṛ
- ढ़ ड़ -> r̤ha r̤a

## js-lib@v1.0.2

- add `w` as typing time alternative for `v`
- **च** and **छ**
  - Main :- `ch` and `Ch`
  - Duplicates(Typing+Transliteration) :- `C` and `chh`
- Some other fixes

## js-lib@v1.0.1

- 272e6349eebf47f68db34c5dc6ee9d91bb16ae9b
  - Fixed ch (च) typing which is a duplicate of C
  - shh for ष in typing mode
- export `getNormalizedScriptName`
- fixed ज्ञ -> jn with option `all_to_normal:replace_pancham_varga_varna_with_n`
