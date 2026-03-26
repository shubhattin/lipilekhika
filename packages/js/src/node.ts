import { getNormalizedScriptName, type ScriptLangType } from './index_main';
import type { CustomOptionType } from './transliteration/transliterate';
import {
  DEFAULT_INCLUDE_INHERENT_VOWEL,
  DEFAULT_USE_NATIVE_NUMERALS,
  type TypingContextOptions,
  type TypingDiff
} from './typing';

type NativeModule = typeof import('../binding/pkg');
type NativeTypingContext = InstanceType<NativeModule['NativeTypingContext']>;

let nativeModulePromise: Promise<NativeModule> | null = null;
const loadNativeModule = () => {
  if (!nativeModulePromise) {
    nativeModulePromise = import('../binding/pkg');
  }
  return nativeModulePromise;
};

export async function preloadNode() {
  await loadNativeModule();
}

/**
 * Creates a stateful isolated context for character-by-character input typing,
 * backed by the native Node N-API binding.
 *
 * This mirrors the public API of `createTypingContext` from `typing.ts`, including
 * the `ready` promise and synchronous `takeKeyInput` calls after initialization.
 *
 * @param typing_lang - The script/language to type in
 * @param options - The options for the typing context
 * @returns A closed-over context object with the same methods as the TS typing version
 */
export function createTypingContext(typing_lang: ScriptLangType, options?: TypingContextOptions) {
  const normalized_typing_lang = getNormalizedScriptName(typing_lang);
  if (!normalized_typing_lang) {
    throw new Error(`Invalid script name: ${typing_lang}`);
  }

  let use_native_numerals = options?.useNativeNumerals ?? DEFAULT_USE_NATIVE_NUMERALS;
  let include_inherent_vowel = options?.includeInherentVowel ?? DEFAULT_INCLUDE_INHERENT_VOWEL;
  let native_ctx: NativeTypingContext | null = null;
  let should_clear_on_ready = false;

  const ready: Promise<void> = (async () => {
    const nativeMod = await loadNativeModule();
    native_ctx = new nativeMod.NativeTypingContext(normalized_typing_lang, {
      auto_context_clear_time_ms: options?.autoContextTClearTimeMs,
      use_native_numerals,
      include_inherent_vowel
    });

    if (should_clear_on_ready) {
      native_ctx.clear_context();
    }
  })();

  const getNativeContext = () => {
    if (!native_ctx) {
      throw new Error(
        'Typing context not ready. Await `ctx.ready` before calling takeKeyInputSync.'
      );
    }
    return native_ctx;
  };

  return {
    ready,
    clearContext: () => {
      if (native_ctx) {
        native_ctx.clear_context();
      } else {
        should_clear_on_ready = true;
      }
    },
    takeKeyInput: (key: string): TypingDiff => {
      const diff = getNativeContext().take_key_input(key);
      return {
        to_delete_chars_count: diff.to_delete_chars_count,
        diff_add_text: diff.diff_add_text,
        context_length: diff.context_length
      };
    },
    updateUseNativeNumerals: (useNativeNumerals: boolean) => {
      use_native_numerals = useNativeNumerals ?? DEFAULT_USE_NATIVE_NUMERALS;
      native_ctx?.update_use_native_numerals(use_native_numerals);
    },
    updateIncludeInherentVowel: (includeInherentVowel: boolean) => {
      include_inherent_vowel = includeInherentVowel ?? DEFAULT_INCLUDE_INHERENT_VOWEL;
      native_ctx?.update_include_inherent_vowel(include_inherent_vowel);
    },
    getUseNativeNumerals: () => native_ctx?.get_use_native_numerals() ?? use_native_numerals,
    getIncludeInherentVowel: () =>
      native_ctx?.get_include_inherent_vowel() ?? include_inherent_vowel,
    getNormalizedScript: () => native_ctx?.get_normalized_script() ?? normalized_typing_lang
  };
}

/**
 * Node.js native(Rust + N-API) based transliteration.
 *
 * Transliterates `text` from `from` to `to`.
 * @param text - The text to transliterate
 * @param from - The script/language to transliterate from
 * @param to - The script/language to transliterate to
 * @param trans_options - The custom transliteration options to use for the transliteration
 * @returns The transliterated text
 */
export async function transliterate_node(
  text: string,
  from: ScriptLangType,
  to: ScriptLangType,
  trans_options?: CustomOptionType
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

  const nativeMod = await loadNativeModule();
  return nativeMod.transliterate(text, normalized_from, normalized_to, trans_options);
}
