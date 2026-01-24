import 'package:flutter/material.dart';
import 'package:lipilekhika/lipilekhika.dart';

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

    // Get all available scripts
    final scripts = allScriptLangList.where((s) => s != 'Normal').toList();
    // Add Normal at the beginning for romanized input
    scripts.insert(0, 'Normal');

    return DropdownButtonFormField<String>(
      initialValue: value,
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
      items: scripts.map((script) {
        return DropdownMenuItem<String>(
          value: script,
          child: Row(
            children: [
              _buildScriptAvatar(context, script),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  _getDisplayName(script),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        );
      }).toList(),
      selectedItemBuilder: (context) {
        return scripts.map((script) {
          return Row(
            children: [
              _buildScriptAvatar(context, script),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  _getDisplayName(script),
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

    // Get first character representation for the script
    String avatarText = _getScriptSample(script);

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
          fontSize: 14,
          fontWeight: FontWeight.bold,
          color: colorScheme.onPrimaryContainer,
        ),
      ),
    );
  }

  String _getDisplayName(String script) {
    if (script == 'Normal') return 'Romanized';
    return script;
  }

  String _getScriptSample(String script) {
    // Sample characters for each script to show in avatar
    const samples = {
      'Normal': 'ā',
      'Romanized': 'ā',
      'Devanagari': 'अ',
      'Bengali': 'অ',
      'Tamil': 'அ',
      'Telugu': 'అ',
      'Kannada': 'ಅ',
      'Malayalam': 'അ',
      'Gujarati': 'અ',
      'Oriya': 'ଅ',
      'Gurmukhi': 'ਅ',
      'Sinhala': 'අ',
      'Thai': 'อ',
      'Tibetan': 'ཨ',
      'Burmese': 'အ',
      'Khmer': 'អ',
      'Lao': 'ອ',
      'Javanese': 'ꦄ',
      'Balinese': 'ᬅ',
      'Brahmi': '𑀅',
      'Grantha': '𑌅',
      'Modi': '𑘀',
      'Sharada': '𑆃',
      'Siddham': '𑖀',
      'Takri': '𑚀',
      'Kharoshthi': '𐨀',
      'Nandinagari': '𑧁',
      'Kaithi': '𑂃',
      'Bhaiksuki': '𑰀',
      'Soyombo': '𑩐',
      'ZanabazarSquare': '𑨀',
      'Tirhuta': '𑒁',
      'Newa': '𑐀',
      'Limbu': 'ᤀ',
      'Lepcha': 'ᰣ',
      'Meetei': 'ꯀ',
      'Ahom': '𑜀',
      'Mro': '𖩀',
      'Wancho': '𞋀',
      'PauCinHau': '𑫀',
      'Kayah': 'ꤊ',
      'Cham': 'ꨀ',
      'TaiTham': 'ᨠ',
      'NewTaiLue': 'ᦀ',
      'TaiViet': 'ꪀ',
      'Sundanese': 'ᮃ',
      'BatakToba': 'ᯀ',
      'BatakKaro': 'ᯀ',
      'Rejang': 'ꤰ',
      'Buginese': 'ᨀ',
      'Makasar': '𑻠',
      'OldJavanese': '𑼀',
      'OldSundanese': '𑻰',
      'Hanunoo': 'ᜠ',
      'Buhid': 'ᝀ',
      'Tagalog': 'ᜀ',
      'Tagbanwa': 'ᝠ',
      'Chakma': '𑄀',
      'SylotiNagri': 'ꠀ',
      'PhagsPa': 'ꡀ',
      'Marchen': '𑱀',
      'Masaram': '𑴀',
      'GunjalaGondi': '𑵠',
      'Dogra': '𑠀',
      'Dives': 'ހ',
      'Khojki': '𑈀',
      'Khudawadi': '𑊰',
      'Mahajani': '𑅐',
      'Multani': '𑊀',
      'Tifinagh': 'ⴰ',
    };

    return samples[script] ?? script.substring(0, 1).toUpperCase();
  }
}
