/// Tests for the lipilekhika main module.
library;

import 'package:lipilekhika/lipilekhika.dart';
import 'package:test/test.dart';

void main() {
  setUpAll(() async {
    // Initialize the library before running tests
    await initLipiLekhika();
  });

  group('preloadScriptData', () {
    test('should preload Devanagari script data without errors', () {
      expect(() => preloadScriptData('Devanagari'), returnsNormally);
    });

    test('should preload multiple scripts', () {
      final scripts = ['Devanagari', 'Tamil', 'Telugu', 'Kannada'];
      for (final script in scripts) {
        expect(() => preloadScriptData(script), returnsNormally);
      }
    });

    test('should preload with normalized name', () {
      expect(() => preloadScriptData('dev'), returnsNormally);
    });

    test('should preload all major scripts', () {
      // Load first 5 scripts from the list
      for (final script in scriptList.take(5)) {
        expect(() => preloadScriptData(script), returnsNormally);
      }
    });
  });

  group('getSchwaStatusForScript', () {
    test('should get schwa status for Devanagari', () {
      final status = getSchwaStatusForScript('Devanagari');
      expect(status, isA<bool?>());
    });

    test('should get schwa status for Tamil', () {
      final status = getSchwaStatusForScript('Tamil');
      expect(status, isA<bool?>());
    });

    test('should get schwa status for multiple scripts', () {
      final scripts = ['Devanagari', 'Tamil', 'Telugu', 'Kannada', 'Malayalam'];
      for (final script in scripts) {
        final status = getSchwaStatusForScript(script);
        expect(status, isA<bool?>());
      }
    });

    test('should get schwa status with normalized name', () {
      final status = getSchwaStatusForScript('dev');
      expect(status, isA<bool?>());
    });
  });

  group('getAllOptions', () {
    test('should get all options for Normal to Devanagari', () {
      final options = getAllOptions(
        fromScript: 'Normal',
        toScript: 'Devanagari',
      );
      expect(options, isA<List<String>>());
      expect(options.every((opt) => opt is String), isTrue);
    });

    test('should get all options for Devanagari to Tamil', () {
      final options = getAllOptions(
        fromScript: 'Devanagari',
        toScript: 'Tamil',
      );
      expect(options, isA<List<String>>());
      expect(options.every((opt) => opt is String), isTrue);
    });

    test('should work with normalized names', () {
      final options = getAllOptions(
        fromScript: 'Normal',
        toScript: 'dev',
      );
      expect(options, isA<List<String>>());
    });

    test('should handle multiple script pairs', () {
      final pairs = [
        ('Normal', 'Devanagari'),
        ('Normal', 'Tamil'),
        ('Devanagari', 'Tamil'),
        ('Tamil', 'Telugu'),
      ];

      for (final (fromScript, toScript) in pairs) {
        final options = getAllOptions(
          fromScript: fromScript,
          toScript: toScript,
        );
        expect(options, isA<List<String>>());
      }
    });
  });

  group('getNormalizedScriptName', () {
    test('should normalize Devanagari', () {
      final result = getNormalizedScriptName('Devanagari');
      expect(result, isA<String>());
      expect(result, 'Devanagari');
    });

    test('should normalize script acronym', () {
      final result = getNormalizedScriptName('dev');
      expect(result, isA<String>());
      expect(result, 'Devanagari');
    });

    test('should be case insensitive', () {
      final result1 = getNormalizedScriptName('devanagari');
      final result2 = getNormalizedScriptName('DEVANAGARI');
      final result3 = getNormalizedScriptName('Devanagari');
      expect(result1, result2);
      expect(result2, result3);
    });

    test('should normalize various script names', () {
      final scripts = ['dev', 'tamil', 'telugu', 'kannada', 'mal'];
      for (final script in scripts) {
        final result = getNormalizedScriptName(script);
        expect(result, isA<String>());
        expect(result, isNotEmpty);
      }
    });

    test('should return null for invalid script name', () {
      final result = getNormalizedScriptName('InvalidScript');
      expect(result, isNull);
    });

    test('should normalize all scripts in scriptList', () {
      for (final script in scriptList.take(10)) {
        final result = getNormalizedScriptName(script);
        expect(result, isA<String>());
        expect(result, isNotEmpty);
      }
    });
  });

  group('Constants', () {
    test('scriptList should be a non-empty list of strings', () {
      expect(scriptList, isA<List<String>>());
      expect(scriptList, isNotEmpty);
      expect(scriptList.every((script) => script is String), isTrue);
    });

    test('scriptList should contain major scripts', () {
      final majorScripts = ['Devanagari', 'Tamil', 'Telugu', 'Kannada'];
      for (final script in majorScripts) {
        expect(scriptList, contains(script));
      }
    });

    test('langList should be a non-empty list of strings', () {
      expect(langList, isA<List<String>>());
      expect(langList, isNotEmpty);
      expect(langList.every((lang) => lang is String), isTrue);
    });

    test('allScriptLangList should be a non-empty list of strings', () {
      expect(allScriptLangList, isA<List<String>>());
      expect(allScriptLangList, isNotEmpty);
      expect(allScriptLangList.every((item) => item is String), isTrue);
    });

    test('allScriptLangList should contain both scripts and languages', () {
      // Should contain items from scriptList
      for (final script in scriptList.take(5)) {
        expect(allScriptLangList, contains(script));
      }

      // Should contain items from langList
      for (final lang in langList.take(5)) {
        expect(allScriptLangList, contains(lang));
      }
    });

    test('allScriptLangList should have reasonable length', () {
      // Should be at least as long as either list
      expect(allScriptLangList.length, greaterThanOrEqualTo(scriptList.length));
      expect(allScriptLangList.length, greaterThanOrEqualTo(langList.length));
      // Should be less than or equal to sum (due to deduplication)
      expect(
        allScriptLangList.length,
        lessThanOrEqualTo(scriptList.length + langList.length),
      );
    });

    test('scriptList should contain unique values', () {
      expect(scriptList.length, scriptList.toSet().length);
    });

    test('langList should contain unique values', () {
      expect(langList.length, langList.toSet().length);
    });

    test('allScriptLangList should contain unique values', () {
      expect(allScriptLangList.length, allScriptLangList.toSet().length);
    });
  });

  group('transliterate', () {
    test('should transliterate Normal to Devanagari', () {
      final result = transliterate(
        text: 'namaste',
        fromScript: 'Normal',
        toScript: 'Devanagari',
      );
      expect(result, isA<String>());
      expect(result, isNotEmpty);
      expect(result, isNot('namaste')); // Should be transliterated
    });

    test('should transliterate Devanagari to Tamil', () {
      final result = transliterate(
        text: 'नमस्ते',
        fromScript: 'Devanagari',
        toScript: 'Tamil',
      );
      expect(result, isA<String>());
      expect(result, isNotEmpty);
    });

    test('should handle empty text', () {
      final result = transliterate(
        text: '',
        fromScript: 'Normal',
        toScript: 'Devanagari',
      );
      expect(result, '');
    });
  });
}
