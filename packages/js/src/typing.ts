import { getNormalizedScriptName } from './utils/lang_list/script_normalization';
import { getScriptData } from './utils/get_script_data';
import {
  resolve_transliteration_rules,
  transliterate_text_core,
  type CustomOptionType
} from './transliteration/transliterate';
import type { ScriptLangType } from './types';

/** Default time in milliseconds after which the context will be cleared automatically */
export const DEFAULT_AUTO_CONTEXT_CLEAR_TIME_MS = 4500;
/** Default values for the typing context options */
export const DEFAULT_USE_NATIVE_NUMERALS = true;
/** Default value for the include inherent vowel option.
 * By default avoids schwa deletion
 */
export const DEFAULT_INCLUDE_INHERENT_VOWEL = false;

export type TypingContextOptions = {
  /** The time in milliseconds after which the context will be cleared automatically.
   * `0` clears it after any pause.
   * @default 4500ms
   */
  autoContextClearTimeMs?: number;
  /** @deprecated Misspelled name of `autoContextClearTimeMs`, which is used when both are set */
  autoContextTClearTimeMs?: number;
  /** Use native numerals in transliteration/typing
   * @default true
   */
  useNativeNumerals?: boolean;
  /** Include inherent vowels(schwa character) in transliteration/typing
   *
   * `true` : `k` -> `क` (Eg. Hindi, Bengali, Gujarati, etc.)
   *
   * `false` : `k` -> `क्` (Default Behavior in transliteration. Eg. Sanskrit, Telugu, Tamil, Kannada, etc)
   *
   * @default false
   */
  includeInherentVowel?: boolean;
};

const isHighSurrogate = (code: number) => code >= 0xd800 && code <= 0xdbff;
const isLowSurrogate = (code: number) => code >= 0xdc00 && code <= 0xdfff;

/** Reads the auto clear time, accepting the deprecated misspelled option name too */
export const resolveAutoContextClearTimeMs = (options?: TypingContextOptions) =>
  options?.autoContextClearTimeMs ??
  options?.autoContextTClearTimeMs ??
  DEFAULT_AUTO_CONTEXT_CLEAR_TIME_MS;

/**
 * Typing keeps the input of the current context and transliterates all of it on every key. The
 * context is cleared at a space or punctuation, but a long run of letters would keep growing.
 * Once the context input is `CONTEXT_TRIM_LENGTH` keys (code points) long, its start is
 * committed, keeping about the last `CONTEXT_KEEP_LENGTH` (see `commitContextStart`).
 * Counted in code points, like the Rust and Go versions, so all of them commit at the same keys.
 */
const CONTEXT_TRIM_LENGTH = 64;
const CONTEXT_KEEP_LENGTH = 32;
/** Number of split points tried for one commit */
const CONTEXT_TRIM_TRIES = 4;

/** UTF-16 index of the code point before index `i` of `text` */
const prevCodePointIndex = (text: string, i: number) =>
  i > 1 && isLowSurrogate(text.charCodeAt(i - 1)) && isHighSurrogate(text.charCodeAt(i - 2))
    ? i - 2
    : i - 1;

export type TypingDiff = {
  /**
   * These number of characters need to be deleted from the current "app" input state.
   *
   * Counted in UTF-16 code units (like `string.length`), so it can be used directly with
   * `string.slice` and input selection offsets. A character outside the BMP (eg. Brahmi `𑀓`)
   * counts as 2.
   */
  to_delete_chars_count: number;
  /** These characters need to be added to the current "app" input state */
  diff_add_text: string;
  /** Remaining internal context length (0 means context was cleared) */
  context_length: number;
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
  let use_native_numerals = options?.useNativeNumerals ?? DEFAULT_USE_NATIVE_NUMERALS;
  let include_inherent_vowel = options?.includeInherentVowel ?? DEFAULT_INCLUDE_INHERENT_VOWEL;
  const normalized_typing_lang = getNormalizedScriptName(typing_lang);
  if (!normalized_typing_lang) {
    throw new Error(`Invalid script name: ${typing_lang}`);
  }

  let curr_input = '';
  let curr_output = '';

  /** `curr_input` length in code points (keys) */
  let curr_input_length = 0;
  let curr_context_length = 0;
  /** `curr_input_length` at which `commitContextStart` is tried next */
  let next_trim_length = CONTEXT_TRIM_LENGTH;

  const auto_context_clear_time_ms = resolveAutoContextClearTimeMs(options);
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
    curr_input_length = 0;
    curr_context_length = 0;
    next_trim_length = CONTEXT_TRIM_LENGTH;
  }

  const transliterateInput = (input: string) =>
    transliterate_text_core(
      input,
      'Normal',
      normalized_typing_lang!,
      from_script_data!,
      to_script_data!,
      trans_options,
      custom_rules,
      {
        typing_mode: true,
        useNativeNumerals: use_native_numerals,
        includeInherentVowel: include_inherent_vowel
      }
    );

  /**
   * Commits the start of a long context, so that a long run of letters does not make each key
   * slower (quadratic time). The input is split into a head and the last `CONTEXT_KEEP_LENGTH`
   * of it, the split is only used when it does not change anything: the head and the tail
   * transliterated on their own give the current output, and the tail keeps the whole context.
   * The head's output is then final, the context continues with the tail.
   */
  function commitContextStart() {
    // start of the last `CONTEXT_KEEP_LENGTH` code points, each try moves one code point back
    let split = curr_input.length;
    for (let i = 0; i < CONTEXT_KEEP_LENGTH; i++) split = prevCodePointIndex(curr_input, split);
    for (
      let tries = 0;
      tries < CONTEXT_TRIM_TRIES && split > 0;
      tries++, split = prevCodePointIndex(curr_input, split)
    ) {
      const tail_input = curr_input.substring(split);
      const tail = transliterateInput(tail_input);
      if (
        tail.output === '' ||
        tail.context_length !== curr_context_length ||
        !curr_output.endsWith(tail.output)
      )
        continue;
      const head = transliterateInput(curr_input.substring(0, split));
      if (head.output.length + tail.output.length !== curr_output.length) continue;
      if (!curr_output.startsWith(head.output)) continue;
      curr_input = tail_input;
      curr_input_length = CONTEXT_KEEP_LENGTH + tries;
      curr_output = tail.output;
      next_trim_length = CONTEXT_TRIM_LENGTH;
      return;
    }
    // no split point found, try again after some more keys
    next_trim_length = curr_input_length + CONTEXT_KEEP_LENGTH;
  }
  // having `takeKeyInput` as async function resulted in some latency issues
  // so we have reorganized the code be synchronous

  /**
   * Accepts character by character input and returns the diff
   * @param key  The key to take input for
   * @returns The diff of the previous and current output
   */
  function takeKeyInput(key: string): TypingDiff {
    if (!from_script_data || !to_script_data) {
      throw new Error('Typing context not ready. Await `ctx.ready` before calling takeKeyInput.');
    }
    // one code point, so that a key outside the BMP (a surrogate pair) is not split
    const first_code_point = key?.codePointAt(0);
    if (first_code_point === undefined) {
      // an empty key changes nothing (not even the idle timer)
      return { to_delete_chars_count: 0, diff_add_text: '', context_length: curr_context_length };
    }
    const curr_time_ms = Date.now();
    if (last_time_ms !== null && curr_time_ms - last_time_ms > auto_context_clear_time_ms) {
      clearContext();
    }
    curr_input += String.fromCodePoint(first_code_point);
    curr_input_length++;
    const prev_output = curr_output;
    const { context_length, output } = transliterateInput(curr_input);

    // calculate the diff
    let common_index = 0;
    while (common_index < output.length && common_index < prev_output.length) {
      if (output[common_index] !== prev_output[common_index]) break;
      common_index++;
    }
    // do not split a surrogate pair: if only its high surrogate is common, it is replaced as well
    if (common_index > 0 && isHighSurrogate(output.charCodeAt(common_index - 1))) common_index--;
    const diff_add_text = output.substring(common_index);
    const to_delete_chars_count = prev_output.length - common_index;

    if (context_length > 0) {
      curr_output = output;
      curr_context_length = context_length;
      if (curr_input_length >= next_trim_length) commitContextStart();
    } else {
      clearContext();
    }

    last_time_ms = curr_time_ms;
    return {
      /** These number of characters need to be deleted from the current "app" input state */
      to_delete_chars_count,
      /** These characters need to be added to the current "app" input state */
      diff_add_text,
      /** Remaining internal context length (0 means context was cleared) */
      context_length
    };
  }

  return {
    /** Await once, then use `takeKeyInput` for best typing latency. */
    ready,
    clearContext,
    takeKeyInput,
    updateUseNativeNumerals: (useNativeNumerals: boolean) => {
      use_native_numerals = useNativeNumerals ?? DEFAULT_USE_NATIVE_NUMERALS;
    },
    updateIncludeInherentVowel: (includeInherentVowel: boolean) => {
      include_inherent_vowel = includeInherentVowel ?? DEFAULT_INCLUDE_INHERENT_VOWEL;
    },
    getUseNativeNumerals: () => use_native_numerals,
    getIncludeInherentVowel: () => include_inherent_vowel,
    getNormalizedScript: () => normalized_typing_lang
  };
}

function isTextInputElement(value: unknown): value is HTMLInputElement | HTMLTextAreaElement {
  return (
    (typeof HTMLInputElement !== 'undefined' && value instanceof HTMLInputElement) ||
    (typeof HTMLTextAreaElement !== 'undefined' && value instanceof HTMLTextAreaElement)
  );
}

function inputElementFromTypingEvent(
  event: unknown
): HTMLInputElement | HTMLTextAreaElement | null {
  if (!event || typeof event !== 'object') return null;
  const o = event as {
    currentTarget?: unknown;
    target?: unknown;
    nativeEvent?: { target?: unknown };
  };
  const fromCurrent = o.currentTarget;
  if (isTextInputElement(fromCurrent)) {
    return fromCurrent;
  }
  const fromNativeTarget = o.nativeEvent?.target;
  if (isTextInputElement(fromNativeTarget)) {
    return fromNativeTarget;
  }
  const fromTarget = o.target;
  if (isTextInputElement(fromTarget)) {
    return fromTarget;
  }
  return null;
}

function inputEventFromTypingEvent(event: unknown): InputEvent | null {
  if (typeof InputEvent !== 'undefined' && event instanceof InputEvent) return event;
  if (!event || typeof event !== 'object' || !('nativeEvent' in event)) return null;
  const n = (event as { nativeEvent: unknown }).nativeEvent;
  return typeof InputEvent !== 'undefined' && n instanceof InputEvent ? n : null;
}

type BeforeInputEventLike = Pick<
  InputEvent,
  'data' | 'inputType' | 'isComposing' | 'preventDefault' | 'type'
>;

function isBeforeInputEventLike(value: unknown): value is BeforeInputEventLike {
  if (!value || typeof value !== 'object') return false;
  const o = value as { data?: unknown; inputType?: unknown; type?: unknown };
  return (
    typeof o.data === 'string' ||
    o.inputType === 'insertText' ||
    o.type === 'beforeinput' ||
    o.type === 'textInput'
  );
}

function beforeInputEventFromTypingEvent(event: unknown): BeforeInputEventLike | null {
  if (typeof InputEvent !== 'undefined' && event instanceof InputEvent) return event;
  if (!event || typeof event !== 'object') return null;

  const o = event as { nativeEvent?: unknown };
  const nativeEvent = o.nativeEvent;
  if (typeof InputEvent !== 'undefined' && nativeEvent instanceof InputEvent) {
    return nativeEvent;
  }

  // React polyfills `onBeforeInput`, so the synthetic wrapper can expose the
  // useful `data`/`type`/`preventDefault` fields even when `nativeEvent` is not
  // a real `InputEvent`.
  if (isBeforeInputEventLike(event)) {
    return event;
  }
  if (isBeforeInputEventLike(nativeEvent)) {
    return nativeEvent;
  }
  return null;
}

/**
 * Where the last transliterated key left the element. The typing context holds the text just
 * before the caret, so it is only valid while the caret and the text are still where it left them.
 * A mouse click, a touch, undo, an autocorrect or the app changing the value do not always come
 * with an event we can clear on, so before every key this is compared with the element instead.
 */
type TypingAnchor = {
  element: object;
  value: string;
  caret: number;
};
const typing_anchors = new WeakMap<object, TypingAnchor>();

function setTypingAnchor(typingContext: object, element: HTMLInputElement | HTMLTextAreaElement) {
  typing_anchors.set(typingContext, {
    element,
    value: element.value,
    caret: element.selectionStart ?? element.value.length
  });
}

/** Clears the context and forgets where it was left */
function resetTypingContext(typingContext: ReturnType<typeof createTypingContext>) {
  typing_anchors.delete(typingContext);
  typingContext.clearContext();
}

function keyboardEventFromTypingEvent(event: unknown): KeyboardEvent | null {
  if (typeof KeyboardEvent !== 'undefined' && event instanceof KeyboardEvent) return event;
  if (!event || typeof event !== 'object' || !('nativeEvent' in event)) return null;
  const n = (event as { nativeEvent: unknown }).nativeEvent;
  return typeof KeyboardEvent !== 'undefined' && n instanceof KeyboardEvent ? n : null;
}

/**
 * @deprecated This function is deprecated.
 * Prefer using `handleTypingBeforeInputEvent` instead, which handles transliteration typing via the native `beforeinput` event in both React and Svelte.
 *
 * Handles input events for transliteration typing in `input` and `textarea` elements.
 *
 * Use this function with **React** only if the `onbeforeinput` approach does not work.
 *
 * @param typingContext - The typing context created for the element
 * @param event - Input Event
 * @param onValueChange - Optional callback function invoked when the value changes
 * @param enabled_ - Optional flag to enable/disable transliteration (defaults to true)
 */
export async function handleTypingInputEvent(
  typingContext: ReturnType<typeof createTypingContext>,
  event: unknown,
  onValueChange?: (updatedValue: string) => void,
  enabled_?: boolean
) {
  const enabled = enabled_ ?? true;
  if (!enabled) {
    // the text typed now is not part of the context
    resetTypingContext(typingContext);
    onValueChange?.(inputElementFromTypingEvent(event)?.value ?? '');
    return;
  }

  const nativeEvent = inputEventFromTypingEvent(event);
  const isReactSyntheticEvent =
    typeof event === 'object' && event !== null && 'nativeEvent' in event;
  const inputElement = inputElementFromTypingEvent(event);

  if (!nativeEvent || !inputElement) return;

  // Don’t interfere with IME/composition; this breaks mobile/IME typing.
  if (nativeEvent.isComposing) return;

  // Only handle actual single-character insertions.
  // For deletes/paste/etc, let the browser handle it and clear context.
  if (nativeEvent.inputType !== 'insertText') {
    onValueChange?.(inputElement.value);
    resetTypingContext(typingContext);
    return;
  }

  const inputData: unknown = nativeEvent.data;
  if (typeof inputData !== 'string' || inputData.length !== 1) {
    onValueChange?.(inputElement.value);
    resetTypingContext(typingContext);
    return;
  }

  // If there is a selection, we don’t have a clean incremental diff story yet.
  // Let the browser replace the selection and reset the typing context.
  const selectionStart = inputElement.selectionStart ?? 0;
  const selectionEnd = inputElement.selectionEnd ?? selectionStart;
  if (selectionStart !== selectionEnd) {
    onValueChange?.(inputElement.value);
    resetTypingContext(typingContext);
    return;
  }

  // The browser has already inserted `inputData` at the caret: the context is only still valid
  // if that is the only change since the last key.
  const value = inputElement.value;
  const anchor = typing_anchors.get(typingContext);
  const anchorCaret = selectionStart - inputData.length;
  if (
    !anchor ||
    anchor.element !== inputElement ||
    anchor.caret !== anchorCaret ||
    anchor.value !== value.slice(0, anchorCaret) + value.slice(selectionStart)
  ) {
    resetTypingContext(typingContext);
  }

  if (isReactSyntheticEvent && onValueChange) {
    // Extra step required in React for controlled inputs: first acknowledge the browser's edit.
    onValueChange(inputElement.value);
  }

  await typingContext.ready;

  // More text arrived while waiting for the script data: the offsets read above are stale, so
  // leave the typed text as it is rather than replacing the wrong part of it.
  if (inputElement.value !== value) {
    resetTypingContext(typingContext);
    return;
  }

  const { diff_add_text, to_delete_chars_count } = typingContext.takeKeyInput(inputData);

  // In the `input` event, the browser has already inserted `inputData` at the caret.
  // Replace: [ ... (previous context) + inserted raw char ] with transliterated diff.
  const replaceEnd = selectionStart;
  const replaceStart = Math.max(0, replaceEnd - to_delete_chars_count - inputData.length);
  inputElement.setRangeText(diff_add_text, replaceStart, replaceEnd, 'end');
  setTypingAnchor(typingContext, inputElement);

  onValueChange?.(inputElement.value);
}

/**
 * Handles `beforeinput` events for transliteration typing in `input` and `textarea` elements.
 *
 * @param typingContext - The typing context created for the element
 * @param event - BeforeInput event (native or React synthetic)
 * @param onValueChange - Optional callback function invoked when the value changes
 * @param enabled_ - Optional flag to enable/disable transliteration (defaults to true)
 */
export async function handleTypingBeforeInputEvent(
  typingContext: ReturnType<typeof createTypingContext>,
  event: unknown,
  onValueChange?: (updatedValue: string) => void,
  enabled_?: boolean
) {
  /*
   * This is the recommended browser-native approach:
   * - Use `beforeinput` to "suppress" the default insertion via `preventDefault()`
   * - Apply the transliteration diff using the native `setRangeText` API
   *
   * For non-character events (backspace/delete/paste/etc), do NOT prevent default here.
   * Pair this with `handleTypingInputEvent` on `input` to keep state in sync for those cases.
   *
   * */
  const enabled = enabled_ ?? true;
  if (!enabled) {
    // the text typed now is not part of the context
    resetTypingContext(typingContext);
    return;
  }

  const beforeInputEvent = beforeInputEventFromTypingEvent(event);
  const inputElement = inputElementFromTypingEvent(event);

  if (!beforeInputEvent || !inputElement) return;

  // Don’t interfere with IME/composition; this breaks mobile/IME typing.
  if (beforeInputEvent.isComposing) return;

  // Only handle typed text. Let the browser do everything else (deletes, undo, paste, drop,
  // autocorrect...) and start a new context, as the text before the caret changes.
  // A native `beforeinput` always has an `inputType`. React's synthetic `onBeforeInput`
  // (polyfilled with `textInput`) has none, it only reports the `type`.
  const isTypedText = beforeInputEvent.inputType
    ? beforeInputEvent.inputType === 'insertText'
    : beforeInputEvent.type === 'beforeinput' || beforeInputEvent.type === 'textInput';
  if (!isTypedText) {
    resetTypingContext(typingContext);
    return;
  }
  const inputData: unknown = beforeInputEvent.data;
  if (typeof inputData !== 'string' || inputData.length === 0) {
    resetTypingContext(typingContext);
    return;
  }

  // Only intercept real single-character typing.
  // In some environments (notably React), paste can surface as a `textInput` event
  // with multi-character `data`. Preventing default in that case breaks Ctrl+V.
  if (inputData.length !== 1) {
    resetTypingContext(typingContext);
    return;
  }

  // If there is a selection, we don’t have a clean incremental diff story yet.
  // Let the browser replace the selection and reset the typing context.
  if ((inputElement.selectionStart ?? 0) !== (inputElement.selectionEnd ?? 0)) {
    resetTypingContext(typingContext);
    return;
  }

  // Suppress the default browser insertion.
  beforeInputEvent.preventDefault?.();

  await typingContext.ready;

  // Read the caret only now: keys typed before the script data was loaded all wait above and
  // continue in order, each after the previous one has been applied.
  const selectionStart = inputElement.selectionStart ?? 0;
  const selectionEnd = inputElement.selectionEnd ?? selectionStart;
  const anchor = typing_anchors.get(typingContext);
  if (
    !anchor ||
    anchor.element !== inputElement ||
    anchor.caret !== selectionStart ||
    anchor.value !== inputElement.value
  ) {
    resetTypingContext(typingContext);
  }

  const { diff_add_text, to_delete_chars_count } = typingContext.takeKeyInput(inputData);

  // Replace the "context" immediately before the caret with the transliterated diff.
  // (`selectionEnd` only differs if a selection was made while waiting: it is replaced, like
  // the browser would have done.)
  const replaceStart = Math.max(0, selectionStart - to_delete_chars_count);
  inputElement.setRangeText(diff_add_text, replaceStart, selectionEnd, 'end');
  setTypingAnchor(typingContext, inputElement);

  onValueChange?.(inputElement.value);
}

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
export function clearTypingContextOnKeyDown(
  event: unknown,
  ctx: ReturnType<typeof createTypingContext>
) {
  const e = keyboardEventFromTypingEvent(event);
  if (e) {
    // Mobile virtual keyboards and IME/composition frequently report keys like
    // "Unidentified"/"Process". Clearing context here breaks typing on Android/iOS.
    if (e.isComposing) return false;

    const key = e.key;
    if (!key) return false;

    if (key === 'Unidentified' || key === 'Process' || key === 'Dead') return false;

    // Also with Ctrl/Alt/Meta: these still move the caret (word or line jumps) or delete text.
    // Other shortcut chords (copy, select all...) are not in the list and keep the context.
    if (CONTEXT_CLEAR_KEYS.has(key)) {
      ctx.clearContext();
      return true;
    }
  }
  return false;
}

type ListType = 'svara' | 'vyanjana' | 'anya' | 'mAtrA';

/**
 * Functions to get the krama array for a script.
 *
 * It can be used to compare the krama array of two scripts.
 * Especially useful for brahmic scripts, as they have a direct correlation
 *
 * @returns The krama array with corresponding type for the script
 */
export async function getScriptKramaData(script: ScriptLangType) {
  const normalized_typing_lang = getNormalizedScriptName(script);
  if (!normalized_typing_lang) {
    throw new Error(`Invalid script name: ${script}`);
  }
  const script_data = await getScriptData(normalized_typing_lang);
  const data: [text: string, type: ListType][] = script_data.krama_text_arr.map((val) => [
    val[0],
    script_data.list[val[1] ?? -1]?.type ?? 'anya'
  ]);
  return data;
}

/**
 * Returns the typing data map for a script.
 * @param script - The script to get the typing data map for
 * @returns The typing data map for the script
 */
export async function getScriptTypingDataMap(script: ScriptLangType) {
  const normalized_typing_lang = getNormalizedScriptName(script);
  if (!normalized_typing_lang) {
    throw new Error(`Invalid script name: ${script}`);
  }
  const [script_data, normal_script_data] = await Promise.all([
    getScriptData(normalized_typing_lang),
    getScriptData('Normal')
  ]);
  type Item = [text: string, type: ListType, mappings: string[]];
  const mergeDuplicateTextMappings = (items: Item[]) => {
    // Merge items that end up with the same displayed text (and type), and keep mappings unique.
    // We do this at the end so we don't disturb index-based mapping during population.
    const keyToIndex = new Map<string, number>();
    const mappingSets: Set<string>[] = [];
    const out: Item[] = [];

    for (const [text, type, mappings] of items) {
      const key = `${text}\u0000${type}`;
      const existingIndex = keyToIndex.get(key);

      if (existingIndex === undefined) {
        const uniq: string[] = [];
        const set = new Set<string>();
        for (const m of mappings) {
          if (!set.has(m)) {
            set.add(m);
            uniq.push(m);
          }
        }
        out.push([text, type, uniq]);
        keyToIndex.set(key, out.length - 1);
        mappingSets.push(set);
      } else {
        const set = mappingSets[existingIndex];
        const targetMappings = out[existingIndex][2];
        for (const m of mappings) {
          if (!set.has(m)) {
            set.add(m);
            targetMappings.push(m);
          }
        }
      }
    }

    // Drop items that have no typing mappings.
    return out.filter(([, , mappings]) => mappings.length > 0);
  };
  const res: {
    common_krama_map: Item[];
    /** Contains mappings for script specific characters.
     * uplicate key mappings are handled in the common_krama_map.
     */
    script_specific_krama_map: Item[];
  } = {
    common_krama_map: script_data.krama_text_arr.map((v) => [
      v[0],
      script_data.list[v[1] ?? -1]?.type ?? 'anya',
      []
    ]),
    script_specific_krama_map: script_data.custom_script_chars_arr.map((val) => [
      val[0],
      script_data.list[val[1] ?? -1]?.type ?? 'anya',
      []
    ])
  };

  /** A key without a krama in the typing map is read from the Normal krama (Step 2 of the
   * transliteration), the first index of its text wins */
  const normal_krama_index = new Map<string, number>();
  for (let i = 0; i < normal_script_data.krama_text_arr.length; i++) {
    const text = normal_script_data.krama_text_arr[i][0];
    if (text && !normal_krama_index.has(text)) normal_krama_index.set(text, i);
  }
  const typing_map_texts = new Set<string>();
  for (let i = 0; i < script_data.typing_text_to_krama_map.length; i++) {
    const item = script_data.typing_text_to_krama_map[i];
    const normal_text_map = item[0];
    typing_map_texts.add(normal_text_map);
    if (normal_text_map === '') continue;

    if (item[1] && item[1].custom_back_ref !== undefined && item[1].custom_back_ref !== null) {
      res.script_specific_krama_map[item[1].custom_back_ref][2].push(normal_text_map);
    } else if (item[1] && item[1].krama && item[1].krama.length === 1) {
      // ignore the ones whose length is greater than 1 (as they usually are intermediate typing states)
      const krama_index = item[1].krama[0] ?? -1;
      if (krama_index !== -1) {
        res.common_krama_map[krama_index][2].push(normal_text_map);
      }
    } else if (item[1] && !item[1].krama?.length) {
      // a prefix of longer keys which is a character too (`sh` -> श, the start of `shh`)
      const krama_index = normal_krama_index.get(normal_text_map);
      if (krama_index !== undefined) res.common_krama_map[krama_index][2].push(normal_text_map);
    }
  }
  // the keys which are not in the typing map at all (`m` -> म), read by their code point
  for (const [text, krama_index] of normal_krama_index) {
    if (typing_map_texts.has(text) || [...text].length !== 1) continue;
    res.common_krama_map[krama_index][2].push(text);
  }

  // A key whose character this script lacks falls back to an empty text (`.a1` to the
  // a1 mAtrA, which is the empty a mAtrA in Devanagari), nothing to show for it
  res.common_krama_map = mergeDuplicateTextMappings(res.common_krama_map).filter(
    ([text]) => text !== ''
  );
  // the context clearing `q` has no text
  res.script_specific_krama_map = mergeDuplicateTextMappings(res.script_specific_krama_map).filter(
    ([text]) => text !== ''
  );

  return res;
}

/*

Old Approach without `setRangeText`

async function handleTypingInputEvent(
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

*/
