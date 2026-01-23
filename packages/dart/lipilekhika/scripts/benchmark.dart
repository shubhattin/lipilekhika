/// Benchmark script for lipilekhika Dart package
///
/// Measures performance of:
/// - Transliteration operations
/// - Typing emulation
library;

import 'dart:io';
import 'package:lipilekhika/lipilekhika.dart';
import 'package:yaml/yaml.dart';
import 'package:path/path.dart' as path;

// ANSI color codes for terminal output
const _cyan = '\x1B[36m';
const _yellow = '\x1B[33m';
const _bold = '\x1B[1m';
const _reset = '\x1B[0m';

/// Get test data folder path
Directory getTestDataFolder() {
  final scriptPath = Platform.script.toFilePath();
  final scriptFile = File(scriptPath);

  // Navigate up to find the root directory with test_data
  var currentDir = scriptFile.parent;
  while (currentDir.path != currentDir.parent.path) {
    final testDataCandidate =
        Directory(path.join(currentDir.path, 'test_data'));
    if (testDataCandidate.existsSync()) {
      return Directory(
          path.join(currentDir.path, 'test_data', 'transliteration'));
    }
    currentDir = currentDir.parent;
  }

  throw Exception('Could not find test_data folder');
}

/// Get typing test data folder path
Directory getTypingTestDataFolder() {
  final scriptPath = Platform.script.toFilePath();
  final scriptFile = File(scriptPath);

  var currentDir = scriptFile.parent;
  while (currentDir.path != currentDir.parent.path) {
    final testDataCandidate =
        Directory(path.join(currentDir.path, 'test_data'));
    if (testDataCandidate.existsSync()) {
      return Directory(path.join(currentDir.path, 'test_data', 'typing'));
    }
    currentDir = currentDir.parent;
  }

  throw Exception('Could not find typing test_data folder');
}

/// Recursively list all YAML files in a directory
List<File> listYamlFiles(Directory directory) {
  final collected = <File>[];
  final entries = directory.listSync(recursive: true);

  for (final entry in entries) {
    if (entry is File && entry.path.endsWith('.yaml')) {
      // Skip context directories for typing tests
      if (!entry.path.contains('context')) {
        collected.add(entry);
      }
    }
  }

  return collected;
}

/// Load all transliteration test data from YAML files
List<Map<dynamic, dynamic>> getTestData() {
  final data = <Map<dynamic, dynamic>>[];
  final testDataFolder = getTestDataFolder();
  final yamlFiles = listYamlFiles(testDataFolder);

  for (final yamlFile in yamlFiles) {
    final yamlContent = yamlFile.readAsStringSync();
    final rawData = loadYaml(yamlContent);

    if (rawData is YamlList) {
      for (final item in rawData) {
        if (item is Map) {
          data.add(item);
        }
      }
    }
  }

  return data;
}

/// Load all typing test data from YAML files
List<Map<dynamic, dynamic>> getTypingTestData() {
  final data = <Map<dynamic, dynamic>>[];
  final testDataFolder = getTypingTestDataFolder();
  final yamlFiles = listYamlFiles(testDataFolder);

  for (final yamlFile in yamlFiles) {
    final yamlContent = yamlFile.readAsStringSync();
    final rawData = loadYaml(yamlContent);

    if (rawData is YamlList) {
      for (final item in rawData) {
        if (item is Map) {
          data.add(item);
        }
      }
    }
  }

  return data;
}

/// Emulate typing text character by character
String emulateTyping(
  String text,
  String script, {
  Map<String, dynamic>? options,
}) {
  // Convert options to TypingContextOptions if provided
  TypingContextOptions? typingOptions;
  if (options != null) {
    typingOptions = TypingContextOptions(
      autoContextClearTimeMs: options['autoContextClearTimeMs'] != null
          ? BigInt.from(options['autoContextClearTimeMs'] as int)
          : BigInt.from(defaultAutoContextClearTimeMs),
      useNativeNumerals:
          options['useNativeNumerals'] as bool? ?? defaultUseNativeNumerals,
      includeInherentVowel: options['includeInherentVowel'] as bool? ??
          defaultIncludeInherentVowel,
    );
  }

  final ctx = createTypingContext(typingLang: script, options: typingOptions);
  var resultRunes = <int>[];

  // Iterate over Unicode code points
  for (final rune in text.runes) {
    final char = String.fromCharCode(rune);
    final diff = ctx.takeKeyInput(key: char);

    // Delete characters as needed
    if (diff.toDeleteCharsCount.toInt() > 0) {
      final deleteCount = diff.toDeleteCharsCount.toInt();
      if (deleteCount <= resultRunes.length) {
        resultRunes = resultRunes.sublist(0, resultRunes.length - deleteCount);
      }
    }

    // Add new text
    resultRunes.addAll(diff.diffAddText.runes);
  }

  return String.fromCharCodes(resultRunes);
}

/// Preload all script data
void preloadData() {
  for (final script in scriptList) {
    preloadScriptData(script);
  }
}

/// Run all benchmarks
Future<void> benchmark() async {
  print('${_bold}${_cyan}Loading test data...$_reset');
  final testData = getTestData();
  final typingTestData = getTypingTestData();

  print('Loaded ${testData.length} transliteration tests');
  print('Loaded ${typingTestData.length} typing tests\n');

  // Transliteration Cases
  print('${_bold}${_cyan}Transliteration Cases:$_reset');
  preloadData();

  final translitStart = DateTime.now();
  for (final test in testData) {
    // Convert options from YamlMap to Map<String, bool> if present
    Map<String, bool>? options;
    if (test['options'] != null) {
      final rawOptions = test['options'];
      if (rawOptions is Map) {
        options = {};
        rawOptions.forEach((key, value) {
          options![key.toString()] = value as bool;
        });
      }
    }

    transliterate(
      text: test['input'] as String,
      fromScript: test['from'] as String,
      toScript: test['to'] as String,
      options: options,
    );
  }
  final translitEnd = DateTime.now();
  final translitElapsed =
      translitEnd.difference(translitStart).inMicroseconds / 1000;
  print(
      'Time taken: $_yellow${translitElapsed.toStringAsFixed(2)} ms$_reset\n');

  // Typing Emulation
  print('${_bold}${_cyan}Typing Emulation:$_reset');

  // 1. Emulate on Normal to others
  final normalToOthers =
      testData.where((td) => td['from'] == 'Normal').toList();

  final typingStart = DateTime.now();
  for (final test in normalToOthers) {
    emulateTyping(
      test['input'] as String,
      test['to'] as String,
    );
  }

  // 2. Emulate on typing mode tests
  for (final test in typingTestData) {
    // Convert options from YamlMap to Map<String, dynamic> if present
    Map<String, dynamic>? options;
    if (test['options'] != null) {
      final rawOptions = test['options'];
      if (rawOptions is Map) {
        options = {};
        rawOptions.forEach((key, value) {
          options![key.toString()] = value;
        });
      }
    }

    emulateTyping(
      test['text'] as String,
      test['script'] as String,
      options: options,
    );
  }
  final typingEnd = DateTime.now();
  final typingElapsed = typingEnd.difference(typingStart).inMicroseconds / 1000;
  print('Time taken: $_yellow${typingElapsed.toStringAsFixed(2)} ms$_reset\n');
}

Future<void> main() async {
  await initLipiLekhika();
  await benchmark();
}
