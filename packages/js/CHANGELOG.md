# Changelog

## js-lib@1.0.14 (Unreleased)

- New custom transliteration options `normal_to_brahmic:include_inherent_vowel` (`kamal` -> `कमल`, default `कमल्`) and `normal_to_brahmic:keep_ascii_numerals` (`2025` stays `2025`, default `२०२५`), from Normal / Romanized to Brahmic scripts: the `includeInherentVowel` and `useNativeNumerals: false` typing options, now for transliteration too
- `transliterate_wasm` on Cloudflare Workers and Vercel Edge: new `lipilekhika/wasm` entry (same API), which imports the `.wasm` file as a module on those runtimes (`workerd` / `edge-light` export conditions), fetches it as a separate file in browsers (falling back to the embedded module if it can not be loaded) and is the embedded module in Node.js, Bun and Deno. `lipilekhika/wasm/slim` (`initWasm`) takes the `.wasm` file from you, shipped as `lipilekhika/lipilekhika.wasm`. `transliterate_wasm` from `lipilekhika` is unchanged and stays the recommended one; where it can not load it now says to use `lipilekhika/wasm`
- Fix: `transliterate_wasm` from `lipilekhika` failed with `Invalid URL` under CommonJS (`require('lipilekhika')`), where there is no `import.meta.url` to resolve its embedded module against. The embedded module is now decoded from base64 directly, no `fetch` of a `data:` URL (works in test environments without `fetch` and with a Content Security Policy that blocks `data:`)
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
- Fix: browser typing helpers start a new context when the caret or text changed between keys (click, undo, Ctrl+Backspace, app-side edits, typing while disabled), so the next key no longer deletes or merges the wrong text; single-character paste / drop / autocorrect are not transliterated; keys typed before the script data is loaded apply in order (Telugu `kama` -> `కమ`, was `మ్క్`); Ctrl/Alt/Meta + navigation or deletion keys clear the context ([#170](https://github.com/shubhattin/lipilekhika/pull/170))
- Fix: browser typing helpers (`handleTypingBeforeInputEvent`): typing over a selection replaces it with the transliterated key (select `hello` in `hello world`, type `ka` -> `क world`, was `kअ world`); `maxlength` is respected, a key whose transliteration would make the text longer than it is dropped like the browser does (was exceeded: `नमस्ते` in a `maxlength=3` input); `<input type="email">` / `type="number"`, which have no selection API, are left to the browser (every key was swallowed). `handleTypingInputEvent` also respects `maxlength` and leaves those inputs alone ([#184](https://github.com/shubhattin/lipilekhika/issues/184))
- Fix: browser typing (`handleTypingBeforeInputEvent`): keys typed before the script data is loaded no longer land at the wrong place when the caret is moved meanwhile (type `ka` at the end of `XY`, click at the start, type `ga`: `गXYक`, was `कगXY`), and a Backspace meanwhile no longer deletes other text (`XYkam` + Backspace: `XYka`, was `Xकम्`). These keys are now inserted by the browser where they are typed and transliterated once the data is there, or left as typed if the text was changed in some other way ([#189](https://github.com/shubhattin/lipilekhika/issues/189))
- Fix: `autoContextClearTimeMs` (the documented name) is used by `createTypingContext`, the code read `autoContextTClearTimeMs` which still works but is deprecated; the N-API typing context (`lipilekhika/node`) now clears itself after the idle time too ([#171](https://github.com/shubhattin/lipilekhika/pull/171))
- Fix: typing an empty key changes nothing and returns the current `context_length` (was 0), typing a long run of letters without a space takes linear time (each key re-transliterated the whole run: 20k keys took ~30 s, now ~0.1 s) ([#171](https://github.com/shubhattin/lipilekhika/pull/171))
- Fix: native characters that were wrong or not read: Sinhala candrabindu is `ඁ` (was the Gujarati `ઁ`), the Granth / Modi abbreviation signs were swapped (Granth `॰`, Modi `𑙃`); now read: Bengali / Assamese khanda ta `ৎ` (`উৎসব` -> `उत्सब`), Bengali ZWJ + hasanta (`র‍্যাব` -> `ryAba`), Malayalam dot reph `ൎ`, old style chillus (virama + ZWJ, `അവന്‍` -> `avan`) and `ൔ ൕ ൖ`, Sinhala `ඦ` (`ञ्ज`), Gurumukhi `ਲ਼` (U+0A33), Devanagari `ॲ`, Telugu / Kannada nakaara pollu `ౝ ೝ`; Brahmi writes its own dandas `𑁇 𑁈` (was `।` `॥`, still read); text written by earlier versions with the old Sinhala / Granth characters is still read ([#172](https://github.com/shubhattin/lipilekhika/pull/172))
- Fix: decomposed (NFD / NFC) text is read like the precomposed characters: two-part vowel signs as their parts (Malayalam `കൊ` as ക + െ + ാ -> `को`, was `केा`; also Odia, Telugu, Sinhala, Tamil `ஔ`, Siddham), Gurumukhi `ਸ਼` as ਸ + ਼ (`शाम`, was `स़ाम`), Romanized letters with combining marks (`a` + U+0304 -> `आ`); Romanized reads IAST `ṃ` and `ḹ`: `saṃskṛtam` -> `संस्कृतम्` ([#173](https://github.com/shubhattin/lipilekhika/pull/173))
- Fix: Tamil `ம்` is the anusvAra only after a consonant, vowel or vowel sign, elsewhere (start of a word, after a halant, digit or sign) `म्`: `ஸாத்ம்ய` -> `सात्म्य` (was `सात्ंय`); Tamil-Extended `ல்ல்ரி²` -> `लॢ` (was `ल्ऌ`); Sinhala touching letters with `all_to_normal:preserve_specific_chars`: `ක‍්ව` -> `kva` (was `ka.qva`); output options apply inside one match: Romanized `sha` -> `ස්‍හ` with `all_to_sinhala:use_conjunct_enabling_halant` (was `ස්හ`), Sinhala `ඟ ඦ` -> `nga nja` with `all_to_normal:replace_pancham_varga_varna_with_n` (was `Gga Jja`) ([#173](https://github.com/shubhattin/lipilekhika/pull/173))
- Typing: `yz` types य़ / য় and य़ is `yz` in Normal / Romanized (was `y`, read back as य / য: `সময়` -> `samayza`); `aiI` / `auU` type ऍ ऑ (Devanagari, Purna-Devanagari, Gujarati, Sinhala); `.ai` / `.au` type ै ौ (input was dropped); `x` is a key of its own: `#x` -> `#क्ष्` (was `꣬ष्`) ([#174](https://github.com/shubhattin/lipilekhika/pull/174))
- Unknown option keys and non-boolean values throw in `transliterate` / `transliterate_wasm` / `transliterate_node` (were ignored by `transliterate`, `'false'` turned an option on), an `undefined` value is not set; `getAllOptions` is empty for a same-script pair (`Hindi` -> `Sanskrit`); `getSchwaStatusForScript` accepts language names; `transliterate_wasm` takes array items that split a surrogate pair; the typing data map lists the keys read from the Normal krama (`m` म, `sh` श, `0` ०) and has no empty `q` item ([#174](https://github.com/shubhattin/lipilekhika/pull/174))
- Fix: the `brahmic_to_brahmic:replace_pancham_varga_varna_with_anusvAra` option works on the letters read, not on single input characters: Tamil-Extended `ந்ரு²த்ய` stays `नृत्य` (was `ंत्य`, the ृ written `்ரு²` starts with the halant character), and a nasal + halant + vyanjana written as one letter (Sinhala `ඟ` `ඳ`) or with the ZWJ before the al-lakuna (`ඞ‍්ග`) is replaced like the spelled out one: `ඳ` -> `ंद` (was `न्द`); `all_to_sinhala:use_conjunct_enabling_halant` adds no ZWJ next to a ZWJ / ZWNJ already in the text (`क्‍ष` -> `ක්‍ෂ`, was a double ZWJ) ([#181](https://github.com/shubhattin/lipilekhika/issues/181))
- Fix: typing a long run of consonants with `includeInherentVowel` takes linear time (each key re-transliterated the whole run: 16k keys took ~20 s in JS) ([#181](https://github.com/shubhattin/lipilekhika/issues/181))
- Fix: decomposed (NFD) Romanized is read like the precomposed letters also where the base of a letter could continue the letter before it: `kaī` (`i` + U+0304) -> `कई` (was `कै` + a stray U+0304), `kḥ` (`h` + U+0323) -> `क्ः` (was `ख्` + U+0323); a ZWJ / ZWNJ is not written in Normal / Romanized and does not end the syllable: `क्‍ष`, `क‍्ष`, `र‍्य` -> `kSha`, `kSha`, `rya` (were `k‍Sha`, `ka‍Sha`, `ra‍ya`), in every script (only Bengali `র‍্য` was read) ([#182](https://github.com/shubhattin/lipilekhika/issues/182))
- Fix: characters that were not read: Gurumukhi tippi `ੰ` is the anusvAra (`ਪੰਜਾਬੀ` -> `पंजाबी` / `paMjAbI`, was `पੰजाबी`) and addak `ੱ` doubles the vyanjana after it (`ਪੱਤਰ` -> `पत्तर`, `ਮੱਖਣ` -> `मक्खण`, was `पੱतर`), Tamil `ஂ` is the anusvAra (`அஂ` -> `अं`), the Telugu nukta `఼` (`క఼` -> `क़`), the historic Telugu tsa / dza `ౘ` `ౙ` as `చ` `జ` and Malayalam TTTA `ഺ` (alveolar ṯa) as `ത`. All are only read: the anusvAra is written as bindi `ਂ` / `ம்`, a doubled vyanjana with the halant, a Telugu vyanjana with the nukta as the plain one ([#183](https://github.com/shubhattin/lipilekhika/issues/183))
- Fix: `require('lipilekhika/node')` (CommonJS) threw `ERR_INVALID_ARG_VALUE` as it was loaded: the CommonJS build has no `import.meta.url` for `createRequire`, it now uses `__filename` there, and the module path is resolved on first use ([#180](https://github.com/shubhattin/lipilekhika/issues/180))
- CommonJS types (`.d.cts`) for every `require` condition: a CommonJS file importing `lipilekhika` or `lipilekhika/typing` got TS1479 with `module: node16`; types for `import wasmModule from 'lipilekhika/lipilekhika.wasm'`; `dist/tsdoc-metadata.json` is no longer in the package ([#180](https://github.com/shubhattin/lipilekhika/issues/180))
- The package is checked as a user installs it before it is published: the packed tarball loads every entry with `import` and `require` under Node and Bun (pure JS, WASM, N-API) and type-checks (`nodenext`, `node16`, `bundler`), on Linux, macOS and Windows (x64 and arm64) in the release workflow, which publishes that same tarball (`bun run test:package`) ([#180](https://github.com/shubhattin/lipilekhika/issues/180))
- `transliterate`, `transliterate_wasm` and `transliterate_node` check their arguments alike: `text` that is not a string or an array of strings throws a `TypeError` (was `[""]` in JS, a WASM `memory access out of bounds` error or a conversion error), `trans_options` that is not an object or has a value that is not a boolean throws a `TypeError`, a script name that is not a string (eg. a `Symbol`) is an `Invalid script name` (`getNormalizedScriptName` gives `null`); a lone surrogate is read as U+FFFD in pure JS too, like WASM and N-API (`'ka\ud800'` -> `क�`), also as a typed key ([#185](https://github.com/shubhattin/lipilekhika/issues/185))
- Typing context options (pure JS and `lipilekhika/node` alike): `options` that is not an object throws a `TypeError`; `autoContextClearTimeMs` that is negative or `NaN` throws a `RangeError` (pure JS cleared before every key, N-API after any pause), one that is not a number a `TypeError`; `useNativeNumerals` / `includeInherentVowel` that are not a boolean (or `undefined`) throw a `TypeError`; `updateUseNativeNumerals` / `updateIncludeInherentVowel` throw a `TypeError` for a value that is not a boolean (`undefined` reset the option to its default); the idle time is measured with the monotonic `performance.now()` (`Date.now()` where there is no `performance`) in whole milliseconds, like the Rust context ([#185](https://github.com/shubhattin/lipilekhika/issues/185))
- `initWasm` (`lipilekhika/wasm/slim`) takes a `DataView` and rejects a missing source (`null`, `undefined`) with a `TypeError`; an N-API typing context without a native binary for the platform no longer ends the process with an unhandled rejection, its `ready` rejects and `takeKeyInput` throws the load error ([#185](https://github.com/shubhattin/lipilekhika/issues/185))
- Normal: the candra vowels ऍ ऑ (and their mAtrAs ॅ ॉ) are `aiI` / `auU`, the typing keys (were `ai` / `au`, the same as ऐ औ): `हॉटल` -> `hauUTala` -> `हॉटल` (was `hauTala` -> `हौटल`). Sinhala ඇ ඈ are the same vowels, `ඇයි` -> `aiIyi` (was `aiyi`, which reads back as `ඓයි`). In a script without them Normal `aiI` is ai (ঐ, was ঐঈ), typing too; typing `kaiI` into Romanized shows `kê` (was `kaiī`) ([#186](https://github.com/shubhattin/lipilekhika/issues/186))
- Odia `ଯ` is read as the plain ya: `ଯାତ୍ରା` -> `यात्रा` / `yAtrA` (was `य़ात्रा` / `yzAtrA`). Written as before: `य` -> `ୟ`, `य़` -> `ଯ` ([#186](https://github.com/shubhattin/lipilekhika/issues/186))
- Typing data map (`getScriptTypingDataMap`): lists every key, also the ones that type several characters: `x` -> `क्ष` ([#186](https://github.com/shubhattin/lipilekhika/issues/186))

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
