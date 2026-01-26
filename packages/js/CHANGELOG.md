# Changelog

## Unreleased (js-lib@v1.0.5)

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
