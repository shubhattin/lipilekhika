import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import 'script_selector.dart';
import 'typing_help/layout.dart';
import '../utils/font_config.dart';

/// The typing help sheet: every character of a script with the keys to type
/// it, organized like the old Lipi Lekhika charts and coloured by group.
/// Same layout as the web app's typing help (`TypingHelper.svelte`).
class TypingHelperModal extends StatefulWidget {
  final String script;

  const TypingHelperModal({
    super.key,
    required this.script,
  });

  @override
  State<TypingHelperModal> createState() => _TypingHelperModalState();
}

enum _Tab { typing, compare }

/// Colours of a group, after the tailwind palette used on the web
class _Tone {
  final Color base;
  final Color light;
  final Color dark;

  const _Tone(this.base, this.light, this.dark);

  static const sky =
      _Tone(Color(0xFF0EA5E9), Color(0xFF0369A1), Color(0xFF7DD3FC));
  static const rose =
      _Tone(Color(0xFFF43F5E), Color(0xFFBE123C), Color(0xFFFDA4AF));
  static const emerald =
      _Tone(Color(0xFF10B981), Color(0xFF047857), Color(0xFF6EE7B7));
  static const violet =
      _Tone(Color(0xFF8B5CF6), Color(0xFF6D28D9), Color(0xFFC4B5FD));
  static const amber =
      _Tone(Color(0xFFF59E0B), Color(0xFFB45309), Color(0xFFFCD34D));
  static const fuchsia =
      _Tone(Color(0xFFD946EF), Color(0xFFA21CAF), Color(0xFFF0ABFC));

  Color glyph(bool isDark) => isDark ? dark : light;
  Color card(bool isDark) => base.withValues(alpha: isDark ? 0.08 : 0.06);
  Color border() => base.withValues(alpha: 0.3);
}

/// each group is coloured by what it holds, like the charts of the old Lipi Lekhika
_Tone _toneOf(SectionId section, String group) {
  switch (section) {
    case SectionId.svara:
      return _Tone.sky;
    case SectionId.vyanjana:
      return group == 'conjuncts' ? _Tone.emerald : _Tone.rose;
    case SectionId.other:
      return group == 'numerals' ? _Tone.violet : _Tone.amber;
    case SectionId.special:
      return group == 'signs' ? _Tone.sky : _Tone.fuchsia;
  }
}

const _sectionAccent = {
  SectionId.svara: Color(0xFF0EA5E9),
  SectionId.vyanjana: Color(0xFFF43F5E),
  SectionId.other: Color(0xFFF59E0B),
  SectionId.special: Color(0xFFD946EF),
};

class _TypingHelperModalState extends State<TypingHelperModal> {
  late String _script;
  String _compare = 'Romanized';
  _Tab _tab = _Tab.typing;
  bool _showAlternates = true;

  HelpLayout? _layout;
  String? _error;

  final _sectionKeys = <SectionId, GlobalKey>{
    for (final id in SectionId.values) id: GlobalKey(),
  };

  @override
  void initState() {
    super.initState();
    _script = widget.script == 'Normal' ? 'Devanagari' : widget.script;
    _load();
  }

  void _load() {
    try {
      _layout = _tab == _Tab.typing
          ? buildLayout(_script)
          : buildLayout(_script, _compare);
      _error = null;
    } catch (e) {
      _layout = null;
      _error = e.toString();
    }
  }

  void _update(VoidCallback change) {
    setState(() {
      change();
      _load();
    });
  }

  void _jumpTo(SectionId id) {
    final ctx = _sectionKeys[id]?.currentContext;
    if (ctx != null) {
      Scrollable.ensureVisible(
        ctx,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    }
  }

  /// ई with its keys (I, ee, ii) in the selected script, the example of the info
  Cell? get _alternatesExample {
    for (final section in _layout?.sections ?? const <Section>[]) {
      for (final group in section.groups) {
        for (final cell in group.cells) {
          if (cell?.id == 'I' && cell!.main.primary != null) return cell;
        }
      }
    }
    return null;
  }

  void _showAlternatesInfo() {
    final example = _alternatesExample;
    showDialog<void>(
      context: context,
      builder: (context) {
        final theme = Theme.of(context);
        final colorScheme = theme.colorScheme;
        final muted = colorScheme.onSurfaceVariant;
        final keys = example == null
            ? const <String>[]
            : [
                example.main.primary!,
                ...example.main.alternates.where((k) => !k.startsWith('.')),
              ];
        return AlertDialog(
          title: const Text('Alternate keys'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Other keys for the same letter. The first one is the main key.',
                style: TextStyle(color: muted, height: 1.4),
              ),
              if (example != null) ...[
                const SizedBox(height: 12),
                Container(
                  width: double.infinity,
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: colorScheme.surfaceContainerHighest
                        .withValues(alpha: 0.6),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Wrap(
                    spacing: 6,
                    runSpacing: 4,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      for (final (i, key) in keys.indexed) ...[
                        if (i == 1)
                          Text('or',
                              style: TextStyle(fontSize: 12, color: muted)),
                        i == 0 ? _KeyCap(key) : _AltKey(key),
                      ],
                      Text('→', style: TextStyle(color: muted)),
                      Text(
                        example.main.text,
                        style: FontConfig.getTextStyleForScript(
                          _script,
                          baseStyle: TextStyle(
                            fontSize: 24,
                            color: colorScheme.onSurface,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 12),
              Text.rich(
                TextSpan(children: [
                  const TextSpan(
                      text: 'All of them work while typing. When converting '
                          'text, some alternates need the '),
                  TextSpan(
                    text: 'Use Typing Characters',
                    style: TextStyle(
                      color: colorScheme.onSurface,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const TextSpan(text: ' option.'),
                ]),
                style: TextStyle(fontSize: 13, color: muted, height: 1.4),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Got it'),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return DraggableScrollableSheet(
      initialChildSize: 0.9,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, scrollController) {
        return Container(
          decoration: BoxDecoration(
            color: colorScheme.surface,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            children: [
              // Handle
              Container(
                margin: const EdgeInsets.only(top: 10),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: colorScheme.onSurfaceVariant.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              _buildHeader(context),
              _buildControls(context),
              const Divider(height: 1),
              if (_layout != null) _buildSectionNav(context, _layout!),
              Expanded(child: _buildBody(context, scrollController)),
            ],
          ),
        );
      },
    );
  }

  Widget _buildHeader(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 4, 4, 0),
      child: Row(
        children: [
          Icon(LucideIcons.keyboard, color: colorScheme.primary, size: 22),
          const SizedBox(width: 10),
          Text(
            'Typing help',
            style: Theme.of(context)
                .textTheme
                .titleMedium
                ?.copyWith(fontWeight: FontWeight.w600),
          ),
          const Spacer(),
          IconButton(
            onPressed: () => Navigator.pop(context),
            icon: const Icon(LucideIcons.x, size: 20),
            tooltip: 'Close',
          ),
        ],
      ),
    );
  }

  Widget _buildControls(BuildContext context) {
    final theme = Theme.of(context);
    final muted = theme.colorScheme.onSurfaceVariant;
    // on narrow phones the toggle would squeeze the script selector
    final narrow = MediaQuery.sizeOf(context).width < 400;

    final alternatesToggle = Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Flexible(
          child: InkWell(
            borderRadius: BorderRadius.circular(8),
            onTap: () => setState(() => _showAlternates = !_showAlternates),
            child: Padding(
              padding: const EdgeInsets.only(right: 4),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Checkbox(
                    value: _showAlternates,
                    visualDensity: VisualDensity.compact,
                    onChanged: (v) =>
                        setState(() => _showAlternates = v ?? true),
                  ),
                  Flexible(
                    child: Text(
                      narrow ? 'Show alternate keys' : 'Alternates',
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodyMedium?.copyWith(color: muted),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        IconButton(
          onPressed: _showAlternatesInfo,
          icon: Icon(LucideIcons.info, size: 18, color: muted),
          tooltip: 'About alternate keys',
          visualDensity: VisualDensity.compact,
        ),
      ],
    );

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: ScriptSelector(
                  value: _script,
                  onChanged: (s) => _update(() => _script = s),
                  haveNormalScript: false,
                ),
              ),
              if (_tab == _Tab.typing && !narrow) ...[
                const SizedBox(width: 4),
                alternatesToggle,
              ],
            ],
          ),
          const SizedBox(height: 10),
          SegmentedButton<_Tab>(
            segments: const [
              ButtonSegment(
                value: _Tab.typing,
                icon: Icon(LucideIcons.map, size: 16),
                label: Text('Typing map'),
              ),
              ButtonSegment(
                value: _Tab.compare,
                icon: Icon(LucideIcons.arrowLeftRight, size: 16),
                label: Text('Compare'),
              ),
            ],
            selected: {_tab},
            showSelectedIcon: false,
            onSelectionChanged: (s) => _update(() => _tab = s.first),
          ),
          if (_tab == _Tab.typing && narrow) ...[
            const SizedBox(height: 4),
            Align(alignment: Alignment.centerLeft, child: alternatesToggle),
          ],
          if (_tab == _Tab.compare) ...[
            const SizedBox(height: 10),
            Row(
              children: [
                Text('with', style: TextStyle(color: muted)),
                const SizedBox(width: 12),
                Expanded(
                  child: ScriptSelector(
                    value: _compare,
                    onChanged: (s) => _update(() => _compare = s),
                    haveNormalScript: true,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSectionNav(BuildContext context, HelpLayout layout) {
    return Container(
      height: 46,
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(color: Theme.of(context).dividerColor),
        ),
      ),
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        children: [
          for (final section in layout.sections)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 3),
              child: _SectionPill(
                title: section.title,
                color: _sectionAccent[section.id]!,
                onTap: () => _jumpTo(section.id),
              ),
            ),
        ],
      ),
    );
  }

  Widget _dot(Color color, double size) => Container(
        width: size,
        height: size,
        decoration: BoxDecoration(color: color, shape: BoxShape.circle),
      );

  Widget _buildBody(BuildContext context, ScrollController scrollController) {
    if (_error != null || _layout == null) {
      final theme = Theme.of(context);
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(LucideIcons.circleAlert,
                  size: 40, color: theme.colorScheme.error),
              const SizedBox(height: 12),
              Text('Could not load the typing help',
                  style: theme.textTheme.titleSmall),
              const SizedBox(height: 6),
              Text(_error ?? '',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodySmall),
            ],
          ),
        ),
      );
    }

    final layout = _layout!;
    return SingleChildScrollView(
      controller: scrollController,
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (final section in layout.sections) ...[
            _buildSection(context, section),
            const SizedBox(height: 28),
          ],
          if (layout.controls != null && layout.controls!.isNotEmpty)
            _TypingControlsBox(controls: layout.controls!, script: _script),
        ],
      ),
    );
  }

  Widget _buildSection(BuildContext context, Section section) {
    final theme = Theme.of(context);
    return Column(
      key: _sectionKeys[section.id],
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            _dot(_sectionAccent[section.id]!, 10),
            const SizedBox(width: 8),
            Text(
              section.title,
              style: theme.textTheme.titleMedium
                  ?.copyWith(fontWeight: FontWeight.w600),
            ),
            if (section.hint != null) ...[
              const SizedBox(width: 8),
              Flexible(
                child: Text(
                  section.hint!,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.bodySmall
                      ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                ),
              ),
            ],
          ],
        ),
        const SizedBox(height: 12),
        for (final group in section.groups) ...[
          _buildGroup(context, section, group),
          const SizedBox(height: 16),
        ],
      ],
    );
  }

  Widget _buildGroup(BuildContext context, Section section, Group group) {
    final theme = Theme.of(context);
    final tone = _toneOf(section.id, group.id);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (group.title != section.title)
          Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: Text.rich(
              TextSpan(children: [
                WidgetSpan(
                  alignment: PlaceholderAlignment.middle,
                  child: Container(
                    width: 4,
                    height: 12,
                    margin: const EdgeInsets.only(right: 7),
                    decoration: BoxDecoration(
                      color: tone.base,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                TextSpan(
                  text: group.title,
                  style: theme.textTheme.labelLarge
                      ?.copyWith(fontWeight: FontWeight.w600),
                ),
                if (group.hint != null)
                  TextSpan(
                    text: '   ${group.hint}',
                    style: theme.textTheme.bodySmall
                        ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                  ),
              ]),
            ),
          ),
        LayoutBuilder(builder: (context, constraints) {
          const gap = 6.0;
          final int columns;
          if (group.columns != null) {
            columns = group.columns!;
          } else {
            // the svara cards also hold the mAtrA sign, so they are wider
            final minWidth = group.id == 'svara' ? 100.0 : 72.0;
            columns = ((constraints.maxWidth + gap) / (minWidth + gap))
                .floor()
                .clamp(2, 12);
          }
          // vargas keep 5 columns, but not too wide on a tablet
          final maxWidth = group.columns != null ? 560.0 : double.infinity;
          return Align(
            alignment: Alignment.centerLeft,
            child: ConstrainedBox(
              constraints: BoxConstraints(maxWidth: maxWidth),
              child: _grid(group.cells, columns, gap, tone),
            ),
          );
        }),
      ],
    );
  }

  /// rows of equal height, like a css grid
  Widget _grid(List<Cell?> cells, int columns, double gap, _Tone tone) {
    final rows = <Widget>[];
    for (var start = 0; start < cells.length; start += columns) {
      final row =
          cells.sublist(start, (start + columns).clamp(0, cells.length));
      rows.add(Padding(
        padding: EdgeInsets.only(bottom: gap),
        child: IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              for (var i = 0; i < columns; i++) ...[
                if (i > 0) SizedBox(width: gap),
                Expanded(
                  child: i < row.length
                      ? _card(row[i], tone)
                      : const SizedBox.shrink(),
                ),
              ],
            ],
          ),
        ),
      ));
    }
    return Column(children: rows);
  }

  Widget _card(Cell? cell, _Tone tone) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;

    if (cell == null) {
      return Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: colorScheme.outlineVariant.withValues(alpha: 0.5),
          ),
        ),
      );
    }

    final glyphStyle = FontConfig.getTextStyleForScript(
      _script,
      baseStyle: TextStyle(
        fontSize: 22,
        height: 1.3,
        color: tone.glyph(isDark),
      ),
    );

    Widget glyph(String text, TextStyle style) => isInvisible(text)
        ? Text(
            cell.label ?? '?',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: colorScheme.onSurfaceVariant,
            ),
          )
        : Text(displayText(text), style: style);

    return Tooltip(
      message: cell.label ?? '',
      triggerMode: cell.label != null
          ? TooltipTriggerMode.longPress
          : TooltipTriggerMode.manual,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
        decoration: BoxDecoration(
          color: tone.card(isDark),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: tone.border()),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            FittedBox(
              fit: BoxFit.scaleDown,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.baseline,
                textBaseline: TextBaseline.alphabetic,
                children: [
                  glyph(cell.main.text, glyphStyle),
                  if (cell.sign != null) ...[
                    const SizedBox(width: 6),
                    Text(
                      displayText(cell.sign!.text),
                      style: glyphStyle.copyWith(
                        color: tone.glyph(isDark).withValues(alpha: 0.75),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 4),
            if (_tab == _Tab.typing) ...[
              _KeyCap(cell.main.primary ?? ''),
              if (_showAlternates && cell.main.alternates.isNotEmpty) ...[
                const SizedBox(height: 3),
                Wrap(
                  alignment: WrapAlignment.center,
                  spacing: 2,
                  runSpacing: 2,
                  children: [
                    for (final alt in cell.main.alternates) _AltKey(alt),
                  ],
                ),
              ],
            ] else ...[
              Container(
                width: 22,
                height: 1,
                color: colorScheme.outlineVariant,
              ),
              const SizedBox(height: 2),
              FittedBox(
                fit: BoxFit.scaleDown,
                child: Text(
                  [
                    cell.other?.text.isNotEmpty == true
                        ? displayText(cell.other!.text)
                        : '—',
                    if (cell.other?.sign != null)
                      displayText(cell.other!.sign!),
                  ].join('  '),
                  style: FontConfig.getTextStyleForScript(
                    _compare,
                    baseStyle: TextStyle(
                      fontSize: 19,
                      height: 1.3,
                      color: colorScheme.onSurfaceVariant,
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// A section shortcut in the nav row, a dot and the section name
class _SectionPill extends StatelessWidget {
  final String title;
  final Color color;
  final VoidCallback onTap;

  const _SectionPill({
    required this.title,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Material(
      color: Colors.transparent,
      shape: StadiumBorder(side: BorderSide(color: colorScheme.outlineVariant)),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(color: color, shape: BoxShape.circle),
              ),
              const SizedBox(width: 6),
              Text(
                title,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: colorScheme.onSurface,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// The main key, drawn like a key cap
class _KeyCap extends StatelessWidget {
  final String text;

  const _KeyCap(this.text);

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(4),
        border: Border(
          top: BorderSide(color: colorScheme.outlineVariant),
          left: BorderSide(color: colorScheme.outlineVariant),
          right: BorderSide(color: colorScheme.outlineVariant),
          bottom: BorderSide(color: colorScheme.outlineVariant, width: 2),
        ),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontFamily: 'monospace',
          fontSize: 12,
          fontWeight: FontWeight.w700,
          color: colorScheme.onSurface,
        ),
      ),
    );
  }
}

/// An alternate key, smaller and muted
class _AltKey extends StatelessWidget {
  final String text;

  const _AltKey(this.text);

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 3),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(3),
        border: Border.all(
          color: colorScheme.outlineVariant.withValues(alpha: 0.8),
        ),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontFamily: 'monospace',
          fontSize: 10,
          height: 1.5,
          color: colorScheme.onSurfaceVariant,
        ),
      ),
    );
  }
}

/// The keys which change how the typing works, as one compact box
class _TypingControlsBox extends StatelessWidget {
  final TypingControls controls;
  final String script;

  const _TypingControlsBox({required this.controls, required this.script});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final muted = colorScheme.onSurfaceVariant;
    final scriptStyle = FontConfig.getTextStyleForScript(
      script,
      baseStyle: TextStyle(fontSize: 14, color: colorScheme.onSurface),
    );
    const code = TextStyle(fontFamily: 'monospace', fontSize: 12);

    Widget item(String key, String title, List<InlineSpan>? example) => Padding(
          padding: const EdgeInsets.only(top: 10),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _KeyCap(key),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: theme.textTheme.bodyMedium),
                    if (example != null)
                      Text.rich(
                        TextSpan(children: example),
                        style: TextStyle(fontSize: 12, color: muted),
                      ),
                  ],
                ),
              ),
            ],
          ),
        );

    final sep = controls.separator;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: colorScheme.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text.rich(TextSpan(children: [
            TextSpan(
              text: 'Typing controls',
              style: theme.textTheme.labelLarge
                  ?.copyWith(fontWeight: FontWeight.w600),
            ),
            TextSpan(
              text: '   keys that change how you type',
              style: theme.textTheme.bodySmall?.copyWith(color: muted),
            ),
          ])),
          if (sep != null)
            item('q', 'Keeps two keys apart', [
              TextSpan(text: sep.split, style: code),
              const TextSpan(text: ' → '),
              TextSpan(text: sep.splitText, style: scriptStyle),
              const TextSpan(text: ', not '),
              TextSpan(text: sep.joined, style: code),
              const TextSpan(text: ' → '),
              TextSpan(text: sep.joinedText, style: scriptStyle),
            ]),
          for (final joiner in controls.joiners)
            item(
              joiner.key,
              joiner.name,
              joiner.exampleInput != null
                  ? [
                      TextSpan(text: joiner.exampleInput, style: code),
                      const TextSpan(text: ' → '),
                      TextSpan(text: joiner.exampleOutput, style: scriptStyle),
                    ]
                  : null,
            ),
          if (controls.literals.isNotEmpty) ...[
            const SizedBox(height: 12),
            const Divider(height: 1),
            const SizedBox(height: 10),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                Text('Literal letters',
                    style: TextStyle(fontSize: 12, color: muted)),
                for (final literal in controls.literals)
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: colorScheme.surface,
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: colorScheme.outlineVariant),
                    ),
                    child: Text.rich(TextSpan(children: [
                      TextSpan(
                        text: literal.key,
                        style: code.copyWith(fontWeight: FontWeight.w700),
                      ),
                      TextSpan(text: ' → ', style: TextStyle(color: muted)),
                      TextSpan(text: literal.text),
                    ])),
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
