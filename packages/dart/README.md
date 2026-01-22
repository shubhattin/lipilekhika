# LipiLekhika for Dart/Flutter

A Dart/Flutter package for transliterating text between Indian Brahmic scripts. Powered by Rust via [flutter_rust_bridge](https://cjycode.com/flutter_rust_bridge/).

## Features

- 🚀 **Fast**: Uses Rust compiled functions for high-performance transliteration
- 📝 **Comprehensive**: Supports 20+ Indian scripts and languages
- ⌨️ **Typing Support**: Real-time character-by-character typing with transliteration
- 🔧 **Customizable**: Fine-grained control over transliteration options

## Installation

Add this to your `pubspec.yaml`:

```yaml
dependencies:
  lipilekhika:
    git:
      url: https://github.com/shubhattin/lipilekhika
      path: packages/dart/lipilekhika
```

## Usage

### Initialization

Before using any functions, initialize the library:

```dart
import 'package:lipilekhika/lipilekhika.dart';

void main() async {
  await initLipiLekhika();
  runApp(MyApp());
}
```

### Basic Transliteration

```dart
import 'package:lipilekhika/lipilekhika.dart';

// Transliterate from Roman (Normal) to Devanagari
final result = transliterate(
  text: 'namaste',
  fromScript: 'Normal',
  toScript: 'Devanagari',
);
print(result); // नमस्ते

// Transliterate between scripts
final bengali = transliterate(
  text: 'नमस्ते',
  fromScript: 'Devanagari',
  toScript: 'Bengali',
);
print(bengali); // নমস্তে
```

### Real-time Typing

For real-time keyboard input transliteration:

```dart
import 'package:lipilekhika/lipilekhika.dart';

// Create a typing context
final ctx = createTypingContext(typingLang: 'Devanagari');

// Process each key press
void onKeyPress(String key) {
  final diff = ctx.takeKeyInput(key: key);
  
  // diff.toDeleteCharsCount - number of characters to delete from display
  // diff.diffAddText - text to add to display
  
  // Update your text field accordingly
}

// Clear context when needed (e.g., on focus loss)
ctx.clearContext();
```

### Typing Options

```dart
final ctx = createTypingContext(
  typingLang: 'Hindi',
  options: TypingContextOptions(
    autoContextClearTimeMs: 4500, // Auto-clear after 4.5 seconds
    useNativeNumerals: true,      // Use native Hindi numerals
    includeInherentVowel: true,   // Include schwa (for Hindi)
  ),
);
```

### Get Available Scripts

```dart
// Get list of all supported scripts
print(scriptList); // ['Devanagari', 'Bengali', 'Tamil', ...]

// Get list of all supported languages
print(langList); // ['Hindi', 'Bengali', 'Tamil', ...]

// Get all available scripts and languages
print(allScriptLangList);
```

### Transliteration Options

```dart
// Get available options for a script pair
final options = getAllOptions(
  fromScript: 'Normal',
  toScript: 'Devanagari',
);
print(options);

// Use options in transliteration
final result = transliterate(
  text: 'text',
  fromScript: 'Normal',
  toScript: 'Devanagari',
  options: {'some_option': true},
);
```

## Supported Scripts

- **Brahmic Scripts**: Devanagari, Bengali, Gurmukhi, Gujarati, Oriya, Tamil, Telugu, Kannada, Malayalam, Sinhala, Thai, Burmese, Khmer, Tibetan, and more
- **Romanization**: IAST, ITRANS, Harvard-Kyoto, Velthuis, and more
- **Languages**: Hindi, Sanskrit, Marathi, Nepali, Bengali, Gujarati, Punjabi, Tamil, Telugu, Kannada, Malayalam, and more

## License

MIT License - see [LICENSE](../../LICENCE) for details.
