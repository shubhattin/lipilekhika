/// Typing context functions for LipiLekhika.
///
/// This module provides high-level functions for real-time character-by-character
/// input typing with transliteration support.
library;

import 'rust/api/typing.dart' as rust_typing;

// Re-export types from the generated bindings
export 'rust/api/typing.dart'
    show
        TypingContext,
        TypingContextOptions,
        TypingDiff,
        ListType,
        TypingDataMapItem,
        ScriptTypingDataMap,
        KramaDataItem;

/// Default time in milliseconds after which the context will be cleared automatically.
int get defaultAutoContextClearTimeMs =>
    rust_typing.defaultAutoContextClearTimeMs().toInt();

/// Default value for using native numerals while typing.
bool get defaultUseNativeNumerals => rust_typing.defaultUseNativeNumerals();

/// Default value for including inherent vowels while typing.
/// By default avoids schwa deletion.
bool get defaultIncludeInherentVowel =>
    rust_typing.defaultIncludeInherentVowel();

/// Creates a stateful isolated context for character by character input typing.
///
/// This is the main function which returns a context object with methods for
/// handling typing input. Different realtime schemes can be implemented using this.
///
/// [typingLang] - The script/language to type in
/// [options] - Optional configuration for the typing context
///
/// Returns a typing context object with the following methods:
/// - `clearContext()`: Clears all internal states and contexts
/// - `takeKeyInput(key)`: Accepts character input and returns the diff
/// - `updateUseNativeNumerals(value)`: Update native numerals setting
/// - `updateIncludeInherentVowel(value)`: Update inherent vowel setting
/// - `getUseNativeNumerals()`: Get current native numerals setting
/// - `getIncludeInherentVowel()`: Get current inherent vowel setting
///
/// Throws an exception if an invalid script name is provided.
///
/// Example:
/// ```dart
/// final ctx = createTypingContext(typingLang: 'Devanagari');
///
/// // Process each key press
/// final diff = ctx.takeKeyInput(key: 'k');
/// // diff.toDeleteCharsCount tells how many chars to delete
/// // diff.diffAddText tells what text to add
/// ```
rust_typing.TypingContext createTypingContext({
  required String typingLang,
  rust_typing.TypingContextOptions? options,
}) {
  return rust_typing.TypingContext(
    typingLang: typingLang,
    options: options,
  );
}

/// Returns the typing data map for a script.
///
/// This function can be used to compare the krama array of two scripts.
/// It's especially useful for brahmic scripts, as they have a direct correlation.
///
/// [script] - The script to get the typing data map for
///
/// Returns a ScriptTypingDataMap object containing:
/// - `commonKramaMap`: Mappings for common characters across scripts
/// - `scriptSpecificKramaMap`: Mappings for script-specific characters
///
/// Each mapping contains:
/// - `text`: The displayed character in the target script
/// - `listType`: One of ListType.anya, ListType.vyanjana, ListType.matra, ListType.svara
/// - `mappings`: List of input key sequences that produce this character
///
/// Throws an exception if an invalid script name is provided or if 'Normal' is used.
rust_typing.ScriptTypingDataMap getScriptTypingDataMap(String script) {
  return rust_typing.getScriptTypingDataMap(script: script);
}

/// Returns the krama data for a script (character + type pairs).
///
/// Used for comparing character sets between scripts. Each script's krama array
/// has a 1:1 correspondence at the same indices, making it useful for side-by-side
/// comparison of characters across Brahmic scripts.
///
/// [script] - The script/language name to get krama data for
///
/// Returns a list of KramaDataItem, where each item contains:
/// - `characterText`: The displayed character in the target script
/// - `listType`: One of ListType.anya, ListType.vyanjana, ListType.matra, ListType.svara
///
/// Throws an exception if an invalid script name is provided or if 'Normal' is used.
List<rust_typing.KramaDataItem> getScriptKramaData(String script) {
  return rust_typing.getScriptKramaData(script: script);
}
