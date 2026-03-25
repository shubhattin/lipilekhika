import { getNormalizedScriptName, type ScriptLangType } from './index_main';
import type { CustomOptionType } from './transliteration/transliterate';

export const DEFAULT_AUTO_CONTEXT_CLEAR_TIME_MS = 4500;
export const DEFAULT_USE_NATIVE_NUMERALS = true;
export const DEFAULT_INCLUDE_INHERENT_VOWEL = false;

export type TypingContextOptions = {
  autoContextTClearTimeMs?: number;
  useNativeNumerals?: boolean;
  includeInherentVowel?: boolean;
};

type TypingDiff = {
  to_delete_chars_count: number;
  diff_add_text: string;
  context_length: number;
};

type NativeModule = typeof import('../binding/pkg');
type NativeTypingContext = InstanceType<NativeModule['NativeTypingContext']>;

const loadNativeModule = () => import('../binding/pkg');

export async function preloadNode() {
  await loadNativeModule();
}

export function createTypingContext(typing_lang: ScriptLangType, options?: TypingContextOptions) {
  const normalized_typing_lang = getNormalizedScriptName(typing_lang);
  if (!normalized_typing_lang) {
    throw new Error(`Invalid script name: ${typing_lang}`);
  }

  let use_native_numerals = options?.useNativeNumerals ?? DEFAULT_USE_NATIVE_NUMERALS;
  let include_inherent_vowel =
    options?.includeInherentVowel ?? DEFAULT_INCLUDE_INHERENT_VOWEL;
  let native_ctx: NativeTypingContext | null = null;
  let should_clear_on_ready = false;

  const ready: Promise<void> = (async () => {
    const nativeMod = await loadNativeModule();
    native_ctx = new nativeMod.NativeTypingContext(normalized_typing_lang, {
      autoContextClearTimeMs: options?.autoContextTClearTimeMs,
      useNativeNumerals: use_native_numerals,
      includeInherentVowel: include_inherent_vowel
    });

    if (should_clear_on_ready) {
      native_ctx.clearContext();
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
        native_ctx.clearContext();
      } else {
        should_clear_on_ready = true;
      }
    },
    takeKeyInput: (key: string): TypingDiff => {
      const diff = getNativeContext().takeKeyInput(key);
      return {
        to_delete_chars_count: diff.toDeleteCharsCount,
        diff_add_text: diff.diffAddText,
        context_length: diff.contextLength
      };
    },
    updateUseNativeNumerals: (useNativeNumerals: boolean) => {
      use_native_numerals = useNativeNumerals ?? DEFAULT_USE_NATIVE_NUMERALS;
      native_ctx?.updateUseNativeNumerals(use_native_numerals);
    },
    updateIncludeInherentVowel: (includeInherentVowel: boolean) => {
      include_inherent_vowel = includeInherentVowel ?? DEFAULT_INCLUDE_INHERENT_VOWEL;
      native_ctx?.updateIncludeInherentVowel(include_inherent_vowel);
    },
    getUseNativeNumerals: () => native_ctx?.getUseNativeNumerals() ?? use_native_numerals,
    getIncludeInherentVowel: () =>
      native_ctx?.getIncludeInherentVowel() ?? include_inherent_vowel,
    getNormalizedScript: () => native_ctx?.getNormalizedScript() ?? normalized_typing_lang
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
