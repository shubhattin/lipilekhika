# Lipi Lekhika — JavaScript/TypeScript

> A powerful, typesafe transliteration library for Indian Brahmic scripts with real-time typing support

[![npm version](https://img.shields.io/npm/v/lipilekhika.svg)](https://www.npmjs.com/package/lipilekhika)
[![npm downloads](https://img.shields.io/npm/dm/lipilekhika.svg)](https://www.npmjs.com/package/lipilekhika)
[![Tests](https://github.com/shubhattin/lipilekhika/actions/workflows/js_ci.yml/badge.svg)](https://github.com/shubhattin/lipilekhika/actions/workflows/js_ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

📖 **[Documentation](https://lipilekhika.in/getting-started/javascript/)** • 🌐 **[Website](https://lipilekhika.in)** • 📝 **[Changelog](./CHANGELOG.md)**

## ✨ Features

- 🔄 **Bidirectional Transliteration** — Convert between 15+ Indian Brahmic scripts
- 🛡️ **Full TypeScript Support** — Type-safe script/language names and options
- 📦 **Multiple Module Formats** — Tree-shakable ESM, CommonJS, and UMD builds
- ⚡ **Real-time Typing** — Low-latency typing engine for browser environments
- 🚀 **WASM Support** - Use Blazing fast Rust 🦀 in JS environments
- 🎯 **Highly Customizable** — Fine-tune transliteration with custom options
- 🌍 **Universal Runtime** — Works in Node.js, browsers, Deno, Bun, and more
- 🪶 **Lightweight** — Only 7 KB gzipped

## 📥 Installation

```bash
npm install lipilekhika
```

<details>
<summary>Other package managers</summary>

```bash
pnpm add lipilekhika
bun add lipilekhika
yarn add lipilekhika
```

</details>

## 🚀 Quick Start

### Basic Transliteration

```typescript
import { transliterate } from 'lipilekhika';

// Transliterate from Normal script to Devanagari
const result = await transliterate('na jAyatE mriyatE vA', 'Normal', 'Devanagari');
console.log(result); // न जायते म्रियते वा
```

### With Custom Options

```typescript
import { transliterate } from 'lipilekhika';

const result = await transliterate('గంగా', 'Devanagari', 'Gujarati', {
  'brahmic_to_brahmic:replace_pancham_varga_varna_with_anusvAra': true
});
console.log(result); // ગંગા (instead of ગઙ્ગા)
```

📖 See all [Custom Transliteration Options](https://lipilekhika.in/reference/custom_trans_options/)

## 📚 Core API

### Functions

<details open>
<summary><strong><code>transliterate(text, from, to, options?)</code></strong> — Transliterate text between scripts</summary>

**Parameters:**

- `text: string` — Text to transliterate
- `from: ScriptLangType` — Source script/language
- `to: ScriptLangType` — Target script/language
- `options?: TransliterationOptions` — Custom transliteration options

**Returns:** `Promise<string>`

</details>

<details>
<summary><strong><code>preloadScriptData(name)</code></strong> — Preload script data to avoid fetch latency</summary>

**Parameters:**

- `name: ScriptLangType` — Script/language name to preload

**Returns:** `Promise<ScriptData>`

**Note:** Useful in browsers to avoid initial loading delay.

</details>

<details>
<summary><strong><code>getAllOptions(from, to)</code></strong> — Get available custom options for a script pair</summary>

**Parameters:**

- `from: ScriptLangType` — Source script/language
- `to: ScriptLangType` — Target script/language

**Returns:** `Promise<string[]>`

</details>

<details>
<summary><strong><code>transliterate_wasm(text, from, to, options?)</code></strong> — WASM-based transliteration using Rust</summary>

Read more about [WASM Module](https://lipilekhika.in/getting-started/wasm/)

**Parameters:**

- `text: string` — Text to transliterate
- `from: ScriptLangType` — Source script/language
- `to: ScriptLangType` — Target script/language
- `options?: TransliterationOptions` — Custom transliteration options

**Returns:** `Promise<string>`

**Note:** Uses the fast Rust-based WASM implementation for improved performance. Works in all JavaScript environments (Node.js, browsers, Deno, Bun).

</details>

<details>
<summary><strong><code>preloadWasm()</code></strong> — Preload the WASM module</summary>

**Returns:** `Promise<void>`

**Note:** Preloads the WASM module to avoid initial loading delay when using `transliterate_wasm`.

</details>

### Constants & Types

```typescript
import { SCRIPT_LIST, LANG_LIST, ALL_LANG_SCRIPT_LIST } from 'lipilekhika';
import type { ScriptLangType, TransliterationOptions } from 'lipilekhika';
```

| Export                   | Description                                             |
| ------------------------ | ------------------------------------------------------- |
| `SCRIPT_LIST`            | Array of all supported script names                     |
| `LANG_LIST`              | Array of all supported language names mapped to scripts |
| `ALL_LANG_SCRIPT_LIST`   | Combined list of all scripts and languages              |
| `ScriptLangType`         | Type for script/language identifiers (includes aliases) |
| `TransliterationOptions` | Type for custom transliteration options                 |
| `ScriptListType`         | Type for the script list                                |
| `LangListType`           | Type for the language list                              |

## ⌨️ Real-time Typing

Enable real-time transliteration as users type in `<textarea>` and `<input>` elements.

```typescript
import {
  createTypingContext,
  handleTypingBeforeInputEvent,
  clearTypingContextOnKeyDown
} from 'lipilekhika/typing';
```

📖 **[Browser Typing Tool Guide](https://lipilekhika.in/getting-started/browser_typing_tool)** • **[API Reference](https://lipilekhika.in/reference/realtime_typing)**

### Quick Example

```tsx
import {
  createTypingContext,
  handleTypingBeforeInputEvent,
  clearTypingContextOnKeyDown
} from 'lipilekhika/typing';

const ctx = createTypingContext('Telugu');

<textarea
  onBeforeInput={(e) => handleTypingBeforeInputEvent(ctx, e, setText)}
  onBlur={() => ctx.clearContext()}
  onKeyDown={(e) => clearTypingContextOnKeyDown(e, ctx)}
/>;
```

### API

<details>
<summary><strong><code>createTypingContext(script, options?)</code></strong> — Create a typing context</summary>

**Parameters:**

- `script: ScriptLangType` — Target script/language for typing
- `options?: TypingOptions` — Custom typing options
  - `autoContextClearTimeMs?: number` (default: `4500`)
  - `useNativeNumerals?: boolean` (default: `true`)
  - `includeInherentVowel?: boolean` (default: `false`)

**Returns:** `TypingContext` with:

- `ready: Promise<void>` — Await before using (ensures script data loaded)
- `takeKeyInput(char: string)` — Process character input and return diff
- `clearContext()` — Clear internal state
- `updateUseNativeNumerals(value: boolean)` — Update numeral preference
- `updateIncludeInherentVowel(value: boolean)` — Update inherent vowel inclusion

</details>

<details>
<summary><strong><code>handleTypingBeforeInputEvent(ctx, event, callback?, options?)</code></strong> — Handle beforeinput events</summary>

**Parameters:**

- `ctx: TypingContext` — Typing context
- `event: InputEvent` — The beforeinput event
- `callback?: (newValue: string) => void` — Called with updated value
- `options?` — Additional options

</details>

<details>
<summary><strong><code>clearTypingContextOnKeyDown(event, ctx)</code></strong> — Handle keyboard events</summary>

Handles keyboard events (Arrow keys, Esc, etc.) to clear context appropriately.

**Parameters:**

- `event: KeyboardEvent` — The keydown event
- `ctx: TypingContext` — Typing context to clear

</details>

### Additional Utilities

```typescript
import { getScriptKramaData, getScriptTypingDataMap } from 'lipilekhika/typing';

// Get sequential character array (krama) for a script
const kramaData = await getScriptKramaData('Devanagari');
// Returns: [['अ', 'svara'], ['आ', 'svara'], ['क', 'vyanjana'], ...]

// Get detailed typing mappings for a script
const typingMap = await getScriptTypingDataMap('Telugu');
// Useful for building typing helper UIs
```

## 🌐 CDN Usage (No Build Step)

<details>
<summary><strong>ESM (Module)</strong></summary>

```html
<script type="module">
  import { transliterate } from 'https://cdn.jsdelivr.net/npm/lipilekhika/dist/esm/index.mjs';

  const text = await transliterate('namaste', 'Normal', 'Devanagari');
  console.log(text); // नमस्ते
</script>
```

</details>

<details>
<summary><strong>UMD (Global)</strong></summary>

```html
<script src="https://cdn.jsdelivr.net/npm/lipilekhika"></script>
<script>
  lipilekhika.transliterate('namaste', 'Normal', 'Devanagari').then((text) => console.log(text)); // नमस्ते
</script>
```

</details>

---

## 📖 Resources

- **[Documentation Home](https://lipilekhika.in)** — Complete guides and API reference
- **[JavaScript Guide](https://lipilekhika.in/getting-started/javascript)** — Getting started with JS/TS
- **[Browser Typing Tool](https://lipilekhika.in/getting-started/browser_typing_tool)** — Real-time typing integration
- **[Supported Scripts](https://lipilekhika.in/reference/supported_scripts)** — Full list of scripts
- **[Custom Options](https://lipilekhika.in/reference/custom_trans_options)** — Transliteration options reference
- **[GitHub Repository](https://github.com/shubhattin/lipilekhika)** — Source code and issues
- **[Changelog](./CHANGELOG.md)** — Version history and updates
