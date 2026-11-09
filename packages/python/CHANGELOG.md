# Changelog

## python-lib@1.0.8 (Unreleased)

- Performance Improvements (via rust-lib@@1.1.2)
- Typing: standalone mAtrA keys (`.A`, `.LR`, ... and intermediate states like `.L`) no longer attach to the previous vyanjana or emit the raw input: `k.L` -> `क्ळ`, `k.LR` -> `क्ॢ` (`कळ`, `कॢ` with inherent vowel)
- Fix: Tamil-Extended superscripts moved after a following independent vowel: `ghaA` -> `க⁴ஆ` (was `கஆ⁴`) ([#150](https://github.com/shubhattin/lipilekhika/pull/150))
- Fix: halant of a consonant placed after the next character for custom script characters, prefix-only keys and ASCII digits: `kqq` -> `क्q` (was `कq्`), `kc` -> `क्c`, `k0` -> `क्0` (with `useNativeNumerals: false`); typing `k.h` -> `क्` (was `क््`) ([#156](https://github.com/shubhattin/lipilekhika/pull/156))
- Fix: Tamil-Extended Vedic svara + superscript without a mAtrA read back correctly: `க॒²` -> `ख॒` (was `क॒²`); typing a svara after `RR` / `LRR` / `MM` goes before the superscript: `RR'` -> `ரூ॑²` ([#156](https://github.com/shubhattin/lipilekhika/pull/156))
- Fix: Romanized `sh` (not followed by `h`) is `s` + `h`: `sha` -> `स्ह` (was `shअ`); typing into Romanized: `shh`, `chh`, `sh^` at the start of a word (`shhaShTha` -> `ṣaṣṭha`), `aiI` / `auU` -> `aiī` / `auū` (was `aaa`) ([#156](https://github.com/shubhattin/lipilekhika/pull/156))

## python-lib@1.0.7

- Performance Improvements (via rust-lib@@1.1.2)

## python-lib@1.0.6

- Add android build target (via zig cross compiler and linker)
- Use updated rust lib version `rust-lib@v1.1.0` (also faster)

## python-lib@1.0.5

- Add performace improvements for transliteration and typing emulation (rust based)

## python-lib@v1.0.4

- Use faster Rust backend for even faster performance due to `HashMap`

## python-lib@v1.0.3

- Added normal capital letters for Romanized to allow capital letter typing

## python-lib@v1.0.2

- Added more typing alternatives for Romanized Capital letter forms like aa^ besides A^

## python-lib@v1.0.1

- Added `get_script_krama_data`
- Added `context_length` to `take_key_input` return value
