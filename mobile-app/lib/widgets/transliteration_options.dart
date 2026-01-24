import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

class TransliterationOptionsWidget extends StatefulWidget {
  final Map<String, bool> options;
  final List<String> availableOptions;
  final ValueChanged<Map<String, bool>> onOptionsChanged;

  const TransliterationOptionsWidget({
    super.key,
    required this.options,
    required this.availableOptions,
    required this.onOptionsChanged,
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
                    children: widget.availableOptions.map((option) {
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
                    }).toList(),
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

    // Format the option key to be more readable
    final displayName = _formatOptionName(optionKey);
    final description = _getOptionDescription(optionKey);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Switch(
            value: value,
            onChanged: onChanged,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  displayName,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                if (description != null)
                  Text(
                    description,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurfaceVariant,
                        ),
                  ),
              ],
            ),
          ),
          IconButton(
            onPressed: () => _showOptionInfo(context, optionKey, displayName),
            icon: Icon(
              LucideIcons.info,
              size: 18,
              color: colorScheme.onSurfaceVariant,
            ),
            visualDensity: VisualDensity.compact,
          ),
        ],
      ),
    );
  }

  String _formatOptionName(String key) {
    // Convert camelCase or snake_case to readable format
    return key
        .replaceAllMapped(
          RegExp(r'([a-z])([A-Z])'),
          (match) => '${match.group(1)} ${match.group(2)}',
        )
        .replaceAll('_', ' ')
        .split(' ')
        .map((word) => word.isNotEmpty
            ? '${word[0].toUpperCase()}${word.substring(1)}'
            : word)
        .join(' ');
  }

  String? _getOptionDescription(String key) {
    // Add descriptions for known options
    const descriptions = {
      'removeViramaAndDoubleVirama': 'Remove virama marks from output',
      'replaceAvagrahaWithA': 'Replace avagraha with \'a\' character',
    };
    return descriptions[key];
  }

  void _showOptionInfo(BuildContext context, String key, String displayName) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(displayName),
        content: Text(
          'This option modifies the transliteration behavior for $displayName.',
        ),
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
