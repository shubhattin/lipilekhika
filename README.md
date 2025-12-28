# Lipi Lekhika

**A powerful, fast, and open-source transliteration tool for Indian Brahmic scripts**

[![Website](https://img.shields.io/badge/Website-lipilekhika.in-blue)](https://lipilekhika.in)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

---

## 🌟 About

Lipi Lekhika is a comprehensive transliteration tool designed for Indian [Brahmic Scripts](https://en.wikipedia.org/wiki/Brahmic_scripts). It enables seamless conversion between different Indian scripts and provides powerful realtime typing capabilities for Indian languages.


## 📦 Packages

Lipi Lekhika is available for multiple programming languages:

### JavaScript

[![npm version](https://img.shields.io/npm/v/lipilekhika.svg)](https://www.npmjs.com/package/lipilekhika)
[![npm downloads](https://img.shields.io/npm/dm/lipilekhika.svg)](https://www.npmjs.com/package/lipilekhika)

- **NPM Package**: [`lipilekhika`](https://www.npmjs.com/package/lipilekhika)
- **Repository README**: [packages/js/README.md](./packages/js/README.md)
- **Documentation**: [JavaScript Guide](https://lipilekhika.in/getting-started/javascript)

<!-- ### Python

🚧 **Coming Soon** - Python package is currently in development

- **Repository**: [packages/python](./packages/python) -->

### Other Languages

Support for **Rust**, **Python** and **Go** is planned for future releases.

---

### Supported Scripts

Lipi Lekhika supports all **modern Indian scripts** including:

- **Devanagari** - Hindi, Sanskrit, Marathi, Nepali, Konkani
- **Bengali** - Bengali, Assamese(few aksharas are different)
- **Telugu** - Telugu
- **Tamil** - Tamil (Standard & **Extended**)
- **Kannada** - Kannada
- **Malayalam** - Malayalam
- **Gujarati** - Gujarati
- **Gurumukhi** - Punjabi
- **Odia** - Odia
- **Assamese** - Assamese
- **Sinhala** - Sinhala
- **Purna Devangari** - A Universal Script to represent all Indian Languages. This is possible as the devanagari script has characters (extended) for all Languages. Including Tamil and even Sindhi and Kashmiri. 

### Ancient Brahmic Scripts

Beyond modern scripts, Lipi Lekhika also supports historical and ancient scripts:

- **[Brahmi](https://en.wikipedia.org/wiki/Brahmi_script)** - 𑀦𑀫𑀲𑁆𑀓𑀸𑀭𑀫𑁆
- **[Grantha](https://en.wikipedia.org/wiki/Grantha_script)** - 𑌨𑌮𑌸𑍍𑌕𑌾𑌰𑌮𑍍
- **[Modi](https://en.wikipedia.org/wiki/Modi_script)** - 𑘡𑘦𑘭𑘿𑘎𑘰𑘨𑘦𑘿
- **[Sharada](https://en.wikipedia.org/wiki/Sharada_script)** - 𑆤𑆩𑆱𑇀𑆑𑆳𑆫𑆩𑇀
- **[Siddham](https://en.wikipedia.org/wiki/Siddha%E1%B9%83_script)** - 𑖡𑖦𑖭𑖿𑖎𑖯𑖨𑖦𑖿

### Romanization Standards

Two special output formats are available:

- **Romanized** - Based on [IAST](https://en.wikipedia.org/wiki/International_Alphabet_of_Sanskrit_Transliteration) and [ISO 15919](https://en.wikipedia.org/wiki/ISO_15919) standards
- **Normal** - An intuitive standard inspired by [ITRANS](https://en.wikipedia.org/wiki/ITRANS) and [Harvard-Kyoto](https://en.wikipedia.org/wiki/Harvard-Kyoto)

📖 **[Full List of Supported Scripts](https://lipilekhika.in/reference/supported_scripts)**

---

## ✨ Features

### 🔄 Bidirectional Transliteration

Convert text seamlessly between any supported Indian script. All modern Indian scripts are fully supported with high accuracy transliteration.

**Example: "नमस्कारम्" (Namaskaram) across scripts:**

| Script | Text |
|--------|------|
| Devanagari | नमस्कारम् |
| Telugu | నమస్కారమ్ |
| Gujarati | નમસ્કારમ્ |
| Normal | namaskAram |
| Romanized | namaskāram |

### ⌨️ Realtime Typing Tool

A fast, accurate, and predictable typing tool for Indian languages that enables you to type with full speed and accuracy. The typing system uses an intuitive key mapping approach that makes it easy to learn and use.

- **Low-latency** - Instant character rendering without perceptible delay
- **Predictable** - Consistent and logical key mappings
- **Accurate** - High-fidelity transliteration as you type
- **Browser-ready** - Works seamlessly with `<input>` and `<textarea>` elements

📖 **[Realtime Typing Reference](https://lipilekhika.in/reference/realtime_typing)**

### 🕉️ Vedic Sanskrit Support

Comprehensive support for Vedic Sanskrit with accent symbols (स्वर). Almost all modern Indian scripts can display Vedic accents, and Lipi Lekhika provides robust typing and transliteration for them.

**Example: "ॐ सह नाववतु" (Om Saha Navavatu) with Vedic accents:**

- **Devanagari**: ॐ स॒ह ना॑ववतु । स॒ह नौ॑ भुनक्तु ।
- **Kannada**: ಓಂ ಸ॒ಹ ನಾ॑ವವತು । ಸ॒ಹ ನೌ॑ ಭುನಕ್ತು ।
- **Bengali**: ওঁ স॒হ না॑ববতু । স॒হ নৌ॑ ভুনক্তু ।
- **Tamil Extended**: ௐ ஸ॒ஹ நா॑வவது । ஸ॒ஹ நௌ॑ பு⁴நக்து ।

### ⚙️ Custom Transliteration and Typing Options

Fine-tune transliteration behavior with custom options for specific use cases:

- **Native Numerals** - Convert digits to script-specific numerals
- **Inherent Vowel Control** - Handle [schwa deletion](https://en.wikipedia.org/wiki/Schwa_deletion_in_Indo-Aryan_languages)
- **Script-Specific Options** - Brahmic-to-Brahmic transformations, romanization preferences, and more
- 📖 **[Custom Transliteration Options](https://lipilekhika.in/reference/custom_trans_options)**

### 🎯 Type-Safe APIs

All packages are designed with developer experience in mind:

- **Type-safe** script and language names with autocomplete
- **Tree-shakable** - Only bundle what you use
- **Well-documented** - Comprehensive API documentation
- **Zero dependencies** - Minimal footprint

### 🌍 Multiple Distribution Formats

Each package supports multiple formats for maximum compatibility:

- **ESM** (ECMAScript Modules)
- **CommonJS**
- **UMD** (Universal Module Definition)
- Direct CDN usage for browsers

---

## 🚀 Getting Started

### Web Application

Try Lipi Lekhika directly in your browser with our web application:

🌐 **[lipilekhika.in/app](https://lipilekhika.in/app)**

### Documentation

Comprehensive documentation, guides, and API references:

📖 **[lipilekhika.in](https://lipilekhika.in)**

Key documentation sections:

- [Introduction](https://lipilekhika.in/getting-started/introduction)
- [JavaScript/TypeScript Guide](https://lipilekhika.in/getting-started/javascript)
- [Browser Typing Tool](https://lipilekhika.in/getting-started/browser_typing_tool)
- [Supported Scripts](https://lipilekhika.in/reference/supported_scripts)
- [Custom Options Reference](https://lipilekhika.in/reference/custom_trans_options)

---

## 🤝 Contributing

Contributions are welcome! Whether it's bug reports, feature requests, or code contributions, we appreciate your help in making Lipi Lekhika better.

- **Report Issues**: [GitHub Issues](https://github.com/shubhattin/lipilekhika/issues)
- **Source Code**: [GitHub Repository](https://github.com/shubhattin/lipilekhika)

---

## 🔗 Links

- **Website**: [lipilekhika.in](https://lipilekhika.in)
- **GitHub**: [github.com/shubhattin/lipilekhika](https://github.com/shubhattin/lipilekhika)
- **NPM Package**: [npmjs.com/package/lipilekhika](https://www.npmjs.com/package/lipilekhika)
- **Documentation**: [lipilekhika.in](https://lipilekhika.in/getting-started/introduction/)

### Old Lipi Lekhika

- **Github Archive** : [shubhattin/old_lipi_lekhika_archive](https://github.com/shubhattin/old_lipi_lekhika_archive)
- **Old Web App** : [Old Lipi Lekhika](https://lipilekhika.in/old/)
- **Old Windows and Android App Binaries**: [Old Binaries Release](https://github.com/shubhattin/lipilekhika/releases/tag/old)