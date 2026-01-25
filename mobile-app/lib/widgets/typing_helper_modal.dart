import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:lipilekhika/lipilekhika.dart';

import 'script_selector.dart';
import '../utils/font_config.dart';

class TypingHelperModal extends StatefulWidget {
  final String script;

  const TypingHelperModal({
    super.key,
    required this.script,
  });

  @override
  State<TypingHelperModal> createState() => _TypingHelperModalState();
}

class _TypingHelperModalState extends State<TypingHelperModal>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  late String _selectedScript;
  String? _compareScript;

  ScriptTypingDataMap? _typingDataMap;
  List<KramaDataItem>? _baseKramaData;
  List<KramaDataItem>? _compareKramaData;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _selectedScript = widget.script;
    _compareScript = 'Romanized';
    _loadTypingData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadTypingData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      if (_selectedScript != 'Normal') {
        final typingMap = getScriptTypingDataMap(_selectedScript);
        final baseKrama = getScriptKramaData(_selectedScript);

        List<KramaDataItem>? compareKrama;
        if (_compareScript != null && _compareScript != 'Normal') {
          compareKrama = getScriptKramaData(_compareScript!);
        }

        setState(() {
          _typingDataMap = typingMap;
          _baseKramaData = baseKrama;
          _compareKramaData = compareKrama;
          _isLoading = false;
        });
      } else {
        setState(() {
          _error = 'Normal/Romanized script does not have a typing map';
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  void _onScriptChanged(String script) {
    setState(() => _selectedScript = script);
    _loadTypingData();
  }

  void _onCompareScriptChanged(String script) {
    setState(() => _compareScript = script);
    _loadTypingData();
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return DraggableScrollableSheet(
      initialChildSize: 0.85,
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
                margin: const EdgeInsets.only(top: 12),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: colorScheme.onSurfaceVariant.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),

              // Header
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Icon(
                      LucideIcons.keyboard,
                      color: colorScheme.primary,
                    ),
                    const SizedBox(width: 12),
                    Text(
                      'Typing Help',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    const Spacer(),
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(LucideIcons.x),
                    ),
                  ],
                ),
              ),

              // Script Selector
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  children: [
                    Text(
                      'Select Script',
                      style: Theme.of(context).textTheme.labelLarge,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ScriptSelector(
                        value: _selectedScript,
                        onChanged: _onScriptChanged,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // Tabs
              TabBar(
                controller: _tabController,
                tabs: const [
                  Tab(
                    icon: Icon(LucideIcons.map, size: 18),
                    text: 'Typing Map',
                  ),
                  Tab(
                    icon: Icon(LucideIcons.arrowLeftRight, size: 18),
                    text: 'Compare Scripts',
                  ),
                ],
              ),

              // Tab Content
              Expanded(
                child: TabBarView(
                  controller: _tabController,
                  children: [
                    _buildTypingMapTab(scrollController),
                    _buildCompareScriptsTab(scrollController),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildTypingMapTab(ScrollController scrollController) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(LucideIcons.alertCircle,
                  size: 48, color: Theme.of(context).colorScheme.error),
              const SizedBox(height: 16),
              Text(
                'Could not load typing map',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              Text(
                _error!,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ),
        ),
      );
    }

    final typingMap = _typingDataMap!;
    final commonItems = typingMap.commonKramaMap;
    final specificItems = typingMap.scriptSpecificKramaMap;

    // Filter items by type
    final svaraItems = commonItems
        .where((item) =>
            item.listType == ListType.svara || item.listType == ListType.matra)
        .toList();
    final vyanjanaItems = commonItems
        .where((item) => item.listType == ListType.vyanjana)
        .toList();
    final otherItems =
        commonItems.where((item) => item.listType == ListType.anya).toList();

    return ListView(
      controller: scrollController,
      padding: const EdgeInsets.all(16),
      children: [
        _buildSection('Svara', svaraItems),
        const SizedBox(height: 24),
        _buildSection('Vyanjana', vyanjanaItems),
        const SizedBox(height: 24),
        _buildSection('Other', otherItems),
        if (specificItems.isNotEmpty) ...[
          const SizedBox(height: 24),
          _buildSection('Script-specific Characters', specificItems),
        ],
        const SizedBox(height: 32),
      ],
    );
  }

  Widget _buildSection(String title, List<TypingDataMapItem> items) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
        ),
        const SizedBox(height: 12),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 4,
            childAspectRatio: 0.85,
            mainAxisSpacing: 8,
            crossAxisSpacing: 8,
          ),
          itemCount: items.length,
          itemBuilder: (context, index) {
            final item = items[index];
            return _buildCharacterCard(item);
          },
        ),
      ],
    );
  }

  Widget _buildCharacterCard(TypingDataMapItem item) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHigh,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: colorScheme.outline.withValues(alpha: 0.2),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            item.text == '\u200d' ? 'ZWJ' : item.text,
            style: FontConfig.getTextStyleForScript(
              _selectedScript,
              baseStyle: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
          ),
          const Spacer(),
          Wrap(
            spacing: 4,
            runSpacing: 2,
            children: item.mappings.take(3).map((mapping) {
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                decoration: BoxDecoration(
                  color: colorScheme.primaryContainer.withValues(alpha: 0.5),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  mapping,
                  style: TextStyle(
                    fontSize: 10,
                    fontFamily: 'monospace',
                    color: colorScheme.onPrimaryContainer,
                  ),
                ),
              );
            }).toList(),
          ),
          if (item.mappings.length > 3)
            Text(
              '+${item.mappings.length - 3}',
              style: TextStyle(
                fontSize: 9,
                color: colorScheme.onSurfaceVariant,
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildCompareScriptsTab(ScrollController scrollController) {
    final colorScheme = Theme.of(context).colorScheme;

    // Get scripts list excluding Normal and current script, using the ordered list
    final scriptsForCompare = orderedScripts
        .map((s) => s.name)
        .where((s) => s != 'Normal' && s != _selectedScript)
        .toList();

    return ListView(
      controller: scrollController,
      padding: const EdgeInsets.all(16),
      children: [
        // Compare script selector
        Row(
          children: [
            Text(
              'Current: ',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            Text(
              _selectedScript,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Text(
              'Compare with:',
              style: Theme.of(context).textTheme.labelLarge,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: ScriptSelector(
                value: _compareScript != null &&
                        scriptsForCompare.contains(_compareScript)
                    ? _compareScript!
                    : scriptsForCompare.first,
                onChanged: (value) {
                  _onCompareScriptChanged(value);
                },
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),

        if (_isLoading)
          const Center(child: CircularProgressIndicator())
        else if (_baseKramaData != null && _compareKramaData != null)
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 4,
              childAspectRatio: 0.9,
              mainAxisSpacing: 8,
              crossAxisSpacing: 8,
            ),
            itemCount: _baseKramaData!.length,
            itemBuilder: (context, index) {
              final baseItem = _baseKramaData![index];
              final compareItem = index < _compareKramaData!.length
                  ? _compareKramaData![index]
                  : null;

              if (baseItem.characterText.isEmpty) {
                return const SizedBox.shrink();
              }

              return Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: colorScheme.surfaceContainerHigh,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: colorScheme.outline.withValues(alpha: 0.2),
                  ),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      baseItem.characterText,
                      style: FontConfig.getTextStyleForScript(
                        _selectedScript,
                        baseStyle:
                            Theme.of(context).textTheme.titleLarge?.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      compareItem?.characterText ?? '—',
                      style: FontConfig.getTextStyleForScript(
                        _compareScript ?? 'Romanized',
                        baseStyle:
                            Theme.of(context).textTheme.titleMedium?.copyWith(
                                  color: colorScheme.onSurfaceVariant,
                                ),
                      ),
                    ),
                  ],
                ),
              );
            },
          )
        else if (_error != null)
          Center(
            child: Text(
              'Select a script to compare',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: colorScheme.onSurfaceVariant,
                  ),
            ),
          ),

        const SizedBox(height: 32),
      ],
    );
  }
}
