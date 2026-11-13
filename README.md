# Lipi Lekhika

> A powerful, fast, and open-source transliteration tool for Indian Brahmic scripts

[![Website](https://img.shields.io/badge/Website-lipilekhika.in-blue)](https://lipilekhika.in)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![GitHub](https://img.shields.io/github/stars/shubhattin/lipilekhika?style=social)](https://github.com/shubhattin/lipilekhika)

## ✨ Features

- 🔄 **Bidirectional Transliteration** - Supports all the modern Indian scripts, along with the standard romanization schemes such as IAST, ITRANS, SLP1 and Harvard-Kyoto ([script guide](https://lipilekhika.in/reference/script_guide/))
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

Benchmarks on the shared [`test_data`](./test_data) corpus. **Speed** is how many times faster than pure JavaScript on Node.js (1.00×), higher is better. The multi-thread runs (10 threads) are compared with the same single-thread JavaScript time.

`Benchmark machine: Intel Core i5-12450H (12 threads, up to 4.40 GHz)`

**Transliteration** (one pass over 9778 cases)

| Implementation          | Time (ms) |      Speed |
| ----------------------- | --------: | ---------: |
| **Rust**                |      25.3 |  **7.83×** |
| **Rust**, multi-thread  |       5.7 | **34.90×** |
| Go                      |      55.4 |      3.58× |
| Go, multi-thread        |      16.0 |     12.39× |
| Python ¹                |      37.4 |      5.31× |
| Kotlin ¹ (JVM)          |      39.9 |      4.97× |
| N-API ¹, Bun            |      44.1 |      4.49× |
| N-API ¹, Node.js        |      53.2 |      3.73× |
| WebAssembly ¹, Bun      |      50.8 |      3.90× |
| WebAssembly ¹, Node.js  |      65.0 |      3.05× |
| Dart ¹ ²                |     106.0 |      1.87× |
| JavaScript, Bun         |     130.3 |      1.52× |
| **JavaScript**, Node.js |     198.3 |      1.00× |

**Typing** (the 4010 `Normal` cases, typed key by key)

| Implementation          | Time (ms) |      Speed |
| ----------------------- | --------: | ---------: |
| **Rust**                |       112 | **15.31×** |
| Kotlin ¹ (JVM)          |       243 |      7.06× |
| Python ¹                |       250 |      6.87× |
| Go                      |       267 |      6.43× |
| N-API ¹, Node.js        |       408 |      4.20× |
| N-API ¹, Bun            |       411 |      4.17× |
| Dart ¹ ²                |       957 |      1.79× |
| JavaScript, Bun         |      1254 |      1.37× |
| **JavaScript**, Node.js |      1715 |      1.00× |

¹ via the Rust core. ² single cold pass [script](./packages/dart/lipilekhika/scripts/benchmark.dart).

Averages of the statistical suites: Rust [criterion](./packages/rust/src/benches/benchmark.rs), JS / WASM / N-API [mitata](./packages/js/scripts/bench_suite.mjs) (the built package), Go [`testing.B`](./packages/go/lipilekhika/benchmark_test.go), Python [pytest-benchmark](./packages/python/benchmarks/bench_lipilekhika.py), Kotlin [`Benchmark.kt`](./packages/kotlin/lipilekhika/src/test/kotlin/com/shubhattin/lipilekhika/core/Benchmark.kt). See [Contributing](./CONTRIBUTING.md#benchmarks) for how to run them.

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
