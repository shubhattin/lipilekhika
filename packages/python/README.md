# Lipi Lekhika — Python

> A powerful, fast transliteration library for Indian Brahmic scripts with real-time typing support

[![PyPI version](https://img.shields.io/pypi/v/lipilekhika.svg)](https://pypi.org/project/lipilekhika/)
[![PyPI downloads](https://img.shields.io/pypi/dm/lipilekhika.svg)](https://pypi.org/project/lipilekhika/)
[![Tests](https://github.com/shubhattin/lipilekhika/actions/workflows/python_ci.yml/badge.svg)](https://github.com/shubhattin/lipilekhika/actions/workflows/python_ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

📖 **[Documentation](https://lipilekhika.in/getting-started/python/)** • 🌐 **[Website](https://lipilekhika.in)** • 📝 **[Changelog](./CHANGELOG.md)**

## ✨ Features

- 🔄 **Bidirectional Transliteration** — Supports all the modern Indian scripts, along with the standard romanization schemes such as IAST, ITRANS, SLP1 and Harvard-Kyoto ([script guide](https://lipilekhika.in/reference/script_guide/))
- 🦀 **Rust-Powered** — Uses compiled Rust functions for blazing-fast operations
- 🛡️ **Full Type Safety** — Type hints for all functions and proper IDE support
- ⚡ **Real-time Typing** — Low-latency typing engine for interactive applications
- 🎯 **Highly Customizable** — Fine-tune transliteration with custom options
- 🪶 **Lightweight** — Minimal dependencies, fast installation

## 📥 Installation

```bash
pip install lipilekhika
```

**Requirements:** Python 3.10+

## 🚀 Quick Start

### Basic Transliteration

```python
from lipilekhika import transliterate

# Transliterate from Normal script to Devanagari
result = transliterate("na jAyatE mriyatE vA", "Normal", "Devanagari")
print(result)  # न जायते म्रियते वा
```

### With Custom Options

```python
from lipilekhika import transliterate

result = transliterate(
    "गङ्गा",
    "Devanagari",
    "Gujarati",
    {"brahmic_to_brahmic:replace_pancham_varga_varna_with_anusvAra": True},
)
print(result)  # ગંગા (instead of ગઙ્ગા)
```

📖 See all [Custom Transliteration Options](https://lipilekhika.in/reference/custom_trans_options/)

## 📚 Core API

### Functions

**`transliterate(text, from_script, to_script, options=None)`** — Transliterate text between scripts

```python
from lipilekhika import transliterate

result = transliterate("namaste", "Normal", "Devanagari")
# Returns: नमस्ते
```

**Parameters:**
- `text: str` — Text to transliterate
- `from_script: ScriptLangType` — Source script/language
- `to_script: ScriptLangType` — Target script/language
- `options: dict[str, bool] | None` — Custom transliteration options

**Returns:** `str`

---

**`preload_script_data(name)`** — Preload script data to avoid initial loading delay

```python
from lipilekhika import preload_script_data

preload_script_data("Telugu")
```

---

**`get_all_options(from_script, to_script)`** — Get available custom options for a script pair

```python
from lipilekhika import get_all_options

options = get_all_options("Normal", "Devanagari")
# Returns: list of available option keys
```

### Constants

```python
from lipilekhika import SCRIPT_LIST, LANG_LIST, ALL_SCRIPT_LANG_LIST

print(SCRIPT_LIST)  # ['Devanagari', 'Bengali', 'Telugu', ...]
print(LANG_LIST)  # ['Sanskrit', 'Hindi', 'Marathi', ...]
```

| Export | Description |
|--------|-------------|
| `SCRIPT_LIST` | List of all supported script names |
| `LANG_LIST` | List of all supported language names mapped to scripts |
| `ALL_SCRIPT_LANG_LIST` | Combined list of all scripts and languages |

## ⌨️ Real-time Typing

Enable real-time transliteration as users type character by character.

```python
from lipilekhika.typing import create_typing_context

ctx = create_typing_context("Telugu")

# Process each character
for char in "namaste":
    diff = ctx.take_key_input(char)
    # Apply the diff to your text buffer:
    # - Remove diff.to_delete_chars_count characters
    # - Add diff.diff_add_text
```

📖 **[Python Guide](https://lipilekhika.in/getting-started/python)** • **[Typing Reference](https://lipilekhika.in/reference/realtime_typing)**

### API

**`create_typing_context(script, options=None)`** — Create a typing context

```python
from lipilekhika.typing import create_typing_context, TypingContextOptions

options = TypingContextOptions(
    auto_context_clear_time_ms=4500,
    use_native_numerals=True,
    include_inherent_vowel=False,
)

ctx = create_typing_context("Devanagari", options)
```

**Returns:** `TypingContext` with:
- `take_key_input(char: str) -> TypingDiff` — Process character input and return diff
- `clear_context()` — Clear internal state
- `update_use_native_numerals(value: bool)` — Update numeral preference
- `update_include_inherent_vowel(value: bool)` — Update inherent vowel inclusion

### Additional Utilities

```python
from lipilekhika.typing import get_script_typing_data_map

# Get detailed typing mappings for a script
typing_map = get_script_typing_data_map("Telugu")
# Useful for building typing helper UIs
```

---

## 📖 Resources

- **[Documentation Home](https://lipilekhika.in)** — Complete guides and API reference
- **[Python Guide](https://lipilekhika.in/getting-started/python)** — Getting started with Python
- **[Supported Scripts](https://lipilekhika.in/reference/supported_scripts)** — Full list of scripts
- **[Custom Options](https://lipilekhika.in/reference/custom_trans_options)** — Transliteration options reference
- **[GitHub Repository](https://github.com/shubhattin/lipilekhika)** — Source code and issues
- **[Changelog](./CHANGELOG.md)** — Version history and updates
