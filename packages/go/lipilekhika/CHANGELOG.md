# Changelog

## v0.0.4 (Unreleased)

- Core rewritten as a port of the Rust implementation: ~3.5x faster transliteration, ~2.6x faster typing, ~98% fewer allocations
- Fix: output now matches Rust / JS, incl. Tamil-Extended superscripts and Vedic svaras, Romanized combining marks, and `replace_pancham_varga_varna_with_anusvAra` dropping the following consonant
- Fix: custom rules are applied in a fixed order (`custom_options.json` order, like Rust), was random
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
- Fix: Tamil-Extended read back with more than one Vedic svara, or a halant + svara, before the superscript: `க॒॑⁴` -> `घ॒॑` (was `क॒॑⁴`), `க்॒²` -> `ख्॒` (was `क्॒²`), `ரு॒॑²` -> `ऋ॒॑` ([#158](https://github.com/shubhattin/lipilekhika/issues/158))
- Fix: Tamil-Extended `ல்ரு²` / `ல்ரூ²` read back as `लृ` / `लॄ` (was `ल्रु²` / `ल्रू²`), also after a consonant (`க்ல்ரு²` -> `क्लृ`) and with a Vedic svara ([#159](https://github.com/shubhattin/lipilekhika/issues/159))
- Fix: Malayalam chillu letters (`ൿ ൺ ൻ ർ ൽ ൾ`) are dead consonants: Malayalam -> Normal `കൻ` -> `kan` (was `kana`), -> Devanagari `कन्` (was `कन`); typing takes no virama and no vowel sign after them: `.n` -> `ൻ` (was `ൻ്`), `k.n` -> `ക്ൻ` (was `ക്ൻ്`), `.ke` -> `ൿഎ` (was `ൿെ`), so the chillu keys are `.k .N .n .r .l .L` (`.na` is now `ൻഅ`). A virama typed after a chillu is kept: `ൻ്റ` is `.n.hrz` (`.nrz` gives `ൻറ`, `nrz` gives `ന്റ`). The typing data map lists the chillus as `anya` (was `vyanjana`) ([#160](https://github.com/shubhattin/lipilekhika/issues/160))
- Fix: `AutoContextClearTimeMs` 0 clears the typing context after any pause, like Rust / JS (was replaced by the 4500 ms default) ([#171](https://github.com/shubhattin/lipilekhika/pull/171))
- Fix: typing an empty key changes nothing and returns the current `context_length` (was 0), typing a long run of letters without a space takes linear time (each key re-transliterated the whole run: 20k keys took ~30 s, now ~0.1 s) ([#171](https://github.com/shubhattin/lipilekhika/pull/171))
