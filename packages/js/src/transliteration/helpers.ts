import type {
  ExpandedBrahmicScriptData,
  ExpandedScriptData
} from '../make_script_data/output_script_data_schema';
import type { ScriptData } from '../utils/get_script_data';
import type { script_list_type } from '../utils/lang_list';

type ListItem = ExpandedBrahmicScriptData['list'][number];
type ListType = ListItem['type'];

type _custom_script_chars_arr_type = ExpandedScriptData['custom_script_chars_arr'][number];

/** @returns index of `text` in the `text_to_krama_map` (or `typing_text_to_krama_map`), `-1` if not found */
export const textToKramaMapIndex = (
  script_data: ScriptData,
  text: string,
  use_typing_text_to_krama_map: boolean = false
): number => {
  return (
    (use_typing_text_to_krama_map
      ? script_data.map_typing_text_to_krama_map.get(text)
      : script_data.map_text_to_krama_map.get(text)) ?? -1
  );
};

/** Same as `textToKramaMapIndex` for a single code point, without creating a string */
export const textToKramaMapCharIndex = (
  script_data: ScriptData,
  cp: number,
  use_typing_text_to_krama_map: boolean = false
): number => {
  return use_typing_text_to_krama_map
    ? script_data.char_typing_text_to_krama_map.get(cp)
    : script_data.char_text_to_krama_map.get(cp);
};

export const getCustomScriptCharsData = (
  script_data: ScriptData,
  text: string
): [_custom_script_chars_arr_type[1], _custom_script_chars_arr_type[2]] | undefined => {
  return script_data.map_custom_script_chars_arr.get(text);
};

export const getTypingTextToKramaText = (
  script_data: ScriptData,
  index: number | null | undefined
): string | undefined => {
  if (index === null || index === undefined || index < 0) return undefined;
  return script_data.typing_text_to_krama_map[index]?.[0];
};

export const kramaIndexOfText = (script_data: ScriptData, text: string): number => {
  return script_data.map_krama_text_arr.get(text) ?? -1;
  // no need to use lower bound binary search, we can direcly use a hash map lookup
};

/** Same as `kramaIndexOfText` for a single code point, without creating a string */
export const kramaIndexOfChar = (script_data: ScriptData, cp: number): number => {
  return script_data.char_krama_text_arr.get(cp);
};

export const kramaTextOrNull = (script: ScriptData, idx: number): string | null => {
  const v = script.krama_text_arr[idx]?.[0];
  return typeof v === 'string' ? v : null;
};

export const kramaTextOrEmpty = (script: ScriptData, idx: number): string => {
  return kramaTextOrNull(script, idx) ?? '';
};

export const string_builder = () => {
  const result: string[] = [];

  // Domain-level output ops (prefer these in transliteration logic)
  // like emit, tail can be used

  /** push text to the result */
  function emit(text: string) {
    if (!text) return;
    result.push(text);
  }

  /** Add multiple pieces to the result */
  function emitPieces(pieces: string[]) {
    for (const p of pieces) emit(p);
  }

  function lastPiece(): string | undefined {
    return result.at(-1);
  }

  function lastChar(): string | undefined {
    const lp = lastPiece();
    return lp?.at(-1);
  }

  function popLastChar(): string | undefined {
    const lp = lastPiece();
    if (!lp) return undefined;
    const ch = lp.at(-1);
    const rest = lp.slice(0, -1);
    result[result.length - 1] = rest;
    return ch;
  }

  function rewriteTailPieces(count: number, newPieces: string[]) {
    result.splice(-count, count, ...newPieces.filter(Boolean));
  }

  /** Pop the last output *character*, insert `before`, re-insert the popped char, then insert `after`.
   * Caller decides whether to use this (e.g. for Tamil-Extended superscript reorder).
   */
  function withLastCharMovedAfter(beforePieces: string[], afterPieces: string[]) {
    const ch = popLastChar();
    if (!ch) {
      emitPieces(beforePieces);
      emitPieces(afterPieces);
      return;
    }
    emitPieces(beforePieces);
    emit(ch);
    emitPieces(afterPieces);
  }

  /** Peek at the piece at the given index */
  function peekAt(index: number): CursorCp | null {
    const item = result.at(index);
    if (!item) return null;
    return {
      cp: index,
      ch: item,
      width: item.length
    };
  }

  function rewriteAt(index: number, newPiece: string) {
    if (index < 0) {
      index = result.length + index;
    }
    if (index < 0 || index >= result.length) return;
    result[index] = newPiece;
  }

  return {
    emit,
    emitPieces,
    lastPiece,
    lastChar,
    popLastChar,
    rewriteTailPieces,
    withLastCharMovedAfter,
    toString: () => {
      return result.join('');
    },
    rewriteAt,
    peekAt
  };
};

/** Stand-in for list items synthesized at runtime; context consumers only inspect the `type`. */
export const ANYA_LIST_ITEM: ListItem = { type: 'anya', krama_ref: [] };

/**
 * Mostly used is -1 for prev context.
 * But even in the theoretical case it is -3 for now
 */
export const PREV_CONTEXT_MAX_LEN = 3;

/**
 * Fixed-size sliding window over the last `PREV_CONTEXT_MAX_LEN` context items.
 *
 * Only the text and the list `type` of an item are ever inspected, so those are stored
 * in two parallel slot arrays (no per-item tuple allocation).
 */
export const prev_context_builder = () => {
  const texts: (string | undefined)[] = Array.from({ length: PREV_CONTEXT_MAX_LEN });
  const types: (ListType | undefined)[] = Array.from({ length: PREV_CONTEXT_MAX_LEN });
  let len = 0;

  function clear() {
    len = 0;
  }

  function length() {
    return len;
  }

  /** resolves the (supports -ve) index into a slot index, `-1` if out of range */
  function slot(i: number): number {
    if (i < 0) i += len;
    return i < 0 || i >= len ? -1 : i;
  }

  function typeAt(i: number): ListType | undefined {
    const s = slot(i);
    return s === -1 ? undefined : types[s];
  }

  function textAt(i: number): string | undefined {
    const s = slot(i);
    return s === -1 ? undefined : texts[s];
  }

  function lastText(): string | undefined {
    return textAt(-1);
  }

  function lastType(): ListType | undefined {
    return typeAt(-1);
  }

  function isLastType(t: ListType) {
    return lastType() === t;
  }

  /** Push a new context item, enforcing the max length and skipping empty/undefined text. */
  function push(text: string | undefined, type: ListType | undefined) {
    if (text === undefined || text.length === 0) return;
    if (len === PREV_CONTEXT_MAX_LEN) {
      for (let i = 1; i < PREV_CONTEXT_MAX_LEN; i++) {
        texts[i - 1] = texts[i];
        types[i - 1] = types[i];
      }
      texts[PREV_CONTEXT_MAX_LEN - 1] = text;
      types[PREV_CONTEXT_MAX_LEN - 1] = type;
    } else {
      texts[len] = text;
      types[len] = type;
      len++;
    }
  }

  return {
    clear,
    length,
    lastText,
    lastType,
    typeAt,
    textAt,
    isLastType,
    push
  };
};

type CursorCp = { cp: number; ch: string; width: number };
export const make_input_cursor = (text: string) => {
  let pos = 0; // UTF-16 code unit index

  // Reuse a single scratch object to avoid allocating a new object on every peek.
  // IMPORTANT: callers must not hold the returned reference across calls.
  const _scratch: CursorCp = { cp: 0, ch: '', width: 0 };

  function peekAt(index: number): CursorCp | null {
    const cp = text.codePointAt(index);
    if (cp === undefined) return null;
    const ch = String.fromCodePoint(cp);
    _scratch.cp = cp;
    _scratch.ch = ch;
    _scratch.width = ch.length;
    return _scratch;
  }

  /** Code point at the UTF-16 `index` without creating a string, `-1` if out of range */
  function cpAt(index: number): number {
    return text.codePointAt(index) ?? -1;
  }

  /** UTF-16 index of the character before the one starting at `index`
   * (steps over a whole surrogate pair for non-BMP characters) */
  function prevCharIndex(index: number): number {
    const low = text.charCodeAt(index - 1);
    const high = text.charCodeAt(index - 2);
    return low >= 0xdc00 && low <= 0xdfff && high >= 0xd800 && high <= 0xdbff
      ? index - 2
      : index - 1;
  }

  function peek(): CursorCp | null {
    return peekAt(pos);
  }

  function peekAtOffsetUnits(offsetUnits: number): CursorCp | null {
    return peekAt(pos + offsetUnits);
  }

  function advance(units: number) {
    pos += units;
  }

  function slice(from: number, to: number) {
    return text.substring(from, to);
  }

  return {
    get pos() {
      return pos;
    },
    cpAt,
    prevCharIndex,
    peek,
    peekAt,
    peekAtOffsetUnits,
    advance,
    slice
  };
};

type PeekAtLike = (index: number) => { ch: string } | null;

/**
 * Matches `prev` (krama indexes) backwards, ending at `anchorIndex`.
 *
 * @param prevIndex index of the item before `index`. Defaults to `index - 1` (result pieces);
 * for the input text pass `cursor.prevCharIndex`, as non-BMP characters take two UTF-16 units
 * (stepping back by one unit would land in the middle of a surrogate pair and never match)
 */
export const matchPrevKramaSequence = (
  peekAt: PeekAtLike,
  anchorIndex: number,
  prev: number[],
  script_data: ScriptData,
  prevIndex: (index: number) => number = (index) => index - 1
): { matched: boolean; matchedLen: number } => {
  let index = anchorIndex;
  for (let i = 0; i < prev.length; i++) {
    const expected_krama_index = prev[prev.length - 1 - i];
    if (i > 0) index = prevIndex(index);
    const info = peekAt(index);
    if (info === null) return { matched: false, matchedLen: 0 };
    const got_krama_index = kramaIndexOfText(script_data, info.ch);
    if (got_krama_index === -1 || got_krama_index !== expected_krama_index) {
      return { matched: false, matchedLen: 0 };
    }
  }
  return { matched: true, matchedLen: prev.length };
};

export const replaceWithPieces = (replace_with: number[], script_data: ScriptData): string[] => {
  return replace_with.map((k) => kramaTextOrEmpty(script_data, k)).filter(Boolean);
};

export const TAMIL_EXTENDED_SUPERSCRIPT_NUMBERS = ['²', '³', '⁴'] as const;
// Direct equality checks are faster than indexOf on tiny constant arrays.
export const isTaExtSuperscriptTail = (ch: string | undefined): boolean => {
  return ch === '²' || ch === '³' || ch === '⁴';
};

/** Code point version of `isTaExtSuperscriptTail` */
export const isTaExtSuperscriptTailCp = (cp: number): boolean => {
  return cp === 0xb2 || cp === 0xb3 || cp === 0x2074; // ² ³ ⁴
};

export const VEDIC_SVARAS = ['॒', '॑', '᳚', '᳛'] as const;
export const isVedicSvaraTail = (ch: string | undefined): boolean => {
  return ch === '॒' || ch === '॑' || ch === '᳚' || ch === '᳛';
};

/** Code point version of `isVedicSvaraTail` */
export const isVedicSvaraTailCp = (cp: number): boolean => {
  return cp === 0x952 || cp === 0x951 || cp === 0x1cda || cp === 0x1cdb; // ॒ ॑ ᳚ ᳛
};

/** UTF-16 code units taken by the code point */
export const cpWidth = (cp: number): number => (cp > 0xffff ? 2 : 1);

export const isScriptTamilExt = (script_name: script_list_type): boolean => {
  return script_name === 'Tamil-Extended';
};

/** Emit pieces, optionally reordering relative to a trailing Tamil-Extended superscript number.
 *
 * When `should_reorder` is true, this will move the last output *character* (typically the superscript)
 * after the emitted pieces (with special handling when the first piece begins with `halant`).
 *
 * Caller is responsible for deciding when reordering is semantically correct.
 */
export const emitPiecesWithReorder = (
  result: ReturnType<typeof string_builder>,
  pieces: string[],
  halant: string,
  /** Tamil Extended Superscript Specific Reorder option */
  should_reorder: boolean
) => {
  if (pieces.length === 0) return;
  if (!should_reorder) {
    result.emitPieces(pieces);
    return;
  }

  const first_piece = pieces[0] ?? '';
  if (first_piece[0] === halant) {
    const rest_first = first_piece.slice(1);
    const after_pieces: string[] = [];
    if (rest_first) after_pieces.push(rest_first);
    for (let i = 1; i < pieces.length; i++) after_pieces.push(pieces[i]!);
    result.withLastCharMovedAfter([halant], after_pieces);
  } else {
    result.withLastCharMovedAfter(pieces, []);
  }
};

const VEDIC_SVARAS_TYPING_SYMBOLS = ['_', "'''", "''", "'"];
const VEDIC_SVARAS_NORMAL_SYMBOLS = ['↓', '↑↑↑', '↑↑', '↑'];
/**
 * Applying custom typing alias rules
 *
 * Handling Vedic Svara input in tamil Extended
 *
 * `x` -> `kSh` (क्ष) is a key in the typing data of each script, so that its `k` does not join
 * the key before it. Normal has no typing data, there it is replaced in the input.
 */
export const applyTypingInputAliases = (text: string, to_script_name: script_list_type): string => {
  if (!text) return text;
  if (to_script_name === 'Normal' && text.indexOf('x') !== -1) text = text.replaceAll('x', 'kSh');
  if (to_script_name === 'Tamil-Extended')
    for (let i = 0; i < VEDIC_SVARAS_TYPING_SYMBOLS.length; i++) {
      const symbol = VEDIC_SVARAS_TYPING_SYMBOLS[i];
      if (text.indexOf(symbol) !== -1) {
        text = text.replaceAll(symbol, VEDIC_SVARAS_NORMAL_SYMBOLS[i]);
      }
    }
  return text;
};
