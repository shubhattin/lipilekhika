/// Available preset types
enum PresetListType {
  none,
  tscPortal,
}

/// Extension to get string key for SharedPreferences
extension PresetListTypeExtension on PresetListType {
  String get key {
    switch (this) {
      case PresetListType.none:
        return 'none';
      case PresetListType.tscPortal:
        return 'tsc_portal';
    }
  }

  static PresetListType fromKey(String key) {
    switch (key) {
      case 'tsc_portal':
        return PresetListType.tscPortal;
      case 'none':
      default:
        return PresetListType.none;
    }
  }
}

/// Rule type alias for readability
typedef Rule = String;

/// Conditional rule that applies only for specific script combinations
class ConditionalRule {
  final Rule rule;
  final String from;
  final String to;

  const ConditionalRule({
    required this.rule,
    required this.from,
    required this.to,
  });
}

/// Preset configuration
class Preset {
  final String label;
  final String? description;
  final List<Rule> directApplyRules;
  final List<ConditionalRule> conditionalRules;

  const Preset({
    required this.label,
    this.description,
    this.directApplyRules = const [],
    this.conditionalRules = const [],
  });
}

/// Scripts in which option `brahmic_to_brahmic:replace_pancham_varga_varna_with_anusvAra`
/// is to be enabled
const List<String> scriptsToReplaceWithAnunasik = ['Telugu', 'Kannada'];

/// All available presets
const Map<PresetListType, Preset> presets = {
  PresetListType.none: Preset(
    label: 'None',
    description: 'No Default Transliteration Options',
    directApplyRules: [],
    conditionalRules: [],
  ),
  PresetListType.tscPortal: Preset(
    label: 'The Sanskrit Channel',
    description:
        'Default Transliteration Options used in The Sanskrit Channel Projects Portal',
    directApplyRules: [
      'all_to_normal:remove_virAma_and_double_virAma',
      'all_to_normal:replace_avagraha_with_a',
      'all_to_normal:replace_pancham_varga_varna_with_n',
      'all_to_sinhala:use_conjunct_enabling_halant',
    ],
    conditionalRules: [
      ConditionalRule(
        rule: 'brahmic_to_brahmic:replace_pancham_varga_varna_with_anusvAra',
        from: 'Devanagari',
        to: 'Telugu',
      ),
      ConditionalRule(
        rule: 'brahmic_to_brahmic:replace_pancham_varga_varna_with_anusvAra',
        from: 'Devanagari',
        to: 'Kannada',
      ),
    ],
  ),
};

/// Check if a string is a valid preset key
bool isPresetKey(String key) {
  return key == 'none' || key == 'tsc_portal';
}
