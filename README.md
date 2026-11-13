# Lipi Lekhika

> A powerful, fast, and open-source transliteration tool for Indian Brahmic scripts

[![Website](https://img.shields.io/badge/Website-lipilekhika.in-blue)](https://lipilekhika.in)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![GitHub](https://img.shields.io/github/stars/shubhattin/lipilekhika?style=social)](https://github.com/shubhattin/lipilekhika)

## ✨ Features

- 🔄 **Bidirectional Transliteration** - Convert between 15+ [Indian Brahmic scripts](https://en.wikipedia.org/wiki/Brahmic_scripts) including Devanagari, Bengali, Tamil, Telugu, and more
- ⚡ **Real-time Typing** - Type in any Indian language using English keyboard with a intuitive map
- 🎯 **Highly Customizable** - Custom Transliteration and Typing Options
- 🚀 **Blazing Fast** - Optimized for performance in JavaScript and Rust
- 📚 **Multiple Language Bindings** - Available as packages for JavaScript, Rust and Python
- 🌐 **Multi-platform** - Use on multiple devices. Web, Andoid, Windows, Linux

## Apps

- 🌐 **Web App** - Try it instantly at [lipilekhika.in/app](https://lipilekhika.in/app)
- 🪟 **Windows** - Download the [latest MSI installer](https://lipilekhika.in/redirect/pc-app-release-win-download) or the [portable zip](https://lipilekhika.in/redirect/pc-app-release-win-portable) (no install: unzip and run)
- 🤖 **Android** - download the [latest APK](https://lipilekhika.in/redirect/mobile-app-release-page)
- 🐧 **Linux** - Install the [fcitx5 plugin](https://github.com/shubhattin/lipilekhika/blob/main/plugins/fcitx5/README.md), and [Lipi Parivartaka](https://lipilekhika.in/redirect/pc-app-release-linux-parivartaka) to convert text between scripts
- 🍎 **macOS** - [Lipi Parivartaka](https://lipilekhika.in/redirect/pc-app-release-macos-parivartaka) to convert text between scripts (Apple silicon and Intel, macOS 12+)

## 📦 Packages

- **JavaScript/TypeScript** - [`lipilekhika`](https://www.npmjs.com/package/lipilekhika) on NPM · [![npm version](https://img.shields.io/npm/v/lipilekhika.svg)](https://www.npmjs.com/package/lipilekhika) [![npm downloads](https://img.shields.io/npm/dm/lipilekhika.svg)](https://www.npmjs.com/package/lipilekhika) · [Docs](https://lipilekhika.in/getting-started/javascript)

- **Rust** 🦀 - [`lipilekhika`](https://crates.io/crates/lipilekhika) on Crates.io · [![crates.io](https://img.shields.io/crates/v/lipilekhika.svg)](https://crates.io/crates/lipilekhika) [![crates.io](https://img.shields.io/crates/d/lipilekhika.svg)](https://crates.io/crates/lipilekhika) · [Docs](https://lipilekhika.in/getting-started/rust)

- **Python** 🐍 - [`lipilekhika`](https://pypi.org/project/lipilekhika/) on PyPI · [![PyPI version](https://img.shields.io/pypi/v/lipilekhika.svg)](https://pypi.org/project/lipilekhika/) [![PyPI downloads](https://img.shields.io/pypi/dm/lipilekhika.svg)](https://pypi.org/project/lipilekhika/) · [Docs](https://lipilekhika.in/getting-started/python)

- **WebAssembly** : Rust-powered [WebAssembly module](https://lipilekhika.in/getting-started/wasm)

- **Go** - [`github.com/shubhattin/lipilekhika/packages/go/lipilekhika`](https://pkg.go.dev/github.com/shubhattin/lipilekhika/packages/go/lipilekhika) · [Package README](./packages/go/lipilekhika/README.md) · [Docs](https://lipilekhika.in/getting-started/go)

## 🚀 Quick Start

**Web App**: [lipilekhika.in/app](https://lipilekhika.in/app) - Try it instantly in your browser

**Documentation**: [lipilekhika.in](https://lipilekhika.in/getting-started/introduction/) - Comprehensive guides and API reference

**Key Resources**:

- [Introduction](https://lipilekhika.in/getting-started/introduction) - Learn the basics
- [JavaScript Guide](https://lipilekhika.in/getting-started/javascript) - Integration guide for JavaScript/TypeScript
- [Python Guide](https://lipilekhika.in/getting-started/python) - Integration guide for Python
- [Supported Scripts](https://lipilekhika.in/reference/supported_scripts) - Full list of scripts
- [Browser Typing Tool](https://lipilekhika.in/getting-started/browser_typing_tool) - Real-time typing setup

## ⚡ Performance

Benchmarks on the shared [`test_data`](./test_data) corpus (lower is better). The **% of JS** columns give the time as a percentage of the pure JavaScript implementation on Node.js (100%).

`Benchmark machine: Intel Core i5-12450H (12 threads, up to 4.40 GHz)`

The Rust implementation is **~8× faster** than pure JavaScript on Node.js (25 ms vs 198 ms) and **~5×** faster than on Bun (130 ms). With multiple threads it is **~35×** faster than JavaScript on Node.js.

### Transliteration

Time for one pass over all 9778 transliteration cases.

**Native implementations**

| Implementation | Single thread (ms) | % of JS |      Multi thread (ms) | % of JS |
| -------------- | -----------------: | ------: | ---------------------: | ------: |
| **Rust**       |             **25** | **13%** |                **5.7** |  **3%** |
| **Go**         |                 55 |     28% | 16.0 _(10 goroutines)_ |      8% |

**Other languages** _(via the Rust core)_

| Implementation | Time (ms) | % of JS |
| -------------- | --------: | ------: |
| **Python**     |        37 |     19% |
| **Dart** ¹     |       106 |     53% |

**JavaScript runtimes**

| Implementation           | Node.js (ms) | % of JS | Bun (ms) | % of JS |
| ------------------------ | -----------: | ------: | -------: | ------: |
| N-API _(via Rust)_       |           53 |     27% |       44 |     22% |
| WebAssembly _(via Rust)_ |           65 |     33% |       51 |     26% |
| **Pure JavaScript**      |      **198** |    100% |  **130** |     66% |

### Typing

Time to type the 4010 `Normal` transliteration cases key by key into their scripts (a typing context, one call per key).

| Implementation               | Time (ms) | % of JS |
| ---------------------------- | --------: | ------: |
| **Rust**                     |   **112** |  **7%** |
| **Python** _(via Rust)_      |       250 |     15% |
| **Go**                       |       267 |     16% |
| N-API _(via Rust)_, Node.js  |       408 |     24% |
| N-API _(via Rust)_, Bun      |       411 |     24% |
| **Dart** ¹ _(via Rust)_      |       957 |     56% |
| **Pure JavaScript**, Bun     |      1254 |     73% |
| **Pure JavaScript**, Node.js |  **1715** |    100% |

Averages from the statistical benchmark suites (warm-up, many samples): Rust [criterion](./packages/rust/src/benches/benchmark.rs), JS / WASM / N-API [mitata](./packages/js/scripts/bench_suite.mjs) (the built package under plain Node.js / Bun), Go [`testing.B`](./packages/go/lipilekhika/benchmark_test.go), Python [pytest-benchmark](./packages/python/benchmarks/bench_lipilekhika.py).

¹ Dart from its single cold pass [script](./packages/dart/lipilekhika/scripts/benchmark.dart) (transliteration 105-110 ms, typing 946-969 ms).

**Benchmark scripts:** single cold pass: [JavaScript](./packages/js/scripts/benchmark.mjs) (also covers N-API & WASM) · [Rust](./packages/rust/examples/bench.rs) · [Python](./packages/python/scripts/benchmark.py) · [Dart](./packages/dart/lipilekhika/scripts/benchmark.dart) · [Go](./packages/go/lipilekhika/bench/benchmark.go). See [Contributing](./CONTRIBUTING.md#benchmarks) for how to run both kinds.

> Even the initial Rust rewrite (almost line by line) was _439 ms_ (JS : 740 ms). But after some simple optmization like
> using `HashMap` (over binary search for lookups) and `Vec<char>` (to iterate in string) it was at _155 ms_ (JS : 460 ms). But now after optimizations
> (like avoid heap allocations and better data structures). Moving to `no_std` also improved performance (-12ms) for some reason.
> That got it to _51 ms_, and later hot path work (dense char lookup tables, allocation free context, buffer reuse while typing) to **23 ms** (for the 8879 cases of then, the test data has grown since).

## 🤝 Contributing

Contributions are welcome! Help us improve Lipi Lekhika through bug reports, feature requests, or code contributions.

See [CONTRIBUTING.md](CONTRIBUTING.md) for development and testing setup.

**GitHub Repository**: [github.com/shubhattin/lipilekhika](https://github.com/shubhattin/lipilekhika) · **Issues**: [Report here](https://github.com/shubhattin/lipilekhika/issues)

---

## 📚 Legacy

**Old Lipi Lekhika** (archived version):

- [GitHub Archive](https://github.com/shubhattin/old_lipi_lekhika_archive) · [Old Web App](https://lipilekhika.in/old/) · [Windows/Android Binaries](https://github.com/shubhattin/lipilekhika/releases/tag/old)
