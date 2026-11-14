# Changelog

## Unreleased

- The Compare tab of the typing help shows the other spellings of the compared script under each letter (_Alternates_ checkbox), mostly useful for ITRANS: `R^i` for `RRi`, `aa` for `A`, `chh` for `Ch`, `x` for `kSh`, and a few for IAST and Romanized (`r̥` for `ṛ`)

## pc-app@v1.1.0

- **New app, written with GPUI** ([GPUI Kit](https://gpui-kit.com)) in place of iced, with a light and a dark theme (or the system's)
- **Lipi Parivartaka is now part of the app** (a window of it, no more Tauri/JS): realtime typing, presets and options, swap, open and save `.txt` (also by dropping a file on the box), undo/redo, copy, and the text is kept between runs (_Remember text_ in the settings popover turns this off and removes the kept copy). Its start menu entry opens it on its own (`lipilekhika.exe --parivartaka`)
- New typing help, the same as the web app's: the typing map and the comparison of scripts, by section, with the alternate keys
- Searchable script picker, by Modern, Latin and Ancient scripts
- The app runs on Linux too (without the system wide typing, which is the Fcitx5 plugin there)
- **Lipi Parivartaka for Linux and macOS**, on its own (without the typing tool): a `.tar.gz` for Linux (x86_64, with `install.sh` for the app menu) and an app for macOS 12+ (Apple silicon and Intel in one). macOS asks to allow it on its first start (it is not notarized)
- **Portable Windows app**: a zip next to the installer. Unzip and run, nothing is installed: the settings stay in its folder, the fonts for Brahmi, Grantha, Modi, Sharada and Siddham work in all apps while it runs, and `Lipi Parivartaka.exe` opens Lipi Parivartaka

- Performance improvements (rust-lib@v1.1.2)
- New standard romanization schemes IAST, ITRANS, Harvard-Kyoto and SLP1, listed after Romanized

## pc-app@v1.0.11

- Use updated rust package `v1.1.0`. It introduces changes in Error and Script name handling
- Also 60-70% faster

## pc-app@v1.0.10

- Performance Imrpovements

## pc-app@v1.0.9

- Performance improvements

## pc-app@v1.0.8

- Add **Major Performance Improvements** for `transliterate`

## pc-app@v1.0.7

- Added normal capital letters for Romanized to allow capital letter typing

## pc-app@v1.0.6

- Use update `lipilekhika` package (rust-lib@v1.0.5)
  - Added more typing alternatives for Romanized Capital letter forms like aa^ besides A^

## pc-app@v1.0.5

- Add script options persistent storage in lipiparivartak
- Add preset option selector in lipiparivartaka

## pc-app@v1.0.4

- Improvements to the Lipi Parivartak
