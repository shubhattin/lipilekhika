# Fcitx5 Lipilekhika Plugin

Fcitx5 input method addon for typing in 19 Indic scripts using the Lipilekhika transliteration engine.

## Features

- **Multi-script support**: Devanagari, Telugu, Tamil, Bengali, Kannada, Gujarati, Malayalam, Odia, Sinhala, Gurumukhi, Assamese, and more
- **Configurable options**: Auto-clear timeout, native numerals, inherent vowel handling
- **Real-time transliteration**: Roman → script conversion as you type
- **Context-aware**: Automatically commits when appropriate

## Requirements

### Build Dependencies
- **Fcitx5** (≥5.0): Core and Config libraries
- **Rust** (≥1.70): Rust toolchain with Cargo
- **CMake** (≥3.21)
- **C++20** compiler (GCC ≥10 or Clang ≥12)

### Runtime Dependencies
- **Fcitx5** (running instance)

## Installation

```bash
# From repository root
cd plugins/fcitx5

# Build and install system-wide (requires sudo)
./build.sh
```

This will:
- Build the Rust FFI binding and C++ addon
- Install to `/usr/lib/fcitx5/`
- Register 19 input methods in Fcitx5
- Clean up any conflicting user-local configs

## Usage

1. **Restart Fcitx5**:
   ```bash
   fcitx5 -rd
   ```

2. **Add Input Method**:
   - Open Fcitx5 configuration (e.g., `fcitx5-configtool`)
   - Search for "lipilekhika"
   - Add desired script(s) from the list

3. **Start Typing**:
   - Switch to a Lipilekhika input method
   - Type in Roman characters (e.g., `namaste` → नमस्ते)
   - Press **Space**, **Enter**, or **Shift** to commit

### Keyboard Shortcuts

- **Esc**: Cancel/clear current composition
- **Backspace**: Edit composition character-by-character
- **Space/Enter/Shift**: Commit composition
- **Ctrl/Alt/Super + key**: Pass through to application

## Configuration

Settings are in `~/.config/fcitx5/conf/lipilekhika.conf` (auto-generated) or via Fcitx5 config UI:

- **AutoContextClearTimeMs** (int, default `4500`): Milliseconds before clearing internal context
- **UseNativeNumerals** (bool, default `true`): Use script-native digits (e.g., ०-९ for Devanagari)
- **IncludeInherentVowel** (bool, default `false`): Include inherent vowel/schwa in output

## Supported Scripts

Devanagari, Telugu, Tamil, Tamil-Extended, Bengali, Kannada, Gujarati, Malayalam, Odia, Sinhala, Romanized, Gurumukhi, Assamese, Purna-Devanagari, Brahmi, Granth, Modi, Sharada, Siddham
