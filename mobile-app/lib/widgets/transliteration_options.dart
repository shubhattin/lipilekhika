import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../models/presets.dart';
import 'preset_selector.dart';

// Custom option descriptions matching the TypeScript/Svelte version
const Map<String, (String, String)> customOptionDescriptions = {
  'all_to_normal:preserve_specific_chars': (
    'Preserve Specific Characters',
    'Preserves script-specific characters when converting to Normal script. Can be useful for studying script specific characters.'
  ),
  'all_to_normal:remove_virAma_and_double_virAma': (
    'Remove Virāma and Double Virāma',
    'Removes virāma (।) and pūrṇa virāma (॥) punctuation from Normal/Romanized output.'
  ),
  'all_to_normal:replace_avagraha_with_a': (
    'Replace Avagraha with a',
    "Replaces avagraha (ऽ) with 'a' in Normal/Romanized output."
  ),
  'all_to_sinhala:use_conjunct_enabling_halant': (
    'Use Conjunct Enabling Halant',
    'Uses conjunct-enabling halant (්) for Sinhala output to properly form conjunct consonants.'
  ),
  'all_to_normal:replace_pancham_varga_varna_with_n': (
    'Replace Pancham Varga Varna with n',
    "Replaces ङ (G) and ञ (J) with 'n' for more natural output."
  ),
  'brahmic_to_brahmic:replace_pancham_varga_varna_with_anusvAra': (
    'Replace Pancham Varga Varna with Anusvāra',
    'Replaces 5th varga consonants (ङ्, ञ्, ण्, न्, म्) with anusvāra (ं) when followed by consonants of the same varga.'
  ),
  'normal_to_all:use_typing_chars': (
    'Use Typing Characters',
    'Enables typing mode characters including duplicate alternatives and script-specific characters. Equivalent to typing mode using `createTypingContext` function.'
  ),
};

class TransliterationOptionsWidget extends StatefulWidget {
  final Map<String, bool> options;
  final List<String> availableOptions;
  final ValueChanged<Map<String, bool>> onOptionsChanged;
  final PresetListType preset;
  final ValueChanged<PresetListType> onPresetChanged;

  const TransliterationOptionsWidget({
    super.key,
    required this.options,
    required this.availableOptions,
    required this.onOptionsChanged,
    required this.preset,
    required this.onPresetChanged,
  });

  @override
  State<TransliterationOptionsWidget> createState() =>
      _TransliterationOptionsWidgetState();
}

class _TransliterationOptionsWidgetState
    extends State<TransliterationOptionsWidget> {
  bool _isExpanded = false;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Card(
      child: Column(
        children: [
          InkWell(
            onTap: () => setState(() => _isExpanded = !_isExpanded),
            borderRadius: BorderRadius.circular(12),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Icon(
                    LucideIcons.settings2,
                    size: 20,
                    color: colorScheme.primary,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Transliteration Options',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                    ),
                  ),
                  Icon(
                    _isExpanded
                        ? LucideIcons.chevronUp
                        : LucideIcons.chevronDown,
                    color: colorScheme.onSurfaceVariant,
                  ),
                ],
              ),
            ),
          ),
          AnimatedCrossFade(
            firstChild: const SizedBox.shrink(),
            secondChild: Column(
              children: [
                const Divider(height: 1),
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      PresetSelector(
                        value: widget.preset,
                        onChanged: widget.onPresetChanged,
                      ),
                      if (widget.availableOptions.isNotEmpty) ...[
                        const SizedBox(height: 16),
                        const Divider(height: 1),
                        const SizedBox(height: 12),
                      ],
                      if (widget.availableOptions.isEmpty)
                        Padding(
                          padding: const EdgeInsets.only(top: 16),
                          child: Text(
                            'No options available for this combination.',
                            style:
                                Theme.of(context).textTheme.bodySmall?.copyWith(
                                      color: colorScheme.onSurfaceVariant,
                                    ),
                          ),
                        )
                      else
                        ...widget.availableOptions.map((option) {
                          return _buildOptionTile(
                            context,
                            option,
                            widget.options[option] ?? false,
                            (value) {
                              final newOptions =
                                  Map<String, bool>.from(widget.options);
                              newOptions[option] = value;
                              widget.onOptionsChanged(newOptions);
                            },
                          );
                        }),
                    ],
                  ),
                ),
              ],
            ),
            crossFadeState: _isExpanded
                ? CrossFadeState.showSecond
                : CrossFadeState.showFirst,
            duration: const Duration(milliseconds: 200),
          ),
        ],
      ),
    );
  }

  Widget _buildOptionTile(
    BuildContext context,
    String optionKey,
    bool value,
    ValueChanged<bool> onChanged,
  ) {
    final colorScheme = Theme.of(context).colorScheme;

    // Get proper name and description from the map
    final optionInfo = customOptionDescriptions[optionKey];
    final displayName = optionInfo?.$1 ?? optionKey;
    final description = optionInfo?.$2 ?? 'No description available.';

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Switch(
            value: value,
            onChanged: onChanged,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: GestureDetector(
              onTap: () => onChanged(!value),
              child: Text(
                displayName,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w500,
                    ),
              ),
            ),
          ),
          IconButton(
            onPressed: () => _showOptionInfo(context, displayName, description),
            icon: Icon(
              LucideIcons.info,
              size: 18,
              color: colorScheme.primary,
            ),
            tooltip: 'More info',
            visualDensity: VisualDensity.compact,
          ),
        ],
      ),
    );
  }

  void _showOptionInfo(
      BuildContext context, String displayName, String description) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(displayName),
        content: Text(description),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }
}
