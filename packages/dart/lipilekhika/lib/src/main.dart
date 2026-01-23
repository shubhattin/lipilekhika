/// Main transliteration functions for LipiLekhika.
///
/// This module provides high-level functions for transliterating text
/// between Indian Brahmic scripts and languages.
library;

import 'rust/frb_generated.dart';
import 'rust/api/main.dart' as rust_main;

export 'rust/api/main.dart' show ScriptListData;

/// Initializes the LipiLekhika library.
///
/// This must be called before using any other functions in the library.
Future<void> initLipiLekhika() async {
  await RustLib.init();
}

/// Transliterates text from one script/language to another.
///
/// [text] - The text to transliterate
/// [fromScript] - The script/language to transliterate from
/// [toScript] - The script/language to transliterate to
/// [options] - Optional custom transliteration options
///
/// Returns the transliterated text.
///
/// Throws an exception if an invalid script name is provided.
///
/// Example:
/// ```dart
/// final result = transliterate(
///   text: 'namaste',
///   fromScript: 'Normal',
///   toScript: 'Devanagari',
/// );
/// print(result); // नमस्ते
/// ```
String transliterate({
  required String text,
  required String fromScript,
  required String toScript,
  Map<String, bool>? options,
}) {
  return rust_main.transliterate(
    text: text,
    fromScript: fromScript,
    toScript: toScript,
    options: options,
  );
}

/// Preloads the script data for the given script/language.
///
/// This is useful for avoiding fetch latency in applications where
/// you want to ensure the script data is loaded before use.
///
/// [scriptName] - The name of the script/language to preload
void preloadScriptData(String scriptName) {
  rust_main.preloadScriptData(scriptName: scriptName);
}

/// Returns the schwa deletion characteristic of the script provided.
///
/// This is the property in which an inherent vowel 'a' (अ) is added to
/// the end of vyanjana (consonant) characters.
///
/// Returns:
/// - `true` if the script has schwa deletion
/// - `false` if the script doesn't have schwa deletion
/// - `null` if the script is not a brahmic script
///
/// Throws an exception if an invalid script name is provided.
bool? getSchwaStatusForScript(String scriptName) {
  return rust_main.getSchwaStatusForScript(scriptName: scriptName);
}

/// Returns the list of all supported custom options for transliterations.
///
/// This function returns all available custom options for the provided
/// script pair that can be used in the transliterate function.
///
/// [fromScript] - The script/language to transliterate from
/// [toScript] - The script/language to transliterate to
///
/// Returns the list of all supported custom options for the provided script pair.
///
/// Throws an exception if an invalid script name is provided.
List<String> getAllOptions({
  required String fromScript,
  required String toScript,
}) {
  return rust_main.getAllOptions(
    fromScript: fromScript,
    toScript: toScript,
  );
}

/// Get the normalized script name for the given script/language.
///
/// This function maps language names to their corresponding script names
/// and validates that the provided name is a valid script/language.
///
/// [scriptName] - The script/language name to normalize
///
/// Returns the normalized script name, or null if invalid.
String? getNormalizedScriptName(String scriptName) {
  return rust_main.getNormalizedScriptName(scriptName: scriptName);
}

/// Returns the script list data containing all script and language mappings.
///
/// This contains:
/// - `scripts`: Map of script names to their indices
/// - `langs`: Map of language names to their indices
/// - `langScriptMap`: Map of language names to their corresponding script names
/// - `scriptAlternatesMap`: Map of script name alternates
rust_main.ScriptListData getScriptListData() {
  return rust_main.getScriptListData();
}

/// The list of all supported script names.
late final List<String> scriptList = getScriptListData().scripts.keys.toList();

/// The list of all supported language names which are mapped to a script.
late final List<String> langList = getScriptListData().langs.keys.toList();

/// Combined list of all supported scripts and languages.
late final List<String> allScriptLangList = {...scriptList, ...langList}.toList();
