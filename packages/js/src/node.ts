import { getNormalizedScriptName, type ScriptLangType } from './index_main';
import { loadNativeBinding, type NativeModule } from './native_binding';
import type { CustomOptionType } from './transliteration/transliterate';
import { validate_trans_options } from './utils/validate_trans_options';
import { validate_text } from './utils/validate_input';
import type { TransliterateInput, TransliterateOutput } from './types';
import type { TypingContextOptions, TypingDiff } from './typing';
import { checkBooleanOption, resolveTypingContextOptions } from './utils/typing_options';

type NativeTypingContext = InstanceType<NativeModule['NativeTypingContext']>;

let nativeModulePromise: Promise<NativeModule> | null = null;
const loadNativeModule = () => {
  if (!nativeModulePromise) {
    nativeModulePromise = Promise.resolve(loadNativeBinding());
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

  const resolved_options = resolveTypingContextOptions(options);
  let use_native_numerals = resolved_options.use_native_numerals;
  let include_inherent_vowel = resolved_options.include_inherent_vowel;
  let native_ctx: NativeTypingContext | null = null;
  let should_clear_on_ready = false;
  /** Why the native binding could not be loaded (eg. no binary for this platform) */
  let load_error: unknown = null;

  const ready: Promise<void> = (async () => {
    const nativeMod = await loadNativeModule();
    native_ctx = new nativeMod.NativeTypingContext(normalized_typing_lang, {
      auto_context_clear_time_ms: resolved_options.auto_context_clear_time_ms,
      use_native_numerals,
      include_inherent_vowel
    });

    if (should_clear_on_ready) {
      native_ctx.clear_context();
    }
  })();
  // `ready` rejects with the load error, but a context whose `ready` is never awaited must not end
  // the process with an unhandled rejection: the error is thrown by `takeKeyInput` instead
  ready.catch((error: unknown) => {
    load_error = error;
  });

  const getNativeContext = () => {
    if (!native_ctx) {
      if (load_error !== null) throw load_error;
      throw new Error('Typing context not ready. Await `ctx.ready` before calling takeKeyInput.');
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
    /** @throws TypeError if the value is not a boolean */
    updateUseNativeNumerals: (useNativeNumerals: boolean) => {
      checkBooleanOption('useNativeNumerals', useNativeNumerals, false);
      use_native_numerals = useNativeNumerals;
      native_ctx?.update_use_native_numerals(use_native_numerals);
    },
    /** @throws TypeError if the value is not a boolean */
    updateIncludeInherentVowel: (includeInherentVowel: boolean) => {
      checkBooleanOption('includeInherentVowel', includeInherentVowel, false);
      include_inherent_vowel = includeInherentVowel;
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
 * @param text - `string | string[]` — text to transliterate (same options for all items in an array)
 * @param from - The script/language to transliterate from
 * @param to - The script/language to transliterate to
 * @param trans_options - The custom transliteration options to use for the transliteration
 * @returns `string` or `string[]` — same shape as `text`
 */
export async function transliterate_node<T extends TransliterateInput>(
  text: T,
  from: ScriptLangType,
  to: ScriptLangType,
  trans_options_?: CustomOptionType
): Promise<TransliterateOutput<T>> {
  validate_text(text);
  const trans_options = validate_trans_options(trans_options_);
  const normalized_from = getNormalizedScriptName(from);
  if (!normalized_from) {
    throw new Error(`Invalid script name: ${from}`);
  }
  const normalized_to = getNormalizedScriptName(to);
  if (!normalized_to) {
    throw new Error(`Invalid script name: ${to}`);
  }

  if (normalized_from === normalized_to) {
    return (typeof text === 'string' ? text : [...text]) as TransliterateOutput<T>;
  }

  const nativeMod = await loadNativeModule();

  if (typeof text === 'string') {
    return (await nativeMod.transliterate(
      text,
      normalized_from,
      normalized_to,
      trans_options
    )) as TransliterateOutput<T>;
  }

  const outputs = await Promise.all(
    text.map((piece) =>
      nativeMod.transliterate(piece, normalized_from, normalized_to, trans_options)
    )
  );
  return outputs as TransliterateOutput<T>;
}
