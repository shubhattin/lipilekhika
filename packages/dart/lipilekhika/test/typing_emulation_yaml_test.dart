/// Tests for typing emulation functionality using YAML test data.
library;

import 'dart:io';
import 'package:lipilekhika/lipilekhika.dart';
import 'package:test/test.dart';
import 'package:yaml/yaml.dart';
import 'package:path/path.dart' as path;

// Vedic svaras for special handling
const vedicSvaras = ['॒', '॑', '᳚', '᳛'];

/// Check if text contains any Vedic svara
bool hasVedicSvara(String text) {
  return vedicSvaras.any((svara) => text.contains(svara));
}

/// Recursively list all YAML files in a directory, excluding 'context' directories
List<File> listYamlFiles(Directory directory) {
  final collected = <File>[];
  final entries = directory.listSync();

  for (final entry in entries) {
    if (entry is Directory) {
      // Skip 'context' directories
      if (path.basename(entry.path) != 'context') {
        collected.addAll(listYamlFiles(entry));
      }
    } else if (entry is File && entry.path.endsWith('.yaml')) {
      collected.add(entry);
    }
  }

  return collected;
}

/// Test data item for transliteration-based typing tests
class EmulateTypingDataItem {
  final dynamic index;
  final String from;
  final String to;
  final String input;
  final String output;
  final bool reversible;
  final bool todo;
  final Map<String, bool>? options;

  EmulateTypingDataItem({
    required this.index,
    required this.from,
    required this.to,
    required this.input,
    required this.output,
    this.reversible = false,
    this.todo = false,
    this.options,
  });

  factory EmulateTypingDataItem.fromYaml(Map<dynamic, dynamic> data) {
    return EmulateTypingDataItem(
      index: data['index'] ?? 'unknown',
      from: data['from'] as String,
      to: data['to'] as String,
      input: data['input'] as String,
      output: data['output'] as String,
      reversible: data['reversible'] as bool? ?? false,
      todo: data['todo'] as bool? ?? false,
      options: (data['options'] as Map<dynamic, dynamic>?)?.map(
        (key, value) => MapEntry(key.toString(), value as bool),
      ),
    );
  }
}

/// Test data item for typing mode tests
class TypingModeDataItem {
  final dynamic index;
  final String text;
  final String output;
  final String script;
  final bool preserveCheck;
  final bool todo;
  final Map<String, dynamic>? options;

  TypingModeDataItem({
    required this.index,
    required this.text,
    required this.output,
    required this.script,
    this.preserveCheck = false,
    this.todo = false,
    this.options,
  });

  factory TypingModeDataItem.fromYaml(Map<dynamic, dynamic> data) {
    return TypingModeDataItem(
      index: data['index'] ?? 'unknown',
      text: data['text'] as String,
      output: data['output'] as String,
      script: data['script'] as String,
      preserveCheck: data['preserve_check'] as bool? ?? false,
      todo: data['todo'] as bool? ?? false,
      options: (data['options'] as Map<dynamic, dynamic>?)?.map(
        (key, value) => MapEntry(key.toString(), value),
      ),
    );
  }
}

/// Helper function to emulate typing character by character
/// Uses text.runes to properly iterate over Unicode code points
/// instead of UTF-16 code units (important for non-BMP characters like Siddham)
String emulateTyping(
  String text,
  String script, {
  TypingContextOptions? options,
}) {
  final ctx = createTypingContext(typingLang: script, options: options);
  var resultRunes = <int>[];

  // Iterate over Unicode code points, not UTF-16 code units
  for (final rune in text.runes) {
    final char = String.fromCharCode(rune);
    final diff = ctx.takeKeyInput(key: char);

    // Delete characters as needed (count is in Unicode code points)
    if (diff.toDeleteCharsCount.toInt() > 0) {
      final deleteCount = diff.toDeleteCharsCount.toInt();
      if (deleteCount <= resultRunes.length) {
        resultRunes = resultRunes.sublist(0, resultRunes.length - deleteCount);
      }
    }

    // Add new text (convert to runes to maintain proper counting)
    resultRunes.addAll(diff.diffAddText.runes);
  }

  return String.fromCharCodes(resultRunes);
}

void main() {
  setUpAll(() async {
    // Initialize the library before running tests
    await initLipiLekhika();
  });

  group('Emulate Typing from Transliteration Data', () {
    // Navigate up from current directory to find the lipilekhika root
    var currentDir = Directory.current;
    while (currentDir.path != currentDir.parent.path) {
      final testDataCandidate =
          Directory(path.join(currentDir.path, 'test_data'));
      if (testDataCandidate.existsSync()) {
        break;
      }
      currentDir = currentDir.parent;
    }

    final inputFolders = [
      Directory(path.join(
          currentDir.path, 'test_data', 'transliteration', 'auto-nor-brahmic')),
      Directory(path.join(
          currentDir.path, 'test_data', 'transliteration', 'auto-nor-other')),
    ];

    for (final folder in inputFolders) {
      if (!folder.existsSync()) {
        continue;
      }

      final folderName = path.basename(folder.path);
      group('⌨️ $folderName', () {
        final yamlFiles = folder
            .listSync()
            .whereType<File>()
            .where((f) => f.path.endsWith('.yaml'))
            .toList();

        for (final yamlFile in yamlFiles) {
          final fileName = path.basename(yamlFile.path);
          final yamlContent = yamlFile.readAsStringSync();
          final rawTestData = loadYaml(yamlContent) as YamlList;

          final testData = rawTestData
              .map((item) =>
                  EmulateTypingDataItem.fromYaml(item as Map<dynamic, dynamic>))
              .toList();

          group(fileName.replaceAll('.yaml', ''), () {
            for (final testItem in testData) {
              // Only test Normal → Script conversions (not Script → Normal)
              if (testItem.from != 'Normal' || testItem.to == 'Normal') {
                continue;
              }

              // Skip TODO tests
              if (testItem.todo) {
                continue;
              }

              test('${testItem.index} - ${testItem.to}', () {
                final result = emulateTyping(testItem.input, testItem.to);

                // Special handling for Tamil-Extended with Vedic svaras
                if (fileName.startsWith('auto') &&
                    testItem.to == 'Tamil-Extended' &&
                    hasVedicSvara(result)) {
                  return;
                }

                final errorMessage = 'Emulate Typing failed:\n'
                    '  File: $fileName\n'
                    '  Index: ${testItem.index}\n'
                    '  From: ${testItem.from}\n'
                    '  To: ${testItem.to}\n'
                    '  Input: "${testItem.input}"\n'
                    '  Expected: "${testItem.output}"\n'
                    '  Actual: "$result"';

                expect(result, testItem.output, reason: errorMessage);
              });
            }
          });
        }
      });
    }
  });

  group('Typing Mode Tests', () {
    // Navigate up from current directory to find the lipilekhika root
    var currentDir = Directory.current;
    while (currentDir.path != currentDir.parent.path) {
      final testDataCandidate =
          Directory(path.join(currentDir.path, 'test_data'));
      if (testDataCandidate.existsSync()) {
        break;
      }
      currentDir = currentDir.parent;
    }
    final testDataFolder =
        Directory(path.join(currentDir.path, 'test_data', 'typing'));

    if (!testDataFolder.existsSync()) {
      test('Typing test data folder should exist', () {
        fail('Test data folder not found at ${testDataFolder.path}');
      });
      return;
    }

    final yamlFiles = listYamlFiles(testDataFolder);

    for (final yamlFile in yamlFiles) {
      final fileName = path.basename(yamlFile.path);
      final testName = fileName.replaceAll('.yaml', '');

      group(testName, () {
        final yamlContent = yamlFile.readAsStringSync();
        final rawTestData = loadYaml(yamlContent) as YamlList;

        final testData = rawTestData
            .map((item) =>
                TypingModeDataItem.fromYaml(item as Map<dynamic, dynamic>))
            .toList();

        for (final testItem in testData) {
          // Skip TODO tests
          if (testItem.todo) {
            continue;
          }

          test('${testItem.index} - ${testItem.script}', () {
            // Convert options to TypingContextOptions
            TypingContextOptions? options;
            if (testItem.options != null) {
              options = TypingContextOptions(
                autoContextClearTimeMs:
                    testItem.options!['autoContextClearTimeMs'] != null
                        ? BigInt.from(
                            testItem.options!['autoContextClearTimeMs'] as int)
                        : BigInt.from(defaultAutoContextClearTimeMs),
                useNativeNumerals:
                    testItem.options!['useNativeNumerals'] as bool? ??
                        defaultUseNativeNumerals,
                includeInherentVowel:
                    testItem.options!['includeInherentVowel'] as bool? ??
                        defaultIncludeInherentVowel,
              );
            }

            final result = emulateTyping(
              testItem.text,
              testItem.script,
              options: options,
            );

            final errorMessage = 'Typing Mode failed:\n'
                '  File: $fileName\n'
                '  Index: ${testItem.index}\n'
                '  Script: ${testItem.script}\n'
                '  Input: "${testItem.text}"\n'
                '  Expected: "${testItem.output}"\n'
                '  Actual: "$result"';

            expect(result, testItem.output, reason: errorMessage);
          });

          // Preserve check: type → transliterate back → should get original
          if (testItem.preserveCheck) {
            test('${testItem.index} - ${testItem.script} - preserve check', () {
              // Convert options
              TypingContextOptions? options;
              if (testItem.options != null) {
                options = TypingContextOptions(
                  autoContextClearTimeMs: testItem
                              .options!['autoContextClearTimeMs'] !=
                          null
                      ? BigInt.from(
                          testItem.options!['autoContextClearTimeMs'] as int)
                      : BigInt.from(defaultAutoContextClearTimeMs),
                  useNativeNumerals:
                      testItem.options!['useNativeNumerals'] as bool? ??
                          defaultUseNativeNumerals,
                  includeInherentVowel:
                      testItem.options!['includeInherentVowel'] as bool? ??
                          defaultIncludeInherentVowel,
                );
              }

              final result = emulateTyping(
                testItem.text,
                testItem.script,
                options: options,
              );

              // Transliterate back to Normal
              final resultBack = transliterate(
                text: result,
                fromScript: testItem.script,
                toScript: 'Normal',
                options: {'all_to_normal:preserve_specific_chars': true},
              );

              final errorMessagePreserve = 'Preserve Check failed:\n'
                  '  File: $fileName\n'
                  '  Index: ${testItem.index}\n'
                  '  Script: ${testItem.script}\n'
                  '  Original Input: "${testItem.text}"\n'
                  '  Typed Output: "$result"\n'
                  '  Transliterated Back: "$resultBack"';

              expect(resultBack, testItem.text, reason: errorMessagePreserve);
            });
          }
        }
      });
    }
  });
}
