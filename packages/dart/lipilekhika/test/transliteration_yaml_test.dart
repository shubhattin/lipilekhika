/// Tests for transliteration functionality using YAML test data.
library;

import 'dart:io';
import 'package:lipilekhika/lipilekhika.dart';
import 'package:test/test.dart';
import 'package:yaml/yaml.dart';
import 'package:path/path.dart' as path;

// Vedic svaras for special handling
const vedicSvaras = ['॒', '॑', '᳚', '᳛'];

/// Test data item structure for transliteration tests
class TransliterationDataItem {
  final dynamic index;
  final String from;
  final String to;
  final String input;
  final String output;
  final bool reversible;
  final bool todo;
  final Map<String, bool>? options;

  TransliterationDataItem({
    required this.index,
    required this.from,
    required this.to,
    required this.input,
    required this.output,
    this.reversible = false,
    this.todo = false,
    this.options,
  });

  factory TransliterationDataItem.fromYaml(Map<dynamic, dynamic> data) {
    return TransliterationDataItem(
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

/// Recursively list all YAML files in a directory
List<File> listYamlFiles(Directory directory) {
  final collected = <File>[];
  final entries = directory.listSync();

  for (final entry in entries) {
    if (entry is Directory) {
      collected.addAll(listYamlFiles(entry));
    } else if (entry is File && entry.path.endsWith('.yaml')) {
      collected.add(entry);
    }
  }

  return collected;
}

/// Check if text contains any Vedic svara
bool hasVedicSvara(String text) {
  return vedicSvaras.any((svara) => text.contains(svara));
}

void main() {
  setUpAll(() async {
    // Initialize the library before running tests
    await initLipiLekhika();
  });

  group('Transliteration from YAML Test Data', () {
    // Get the test data folder path
    // When running via `dart test`, we start from current working directory
    // and search upwards for the test_data folder
    var currentDir = Directory.current;
    while (currentDir.path != currentDir.parent.path) {
      // Check if we're at the lipilekhika root (has test_data folder)
      final testDataCandidate =
          Directory(path.join(currentDir.path, 'test_data'));
      if (testDataCandidate.existsSync()) {
        break;
      }
      currentDir = currentDir.parent;
    }

    final testDataFolder =
        Directory(path.join(currentDir.path, 'test_data', 'transliteration'));

    // Files to ignore
    const testFilesToIgnore = <String>[];

    test('Test data folder should exist', () {
      expect(testDataFolder.existsSync(), isTrue,
          reason: 'Test data folder not found at ${testDataFolder.path}');
    });

    // Get all YAML files
    final yamlFiles =
        testDataFolder.existsSync() ? listYamlFiles(testDataFolder) : <File>[];

    test('Should have test files', () {
      expect(yamlFiles, isNotEmpty, reason: 'No YAML test files found');
    });

    for (final yamlFile in yamlFiles) {
      final relativePath =
          path.relative(yamlFile.path, from: testDataFolder.path);
      final fileName = path.basename(yamlFile.path);

      // Skip ignored files
      if (testFilesToIgnore.contains(relativePath) ||
          testFilesToIgnore.contains(fileName)) {
        continue;
      }

      group('📄 $relativePath', () {
        // Load test data
        final yamlContent = yamlFile.readAsStringSync();
        final rawTestData = loadYaml(yamlContent) as YamlList;

        for (final itemData in rawTestData) {
          final testItem = TransliterationDataItem.fromYaml(
            itemData as Map<dynamic, dynamic>,
          );

          // Skip TODO tests
          if (testItem.todo) {
            continue;
          }

          // Forward transliteration test
          test('${testItem.index} : ${testItem.from} → ${testItem.to}', () {
            // Preload script data for performance
            preloadScriptData(testItem.from);
            preloadScriptData(testItem.to);

            // Perform transliteration
            final result = transliterate(
              text: testItem.input,
              fromScript: testItem.from,
              toScript: testItem.to,
              options: testItem.options,
            );

            // Special handling for Tamil-Extended with Vedic svaras
            // The old implementation had issues with vedic svara tails in Tamil Extended
            if (fileName.startsWith('auto') &&
                testItem.to == 'Tamil-Extended' &&
                hasVedicSvara(result)) {
              return;
            }

            // Assertion with detailed error message
            final errorMessage = 'Transliteration failed:\n'
                '  File: $relativePath\n'
                '  Index: ${testItem.index}\n'
                '  From: ${testItem.from}\n'
                '  To: ${testItem.to}\n'
                '  Input: "${testItem.input}"\n'
                '  Expected: "${testItem.output}"\n'
                '  Actual: "$result"';

            expect(result, testItem.output, reason: errorMessage);
          });

          // Reversible transliteration test
          if (testItem.reversible) {
            test('${testItem.index} : ${testItem.to} ← ${testItem.from}', () {
              // Preload script data
              preloadScriptData(testItem.from);
              preloadScriptData(testItem.to);

              // Forward transliteration
              final result = transliterate(
                text: testItem.input,
                fromScript: testItem.from,
                toScript: testItem.to,
                options: testItem.options,
              );

              // Skip Tamil-Extended with Vedic svaras (known edge case)
              if (fileName.startsWith('auto') &&
                  testItem.to == 'Tamil-Extended' &&
                  hasVedicSvara(result)) {
                return;
              }

              // Reverse transliteration
              final resultReversed = transliterate(
                text: result,
                fromScript: testItem.to,
                toScript: testItem.from,
                options: testItem.options,
              );

              final errorMessageReversed = 'Reversed Transliteration failed:\n'
                  '  File: $relativePath\n'
                  '  Index: ${testItem.index}\n'
                  '  From: ${testItem.to}\n'
                  '  To: ${testItem.from}\n'
                  '  Input: "$result"\n'
                  '  Original Input: "${testItem.input}"\n'
                  '  Reversed Output: "$resultReversed"';

              expect(resultReversed, testItem.input,
                  reason: errorMessageReversed);
            });
          }
        }
      });
    }
  });
}
