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
- 🪟 **Windows** - Download the [latest MSI installer](https://lipilekhika.in/redirect/pc-app-release-win-download)
- 🤖 **Android** - download the [latest APK](https://lipilekhika.in/redirect/mobile-app-release-page)
- 🐧 **Linux** - Install the [fcitx5 plugin](https://github.com/shubhattin/lipilekhika/blob/main/plugins/fcitx5/README.md)

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

Transliteration benchmarks on the shared [`test_data`](./test_data) corpus (lower is better).

`Benchmark machine: Intel Core i5-12450H (12 threads, up to 4.40 GHz)`

The Rust implementation is **~9× faster** than pure JavaScript (51 ms vs 464 ms). And with multiple threads its **42x** faster.

| Implementation | Time (ms) |
| --- | ---: |
| JavaScript | 464 |
| **Rust** | **51** |
| Python *(via Rust)* | 64 |
| Node.js N-API *(via Rust)* | 78 |
| WebAssembly *(via Rust)* | 120 |
| Dart *(via Rust)* | 130 |
| **Rust (Multi thread)** | 11 |

**Benchmark scripts:** [JavaScript](./packages/js/src/scripts/benchmark.ts) (also covers N-API & WASM) · [Rust](./packages/rust/src/benches/benchmark.rs) · [Python](./packages/python/scripts/benchmark.py) · [Dart](./packages/dart/lipilekhika/scripts/benchmark.dart) · [Go](./packages/go/lipilekhika/bench/benchmark.go)

> Even the initial Rust rewrite (almost line by line) was _439 ms_ (JS : 740 ms). But after some simple optmization like
using `HashMap` (over binary search for lookups) and `Vec<char>` (to iterate in string) it was at _155 ms_ (JS : 460 ms). But now after optimizations
(like avoid heap allocations and better data structures). Moving to `no_std` also  improved performance (-12ms) for some reason.
The performance now is at **51 ms**.

## 🤝 Contributing

Contributions are welcome! Help us improve Lipi Lekhika through bug reports, feature requests, or code contributions.

See [CONTRIBUTING.md](CONTRIBUTING.md) for development and testing setup.

**GitHub Repository**: [github.com/shubhattin/lipilekhika](https://github.com/shubhattin/lipilekhika) · **Issues**: [Report here](https://github.com/shubhattin/lipilekhika/issues)


---

## 📚 Legacy

**Old Lipi Lekhika** (archived version):

- [GitHub Archive](https://github.com/shubhattin/old_lipi_lekhika_archive) · [Old Web App](https://lipilekhika.in/old/) · [Windows/Android Binaries](https://github.com/shubhattin/lipilekhika/releases/tag/old)
