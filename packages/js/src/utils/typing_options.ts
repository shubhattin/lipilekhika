import type { TypingContextOptions } from '../typing';

/** Default time in milliseconds after which the context will be cleared automatically */
export const DEFAULT_AUTO_CONTEXT_CLEAR_TIME_MS = 4500;
/** Default values for the typing context options */
export const DEFAULT_USE_NATIVE_NUMERALS = true;
/** Default value for the include inherent vowel option.
 * By default avoids schwa deletion
 */
export const DEFAULT_INCLUDE_INHERENT_VOWEL = false;

/** Reads the auto clear time, accepting the deprecated misspelled option name too */
export const resolveAutoContextClearTimeMs = (options?: TypingContextOptions) => {
  const ms =
    options?.autoContextClearTimeMs ??
    options?.autoContextTClearTimeMs ??
    DEFAULT_AUTO_CONTEXT_CLEAR_TIME_MS;
  if (typeof ms !== 'number') {
    throw new TypeError(`autoContextClearTimeMs must be a number, got ${typeof ms}`);
  }
  if (Number.isNaN(ms) || ms < 0) {
    throw new RangeError(`autoContextClearTimeMs must be 0 or more milliseconds, got ${ms}`);
  }
  return ms;
};

/** A typing option or the value of an `update*` call: a boolean, or `undefined` for the default */
export function checkBooleanOption(name: string, value: unknown, allow_undefined: boolean) {
  if (typeof value === 'boolean' || (allow_undefined && value === undefined)) return;
  throw new TypeError(`${name} must be a boolean`);
}

/** Checks the options of `createTypingContext` (the TS and the N-API one alike) */
export function resolveTypingContextOptions(options?: TypingContextOptions) {
  checkBooleanOption('useNativeNumerals', options?.useNativeNumerals, true);
  checkBooleanOption('includeInherentVowel', options?.includeInherentVowel, true);
  return {
    auto_context_clear_time_ms: resolveAutoContextClearTimeMs(options),
    use_native_numerals: options?.useNativeNumerals ?? DEFAULT_USE_NATIVE_NUMERALS,
    include_inherent_vowel: options?.includeInherentVowel ?? DEFAULT_INCLUDE_INHERENT_VOWEL
  };
}
