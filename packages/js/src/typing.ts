import { getNormalizedScriptName } from './utils/lang_list/script_normalization';
import { getScriptData } from './utils/get_script_data';
import {
  resolve_transliteration_rules,
  transliterate_text_core,
  type CustomOptionType
} from './transliteration/transliterate';
import type { ScriptLangType } from './types';

const DEFAULT_AUTO_CONTEXT_CLEAR_TIME_MS = 4500;
const DEFAULT_USE_NATIVE_NUMERALS = true;
type TypingContextOptions = {
  /** The time in milliseconds after which the context will be cleared automatically
   * @default 4500ms
   */
  autoContextTClearTimeMs?: number;
  /** Use native numerals in transliteration/typing
   * @default true
   */
  useNativeNumerals?: boolean;
};

/**
 * Creates a stateful isolated context for character by character input typing.
 * This is the main function which returns the `diff`, different realtime schems can be implemented using this.
 *
 * **Note** :- Script Data is loaded in background but it would still be good to await `ready` before using the context.
 * @param typing_lang - The script/language to type in
 * @param options - The options for the typing context
 * @returns A closed over context object with the following methods:
 */
export function createTypingContext(typing_lang: ScriptLangType, options?: TypingContextOptions) {
  const { autoContextTClearTimeMs } = options ?? {};
  let use_native_numerals = options?.useNativeNumerals ?? DEFAULT_USE_NATIVE_NUMERALS;
  const normalized_typing_lang = getNormalizedScriptName(typing_lang);
  if (!normalized_typing_lang) {
    throw new Error(`Invalid script name: ${typing_lang}`);
  }

  let curr_input = '';
  let curr_output = '';

  const auto_context_clear_time_ms = autoContextTClearTimeMs ?? DEFAULT_AUTO_CONTEXT_CLEAR_TIME_MS;
  let last_time_ms: number | null = null;

  let from_script_data: Awaited<ReturnType<typeof getScriptData>> | null = null;
  let to_script_data: Awaited<ReturnType<typeof getScriptData>> | null = null;
  let trans_options: CustomOptionType = {};
  let custom_rules: ReturnType<typeof resolve_transliteration_rules>['custom_rules'] = [];

  /** Resolves script data + rules once, so per-key typing stays synchronous. */
  const ready: Promise<void> = (async () => {
    const [fromData, toData] = await Promise.all([
      getScriptData('Normal'),
      getScriptData(normalized_typing_lang)
    ]);
    from_script_data = fromData;
    to_script_data = toData;
    const resolved = resolve_transliteration_rules(fromData, toData);
    trans_options = resolved.trans_options;
    custom_rules = resolved.custom_rules;
  })();

  /** Cleares all internal states and contexts */
  function clearContext() {
    last_time_ms = null;
    curr_input = '';
    curr_output = '';
  }
  // having `takeKeyInput` as async function resulted in some latency issues
  // so we have reorganized the code be synchronous

  /**
   * Accepts character by character input and returns the diff
   * @param key  The key to take input for
   * @returns The diff of the previous and current output
   */
  function takeKeyInput(key: string) {
    if (!from_script_data || !to_script_data) {
      throw new Error(
        'Typing context not ready. Await `ctx.ready` before calling takeKeyInputSync.'
      );
    }
    const curr_time_ms = Date.now();
    if (last_time_ms && curr_time_ms - last_time_ms > auto_context_clear_time_ms) {
      clearContext();
    }
    let char_key = key?.[0] ?? '';
    curr_input += char_key;
    let prev_output = curr_output;
    const { context_length, output } = transliterate_text_core(
      curr_input,
      'Normal',
      normalized_typing_lang!,
      from_script_data,
      to_script_data,
      trans_options,
      custom_rules,
      { typing_mode: true, useNativeNumerals: use_native_numerals }
    );
    if (context_length > 0) {
      curr_output = output;
    } else if (context_length === 0) {
      last_time_ms = null;
      curr_input = '';
      curr_output = '';
    }

    // calculate the diff
    let common_index = 0;
    while (common_index < output.length && common_index < prev_output.length) {
      if (output[common_index] !== prev_output[common_index]) break;
      common_index++;
    }
    let diff_add_text = output.substring(common_index);
    let to_delete_chars_count = prev_output.length - common_index;

    last_time_ms = Date.now();
    return {
      /** These number of characters need to be deleted from the current "app" input state */
      to_delete_chars_count,
      /** These characters need to be added to the current "app" input state */
      diff_add_text
    };
  }

  return {
    /** Await once, then use `takeKeyInputSync` for best typing latency. */
    ready,
    clearContext,
    takeKeyInput,
    updateUseNativeNumerals: (useNativeNumerals: boolean) => {
      use_native_numerals = useNativeNumerals ?? DEFAULT_USE_NATIVE_NUMERALS;
    }
  };
}

/**
 * Handles input events for transliteration typing in `input` and `textarea` elements
 *
 * @param typingContext - The typing context created for the element
 * @param event - Input Event
 * @param onValueChange - Optional callback function invoked when the value changes
 */
export async function handleTypingInputEvent(
  typingContext: ReturnType<typeof createTypingContext>,
  event: any,
  onValueChange?: (updatedValue: string) => void,
  enabled_?: boolean
) {
  const enabled = enabled_ ?? true;
  if (!enabled) {
    onValueChange?.(event.currentTarget.value);
    return;
  }
  // react synthetic event handling
  const isReactSyntheticEvent = 'nativeEvent' in event;
  const isInputEvent = isReactSyntheticEvent
    ? typeof InputEvent !== 'undefined' &&
      event?.nativeEvent instanceof InputEvent &&
      event.nativeEvent.data !== null
    : typeof InputEvent !== 'undefined' && event instanceof InputEvent && event.data !== null;
  const inputElement = isReactSyntheticEvent ? event.nativeEvent.target : event.currentTarget;
  if (isInputEvent) {
    if (isReactSyntheticEvent && onValueChange) {
      // extra step required in react
      onValueChange(event.currentTarget.value);
    }
    await typingContext.ready;

    const inputData = isReactSyntheticEvent ? event.nativeEvent.data : event.data;
    const { diff_add_text, to_delete_chars_count } = typingContext.takeKeyInput(inputData);
    const currentValue = inputElement.value;
    const cursorPosition = (inputElement.selectionStart ?? 0) + 1;

    // Split the text into three parts: before cursor, changed part, and after cursor
    const deleteStartPosition = cursorPosition - to_delete_chars_count - 2;
    const textBeforeCursor = currentValue.substring(0, deleteStartPosition);
    const transliteratedText = diff_add_text;

    let textAfterCursor = '';
    const isAtEnd = currentValue.length + 1 === cursorPosition;
    const isNotAtEnd = currentValue.length + 1 !== cursorPosition;

    if (isAtEnd) {
      textAfterCursor = currentValue.substring(cursorPosition + 1);
    } else if (isNotAtEnd) {
      textAfterCursor = currentValue.substring(cursorPosition - 1);
    }

    const newCursorPosition = textBeforeCursor.length + transliteratedText.length;
    const updatedValue = textBeforeCursor + transliteratedText + textAfterCursor;

    // Update the input element
    inputElement.value = updatedValue;
    inputElement.focus();
    inputElement.selectionStart = newCursorPosition;
    inputElement.selectionEnd = newCursorPosition;

    onValueChange?.(updatedValue);
  } else {
    // Handle non-character events (delete, backspace, paste, etc.)
    onValueChange?.(inputElement.value);
    typingContext.clearContext();
  }
}

/**
 * Handles `beforeinput` events for transliteration typing in `input` and `textarea` elements.
 *
 * This is the recommended browser-native approach:
 * - Use `beforeinput` to "suppress" the default insertion via `preventDefault()`
 * - Apply the transliteration diff using the native `setRangeText` API
 *
 * For non-character events (backspace/delete/paste/etc), do NOT prevent default here.
 * Pair this with `handleTypingInputEvent` on `input` to keep state in sync for those cases.
 *
 * @param typingContext - The typing context created for the element
 * @param event - BeforeInput event (native or React synthetic)
 * @param onValueChange - Optional callback function invoked when the value changes
 */
// export async function handleTypingBeforeInputEvent(
//   typingContext: ReturnType<typeof createTypingContext>,
//   event: any,
//   onValueChange?: (updatedValue: string) => void
// ) {
//   const nativeEvent: any = event?.nativeEvent ?? event;
//   const inputElement: HTMLInputElement | HTMLTextAreaElement | null = (event?.currentTarget ??
//     nativeEvent?.target) as any;

//   if (!nativeEvent || !inputElement) return;

//   // Don’t interfere with IME/composition; this breaks mobile/IME typing.
//   if (nativeEvent.isComposing) return;

//   // Only handle actual text insertions. Let the browser do everything else.
//   // (Deletes/paste/etc should be handled via `input` handler + context clearing.)
//   if (nativeEvent.inputType !== 'insertText') return;
//   const inputData: unknown = nativeEvent.data;
//   if (typeof inputData !== 'string' || inputData.length === 0) return;

//   // If there is a selection, we don’t have a clean incremental diff story yet.
//   // Let the browser replace the selection and reset the typing context.
//   const selectionStart = inputElement.selectionStart ?? 0;
//   const selectionEnd = inputElement.selectionEnd ?? selectionStart;
//   if (selectionStart !== selectionEnd) {
//     typingContext.clearContext();
//     return;
//   }

//   await typingContext.ready;

//   // Suppress the default browser insertion.
//   nativeEvent.preventDefault?.();

//   const { diff_add_text, to_delete_chars_count } = typingContext.takeKeyInput(inputData);

//   // Replace the "context" immediately before the caret with the transliterated diff.
//   const replaceEnd = selectionStart;
//   const replaceStart = Math.max(0, replaceEnd - to_delete_chars_count);
//   inputElement.setRangeText(diff_add_text, replaceStart, replaceEnd, 'end');

//   onValueChange?.(inputElement.value);
// }

const CONTEXT_CLEAR_KEYS = new Set([
  'Backspace',
  'Delete',
  'Enter',
  'Tab',
  'Escape',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
  'PageUp',
  'PageDown'
]);

/**
 * Checks if the keydown event should clear the typing context
 * @param e - The keydown event
 * @param ctx - The typing context
 * @returns True if the keydown event should clear the typing context, false otherwise
 */
export function clearTypingContextOnKeyDown(e: any, ctx: ReturnType<typeof createTypingContext>) {
  if (e instanceof KeyboardEvent) {
    // Mobile virtual keyboards and IME/composition frequently report keys like
    // "Unidentified"/"Process". Clearing context here breaks typing on Android/iOS.
    if (e.isComposing) return false;

    const key = e.key;
    if (!key) return false;

    if (key === 'Unidentified' || key === 'Process' || key === 'Dead') return false;

    // Respect shortcut chords / OS-level commands; these should not affect context.
    if (e.ctrlKey || e.metaKey || e.altKey) return false;

    if (CONTEXT_CLEAR_KEYS.has(key)) {
      ctx.clearContext();
      return true;
    }
  }
  return false;
}
