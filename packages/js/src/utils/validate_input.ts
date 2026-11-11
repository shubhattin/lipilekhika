import type { TransliterateInput } from '../types';

/**
 * Checks the `text` of `transliterate`, `transliterate_wasm` and `transliterate_node` alike: a
 * string or an array of strings (a hole in a sparse array is not a string).
 */
export function validate_text(text: unknown): asserts text is TransliterateInput {
  if (typeof text === 'string') return;
  if (Array.isArray(text)) {
    let all_strings = true;
    // a `for` loop also visits the holes of a sparse array (`every` skips them)
    for (let i = 0; i < text.length && all_strings; i++) all_strings = typeof text[i] === 'string';
    if (all_strings) return;
  }
  throw new TypeError('text must be a string or an array of strings');
}

/**
 * A surrogate pair (kept) or a lone surrogate (replaced). No lookbehind: it is a `SyntaxError`
 * where it is not supported (Safari before 16.4), when this module is loaded.
 */
const SURROGATES = /[\ud800-\udbff][\udc00-\udfff]|[\ud800-\udfff]/g;

type WellFormedString = string & {
  isWellFormed?: () => boolean;
  toWellFormed?: () => string;
};

/**
 * Replaces every lone surrogate with U+FFFD, as the Rust based bindings get the text (a Rust
 * string can not hold one), so that all of them give the same output for it.
 */
export function to_well_formed(text: string): string {
  const s = text as WellFormedString;
  if (typeof s.isWellFormed === 'function' && typeof s.toWellFormed === 'function') {
    return s.isWellFormed() ? text : s.toWellFormed();
  }
  return text.replace(SURROGATES, (match) => (match.length === 2 ? match : '\ufffd'));
}

/** `true` for a code point which is a surrogate (only a lone one can be a code point) */
export const is_surrogate_code_point = (code_point: number) =>
  code_point >= 0xd800 && code_point <= 0xdfff;
