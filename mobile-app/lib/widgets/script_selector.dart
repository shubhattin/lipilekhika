import 'package:flutter/material.dart';

// Script avatar mappings matching the TypeScript version
const Map<String, String> scriptAvatarMap = {
  'Devanagari': 'अ',
  'Telugu': 'అ',
  'Tamil': 'அ',
  'Tamil-Extended': 'அ',
  'Bengali': 'অ',
  'Kannada': 'ಅ',
  'Gujarati': 'અ',
  'Malayalam': 'അ',
  'Odia': 'ଅ',
  'Sinhala': 'අ',
  'Normal': 'a',
  'Romanized': 'ā',
  'Gurumukhi': 'ਅ',
  'Assamese': 'অ',
  'Siddham': '𑖀',
  'Purna-Devanagari': 'अ',
  'Brahmi': '𑀅',
  'Granth': '𑌅',
  'Modi': '𑘀',
  'Sharada': '𑆃',
};

// Script categories for organization
enum ScriptCategory {
  modern('Modern Indian Scripts'),
  romanized('Romanization Scripts'),
  ancient('Ancient Scripts');

  final String label;
  const ScriptCategory(this.label);
}

// Ordered list of scripts matching the TypeScript version exactly
// This list is hardcoded to maintain consistent ordering across runs
// (the Rust scriptList uses HashMap which has unpredictable ordering)
const List<ScriptInfo> orderedScripts = [
  // Modern Indian Scripts
  ScriptInfo('Devanagari', ScriptCategory.modern),
  ScriptInfo('Telugu', ScriptCategory.modern),
  ScriptInfo('Tamil', ScriptCategory.modern),
  ScriptInfo('Bengali', ScriptCategory.modern),
  ScriptInfo('Kannada', ScriptCategory.modern),
  ScriptInfo('Gujarati', ScriptCategory.modern),
  ScriptInfo('Malayalam', ScriptCategory.modern),
  ScriptInfo('Odia', ScriptCategory.modern),
  ScriptInfo('Gurumukhi', ScriptCategory.modern),
  ScriptInfo('Assamese', ScriptCategory.modern),
  ScriptInfo('Sinhala', ScriptCategory.modern),
  ScriptInfo('Tamil-Extended', ScriptCategory.modern),
  ScriptInfo('Purna-Devanagari', ScriptCategory.modern),
  // Romanization Scripts
  ScriptInfo('Normal', ScriptCategory.romanized),
  ScriptInfo('Romanized', ScriptCategory.romanized),
  // Ancient Scripts
  ScriptInfo('Brahmi', ScriptCategory.ancient),
  ScriptInfo('Sharada', ScriptCategory.ancient),
  ScriptInfo('Granth', ScriptCategory.ancient),
  ScriptInfo('Modi', ScriptCategory.ancient),
  ScriptInfo('Siddham', ScriptCategory.ancient),
];

// Helper class to store script info
class ScriptInfo {
  final String name;
  final ScriptCategory category;

  const ScriptInfo(this.name, this.category);
}

class ScriptSelector extends StatelessWidget {
  final String value;
  final ValueChanged<String> onChanged;

  const ScriptSelector({
    super.key,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    final scripts =
        orderedScripts.map((scriptInfo) => scriptInfo.name).toList(growable: false);
    final String? initialValue = scripts.contains(value)
        ? value
        : (scripts.contains('Normal') ? 'Normal' : null);

    // Group scripts by category using the ordered list
    final groupedScripts = <ScriptCategory, List<String>>{};
    for (final scriptInfo in orderedScripts) {
      groupedScripts
          .putIfAbsent(scriptInfo.category, () => [])
          .add(scriptInfo.name);
    }

    // Build dropdown items with category headers
    final List<DropdownMenuItem<String>> items = [];
    for (final category in ScriptCategory.values) {
      final scriptsInCategory = groupedScripts[category];
      if (scriptsInCategory != null && scriptsInCategory.isNotEmpty) {
        // Category header (disabled item)
        items.add(
          DropdownMenuItem<String>(
            value: null,
            enabled: false,
            child: Padding(
              padding: const EdgeInsets.only(top: 8, bottom: 4),
              child: Text(
                category.label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: colorScheme.primary,
                ),
              ),
            ),
          ),
        );

        // Scripts in this category
        for (final script in scriptsInCategory) {
          items.add(
            DropdownMenuItem<String>(
              value: script,
              child: Padding(
                padding: const EdgeInsets.only(left: 8),
                child: Row(
                  children: [
                    _buildScriptAvatar(context, script),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        script,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }
      }
    }

    return DropdownButtonFormField<String>(
      value: initialValue,
      decoration: InputDecoration(
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        filled: true,
        fillColor: colorScheme.surfaceContainerLow,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: colorScheme.outline),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide:
              BorderSide(color: colorScheme.outline.withValues(alpha: 0.5)),
        ),
      ),
      isExpanded: true,
      icon: const Icon(Icons.arrow_drop_down),
      items: items,
      selectedItemBuilder: (context) {
        // Must return same number of items as 'items' list, in same order
        // For headers (null value), we return empty containers
        // For scripts, we return the selected display widget
        return items.map((item) {
          if (item.value == null) {
            // Category header - return empty container (won't be shown)
            return const SizedBox.shrink();
          }
          final script = item.value!;
          return Row(
            children: [
              _buildScriptAvatar(context, script),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  script,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          );
        }).toList();
      },
      onChanged: (newValue) {
        if (newValue != null) {
          onChanged(newValue);
        }
      },
    );
  }

  Widget _buildScriptAvatar(BuildContext context, String script) {
    final colorScheme = Theme.of(context).colorScheme;

    // Get script avatar from the map (matching TypeScript version)
    String avatarText =
        scriptAvatarMap[script] ?? script.substring(0, 1).toUpperCase();

    return Container(
      width: 32,
      height: 32,
      decoration: BoxDecoration(
        color: colorScheme.primaryContainer,
        borderRadius: BorderRadius.circular(8),
      ),
      alignment: Alignment.center,
      child: Text(
        avatarText,
        style: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w600,
          color: colorScheme.onPrimaryContainer,
        ),
      ),
    );
  }
}
