# Changelog

## rust-lib@1.1.2 (Unreleased)

- The generated script data is now committed (`src/generated/lipi_data.bin`, `src/scripts.rs`, `src/custom_options.rs`): no build script anymore, the crate can be installed directly from GitHub (`tag = "rust-lib@v<version>"`) and is published without `--no-verify --allow-dirty` (#141)
- All script data and custom option rules are embedded as a single bincode blob, the script list is compiled in as constants
- No more `[build-dependencies]` (`serde_json`, `syn`, `quote`, `prettyplease`): code generation moved to the unpublished `lipilekhika-datagen` crate
- Performance Improvements in #140
- Typing: standalone mAtrA keys (`.A`, `.LR`, ... and intermediate states like `.L`) no longer attach to the previous vyanjana or emit the raw input: `k.L` -> `क्ळ`, `k.LR` -> `क्ॢ` (`कळ`, `कॢ` with inherent vowel)
- Fix: Tamil-Extended superscripts moved after a following independent vowel: `ghaA` -> `க⁴ஆ` (was `கஆ⁴`) ([#150](https://github.com/shubhattin/lipilekhika/pull/150))
- Fix: halant of a consonant placed after the next character for custom script characters, prefix-only keys and ASCII digits: `kqq` -> `क्q` (was `कq्`), `kc` -> `क्c`, `k0` -> `क्0` (with `useNativeNumerals: false`); typing `k.h` -> `क्` (was `क््`) ([#156](https://github.com/shubhattin/lipilekhika/pull/156))
- Fix: Tamil-Extended Vedic svara + superscript without a mAtrA read back correctly: `க॒²` -> `ख॒` (was `क॒²`), `க்²ரு॑²` -> `खृ॑` (was `ख्रु॑²`); typing a svara after `RR` / `LRR` / `MM` goes before the superscript: `RR'` -> `ரூ॑²` ([#156](https://github.com/shubhattin/lipilekhika/pull/156))
- Fix: Romanized `sh` (not followed by `h`) is `s` + `h`: `sha` -> `स्ह` (was `shअ`); typing into Romanized: `shh`, `chh`, `sh^` at the start of a word (`shhaShTha` -> `ṣaṣṭha`), `aiI` / `auU` -> `aiī` / `auū` (was `aaa`), `.ai` / `.L` while typed -> `ai` / `ḷ` (was `aaa` / `aḷ`) ([#156](https://github.com/shubhattin/lipilekhika/pull/156))
- Fix: Gurumukhi `ੜ੍` (prefix of `ੜ੍ਹ`) no longer gets an inherent vowel going to Normal / Romanized: `ੜ੍ਕ` -> `r̤ka` (was `r̤aka`) ([#154](https://github.com/shubhattin/lipilekhika/issues/154))
- Fix: Sharada A1 / u1 / U1 mAtrAs (`𑇋𑆳` `𑇋𑆶` `𑇋𑆷`) are read back as A1 / u1 / U1: Sharada `𑆑𑇋𑆳` -> Purna-Devanagari `कऻ` (was `का`), Brahmi `𑀓𑀹`. Scripts without a distinct form are unchanged (`का`) ([#154](https://github.com/shubhattin/lipilekhika/issues/154))
- Fix: alternate keys fall back to the plain key where a script has no own form: Gujarati writes `D1` (ॾ) as `ડ` (was `ડ઼`, which reads back as `ड़`) ([#154](https://github.com/shubhattin/lipilekhika/issues/154))
- Fix: Sinhala `ඥ` is `ज्ञ` (was `ञ्ज`) and `ඟ` (ṅga) is mapped to `ङ्ग` (was passed through) ([#154](https://github.com/shubhattin/lipilekhika/issues/154))
- Fix: Sinhala conjunct with al-lakuna + ZWJ (`ක්‍ෂ`) keeps its halant going to Normal / Romanized: `kSha` (was `kaSha`) ([#161](https://github.com/shubhattin/lipilekhika/issues/161))
- Typing: Brahmi `.A1` (Bhattiprolu AA) after a vyanjana: `k.A1` -> `𑀓𑁆𑀹` (was `𑀓𑁆𑀸𑁧`) ([#154](https://github.com/shubhattin/lipilekhika/issues/154))
- Fix: Brahmi Bhattiprolu AA (`𑀹`) after a consonant is read as a mAtrA going to Normal / Romanized: `𑀓𑀹` -> `kA` (was `kaA`) ([#154](https://github.com/shubhattin/lipilekhika/issues/154))
- Typing: `.a1` types the a1 mAtrA: Purna-Devanagari `k.a1` -> `क्ऺ`, Sharada `k.a1` -> `𑆑𑇀𑇋` (was `क्१`, `𑆑𑇀𑇑`). Scripts without an a1 mAtrA type it as `.a` ([#163](https://github.com/shubhattin/lipilekhika/issues/163))
- Fix: Sinhala touching letters (ZWJ + al-lakuna, `ක‍්ව`) are read as a halant: `ක‍්ව` -> `kva` / `क्व` (was `ka‍va` / `क‍्व`, with an inherent vowel and the ZWJ copied) ([#164](https://github.com/shubhattin/lipilekhika/issues/164))
- Typing data map (`getScriptTypingDataMap` / `get_script_typing_data_map`): keys whose character a script lacks (empty text) are no longer listed, eg. `.a1` in Devanagari and `.h` in Romanized ([#163](https://github.com/shubhattin/lipilekhika/issues/163))
- Fix: Tamil-Extended read back with more than one Vedic svara, or a halant + svara, before the superscript: `க॒॑⁴` -> `घ॒॑` (was `क॒॑⁴`), `க்॒²` -> `ख्॒` (was `क्॒²`), `ரு॒॑²` -> `ऋ॒॑` ([#158](https://github.com/shubhattin/lipilekhika/issues/158))
- Fix: Tamil-Extended `ல்ரு²` / `ல்ரூ²` read back as `लृ` / `लॄ` (was `ल्रु²` / `ल्रू²`), also after a consonant (`க்ல்ரு²` -> `क्लृ`) and with a Vedic svara ([#159](https://github.com/shubhattin/lipilekhika/issues/159))
- Fix: Malayalam chillu letters (`ൿ ൺ ൻ ർ ൽ ൾ`) are dead consonants: Malayalam -> Normal `കൻ` -> `kan` (was `kana`), -> Devanagari `कन्` (was `कन`); typing takes no virama and no vowel sign after them: `.n` -> `ൻ` (was `ൻ്`), `k.n` -> `ക്ൻ` (was `ക്ൻ്`), `.ke` -> `ൿഎ` (was `ൿെ`), so the chillu keys are `.k .N .n .r .l .L` (`.na` is now `ൻഅ`). A virama typed after a chillu is kept: `ൻ്റ` is `.n.hrz` (`.nrz` gives `ൻറ`, `nrz` gives `ന്റ`). The typing data map lists the chillus as `anya` (was `vyanjana`) ([#160](https://github.com/shubhattin/lipilekhika/issues/160))

## rust-lib@v1.1.2

- Add `no_std` support
- Now the `typing` module has `std` feature which can be enabled to have automatic context clear logic.
- Now 9x faster over the JS version (previosuly 7x, ~63ms -> ~51ms)
- The wasm build is also smaller (as no `std` bloat)
- **Major Change** :- Now Custom Options are accepted via a struct (CustomOptions) instead of of a HashMap.

## rust-lib@1.1.0

- Performance improvements (60%)
- Instroduces a major **Breaking Change**
- `get_normalised_script` function removed.

### Script enums

- The input script/language/alias are now a enum
- This also means that now we dont return the `Result` as the only error that was there was about script parsing.

## rust-lib@1.0.8

- Performance improvements in transliteration and typing emulation

## rust-lib@v1.0.7

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
