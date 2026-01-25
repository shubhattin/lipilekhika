import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lipilekhika/lipilekhika.dart';

/// Font Configuration for different scripts
/// Similar to fonts.css in the web app, but using Google Fonts for all Noto Sans fonts
/// and the bundled Satisar Sharada font for Sharada script.
class FontConfig {
  /// Get the appropriate TextStyle for a given script
  static TextStyle getTextStyleForScript(String script,
      {TextStyle? baseStyle}) {
    final fontFamily = _getFontFamilyForScript(script);

    if (baseStyle != null) {
      return baseStyle.copyWith(fontFamily: fontFamily);
    }

    return TextStyle(fontFamily: fontFamily);
  }

  /// Get the font family name for a given script
  static String _getFontFamilyForScript(String script) {
    // Normalize the script name
    final normalizedScript = getNormalizedScriptName(script);

    switch (normalizedScript) {
      // Base / Romanized
      case 'Normal':
      case 'Romanized':
        return GoogleFonts.notoSans().fontFamily!;

      // Indic Scripts - Using Noto Sans fonts via Google Fonts
      case 'Devanagari':
      case 'Purna-Devanagari':
        return GoogleFonts.notoSansDevanagari().fontFamily!;

      case 'Telugu':
        return GoogleFonts.notoSansTelugu().fontFamily!;

      case 'Tamil':
        return GoogleFonts.notoSansTamil().fontFamily!;

      case 'Tamil-Extended':
        return GoogleFonts.notoSansTamilSupplement().fontFamily!;

      case 'Bengali':
      case 'Assamese':
        // Assamese shares the Bengali font
        return GoogleFonts.notoSansBengali().fontFamily!;

      case 'Kannada':
        return GoogleFonts.notoSansKannada().fontFamily!;

      case 'Gujarati':
        return GoogleFonts.notoSansGujarati().fontFamily!;

      case 'Malayalam':
        return GoogleFonts.notoSansMalayalam().fontFamily!;

      case 'Odia':
        return GoogleFonts.notoSansOriya().fontFamily!;

      case 'Sinhala':
        return GoogleFonts.notoSansSinhala().fontFamily!;

      case 'Gurumukhi':
        return GoogleFonts.notoSansGurmukhi().fontFamily!;

      // Historic / Classical Scripts
      case 'Brahmi':
        return GoogleFonts.notoSansBrahmi().fontFamily!;

      case 'Granth':
        return GoogleFonts.notoSansGrantha().fontFamily!;

      case 'Modi':
        return GoogleFonts.notoSansModi().fontFamily!;

      case 'Sharada':
        // Using bundled Satisar Sharada font
        return 'SatisarSharada';

      case 'Siddham':
        return GoogleFonts.notoSansSiddham().fontFamily!;

      default:
        // Fallback to Noto Sans
        return GoogleFonts.notoSans().fontFamily!;
    }
  }

  /// Helper method to apply font to TextField decoration
  static InputDecoration applyFontToDecoration({
    required InputDecoration decoration,
    required String script,
  }) {
    final fontFamily = _getFontFamilyForScript(script);

    return decoration.copyWith(
      hintStyle: TextStyle(fontFamily: fontFamily),
      labelStyle: TextStyle(fontFamily: fontFamily),
      floatingLabelStyle: TextStyle(fontFamily: fontFamily),
    );
  }
}
