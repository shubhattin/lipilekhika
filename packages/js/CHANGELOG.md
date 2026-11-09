# Changelog

## js-lib@1.0.14 (Unreleased)

- Performance improvements for `transliterate_wasm` and `transliterate_node` (N-API) (Rust based)
- Faster pure JS `transliterate` and typing (Rust optimizations ported): ~43% / ~60% faster transliteration on Node / Bun, ~17-26% faster typing
- Typing: standalone mAtrA keys (`.A`, `.LR`, ... and intermediate states like `.L`) no longer attach to the previous vyanjana or emit the raw input: `k.L` -> `क्ळ`, `k.LR` -> `क्ॢ` (`कळ`, `कॢ` with inherent vowel)
- Fix: input side custom rules (eg. `brahmic_to_brahmic:replace_pancham_varga_varna_with_anusvAra`) never applied for non-BMP source scripts (Brahmi, Sharada, Granth, Siddham, Modi)
- Fix: Tamil-Extended superscripts followed by a non-BMP character (eg. an emoji) gave wrong output or dropped a character
- Fix: `transliterate_wasm` / `preloadWasm` never returned under Bun when nothing else kept the process alive (the script exited silently)
- Fix: Tamil-Extended superscripts moved after a following independent vowel: `ghaA` -> `க⁴ஆ` (was `கஆ⁴`) ([#150](https://github.com/shubhattin/lipilekhika/pull/150))
- Fix: halant of a consonant placed after the next character for custom script characters, prefix-only keys and ASCII digits: `kqq` -> `क्q` (was `कq्`), `kc` -> `क्c`, `k0` -> `क्0` (with `useNativeNumerals: false`); typing `k.h` -> `क्` (was `क््`) ([#156](https://github.com/shubhattin/lipilekhika/pull/156))
- Fix: Tamil-Extended Vedic svara + superscript without a mAtrA read back correctly: `க॒²` -> `ख॒` (was `क॒²`); typing a svara after `RR` / `LRR` / `MM` goes before the superscript: `RR'` -> `ரூ॑²` ([#156](https://github.com/shubhattin/lipilekhika/pull/156))
- Fix: Romanized `sh` (not followed by `h`) is `s` + `h`: `sha` -> `स्ह` (was `shअ`); typing into Romanized: `shh`, `chh`, `sh^` at the start of a word (`shhaShTha` -> `ṣaṣṭha`), `aiI` / `auU` -> `aiī` / `auū` (was `aaa`) ([#156](https://github.com/shubhattin/lipilekhika/pull/156))

## js-lib@1.0.13

- now the `transliterate`, `transliterate_wasm` and `transliterate_node` accept `string | string[]` for `text` input
- Reduced wasm size to 244 KB (base64 gzipped: 114 KB, gzipped: 76 KB), as now the `rust-lib` is `no_std` compatible
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
