import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:lipilekhika/lipilekhika.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../widgets/script_selector.dart';
import '../widgets/transliteration_options.dart';
import '../widgets/typing_helper_modal.dart';
import '../widgets/transliteration_formatter.dart';

class TransliterateScreen extends StatefulWidget {
  const TransliterateScreen({super.key});

  @override
  State<TransliterateScreen> createState() => _TransliterateScreenState();
}

class _TransliterateScreenState extends State<TransliterateScreen> {
  final TextEditingController _inputController = TextEditingController();

  String _fromScript = 'Devanagari';
  String _toScript = 'Romanized';
  String _outputText = '';
  bool _autoConvert = true;
  Map<String, bool> _options = {};
  List<String> _availableOptions = [];

  // Typing mode state
  bool _isTypingMode = true;
  TypingContext? _typingContext;
  TransliterationFormatter? _formatter;

  // Typing options
  bool _useNativeNumerals = true;
  bool _includeInherentVowel = false;

  @override
  void initState() {
    super.initState();
    _loadSavedScripts();
    _inputController.addListener(_onInputChanged);
  }

  /// Load saved script preferences from SharedPreferences
  Future<void> _loadSavedScripts() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedFromScript = prefs.getString('fromScript');
      final savedToScript = prefs.getString('toScript');

      setState(() {
        if (savedFromScript != null) {
          _fromScript = savedFromScript;
        }
        if (savedToScript != null) {
          _toScript = savedToScript;
        }
      });

      _loadOptions();
      // Initialize typing context after loading saved scripts
      if (_isTypingMode) {
        _initTypingContext();
      }
    } catch (e) {
      debugPrint('Error loading saved scripts: $e');
      // If loading fails, just use defaults and continue
      _loadOptions();
      if (_isTypingMode) {
        _initTypingContext();
      }
    }
  }

  /// Save script preferences to SharedPreferences
  Future<void> _saveScripts() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('fromScript', _fromScript);
      await prefs.setString('toScript', _toScript);
    } catch (e) {
      debugPrint('Error saving scripts: $e');
    }
  }

  @override
  void dispose() {
    _inputController.removeListener(_onInputChanged);
    _inputController.dispose();
    super.dispose();
  }

  void _onInputChanged() {
    if (_autoConvert) {
      _performTransliteration();
    }
  }

  Future<void> _loadOptions() async {
    try {
      final options = getAllOptions(
        fromScript: _fromScript,
        toScript: _toScript,
      );
      setState(() {
        _availableOptions = options;
        _options = {for (var opt in options) opt: false};
      });
      // Update typing context if script changed and typing mode is active
      if (_isTypingMode) {
        _initTypingContext();
      }
    } catch (e) {
      debugPrint('Error loading options: $e');
    }
  }

  void _initTypingContext() {
    try {
      final options = TypingContextOptions(
        autoContextClearTimeMs: BigInt.from(defaultAutoContextClearTimeMs),
        useNativeNumerals: _useNativeNumerals,
        includeInherentVowel: _includeInherentVowel,
      );

      _typingContext = createTypingContext(
        typingLang: _fromScript,
        options: options,
      );
      setState(() {
        _formatter = TransliterationFormatter(_typingContext!);
      });
    } catch (e) {
      debugPrint('Error initializing typing context: $e');
      setState(() {
        _isTypingMode = false;
        _formatter = null;
        _typingContext = null;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Typing not available for $_fromScript')),
        );
      }
    }
  }

  void _showTypingSettings() {
    showModalBottomSheet(
      context: context,
      showDragHandle: true,
      useSafeArea: true,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 24, left: 24, right: 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(
                      LucideIcons.settings,
                      size: 20,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                    const SizedBox(width: 12),
                    Text(
                      'Typing Options',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                _buildSwitchOption(
                  title: 'Use Native Numerals',
                  subtitle: 'Convert numbers to script numerals',
                  value: _useNativeNumerals,
                  onChanged: (value) {
                    setModalState(() => _useNativeNumerals = value);
                    setState(() => _useNativeNumerals = value);
                    _typingContext?.updateUseNativeNumerals(
                      useNativeNumerals: value,
                    );
                  },
                ),
                const Divider(height: 32),
                _buildSwitchOption(
                  title: 'Include Inherent Vowel',
                  subtitle: 'Add inherent vowel (schwa) to consonants',
                  value: _includeInherentVowel,
                  onChanged: (value) {
                    setModalState(() => _includeInherentVowel = value);
                    setState(() => _includeInherentVowel = value);
                    _typingContext?.updateIncludeInherentVowel(
                      includeInherentVowel: value,
                    );
                  },
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildSwitchOption({
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(fontWeight: FontWeight.w500),
              ),
              const SizedBox(height: 4),
              Text(
                subtitle,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
              ),
            ],
          ),
        ),
        Switch(
          value: value,
          onChanged: onChanged,
        ),
      ],
    );
  }

  void _performTransliteration() {
    if (_inputController.text.isEmpty) {
      setState(() => _outputText = '');
      return;
    }

    try {
      final result = transliterate(
        text: _inputController.text,
        fromScript: _fromScript,
        toScript: _toScript,
        options: _options.isEmpty ? null : _options,
      );
      setState(() => _outputText = result);
    } catch (e) {
      debugPrint('Transliteration error: $e');
    }
  }

  void _handleSwap() {
    final tempScript = _fromScript;
    final tempInput = _inputController.text;
    final tempOutput = _outputText;

    setState(() {
      _fromScript = _toScript;
      _toScript = tempScript;
      _inputController.text = tempOutput;
      _outputText = tempInput;
    });
    _saveScripts();
    _loadOptions();
  }

  Future<void> _copyToClipboard(String text) async {
    if (text.isEmpty) return;
    await Clipboard.setData(ClipboardData(text: text));
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Copied to clipboard'),
          duration: Duration(seconds: 1),
        ),
      );
    }
  }

  void _showTypingHelper() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => TypingHelperModal(
        script: _fromScript,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // From Section
          _buildSectionCard(
            title: 'FROM',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: ScriptSelector(
                        value: _fromScript,
                        onChanged: (value) {
                          setState(() => _fromScript = value);
                          _saveScripts();
                          _loadOptions();
                          if (_autoConvert) _performTransliteration();
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    IconButton.filled(
                      onPressed: _handleSwap,
                      icon: const Icon(LucideIcons.arrowLeftRight),
                      tooltip: 'Swap scripts',
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Text(
                      'Source text',
                      style: Theme.of(context).textTheme.labelLarge?.copyWith(
                            color: colorScheme.onSurfaceVariant,
                          ),
                    ),
                    const SizedBox(width: 8),
                    IconButton(
                      onPressed: () => _copyToClipboard(_inputController.text),
                      icon: const Icon(LucideIcons.copy, size: 18),
                      tooltip: 'Copy source',
                      visualDensity: VisualDensity.compact,
                    ),
                    IconButton(
                      onPressed: _showTypingHelper,
                      icon: Icon(
                        LucideIcons.helpCircle,
                        size: 20,
                        color: colorScheme.primary,
                      ),
                      tooltip: 'Typing help',
                      visualDensity: VisualDensity.compact,
                    ),
                    const Spacer(),
                    Text(
                      'Type',
                      style: Theme.of(context).textTheme.labelMedium,
                    ),
                    const SizedBox(width: 4),
                    Switch(
                      value: _isTypingMode,
                      onChanged: (value) {
                        setState(() {
                          _isTypingMode = value;
                          if (value) {
                            _initTypingContext();
                          } else {
                            _formatter = null;
                            _typingContext = null;
                          }
                        });
                      },
                    ),
                    const SizedBox(width: 4),
                    IconButton(
                      onPressed: _showTypingSettings,
                      icon: const Icon(LucideIcons.settings, size: 18),
                      tooltip: 'Typing options',
                      visualDensity: VisualDensity.compact,
                      style: IconButton.styleFrom(
                        foregroundColor:
                            Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _inputController,
                  maxLines: 6,
                  inputFormatters: [
                    if (_isTypingMode && _formatter != null) _formatter!,
                  ],
                  onTapOutside: (_) {
                    if (_isTypingMode) {
                      _typingContext?.clearContext();
                    }
                    FocusManager.instance.primaryFocus?.unfocus();
                  },
                  decoration: InputDecoration(
                    hintText: _isTypingMode
                        ? 'Type in $_fromScript...'
                        : 'Enter text to transliterate...',
                    filled: true,
                    fillColor: colorScheme.surfaceContainerLowest,
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // To Section
          _buildSectionCard(
            title: 'TO',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ScriptSelector(
                  value: _toScript,
                  onChanged: (value) {
                    setState(() => _toScript = value);
                    _saveScripts();
                    _loadOptions();
                    if (_autoConvert) _performTransliteration();
                  },
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Text(
                      'Output',
                      style: Theme.of(context).textTheme.labelLarge?.copyWith(
                            color: colorScheme.onSurfaceVariant,
                          ),
                    ),
                    const SizedBox(width: 8),
                    IconButton(
                      onPressed: () => _copyToClipboard(_outputText),
                      icon: const Icon(LucideIcons.copy, size: 18),
                      tooltip: 'Copy output',
                      visualDensity: VisualDensity.compact,
                    ),
                    const Spacer(),
                    Text(
                      'Auto',
                      style: Theme.of(context).textTheme.labelMedium,
                    ),
                    const SizedBox(width: 4),
                    Switch(
                      value: _autoConvert,
                      onChanged: (value) {
                        setState(() => _autoConvert = value);
                        if (value) _performTransliteration();
                      },
                    ),
                    if (!_autoConvert) ...[
                      const SizedBox(width: 8),
                      FilledButton.icon(
                        onPressed: _performTransliteration,
                        icon: const Icon(LucideIcons.refreshCw, size: 16),
                        label: const Text('Convert'),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 8),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  constraints: const BoxConstraints(minHeight: 150),
                  decoration: BoxDecoration(
                    color: colorScheme.surfaceContainerHighest
                        .withValues(alpha: 0.5),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: colorScheme.outline.withValues(alpha: 0.3),
                    ),
                  ),
                  child: SelectableText(
                    _outputText,
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          height: 1.5,
                        ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 12),

          // Transliteration Options
          if (_availableOptions.isNotEmpty)
            TransliterationOptionsWidget(
              options: _options,
              availableOptions: _availableOptions,
              onOptionsChanged: (newOptions) {
                setState(() => _options = newOptions);
                if (_autoConvert) _performTransliteration();
              },
            ),

          // Bottom padding for better spacing
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildSectionCard({
    required String title,
    required Widget child,
  }) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.2,
                    color: Theme.of(context).colorScheme.primary,
                  ),
            ),
            const SizedBox(height: 12),
            child,
          ],
        ),
      ),
    );
  }
}
