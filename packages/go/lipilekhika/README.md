# Lipi Lekhika — Go

> A fast transliteration library for Indian Brahmic scripts in Go

[![Go Reference](https://pkg.go.dev/badge/github.com/shubhattin/lipilekhika/packages/go/lipilekhika.svg)](https://pkg.go.dev/github.com/shubhattin/lipilekhika/packages/go/lipilekhika)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

🌐 **[Website](https://lipilekhika.in)** • 📖 **[Documentation](https://lipilekhika.in/getting-started/go)** • 📝 **[Repository](https://github.com/shubhattin/lipilekhika)**

---

## ✨ Features

- 🔄 **Bidirectional Transliteration** — Supports all the modern Indian scripts, along with the standard romanization schemes such as IAST, ITRANS, SLP1 and Harvard-Kyoto ([script guide](https://lipilekhika.in/reference/script_guide/))
- ⌨️ **Realtime Typing** — Stateful context for character-by-character input
- 🎯 **Customizable Options** — Fine-tune transliteration and typing behaviour
- 📦 **Embedded Script Data** — All data bundled for predictable runtime behaviour

## 📥 Installation

```bash
go get github.com/shubhattin/lipilekhika/packages/go/lipilekhika
```

## 🚀 Quick Start

### Basic Transliteration

```go
package main

import (
	"fmt"

	"github.com/shubhattin/lipilekhika/packages/go/lipilekhika"
)

func main() {
	out, err := lipilekhika.Transliterate("namaskAraH", "Normal", "Devanagari", nil)
	if err != nil {
		panic(err)
	}
	fmt.Println(out) // नमस्कारः
}
```

### Typing Context

```go
package main

import (
	"fmt"

	"github.com/shubhattin/lipilekhika/packages/go/lipilekhika/typing"
)

func main() {
	ctx, err := typing.NewTypingContext("Devanagari", nil)
	if err != nil {
		panic(err)
	}

	diff, err := ctx.TakeKeyInput("n")
	if err != nil {
		panic(err)
	}
	fmt.Printf("delete=%d add=%q\n", diff.ToDeleteCharsCount, diff.DiffAddText)
}
```

## 📚 API

- `lipilekhika.Transliterate(text, fromScript, toScript, transOptions)`
- `lipilekhika.GetAllOptions(fromScript, toScript)` — the custom options of a script pair
- `lipilekhika.GetNormalizedScriptName(name)` — the script a name refers to (`"tel"` -> `"Telugu"`)
- `lipilekhika.PreloadScriptData(name)` — load the script data ahead of time
- `lipilekhika.ScriptList`, `lipilekhika.LangList`, `lipilekhika.AllScriptLangList` — the script and language names
- `typing.NewTypingContext(typingLang, options)`
- `(*typing.TypingContext).TakeKeyInput(key)`
- `(*typing.TypingContext).ClearContext()`
- `typing.GetScriptTypingDataMap(script)` — the characters of a script with the keys that type them
- `typing.GetScriptKramaData(script)` — the characters of a script with their types

📖 Reference: [pkg.go.dev/github.com/shubhattin/lipilekhika/packages/go/lipilekhika](https://pkg.go.dev/github.com/shubhattin/lipilekhika/packages/go/lipilekhika)

## 🎯 Supported Scripts

Devanagari, Purna-Devanagari, Bengali, Assamese, Gujarati, Gurumukhi, Odia, Telugu, Kannada, Malayalam, Tamil, Tamil-Extended, Sinhala, Brahmi, Granth, Modi, Sharada, Siddham, Normal and Romanized.

📖 Full list: [lipilekhika.in/reference/supported_scripts](https://lipilekhika.in/reference/supported_scripts)

## 🔧 Custom Options

📖 [lipilekhika.in/reference/custom_trans_options](https://lipilekhika.in/reference/custom_trans_options)

## 📝 License

MIT License — See [LICENCE](./LICENCE)
