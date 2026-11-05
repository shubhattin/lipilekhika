# Changelog

## v0.0.4 (Unreleased)

- Core rewritten as a port of the Rust implementation: ~3.5x faster transliteration, ~2.6x faster typing, ~98% fewer allocations
- Fix: output now matches Rust / JS, incl. Tamil-Extended superscripts and Vedic svaras, Romanized combining marks, and `replace_pancham_varga_varna_with_anusvAra` dropping the following consonant
- Fix: custom rules are applied in a fixed order (`custom_options.json` order, like Rust), was random
- Typing: standalone mAtrA keys (`.A`, `.LR`, ... and intermediate states like `.L`) no longer attach to the previous vyanjana or emit the raw input: `k.L` -> `क्ळ`, `k.LR` -> `क्ॢ` (`कळ`, `कॢ` with inherent vowel)
