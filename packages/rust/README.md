# Lipi Lekhika — Rust

> A high-performance transliteration library for Indian Brahmic scripts

[![crates.io](https://img.shields.io/crates/v/lipilekhika.svg)](https://crates.io/crates/lipilekhika)
[![crates.io](https://img.shields.io/crates/d/lipilekhika.svg)](https://crates.io/crates/lipilekhika)
[![Tests](https://github.com/shubhattin/lipilekhika/actions/workflows/rust_ci.yml/badge.svg)](https://github.com/shubhattin/lipilekhika/actions/workflows/rust_ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

🌐 **[Website](https://lipilekhika.in)** • 📖 **[Documentation](https://lipilekhika.in/getting-started/rust)** • 🦀 **[Crates.io](https://crates.io/crates/lipilekhika)** • 📝 **[Changelog](./CHANGELOG.md)**

---

## ✨ Features

- 🔄 **Bidirectional Transliteration** — Convert between 15+ Indian Brahmic scripts
- ⚡ **High Performance** — Zero-overhead abstractions and optimized algorithms
- 🛡️ **Type Safe** — Leverages Rust's type system for safety and correctness
- 🎯 **Customizable Options** — Fine-tune transliteration and typing behaviour
- ⌨️ **Typing Mode** — Stateful context for real-time character-by-character input (enable `std` for timed auto-clear between keys)
- 🧱 **no_std** — Default build needs no standard library; embeddable on WASM and similar targets
- 📦 **Embedded Script Data** — All script data bundled at compile time

## ⚡ Performance

The fastest Lipi Lekhika implementation—about **9× faster** than pure JavaScript on the shared benchmark suite. [See the full benchmark table →](https://github.com/shubhattin/lipilekhika#-performance)

## 📥 Installation

```bash
cargo add lipilekhika
```

## 🚀 Quick Start

### Basic Transliteration

```rust
use lipilekhika::{transliterate, Script};

fn main() {
    let result = transliterate(
        "namaskAraH",
        Script::Normal,
        Script::Devanagari,
        None
    );
    
    println!("{}", result); // नमस्कारः
}
```

### With Custom Options

Pass a [`CustomOptions`](https://docs.rs/lipilekhika/latest/lipilekhika/struct.CustomOptions.html) value as the fourth argument. The recommended way to build one is with [`CustomOptionsBuilder`](https://docs.rs/lipilekhika/latest/lipilekhika/struct.CustomOptionsBuilder.html):

```rust
use lipilekhika::{transliterate, CustomOptionsBuilder, Script};

fn main() {
    let options = CustomOptionsBuilder::default()
        .brahmic_to_brahmic_replace_pancham_varga_varna_with_anusvAra(true)
        .build();

    let result = transliterate(
        "गङ्गा",
        Script::Devanagari,
        Script::Gujarati,
        Some(&options),
    );

    println!("{}", result); // ગંગા (instead of ગઙ્ગા)
}
```

## 📚 API

### Core Functions

#### `Script` Enum

All script/language parameters use the `Script` enum instead of strings. You can use full names or shorthand aliases:

```rust
use lipilekhika::Script;

// Full names
Script::Devanagari
Script::Telugu
Script::Normal

// Language names
Script::Hindi      // resolves to Devanagari
Script::Sanskrit   // resolves to Devanagari
Script::English    // resolves to Normal

// Shorthand aliases
Script::Dev        // Devanagari
Script::Tel        // Telugu
Script::Tam        // Tamil
```

Convert to string with `to_string()`. Parse from string with `FromStr`:

```rust
use std::str::FromStr;
use lipilekhika::Script;

let s = Script::Devanagari.to_string(); // "Devanagari"
let parsed = Script::from_str("dev").unwrap(); // Script::Dev
```

Get the normalized/resolved script using `.into()`:

```rust
use lipilekhika::{Script, ScriptListEnum};

let resolved: ScriptListEnum = Script::Hindi.into();    // ScriptListEnum::Devanagari
let resolved: ScriptListEnum = Script::Dev.into();      // ScriptListEnum::Devanagari
let resolved: ScriptListEnum = Script::English.into();  // ScriptListEnum::Normal
```

#### `transliterate`

```rust
pub fn transliterate<'a>(
    text: &'a (impl AsRef<str> + ?Sized),
    from: Script,
    to: Script,
    trans_options: Option<&CustomOptions>,
) -> Cow<'a, str>
```

Transliterates text from one script to another.

**Parameters:**
- `text` — Text to transliterate
- `from` — Source script (`Script` enum)
- `to` — Target script (`Script` enum)
- `trans_options` — Optional [`CustomOptions`] (use [`CustomOptionsBuilder`] to construct)

**Returns:** `Cow<'a, str>` — Transliterated text (borrows input when `from == to`)

#### `get_all_options`

```rust
pub fn get_all_options(
    from_script: Script,
    to_script: Script,
) -> Vec<String>
```

Gets all available custom options for a script pair.

**Parameters:**
- `from_script` — Source script
- `to_script` — Target script

**Returns:** `Vec<String>` — List of option keys

#### `get_script_typing_data_map`

```rust
pub fn get_script_typing_data_map(
    typing_script: Script,
) -> ScriptTypingDataMap
```

Gets typing data mappings for a script (for building custom input methods).

**Parameters:**
- `typing_script` — Script (`Script` enum)

**Returns:** `ScriptTypingDataMap` — Typing data

### Typing Module

For character-by-character real-time input. **Without** the `std` feature, call `clear_context()` yourself when the user pauses or switches fields. **With** `std`, gaps longer than `auto_context_clear_time_ms` (default 4.5s) clear the context automatically in `take_key_input_char`.

Enable in `Cargo.toml`:

```toml
lipilekhika = { version = "1.1", features = ["std"] }
```

Example:

```rust
use lipilekhika::Script;
use lipilekhika::typing::{TypingContext, TypingContextOptions};

fn main() {
    let mut ctx = TypingContext::new(Script::Devanagari, None);
    
    // Process character-by-character input
    let diff = ctx.take_key_input("n");
    println!("Delete: {}, Add: '{}'", diff.to_delete_chars_count, diff.diff_add_text);
    
    let diff = ctx.take_key_input("a");
    println!("Delete: {}, Add: '{}'", diff.to_delete_chars_count, diff.diff_add_text);
    
    // Clear context when needed
    ctx.clear_context();
}
```

#### Types

- **`TypingContext`** — Stateful context for typing mode
  - `new(typing_script: Script, options: Option<TypingContextOptions>)` — Create new context
  - `take_key_input(&mut self, key: &str)` — Process single character input
  - `clear_context(&mut self)` — Clear internal state

- **`TypingContextOptions`** — Configuration for typing behavior
  - `auto_context_clear_time_ms: u64` — Auto-clear timeout (default: 4500ms)
  - `use_native_numerals: bool` — Use script-native numerals (default: true)
  - `include_inherent_vowel: bool` — Include inherent vowel/schwa (default: false)

- **`TypingDiff`** — Result of processing a key input
  - `to_delete_chars_count: usize` — Characters to delete from current state
  - `diff_add_text: String` — Text to insert

- **`ScriptTypingDataMap`** — Typing data for a script (from `get_script_typing_data_map`)
  - `common_krama_map: Vec<TypingDataMapItem>` — Common character mappings
  - `script_specific_krama_map: Vec<TypingDataMapItem>` — Script-specific mappings

- **`ListType`** — Character type enum: `Anya`, `Vyanjana`, `Matra`, `Svara`

- **`TypingDataMapItem`** — Type alias for `(String, ListType, Vec<String>)`

## 🎯 Supported Scripts

Devanagari, Bengali, Tamil, Telugu, Kannada, Malayalam, Gujarati, Odia, Gurmukhi, Sinhala, Tamil-Extended, Myanmar, Tibetan, Limbu, and more.

📖 Full list: [lipilekhika.in/reference/supported_scripts](https://lipilekhika.in/reference/supported_scripts)

## 🔧 Custom Options

Build a [`CustomOptions`] with [`CustomOptionsBuilder::default`] and `<category>_<option>(bool)` setters (replace `:` in option keys with `_`). For map-based sources, use [`CustomOptions::try_from_map`] to parse and [`CustomOptions::to_options_map`] to export.

See the full list of custom transliteration options:

📖 [lipilekhika.in/reference/custom_trans_options](https://lipilekhika.in/reference/custom_trans_options)

## 📖 Resources

- **[Website](https://lipilekhika.in)** — Documentation and guides
- **[Supported Scripts](https://lipilekhika.in/reference/supported_scripts)** — Full list of scripts
- **[Custom Options](https://lipilekhika.in/reference/custom_trans_options)** — Transliteration options reference
- **[GitHub Repository](https://github.com/shubhattin/lipilekhika)** — Source code and issues

## 🛠 Building from Source

> **Do not build from a plain `git clone`.** Script data and `src/scripts.rs` are generated and not checked in — a fresh checkout will not compile.

Use the published crate instead:

```bash
cargo add lipilekhika
```

If you need to build locally (e.g. for contributing), follow the steps in [`.github/workflows/release_rust.yml`](https://github.com/shubhattin/lipilekhika/blob/main/.github/workflows/release_rust.yml)

## 📝 License

MIT License — See [LICENSE](./LICENCE) for details
