# Lipi Lekhika

[![npm version](https://img.shields.io/npm/v/lipilekhika.svg)](https://www.npmjs.com/package/lipilekhika)
[![JS Package CI](https://github.com/shubhattin/lipilekhika/actions/workflows/js_ci.yml/badge.svg)](https://github.com/shubhattin/lipilekhika/actions/workflows/js_ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![npm downloads](https://img.shields.io/npm/dm/lipilekhika.svg)](https://www.npmjs.com/package/lipilekhika)

A powerful, typesafe transliteration library for Indian scripts with realtime typing support.

📖 **[Full Documentation](https://lipilekhika.in/getting-started/javascript/)** | 🌐 **[Website](https://lipilekhika.in)**

## ✨ Features

- 🔄 Bidirectional transliteration between multiple Indian scripts
- 🛡️ Full TypeScript support with type-safe script/language names
- 📦 Tree-shakable and supports **ESM**, **CommonJS**, and **UMD**
- ⚡ Low-latency realtime typing for browser environments
- 🎯 Customizable transliteration options
- 🌍 Works in Node.js, Browser, and all modern JavaScript runtimes

## 📥 Installation

```bash
npm install lipilekhika
# or
pnpm add lipilekhika
# or
bun add lipilekhika
# or
yarn add lipilekhika
```

## 🚀 Usage

### Basic Transliteration

```ts
import { transliterate } from 'lipilekhika';

const result = await transliterate('na jAyatE mriyatE vA', 'Normal', 'Devanagari');
console.log(result); // न जायते म्रियते वा
```

### With Custom Transliteration Options

Full list of available [Custom Transliteration Options](https://lipilekhika.in/reference/custom_trans_options/)

```ts
import { transliterate } from 'lipilekhika';

const result = await transliterate(
  'గంగా',
  'Devanagari',
  'Gujarati',
  { 'brahmic_to_brahmic:replace_pancham_varga_varna_with_anusvAra': true }
);
// result :- ગંગા (instead ગઙ્ગા)
```

## 📚 Core API

### Functions

#### `transliterate(text, from, to, options?)`

Transliterates text from one script to another.

- **`text`**: `string` - The text to transliterate
- **`from`**: `ScriptLangType` - Source script/language
- **`to`**: `ScriptLangType` - Target script/language
- **`options`**: `TransliterationOptions` (optional) - Custom transliteration options

Returns: `Promise<string>`

#### `preloadScriptData(name)`

Preloads script data to avoid fetch latency (useful for browsers).

- **`name`**: `ScriptLangType` - Script/language name to preload

Returns: `Promise<ScriptData>`

#### `getAllOptions(from, to)`

Returns available custom options for a specific script pair.

- **`from`**: `ScriptLangType` - Source script/language
- **`to`**: `ScriptLangType` - Target script/language

Returns: `Promise<string[]>`

### Constants

```ts
import { SCRIPT_LIST, LANG_LIST, ALL_LANG_SCRIPT_LIST } from 'lipilekhika';
```

- **`SCRIPT_LIST`** - Array of all supported script names
- **`LANG_LIST`** - Array of all supported language names mapped to scripts
- **`ALL_LANG_SCRIPT_LIST`** - Combined list of all scripts and languages

### TypeScript Types

```ts
import type {
  TransliterationOptions,
  ScriptLangType,
  ScriptListType,
  LangListType
} from 'lipilekhika';
```

- **`TransliterationOptions`** - Type for custom transliteration options
- **`ScriptLangType`** - Type for script/language identifiers (includes aliases)
- **`ScriptListType`** - Type for the script list
- **`LangListType`** - Type for the language list

## ⌨️ Realtime Typing Utilities

For browser environments with `<textarea>` and `<input>` elements:

```ts
import {
  createTypingContext,
  handleTypingBeforeInputEvent,
  clearTypingContextOnKeyDown,
  getScriptKramaData,
  getScriptTypingDataMap
} from 'lipilekhika/typing';
```

📖 [**Browser Typing Tool Guide**](https://lipilekhika.in/getting-started/browser_typing_tool)

### `createTypingContext(script, options?)`

Creates a typing context for realtime transliteration.

- **`script`**: `ScriptLangType` - Target script/language for typing
- **`options`**: `TypingOptions` (optional) - Custom typing options
  - `autoContextClearTimeMs`: `number` (default: `4500`)
  - `useNativeNumerals`: `boolean` (default: `true`)
  - `includeInherentVowel`: `boolean` (default: `false`)

Returns: `TypingContext` with methods:
- `ready` - Promise to await before using (ensures script data is loaded)
- `takeKeyInput(char)` - Processes character input and returns diff
- `clearContext()` - Clears internal state
- `updateUseNativeNumerals(value)` - Updates numeral preference
- `updateIncludeInherentVowel(value)` - Updates inherent vowel inclusion

### `handleTypingBeforeInputEvent(ctx, event, callback?, options?)`

Handles the `beforeinput` event for realtime typing.

- **`ctx`**: `TypingContext` - Typing context
- **`event`**: `InputEvent` - The beforeinput event
- **`callback`**: `(newValue: string) => void` (optional) - Called with updated value
- **`options`**: Additional options

### `clearTypingContextOnKeyDown(event, ctx)`

Handles keyboard events (Arrow keys, Esc, etc.) to clear context appropriately.

- **`event`**: `KeyboardEvent` - The keydown event
- **`ctx`**: `TypingContext` - Typing context to clear

**Example:**

```tsx
const ctx = createTypingContext('Telugu');

<textarea
  onBeforeInput={(e) => handleTypingBeforeInputEvent(ctx, e, setText)}
  onBlur={() => ctx.clearContext()}
  onKeyDown={(e) => clearTypingContextOnKeyDown(e, ctx)}
/>
```

### Additional Typing Utilities

#### `getScriptKramaData(script)`

Returns the sequential character array (krama) for a script. Useful for comparing character sets across Brahmic scripts.

```ts
const kramaData = await getScriptKramaData('Devanagari');
// Returns: [['अ', 'svara'], ['आ', 'svara'], ['क', 'vyanjana'], ...]
```

#### `getScriptTypingDataMap(script)`

Returns detailed typing mappings for a script, including keyboard shortcuts.

```ts
const typingMap = await getScriptTypingDataMap('Telugu');
// Returns: { common_krama_map: [...], script_specific_krama_map: [...] }
// Useful for building typing helper UIs
```

📖 [**Realtime Typing Reference**](https://lipilekhika.in/reference/realtime_typing)

## 🌐 CDN Usage (No Build Step)

### ESM

```html
<script type="module">
  import { transliterate } from 'https://cdn.jsdelivr.net/npm/lipilekhika/dist/esm/index.mjs';
  
  const text = await transliterate('namaste', 'Normal', 'Devanagari');
  console.log(text);
</script>
```

### UMD

```html
<script src="https://cdn.jsdelivr.net/npm/lipilekhika"></script>
<script>
  lipilekhika.transliterate('namaste', 'Normal', 'Devanagari')
    .then(text => console.log(text));
</script>
```

## 📖 Documentation

For detailed documentation, examples, and guides:

- 🏠 [Home](https://lipilekhika.in)
- 🚀 [Getting Started](https://lipilekhika.in/getting-started/javascript)
- ⌨️ [Browser Typing Tool](https://lipilekhika.in/getting-started/browser_typing_tool)
- 📝 [Supported Scripts](https://lipilekhika.in/reference/supported_scripts)
- ⚙️ [Custom Options](https://lipilekhika.in/reference/custom_trans_options)
- 🔧 [Realtime Typing Reference](https://lipilekhika.in/reference/realtime_typing)

## 🔗 Links

- [GitHub Repository](https://github.com/shubhattin/lipilekhika)
- [npm Package](https://www.npmjs.com/package/lipilekhika)
- [Homepage](https://lipilekhika.in)
- [Report Issues](https://github.com/shubhattin/lipilekhika/issues)

