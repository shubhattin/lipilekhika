/// Tests for the lipilekhika typing module.
library;

import 'package:lipilekhika/lipilekhika.dart';
import 'package:test/test.dart';

void main() {
  setUpAll(() async {
    // Initialize the library before running tests
    await initLipiLekhika();
  });

  group('Constants', () {
    test('defaultAutoContextClearTimeMs should be a positive integer', () {
      expect(defaultAutoContextClearTimeMs, isA<int>());
      expect(defaultAutoContextClearTimeMs, greaterThan(0));
    });

    test('defaultUseNativeNumerals should be a boolean', () {
      expect(defaultUseNativeNumerals, isA<bool>());
    });

    test('defaultIncludeInherentVowel should be a boolean', () {
      expect(defaultIncludeInherentVowel, isA<bool>());
    });
  });

  group('TypingContextOptions', () {
    test('should create with default values', () {
      final options = TypingContextOptions(
        autoContextClearTimeMs: BigInt.from(defaultAutoContextClearTimeMs),
        useNativeNumerals: defaultUseNativeNumerals,
        includeInherentVowel: defaultIncludeInherentVowel,
      );
      expect(options.autoContextClearTimeMs, isA<BigInt>());
      expect(options.useNativeNumerals, isA<bool>());
      expect(options.includeInherentVowel, isA<bool>());
    });

    test('should create with custom values', () {
      final options = TypingContextOptions(
        autoContextClearTimeMs: BigInt.from(2000),
        useNativeNumerals: true,
        includeInherentVowel: false,
      );
      expect(options.autoContextClearTimeMs.toInt(), 2000);
      expect(options.useNativeNumerals, isTrue);
      expect(options.includeInherentVowel, isFalse);
    });
  });

  group('createTypingContext', () {
    test('should create context for Devanagari', () {
      final ctx = createTypingContext(typingLang: 'Devanagari');
      expect(ctx, isA<TypingContext>());
    });

    test('should create context for Tamil', () {
      final ctx = createTypingContext(typingLang: 'Tamil');
      expect(ctx, isA<TypingContext>());
    });

    test('should create context with custom options', () {
      final options = TypingContextOptions(
        autoContextClearTimeMs: BigInt.from(3000),
        useNativeNumerals: true,
        includeInherentVowel: false,
      );
      final ctx = createTypingContext(
        typingLang: 'Devanagari',
        options: options,
      );
      expect(ctx, isA<TypingContext>());
    });

    test('should work with normalized names', () {
      final ctx = createTypingContext(typingLang: 'dev');
      expect(ctx, isA<TypingContext>());
    });
  });

  group('TypingContext', () {
    test('clearContext should work without errors', () {
      final ctx = createTypingContext(typingLang: 'Devanagari');
      ctx.takeKeyInput(key: 'k');
      expect(() => ctx.clearContext(), returnsNormally);
    });

    test('takeKeyInput should return TypingDiff', () {
      final ctx = createTypingContext(typingLang: 'Devanagari');
      final diff = ctx.takeKeyInput(key: 'k');
      expect(diff, isA<TypingDiff>());
      expect(diff.toDeleteCharsCount, isA<BigInt>());
      expect(diff.diffAddText, isA<String>());
      expect(diff.toDeleteCharsCount.toInt(), greaterThanOrEqualTo(0));
      expect(diff.diffAddText, isNotEmpty);
    });

    test('should process sequence of key inputs', () {
      final ctx = createTypingContext(typingLang: 'Devanagari');
      final resultChars = <String>[];

      for (final char in 'namaste'.split('')) {
        final diff = ctx.takeKeyInput(key: char);
        // Simulate deleting chars
        if (diff.toDeleteCharsCount.toInt() > 0) {
          resultChars.removeRange(
            resultChars.length - diff.toDeleteCharsCount.toInt(),
            resultChars.length,
          );
        }
        // Add new text
        resultChars.addAll(diff.diffAddText.split(''));
      }

      final result = resultChars.join();
      expect(result, isNotEmpty);
      expect(result, isNot('namaste')); // Should be transliterated
    });

    test('should update use_native_numerals', () {
      final ctx = createTypingContext(typingLang: 'Devanagari');
      ctx.updateUseNativeNumerals(useNativeNumerals: true);
      expect(ctx.getUseNativeNumerals(), isTrue);
      ctx.updateUseNativeNumerals(useNativeNumerals: false);
      expect(ctx.getUseNativeNumerals(), isFalse);
    });

    test('should update include_inherent_vowel', () {
      final ctx = createTypingContext(typingLang: 'Devanagari');
      ctx.updateIncludeInherentVowel(includeInherentVowel: true);
      expect(ctx.getIncludeInherentVowel(), isTrue);
      ctx.updateIncludeInherentVowel(includeInherentVowel: false);
      expect(ctx.getIncludeInherentVowel(), isFalse);
    });

    test('should get use_native_numerals from options', () {
      final options = TypingContextOptions(
        autoContextClearTimeMs: BigInt.from(4500),
        useNativeNumerals: true,
        includeInherentVowel: false,
      );
      final ctx = createTypingContext(
        typingLang: 'Devanagari',
        options: options,
      );
      expect(ctx.getUseNativeNumerals(), isTrue);
    });

    test('should get include_inherent_vowel from options', () {
      final options = TypingContextOptions(
        autoContextClearTimeMs: BigInt.from(4500),
        useNativeNumerals: true,
        includeInherentVowel: false,
      );
      final ctx = createTypingContext(
        typingLang: 'Devanagari',
        options: options,
      );
      expect(ctx.getIncludeInherentVowel(), isFalse);
    });
  });

  group('TypingDiff', () {
    test('should have correct properties', () {
      final ctx = createTypingContext(typingLang: 'Devanagari');
      final diff = ctx.takeKeyInput(key: 'a');
      expect(diff.toDeleteCharsCount, isA<BigInt>());
      expect(diff.diffAddText, isA<String>());
      expect(diff.toDeleteCharsCount.toInt(), greaterThanOrEqualTo(0));
    });
  });

  group('getScriptTypingDataMap', () {
    test('should get data map for Devanagari', () {
      final dataMap = getScriptTypingDataMap('Devanagari');
      expect(dataMap, isA<ScriptTypingDataMap>());
      expect(dataMap.commonKramaMap, isA<List<TypingDataMapItem>>());
      expect(dataMap.scriptSpecificKramaMap, isA<List<TypingDataMapItem>>());
    });

    test('should get data map for Tamil', () {
      final dataMap = getScriptTypingDataMap('Tamil');
      expect(dataMap, isA<ScriptTypingDataMap>());
      expect(dataMap.commonKramaMap, isNotEmpty);
    });

    test('should work with normalized names', () {
      final dataMap = getScriptTypingDataMap('dev');
      expect(dataMap, isA<ScriptTypingDataMap>());
    });
  });

  group('ScriptTypingDataMap', () {
    test('should have correct structure', () {
      final dataMap = getScriptTypingDataMap('Devanagari');
      expect(dataMap.commonKramaMap, isNotEmpty);
      expect(dataMap.scriptSpecificKramaMap, isA<List>());
    });

    test('commonKramaMap should contain valid items', () {
      final dataMap = getScriptTypingDataMap('Devanagari');
      expect(dataMap.commonKramaMap, isNotEmpty);

      for (final item in dataMap.commonKramaMap.take(5)) {
        expect(item, isA<TypingDataMapItem>());
        expect(item.text, isA<String>());
        expect(item.listType, isA<ListType>());
        expect(item.mappings, isA<List<String>>());
        for (final mapping in item.mappings) {
          expect(mapping, isA<String>());
        }
      }
    });

    test('scriptSpecificKramaMap should contain valid items', () {
      final dataMap = getScriptTypingDataMap('Devanagari');

      for (final item in dataMap.scriptSpecificKramaMap.take(5)) {
        expect(item, isA<TypingDataMapItem>());
        expect(item.text, isA<String>());
        expect(item.listType, isA<ListType>());
        expect(item.mappings, isA<List<String>>());
      }
    });
  });

  group('TypingDataMapItem', () {
    test('should have correct structure', () {
      final dataMap = getScriptTypingDataMap('Devanagari');

      if (dataMap.commonKramaMap.isNotEmpty) {
        final item = dataMap.commonKramaMap.first;
        expect(item.text, isA<String>());
        expect(item.text, isNotEmpty);
        expect(item.listType, isA<ListType>());
        expect(item.mappings, isA<List<String>>());
        // ignore: unnecessary_type_check
        expect(item.mappings.every((m) => m is String), isTrue);
      }
    });
  });

  group('ListType', () {
    test('should have valid values', () {
      final dataMap = getScriptTypingDataMap('Devanagari');
      final allTypes = <ListType>{};

      for (final item in dataMap.commonKramaMap) {
        allTypes.add(item.listType);
      }

      // All types should be one of the defined enum values
      final validTypes = {
        ListType.anya,
        ListType.vyanjana,
        ListType.matra,
        ListType.svara,
      };
      expect(allTypes.every((type) => validTypes.contains(type)), isTrue);
    });
  });

  group('getScriptKramaData', () {
    test('should get krama data for Devanagari', () {
      final kramaData = getScriptKramaData('Devanagari');
      expect(kramaData, isA<List<KramaDataItem>>());
      expect(kramaData, isNotEmpty);
    });

    test('should get krama data for Tamil', () {
      final kramaData = getScriptKramaData('Tamil');
      expect(kramaData, isA<List<KramaDataItem>>());
      expect(kramaData, isNotEmpty);
    });

    test('should work with normalized names', () {
      final kramaData = getScriptKramaData('dev');
      expect(kramaData, isA<List<KramaDataItem>>());
      expect(kramaData, isNotEmpty);
    });

    test('krama data items should have correct structure', () {
      final kramaData = getScriptKramaData('Devanagari');
      expect(kramaData, isNotEmpty);

      for (final item in kramaData.take(10)) {
        expect(item, isA<KramaDataItem>());
        expect(item.characterText, isA<String>());
        expect(item.listType, isA<ListType>());
      }
    });

    test('should have non-empty characters', () {
      final kramaData = getScriptKramaData('Devanagari');
      final nonEmptyItems =
          kramaData.where((item) => item.characterText.isNotEmpty);
      expect(nonEmptyItems, isNotEmpty);
    });

    test('should have all character types', () {
      final kramaData = getScriptKramaData('Devanagari');
      final typesFound = kramaData.map((item) => item.listType).toSet();

      expect(typesFound, isNotEmpty);
      final validTypes = {
        ListType.anya,
        ListType.vyanjana,
        ListType.matra,
        ListType.svara,
      };
      expect(typesFound.every((type) => validTypes.contains(type)), isTrue);
    });

    test('cross-script krama data should have same length', () {
      final devData = getScriptKramaData('Devanagari');
      final tamilData = getScriptKramaData('Tamil');
      final teluguData = getScriptKramaData('Telugu');

      // All Brahmic scripts should have the same krama array length
      expect(devData.length, tamilData.length);
      expect(devData.length, teluguData.length);
    });

    test('should have 1:1 correspondence at same indices', () {
      final devData = getScriptKramaData('Devanagari');
      final tamilData = getScriptKramaData('Tamil');

      // Types should match at the same indices
      final minLength =
          devData.length < tamilData.length ? devData.length : tamilData.length;
      for (var i = 0; i < (minLength < 10 ? minLength : 10); i++) {
        expect(devData[i].listType, tamilData[i].listType);
      }
    });

    test('should work for multiple scripts', () {
      final scripts = ['Devanagari', 'Tamil', 'Telugu', 'Kannada', 'Bengali'];

      for (final script in scripts) {
        final kramaData = getScriptKramaData(script);
        expect(kramaData, isA<List<KramaDataItem>>());
        expect(kramaData, isNotEmpty);
      }
    });
  });

  group('KramaDataItem', () {
    test('should match expected type', () {
      final kramaData = getScriptKramaData('Devanagari');

      if (kramaData.isNotEmpty) {
        final item = kramaData.first;
        expect(item, isA<KramaDataItem>());
        expect(item.characterText, isA<String>());
        expect(item.listType, isA<ListType>());
      }
    });

    test('should be consistent with typing data', () {
      final kramaData = getScriptKramaData('Devanagari');
      final typingData = getScriptTypingDataMap('Devanagari');

      // Krama data >= typing data common map
      expect(kramaData.length,
          greaterThanOrEqualTo(typingData.commonKramaMap.length));

      // Build map for verification
      final kramaMap = <String, (ListType, int)>{};
      for (var i = 0; i < kramaData.length; i++) {
        kramaMap[kramaData[i].characterText] = (kramaData[i].listType, i);
      }

      // Verify typing data matches krama data
      for (final typingItem in typingData.commonKramaMap.take(10)) {
        expect(kramaMap.containsKey(typingItem.text), isTrue,
            reason: 'Character ${typingItem.text} should be in krama data');
        if (kramaMap.containsKey(typingItem.text)) {
          final (kramaType, _) = kramaMap[typingItem.text]!;
          expect(typingItem.listType, kramaType,
              reason: 'Type mismatch for ${typingItem.text}');
        }
      }
    });
  });

  group('Integration Scenarios', () {
    test('complete typing workflow for Devanagari', () {
      final ctx = createTypingContext(typingLang: 'Devanagari');
      final resultChars = <String>[];

      for (final char in 'namaste'.split('')) {
        final diff = ctx.takeKeyInput(key: char);
        if (diff.toDeleteCharsCount.toInt() > 0) {
          resultChars.removeRange(
            resultChars.length - diff.toDeleteCharsCount.toInt(),
            resultChars.length,
          );
        }
        resultChars.addAll(diff.diffAddText.split(''));
      }

      final result = resultChars.join();
      expect(result, isNotEmpty);
      expect(result, isNot('namaste')); // Should be transliterated
    });

    test('typing with native numerals', () {
      final options = TypingContextOptions(
        autoContextClearTimeMs: BigInt.from(4500),
        useNativeNumerals: true,
        includeInherentVowel: false,
      );
      final ctx = createTypingContext(
        typingLang: 'Devanagari',
        options: options,
      );

      final resultChars = <String>[];
      for (final char in '123'.split('')) {
        final diff = ctx.takeKeyInput(key: char);
        if (diff.toDeleteCharsCount.toInt() > 0) {
          resultChars.removeRange(
            resultChars.length - diff.toDeleteCharsCount.toInt(),
            resultChars.length,
          );
        }
        resultChars.addAll(diff.diffAddText.split(''));
      }

      final result = resultChars.join();
      expect(result, isNotEmpty);
      expect(result, isNot('123')); // Should have native numerals
    });

    test('context clear resets state properly', () {
      final ctx = createTypingContext(typingLang: 'Devanagari');

      ctx.takeKeyInput(key: 'k');
      ctx.takeKeyInput(key: 'a');

      ctx.clearContext();

      final diff = ctx.takeKeyInput(key: 'k');
      expect(diff, isA<TypingDiff>());
    });

    test('multiple scripts should work', () {
      final scripts = ['Devanagari', 'Tamil', 'Telugu', 'Kannada'];

      for (final script in scripts) {
        final ctx = createTypingContext(typingLang: script);
        final diff = ctx.takeKeyInput(key: 'a');
        expect(diff, isA<TypingDiff>());
        expect(diff.diffAddText, isNotEmpty);
      }
    });

    test('data map should have useful mappings', () {
      final dataMap = getScriptTypingDataMap('Devanagari');

      final itemsWithMappings = dataMap.commonKramaMap
          .where((item) => item.mappings.isNotEmpty)
          .toList();

      expect(itemsWithMappings, isNotEmpty);

      for (final item in itemsWithMappings.take(10)) {
        expect(item.text, isNotEmpty);
        expect(item.mappings, isNotEmpty);
        for (final mapping in item.mappings) {
          expect(mapping, isNotEmpty);
          expect(mapping.length, lessThan(20)); // No mapping should be too long
        }
      }
    });
  });
}
