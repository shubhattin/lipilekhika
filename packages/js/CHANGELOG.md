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
- Fix: typing a key outside the BMP (eg. an emoji) keeps the whole character, not only its high surrogate: `k😀` -> `क्😀` (was `क्\ud83d`) ([#155](https://github.com/shubhattin/lipilekhika/issues/155))
- Fix: `to_delete_chars_count` of the N-API typing context (`lipilekhika/node`) is in UTF-16 code units like the JS one (was code points), typing into Brahmi, Granth, Modi, Sharada, Siddham no longer corrupts the text: `ki` -> `𑀓𑀺` (was `𑀓\ud804𑀺`). The JS typing diff no longer splits a surrogate pair in `diff_add_text` ([#155](https://github.com/shubhattin/lipilekhika/issues/155))
- Fix: Object prototype keys (`constructor`, `__proto__`, `toString`, ...) are not accepted as script names: `getNormalizedScriptName('constructor')` -> `null`, `transliterate` throws `Invalid script name` ([#155](https://github.com/shubhattin/lipilekhika/issues/155))
- Fix: Tamil-Extended read back with more than one Vedic svara, or a halant + svara, before the superscript: `க॒॑⁴` -> `घ॒॑` (was `क॒॑⁴`), `க்॒²` -> `ख्॒` (was `क्॒²`), `ரு॒॑²` -> `ऋ॒॑` ([#158](https://github.com/shubhattin/lipilekhika/issues/158))
- Fix: Tamil-Extended `ல்ரு²` / `ல்ரூ²` read back as `लृ` / `लॄ` (was `ल्रु²` / `ल्रू²`), also after a consonant (`க்ல்ரு²` -> `क्लृ`) and with a Vedic svara ([#159](https://github.com/shubhattin/lipilekhika/issues/159))
- Fix: Malayalam chillu letters (`ൿ ൺ ൻ ർ ൽ ൾ`) are dead consonants: Malayalam -> Normal `കൻ` -> `kan` (was `kana`), -> Devanagari `कन्` (was `कन`); typing takes no virama and no vowel sign after them: `.n` -> `ൻ` (was `ൻ്`), `k.n` -> `ക്ൻ` (was `ക്ൻ്`), `.ke` -> `ൿഎ` (was `ൿെ`), so the chillu keys are `.k .N .n .r .l .L` (`.na` is now `ൻഅ`). A virama typed after a chillu is kept: `ൻ്റ` is `.n.hrz` (`.nrz` gives `ൻറ`, `nrz` gives `ന്റ`). The typing data map lists the chillus as `anya` (was `vyanjana`) ([#160](https://github.com/shubhattin/lipilekhika/issues/160))

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
