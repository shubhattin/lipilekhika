import 'package:flutter/services.dart';
import 'package:lipilekhika/lipilekhika.dart';

/// A [TextInputFormatter] that performs real-time transliteration while typing.
///
/// This is the Flutter equivalent of the web's `input` event handler approach.
/// In Flutter, `formatEditUpdate` is called after the system has proposed an edit,
/// similar to how the web `input` event fires after the browser has applied the change.
///
/// Example usage:
/// ```dart
/// final ctx = createTypingContext(typingLang: 'Devanagari');
/// TextField(
///   inputFormatters: [TransliterationFormatter(ctx)],
/// )
/// ```
class TransliterationFormatter extends TextInputFormatter {
  final TypingContext ctx;

  TransliterationFormatter(this.ctx);

  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    // Don't interfere with IME composition - this breaks mobile/IME typing
    if (newValue.composing.isValid && !newValue.composing.isCollapsed) {
      return newValue;
    }

    // Calculate the change in text length
    final deltaLen = newValue.text.length - oldValue.text.length;

    // If text was deleted or unchanged, clear context and pass through
    if (deltaLen <= 0) {
      ctx.clearContext();
      return newValue;
    }

    // If there was a selection (not collapsed) in old value, it means text was replaced
    // Clear context and let the change pass through
    if (!oldValue.selection.isCollapsed) {
      ctx.clearContext();
      return newValue;
    }

    // If more than one character was inserted (paste), clear context and pass through
    if (deltaLen != 1) {
      ctx.clearContext();
      return newValue;
    }

    // Get the cursor position in the NEW value (after system inserted the char)
    // This is equivalent to selectionStart in the web input event
    final cursorAfterInsert = newValue.selection.baseOffset;
    if (cursorAfterInsert < 1) {
      ctx.clearContext();
      return newValue;
    }

    // Get the single inserted character
    // It should be at the position just before the cursor
    final insertedChar = newValue.text.substring(
      cursorAfterInsert - 1,
      cursorAfterInsert,
    );

    // Process the character through the typing context
    final diff = ctx.takeKeyInput(key: insertedChar);
    final toDeleteCharsCount = diff.toDeleteCharsCount.toInt();
    final diffAddText = diff.diffAddText;

    // Calculate the replacement range
    // This matches the TS handleTypingInputEvent logic:
    // const replaceEnd = selectionStart; // cursor position after insert
    // const replaceStart = Math.max(0, replaceEnd - to_delete_chars_count - inputData.length);
    //
    // In Flutter terms:
    // - replaceEnd = cursorAfterInsert (where cursor is after system inserted the char)
    // - We need to remove: the inserted char (1) + toDeleteCharsCount previous output chars
    final replaceEnd = cursorAfterInsert;
    final replaceStart =
        (replaceEnd - toDeleteCharsCount - 1).clamp(0, replaceEnd);

    // Build the new text by replacing the range [replaceStart, replaceEnd) with diffAddText
    final beforeReplacement = newValue.text.substring(0, replaceStart);
    final afterReplacement = newValue.text.substring(replaceEnd);
    final updatedText = beforeReplacement + diffAddText + afterReplacement;

    // Calculate new cursor position (at end of inserted text)
    final newCaret = replaceStart + diffAddText.length;

    return TextEditingValue(
      text: updatedText,
      selection: TextSelection.collapsed(offset: newCaret),
      composing: TextRange.empty,
    );
  }
}
