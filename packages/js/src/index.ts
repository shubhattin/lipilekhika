import {
  transliterate_text,
  get_active_custom_options,
  resolve_transliteration_rules,
  transliterate_text_core,
  type CustomOptionType,
  type CustomOptionList
} from './transliteration/transliterate';
import { getScriptData } from './utils/get_script_data';
import {
  getNormalizedScriptName,
  type script_input_name_type
} from './utils/lang_list/script_normalization';
import custom_options_json from './custom_options.json';
import {
  SCRIPT_LIST,
  LANG_LIST,
  ALL_LANG_SCRIPT_LIST,
  type script_list_type,
  type lang_list_type,
  type script_and_lang_list_type
} from './utils/lang_list';

export {
  /**
   * The list of all supported script names
   */
  SCRIPT_LIST,
  /**
   * The list of all supported language names which are mapped to a script
   */
  LANG_LIST,
  /** Lists of all Supported Script/Language */
  ALL_LANG_SCRIPT_LIST
};
/** Type of the script list */
export type ScriptListType = script_list_type;
/** Type of the language list */
export type LangListType = lang_list_type;
/** Type of the script and language list */
export type ScriptAndLangListType = script_and_lang_list_type;

/**
 * Preloads the script data. Useful for browsers as avoids the fetch latency
 * @param name - The name of the script/language to preload
 * @returns The script data
 * @public
 */
export const preloadScriptData = async (name: script_input_name_type) => {
  const normalizedName = getNormalizedScriptName(name);
  if (!normalizedName) {
    throw new Error(`Invalid script name: ${name}`);
  }
  const scriptData = await getScriptData(normalizedName);
  return scriptData;
};

/**
 * Supported script/language identifier types
 */
export type ScriptLangType = script_input_name_type;

/**
 * Transliterates `text` from `from` to `to`.
 * @param text - The text to transliterate
 * @param from - The script/language to transliterate from
 * @param to - The script/language to transliterate to
 * @param options - The custom options to use for the transliteration
 * @returns The transliterated text
 */
export async function transliterate(
  text: string,
  from: ScriptLangType,
  to: ScriptLangType,
  options?: CustomOptionType
) {
  const normalized_from = getNormalizedScriptName(from);
  if (!normalized_from) {
    throw new Error(`Invalid script name: ${from}`);
  }
  const normalized_to = getNormalizedScriptName(to);
  if (!normalized_to) {
    throw new Error(`Invalid script name: ${to}`);
  }
  if (normalized_from === normalized_to) return text;
  const result = await transliterate_text(text, normalized_from, normalized_to, options);
  return result.output;
}

/**
 * This returns the list of all supported custom options for
 * transliterations for the provided script pair
 * @param from_script_name - The script/language to transliterate from
 * @param to_script_name - The script/language to transliterate to
 * @returns The list of all supported custom options for the provided script pair
 */
export async function getAllOptions(
  from_script_name: ScriptLangType,
  to_script_name: ScriptLangType
) {
  const normalized_from = getNormalizedScriptName(from_script_name);
  if (!normalized_from) {
    throw new Error(`Invalid script name: ${from_script_name}`);
  }
  const normalized_to = getNormalizedScriptName(to_script_name);
  if (!normalized_to) {
    throw new Error(`Invalid script name: ${to_script_name}`);
  }
  const from_script_data = await getScriptData(normalized_from);
  const to_script_data = await getScriptData(normalized_to);
  return Object.keys(
    get_active_custom_options(
      from_script_data,
      to_script_data,
      Object.fromEntries(Object.keys(custom_options_json).map((key) => [key, true]))
    )
  ) as CustomOptionList[];
}

/**
 * Custom Transliteration Options
 */
export type TransliterationOptions = CustomOptionType;

/**
 * Creates a stateful isolated context for character by character input typing
 *
 * **Note** :- Script Data is loaded in background but it would still be good to await `ready` before using the context.
 * @param typing_lang - The script/language to type in
 * @returns A closed over context object with the following methods:
 */
export function createTypingContext(typing_lang: ScriptLangType) {
  const normalized_typing_lang = getNormalizedScriptName(typing_lang);
  if (!normalized_typing_lang) {
    throw new Error(`Invalid script name: ${typing_lang}`);
  }

  let curr_input = '';
  let curr_output = '';

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
      { typing_mode: true }
    );
    if (context_length > 0) {
      curr_output = output;
    } else if (context_length === 0) {
      curr_input = '';
      curr_output = '';
    }

    // calculate the diff
    let common_index = 0;
    for (let n = 0; n < output.length; n++) {
      if (output.length == common_index) break;
      if (output[common_index] != prev_output[common_index]) break;
      common_index++;
    }
    let diff_add_text = output.substring(common_index);
    let to_delete_chars_count = prev_output.length - common_index;

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
    getCurrentOutput: () => curr_output
  };
}

type TextInputElement = HTMLInputElement | HTMLTextAreaElement;
/**
 * Cross-framework event type for `<input>` / `<textarea>` handlers.
 *
 * - Svelte / Solid / Vue typically pass the native DOM event (`InputEvent` at runtime).
 * - React wraps DOM events in a SyntheticEvent which exposes the original via `nativeEvent`.
 *
 * We keep this structural (no React/Vue imports) so the package stays framework-agnostic.
 */
export type TextInputEvent =
  | (Event & { currentTarget: TextInputElement })
  | { currentTarget: TextInputElement; nativeEvent: Event };
function unwrapNativeEvent(event: TextInputEvent): Event {
  return 'nativeEvent' in event ? event.nativeEvent : event;
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
  event: TextInputEvent,
  onValueChange?: (updatedValue: string) => void
) {
  const inputElement = event.currentTarget;
  const nativeEvent = unwrapNativeEvent(event);

  // react synthetic event handling
  const isInputEvent =
    typeof InputEvent !== 'undefined' &&
    nativeEvent instanceof InputEvent &&
    nativeEvent.data !== null;
  if (isInputEvent) {
    await typingContext.ready;

    const { diff_add_text, to_delete_chars_count } = typingContext.takeKeyInput(nativeEvent.data);
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
