/// The organized layout of the typing help, a port of the web app's
/// `docs/docs-and-web-client/src/components/typing_help/layout.ts`.
///
/// The krama array is index aligned across all scripts, so the layout is
/// described once with the `Normal` krama text of each position (`k`, `kh`, ...)
/// and resolved for any script. The typing map and the script comparison both
/// render from the same layout.
library;

import 'package:lipilekhika/lipilekhika.dart';

class Glyph {
  final String text;

  /// the main key to type it
  final String? primary;

  /// the other keys which give the same text
  final List<String> alternates;

  const Glyph(this.text, this.primary, this.alternates);
}

class CompareText {
  final String text;
  final String? sign;

  const CompareText(this.text, [this.sign]);
}

class Cell {
  final String id;

  /// the character in the selected script
  final Glyph main;

  /// the vowel sign (mAtrA) of a svara
  final Glyph? sign;

  /// compare mode: the same position in the compared script
  final CompareText? other;

  /// a short description, for the invisible or special characters
  final String? label;

  const Cell({
    required this.id,
    required this.main,
    this.sign,
    this.other,
    this.label,
  });
}

class Group {
  final String id;
  final String title;

  /// a short description shown with the title
  final String? hint;

  /// a fixed grid where the column has a meaning (the vargas), empty slots are `null`
  final int? columns;
  final List<Cell?> cells;

  const Group({
    required this.id,
    required this.title,
    this.hint,
    this.columns,
    required this.cells,
  });

  bool get isNotEmpty => cells.any((c) => c != null);
}

enum SectionId { svara, vyanjana, other, special }

class Section {
  final SectionId id;
  final String title;
  final String? hint;
  final List<Group> groups;

  const Section({
    required this.id,
    required this.title,
    this.hint,
    required this.groups,
  });
}

class SeparatorExample {
  final String joined;
  final String joinedText;
  final String split;
  final String splitText;

  const SeparatorExample(
      this.joined, this.joinedText, this.split, this.splitText);
}

class Joiner {
  final String key;
  final String name;
  final String? exampleInput;
  final String? exampleOutput;

  const Joiner(this.key, this.name, [this.exampleInput, this.exampleOutput]);
}

class Literal {
  final String key;
  final String text;

  const Literal(this.key, this.text);
}

/// The keys which change how the typing works, they are not characters of the script
class TypingControls {
  /// `q` keeps two keys apart (brahmic scripts only)
  final SeparatorExample? separator;
  final List<Joiner> joiners;

  /// keys which give a letter as it is (`QQ` → Q)
  final List<Literal> literals;

  const TypingControls(this.separator, this.joiners, this.literals);

  bool get isNotEmpty =>
      separator != null || joiners.isNotEmpty || literals.isNotEmpty;
}

class HelpLayout {
  final String script;
  final String? compare;

  /// false for the romanized scripts, which have no separate mAtrA or vyanjana types
  final bool brahmic;

  /// only in the typing map
  final TypingControls? controls;
  final List<Section> sections;

  const HelpLayout({
    required this.script,
    this.compare,
    required this.brahmic,
    this.controls,
    required this.sections,
  });
}

class _GroupSpec {
  final String id;
  final String title;
  final String? hint;
  final int? columns;

  /// `Normal` krama text, or `dev:<char>` for the positions without a Normal text
  final List<String> items;

  const _GroupSpec(this.id, this.title, this.items, {this.hint, this.columns});
}

const _svaraItems = [
  'a', 'A', 'i', 'I', 'u', 'U', 'e', 'E', 'ai', //
  'o', 'O', 'au', 'R', 'RR', 'LR', 'LRR', 'aiI', 'auU',
];

const _vargaSpecs = [
  _GroupSpec('ka', 'Ka-varga', ['k', 'kh', 'g', 'gh', 'G'],
      hint: 'velar', columns: 5),
  _GroupSpec('cha', 'Cha-varga', ['ch', 'Ch', 'j', 'jh', 'J'],
      hint: 'palatal', columns: 5),
  _GroupSpec('Ta', 'Ṭa-varga', ['T', 'Th', 'D', 'Dh', 'N'],
      hint: 'retroflex', columns: 5),
  _GroupSpec('ta', 'Ta-varga', ['t', 'th', 'd', 'dh', 'n'],
      hint: 'dental', columns: 5),
  _GroupSpec('pa', 'Pa-varga', ['p', 'ph', 'b', 'bh', 'm'],
      hint: 'labial', columns: 5),
];

const _vyanjanaRestSpecs = [
  _GroupSpec('antahstha', 'Antaḥstha', ['y', 'r', 'l', 'v'],
      hint: 'semivowels'),
  _GroupSpec('ushma', 'Ūṣma', ['sh', 'Sh', 's', 'h'], hint: 'sibilants'),
  _GroupSpec('extra', 'Additional', ['L', 'Lz', 'rz', 'nz']),
  _GroupSpec('nukta', 'Nukta forms',
      ['kz', 'khz', 'gz', 'jz', 'Dz', 'Dhz', 'phz', 'yz'],
      hint: 'consonants with a dot below'),
];

/// typed as a sequence of keys, `x` is a key of its own for क्ष
const _conjuncts = [
  (seq: 'kSh', keys: ['kSh']),
  (seq: 'tr', keys: ['tr']),
  (seq: 'jJ', keys: ['jJ', 'jY']),
  (seq: 'shr', keys: ['shr']),
];

const _otherSpecs = [
  _GroupSpec('yogavaha', 'Ayogavāha', ['M', 'MM', 'H'],
      hint: 'anusvāra, candrabindu, visarga'),
  _GroupSpec('symbols', 'Symbols', ['AUM', '`', 'dev:्', 'dev:़', '°']),
  _GroupSpec('numerals', 'Numerals',
      ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
      hint:
          'plain digits follow the "native numerals" setting, .1 always gives the native digit'),
  _GroupSpec('punctuation', 'Punctuation', ['.', '..']),
  _GroupSpec('vedic', 'Vedic accents', ['↓', '↑', '↑↑', '↑↑↑']),
];

const _charLabels = {
  '‍': 'Zero width joiner',
  '‌': 'Zero width non-joiner',
  '्': 'Halant',
  '़': 'Nukta',
  'ऽ': 'Avagraha',
  '॰': 'Abbreviation sign',
};

final _combiningStart = RegExp(r'^\p{M}', unicode: true);
final _ascii = RegExp(r'^[\x20-\x7e]+$');
final _invisible = RegExp(r'^[\p{Cf}\s]+$', unicode: true);

/// Dotted circle base for the combining signs, so a lone mAtrA or halant stays visible
String displayText(String text) =>
    _combiningStart.hasMatch(text) ? '◌$text' : text;

bool _isAscii(String s) => _ascii.hasMatch(s);

/// The format characters (ZWJ...) render as nothing, show their label instead
bool isInvisible(String text) => _invisible.hasMatch(text);

/// The `Normal` text of the position is the main key, when it can be typed
Glyph _glyph(String text, List<String> keys, [String? normalText]) {
  String? primary;
  if (normalText != null && _isAscii(normalText) && keys.contains(normalText)) {
    primary = normalText;
  } else {
    primary = keys.where(_isAscii).firstOrNull ?? keys.firstOrNull;
  }
  return Glyph(text, primary, keys.where((k) => k != primary).toList());
}

final _kramaCache = <String, List<KramaDataItem>>{};
List<KramaDataItem> _krama(String script) =>
    _kramaCache.putIfAbsent(script, () => getScriptKramaData(script));

String _keyOf(String text, ListType type) => '$text\u0000${type.name}';

HelpLayout buildLayout(String script, [String? compare]) {
  final krama = _krama(script);
  final typingMap = getScriptTypingDataMap(script);
  final normal = _krama('Normal');
  final dev = _krama('Devanagari');
  final cmp = compare != null ? _krama(compare) : null;
  final comparing = cmp != null;

  int indexOf(String id) => id.startsWith('dev:')
      ? dev.indexWhere((r) => r.characterText == id.substring(4))
      : normal.indexWhere((r) => r.characterText == id);

  final keysMap = <String, List<String>>{
    for (final item in typingMap.commonKramaMap)
      _keyOf(item.text, item.listType): item.mappings,
  };

  // the typing map entries already shown, the rest ends up in "Other characters"
  final shownEntries = <String>{};
  // the cells already shown, a second position with the same text (or pair) is skipped
  final seenCells = <String>{};

  Glyph? glyphAt(int i) {
    if (i < 0 || i >= krama.length) return null;
    final row = krama[i];
    if (row.characterText.isEmpty) return null;
    final keys = keysMap[_keyOf(row.characterText, row.listType)] ?? const [];
    return _glyph(row.characterText, keys,
        i < normal.length ? normal[i].characterText : null);
  }

  void markShown(int i) {
    if (i >= 0 && i < krama.length) {
      shownEntries.add(_keyOf(krama[i].characterText, krama[i].listType));
    }
  }

  bool isBrahmic(List<KramaDataItem> k) {
    final i = indexOf('k');
    return i >= 0 && i < k.length && k[i].listType == ListType.vyanjana;
  }

  final brahmic = isBrahmic(krama);

  Cell? cellAt(String id, {bool withSign = false}) {
    final i = indexOf(id);
    if (i == -1) return null;
    final main = glyphAt(i);
    if (main == null) return null;

    Glyph? sign;
    if (withSign &&
        i + 1 < krama.length &&
        krama[i + 1].listType == ListType.matra) {
      sign = glyphAt(i + 1);
    }

    CompareText? other;
    if (cmp != null) {
      final otherText = i < cmp.length ? cmp[i].characterText : '';
      final otherSign = withSign &&
              i + 1 < cmp.length &&
              cmp[i + 1].listType == ListType.matra &&
              cmp[i + 1].characterText.isNotEmpty
          ? cmp[i + 1].characterText
          : null;
      other = CompareText(otherText, otherSign);
    }

    // a character which can not be typed has nothing to show in the typing map
    if (!comparing && main.primary == null) return null;

    final dedupeKey = [main.text, sign?.text, other?.text, other?.sign]
        .map((s) => s ?? '')
        .join('\u0000');
    if (!seenCells.add(dedupeKey)) return null;
    markShown(i);
    if (sign != null) markShown(i + 1);

    return Cell(
        id: id,
        main: main,
        sign: sign,
        other: other,
        label: _charLabels[main.text]);
  }

  Group buildGroup(_GroupSpec spec, {bool withSign = false}) {
    final cells = spec.items.map((id) => cellAt(id, withSign: withSign));
    return Group(
      id: spec.id,
      title: spec.title,
      hint: spec.hint,
      columns: spec.columns,
      // keep the empty slots only where the column has a meaning
      cells: spec.columns != null
          ? cells.toList()
          : cells.whereType<Cell>().toList(),
    );
  }

  // Svara
  final svaraGroup = buildGroup(const _GroupSpec('svara', 'Svara', _svaraItems),
      withSign: brahmic);

  // Vyanjana
  final vargaGroups = _vargaSpecs.map(buildGroup).toList();
  final restGroups = _vyanjanaRestSpecs.map(buildGroup).toList();

  // the inherent `a` gives the bare conjunct in the brahmic scripts, the romanized ones have none
  String conjunctText(String seq, String to, bool toBrahmic) {
    final text =
        transliterate(text: '${seq}a', fromScript: 'Normal', toScript: to);
    return toBrahmic ? text : text.replaceFirst(RegExp(r'a$'), '');
  }

  final cmpBrahmic = cmp != null && isBrahmic(cmp);
  final conjunctCells = [
    for (final c in _conjuncts)
      () {
        final text = conjunctText(c.seq, script, brahmic);
        final type = brahmic ? ListType.vyanjana : ListType.anya;
        final ownKeys = keysMap[_keyOf(text, type)] ?? const <String>[];
        if (ownKeys.isNotEmpty) shownEntries.add(_keyOf(text, type));
        return Cell(
          id: 'conj-${c.seq}',
          main: Glyph(text, c.keys.first, [...c.keys.skip(1), ...ownKeys]),
          other: compare != null
              ? CompareText(conjunctText(c.seq, compare, cmpBrahmic))
              : null,
        );
      }(),
  ];
  final conjunctGroup = Group(
    id: 'conjuncts',
    title: 'Common conjuncts',
    hint: 'typed as a sequence of consonants',
    cells: conjunctCells,
  );

  // Other
  final otherGroups = _otherSpecs.map(buildGroup).toList();

  // Special
  final specialGroups = <Group>[];
  final specific = typingMap.scriptSpecificKramaMap;
  TypingControls? controls;
  if (!comparing) {
    if (brahmic) {
      specialGroups.add(Group(
        id: 'signs',
        title: 'Standalone mātrā signs',
        hint: 'a vowel sign on its own, without a consonant before it',
        cells: [
          for (final cell in svaraGroup.cells)
            if (cell?.sign?.primary != null)
              Cell(id: 'sign-${cell!.id}', main: cell.sign!),
        ],
      ));
    }

    // the joiners and the literal letters are typing controls, not characters of the script
    specialGroups.add(Group(
      id: 'extra',
      title: 'Extra characters',
      hint: 'beyond the common set',
      cells: [
        for (final (idx, item) in specific.indexed)
          if (!_isAscii(item.text) && !isInvisible(item.text))
            Cell(
              id: 'specific-$idx',
              main: _glyph(item.text, item.mappings),
              label: _charLabels[item.text],
            ),
      ],
    ));

    specialGroups.add(Group(
      id: 'unlisted',
      title: 'Other characters',
      cells: [
        for (final (idx, item) in typingMap.commonKramaMap.indexed)
          if (!shownEntries.contains(_keyOf(item.text, item.listType)) &&
              item.listType != ListType.matra)
            Cell(
              id: 'unlisted-$idx',
              main: _glyph(item.text, item.mappings),
              label: _charLabels[item.text],
            ),
      ],
    ));

    String t(String text) =>
        transliterate(text: text, fromScript: 'Normal', toScript: script);
    final k = t('k');
    controls = TypingControls(
      brahmic ? SeparatorExample('kh', t('kha'), 'kqh', k + t('ha')) : null,
      [
        for (final item in specific)
          if (isInvisible(item.text) && item.mappings.isNotEmpty)
            Joiner(
              item.mappings.first,
              _charLabels[item.text] ?? 'Invisible character',
              brahmic && item.text == '‍' ? 'k.qSh' : null,
              brahmic && item.text == '‍' ? '$k‍${t('Sha')}' : null,
            ),
      ],
      [
        for (final item in specific)
          if (_isAscii(item.text) &&
              item.mappings.isNotEmpty &&
              item.mappings.first != item.text)
            Literal(item.mappings.first, item.text),
      ],
    );
  }

  final sections = [
    Section(
      id: SectionId.svara,
      title: 'Svara',
      hint: brahmic ? 'vowels with their mātrā signs' : 'vowels',
      groups: [svaraGroup],
    ),
    Section(
      id: SectionId.vyanjana,
      title: 'Vyañjana',
      hint: 'consonants',
      groups: [...vargaGroups, ...restGroups, conjunctGroup],
    ),
    Section(id: SectionId.other, title: 'Other', groups: otherGroups),
    Section(id: SectionId.special, title: 'Special', groups: specialGroups),
  ];

  return HelpLayout(
    script: script,
    compare: compare,
    brahmic: brahmic,
    controls: controls,
    sections: [
      for (final s in sections)
        if (s.groups.any((g) => g.isNotEmpty))
          Section(
            id: s.id,
            title: s.title,
            hint: s.hint,
            groups: s.groups.where((g) => g.isNotEmpty).toList(),
          ),
    ],
  );
}
