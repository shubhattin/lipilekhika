import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../models/presets.dart';

/// Widget for selecting a preset transliteration configuration
class PresetSelector extends StatelessWidget {
  final PresetListType value;
  final ValueChanged<PresetListType> onChanged;

  const PresetSelector({
    super.key,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final preset = presets[value];

    return Row(
      children: [
        Text(
          'Preset',
          style: Theme.of(context).textTheme.labelLarge?.copyWith(
                color: colorScheme.onSurfaceVariant,
                fontWeight: FontWeight.w500,
              ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: DropdownButtonFormField<PresetListType>(
            initialValue: value,
            decoration: InputDecoration(
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              filled: true,
              fillColor: colorScheme.surfaceContainerLow,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide(color: colorScheme.outline),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide(
                    color: colorScheme.outline.withValues(alpha: 0.5)),
              ),
              isDense: true,
            ),
            isExpanded: true,
            icon: const Icon(Icons.arrow_drop_down, size: 20),
            items: PresetListType.values.map((presetType) {
              return DropdownMenuItem<PresetListType>(
                value: presetType,
                child: Text(
                  presets[presetType]?.label ?? presetType.name,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              );
            }).toList(),
            onChanged: (newValue) {
              if (newValue != null) {
                onChanged(newValue);
              }
            },
          ),
        ),
        if (value != PresetListType.none && preset?.description != null) ...[
          const SizedBox(width: 8),
          IconButton(
            onPressed: () => _showPresetInfo(context, preset!),
            icon: Icon(
              LucideIcons.info,
              size: 18,
              color: colorScheme.primary,
            ),
            tooltip: 'Preset details',
            visualDensity: VisualDensity.compact,
            style: IconButton.styleFrom(
              padding: const EdgeInsets.all(8),
            ),
          ),
        ],
      ],
    );
  }

  void _showPresetInfo(BuildContext context, Preset preset) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(preset.label),
        content: Text(preset.description ?? ''),
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
