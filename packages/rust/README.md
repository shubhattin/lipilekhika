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
- ⌨️ **Typing Mode** — Stateful context for real-time character-by-character input
- 📦 **Embedded Script Data** — All script data bundled at compile time

## 📥 Installation

```bash
cargo add lipilekhika
```

## 🚀 Quick Start

### Basic Transliteration

```rust
use lipilekhika::transliterate;

fn main() {
    let result = transliterate(
        "namaskAraH",
        "Normal",
        "Devanagari",
        None
    ).unwrap();
    
    println!("{}", result); // नमस्कारः
}
```

### With Custom Options

```rust
use lipilekhika::transliterate;
use std::collections::HashMap;

fn main() {
    let mut options = HashMap::new();
    options.insert(
        "brahmic_to_brahmic:replace_pancham_varga_varna_with_anusvAra".to_string(),
        true
    );
    
    let result = transliterate(
        "గంగా",
        "Telugu",
        "Gujarati",
        Some(&options)
    ).unwrap();
    
    println!("{}", result); // ગંગા (instead of ગઙ્ગા)
}
```

## 📚 API

### Core Functions

#### `transliterate`

```rust
pub fn transliterate(
    text: &str,
    from: &str,
    to: &str,
    trans_options: Option<&HashMap<String, bool>>,
) -> Result<String, String>
```

Transliterates text from one script to another.

**Parameters:**
- `text` — Text to transliterate
- `from` — Source script/language name (e.g., "Normal", "Devanagari", "Telugu")
- `to` — Target script/language name
- `trans_options` — Optional custom transliteration options

**Returns:** `Result<String, String>` — Transliterated text or error message

#### `get_all_option`

```rust
pub fn get_all_option(
    from_script_name: &str,
    to_script_name: &str,
) -> Result<Vec<String>, String>
```

Gets all available custom options for a script pair.

**Parameters:**
- `from_script_name` — Source script/language name
- `to_script_name` — Target script/language name

**Returns:** `Result<Vec<String>, String>` — List of option keys or error message

#### `get_script_typing_data_map`

```rust
pub fn get_script_typing_data_map(
    script: &str,
) -> Result<ScriptTypingDataMap, String>
```

Gets typing data mappings for a script (for building custom input methods).

**Parameters:**
- `script` — Script/language name

**Returns:** `Result<ScriptTypingDataMap, String>` — Typing data or error message

### Typing Module

For character-by-character real-time input:

```rust
use lipilekhika::typing::{TypingContext, TypingContextOptions};

fn main() {
    let mut ctx = TypingContext::new("Devanagari", None).unwrap();
    
    // Process character-by-character input
    let diff = ctx.take_key_input("n").unwrap();
    println!("Delete: {}, Add: '{}'", diff.to_delete_chars_count, diff.diff_add_text);
    
    let diff = ctx.take_key_input("a").unwrap();
    println!("Delete: {}, Add: '{}'", diff.to_delete_chars_count, diff.diff_add_text);
    
    // Clear context when needed
    ctx.clear_context();
}
```

#### Types

- **`TypingContext`** — Stateful context for typing mode
  - `new(typing_lang: &str, options: Option<TypingContextOptions>)` — Create new context
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

See the full list of custom transliteration options:

📖 [lipilekhika.in/reference/custom_trans_options](https://lipilekhika.in/reference/custom_trans_options)

## 📖 Resources

- **[Website](https://lipilekhika.in)** — Documentation and guides
- **[Supported Scripts](https://lipilekhika.in/reference/supported_scripts)** — Full list of scripts
- **[Custom Options](https://lipilekhika.in/reference/custom_trans_options)** — Transliteration options reference
- **[GitHub Repository](https://github.com/shubhattin/lipilekhika)** — Source code and issues

## 📝 License

MIT License — See [LICENSE](./LICENCE) for details
