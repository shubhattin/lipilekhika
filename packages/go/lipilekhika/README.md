# Lipi Lekhika — Go

> A fast transliteration library for Indian Brahmic scripts in Go

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

🌐 **[Website](https://lipilekhika.in)** • 📖 **[Documentation](https://lipilekhika.in/getting-started/introduction/)** • 📝 **[Repository](https://github.com/shubhattin/lipilekhika)**

---

## Features

- Bidirectional transliteration across Indian Brahmic scripts
- Real-time typing context for character-by-character input
- Custom transliteration options support
- Embedded script data for predictable runtime behavior
- Benchmark tooling for release-performance checks

## Installation

```bash
go get github.com/shubhattin/lipilekhika/packages/go/lipilekhika
```

## Quick Start

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

## API

- `lipilekhika.Transliterate(text, fromScript, toScript, transOptions)`
- `typing.NewTypingContext(typingLang, options)`
- `(*typing.TypingContext).TakeKeyInput(key)`
- `(*typing.TypingContext).ClearContext()`

## License

MIT License — See [LICENCE](./LICENCE)
