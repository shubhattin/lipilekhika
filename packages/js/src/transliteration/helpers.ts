import type {
  OutputBrahmicScriptData,
  OutputScriptData
} from '../make_script_data/output_script_data_schema';
import { binarySearchLowerWithIndex } from '../utils/binary_search/binary_search';
import type { script_list_type } from '../utils/lang_list';

export type prev_context_array_type = [
  string | undefined,
  OutputBrahmicScriptData['list'][number] | null | undefined
][];

export const kramaTextOrNull = (script: OutputScriptData, idx: number): string | null => {
  const v = script.krama_text_arr[idx]?.[0];
  return typeof v === 'string' ? v : null;
};

export const kramaTextOrEmpty = (script: OutputScriptData, idx: number): string => {
  return kramaTextOrNull(script, idx) ?? '';
};

export const kramaIndexOfText = (script_data: OutputScriptData, text: string): number => {
  return binarySearchLowerWithIndex(
    script_data.krama_text_arr,
    script_data.krama_text_arr_index,
    text,
    {
      accessor: (arr, i) => arr[i][0]
    }
  );
};

/**
 * Applying custom typing alias rules
 *
 * Eg. x -> kSh
 */
export const applyTypingInputAliases = (text: string): string => {
  if (!text) return text;
  // ITRANS-style shortcut: x -> kSh (क्ष)
  if (text.indexOf('x') === -1) return text;
  return text.replaceAll('x', 'kSh');
};

export const string_builder = () => {
  let result: string[] = [];

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
    if (rest) result[result.length - 1] = rest;
    else result.pop();
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

export const prev_context_builder = (maxLen: number) => {
  let arr: prev_context_array_type = [];

  type ContextItem = prev_context_array_type[number];
  type ContextType = OutputBrahmicScriptData['list'][number]['type'];

  function clear() {
    arr = [];
  }

  function length() {
    return arr.length;
  }

  function at(i: number): ContextItem | undefined {
    return arr.at(i);
  }

  function last(): ContextItem | undefined {
    return arr.at(-1);
  }

  function lastText(): string | undefined {
    return last()?.[0];
  }

  function lastType(): ContextType | undefined {
    return last()?.[1]?.type;
  }

  function typeAt(i: number): ContextType | undefined {
    return at(i)?.[1]?.type;
  }

  function textAt(i: number): string | undefined {
    return at(i)?.[0];
  }

  function isLastType(t: ContextType) {
    return lastType() === t;
  }

  function push(item: ContextItem) {
    const text = item[0];
    if (text !== undefined && text.length > 0) arr.push(item);
    if (arr.length > maxLen) arr.shift();
  }

  return {
    clear,
    length,
    at,
    last,
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

  function peekAt(index: number): CursorCp | null {
    const cp = text.codePointAt(index);
    if (cp === undefined) return null;
    const ch = String.fromCodePoint(cp);
    return { cp, ch, width: ch.length };
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
    peek,
    peekAt,
    peekAtOffsetUnits,
    advance,
    slice
  };
};

type PeekAtLike = (index: number) => { ch: string } | null;

export const matchPrevKramaSequence = (
  peekAt: PeekAtLike,
  anchorIndex: number,
  prev: number[],
  script_data: OutputScriptData
): { matched: boolean; matchedLen: number } => {
  for (let i = 0; i < prev.length; i++) {
    const expected_krama_index = prev[prev.length - 1 - i];
    const info = peekAt(anchorIndex - i);
    if (info === null) return { matched: false, matchedLen: 0 };
    const got_krama_index = kramaIndexOfText(script_data, info.ch);
    if (got_krama_index === -1 || got_krama_index !== expected_krama_index) {
      return { matched: false, matchedLen: 0 };
    }
  }
  return { matched: true, matchedLen: prev.length };
};

export const replaceWithPieces = (
  replace_with: number[],
  script_data: OutputScriptData
): string[] => {
  return replace_with.map((k) => kramaTextOrEmpty(script_data, k)).filter(Boolean);
};

export const TAMIL_EXTENDED_SUPERSCRIPT_NUMBERS = ['²', '³', '⁴'] as const;
export const isTaExtSuperscriptTail = (ch: string | undefined): boolean => {
  return (
    !!ch &&
    TAMIL_EXTENDED_SUPERSCRIPT_NUMBERS.indexOf(
      ch as (typeof TAMIL_EXTENDED_SUPERSCRIPT_NUMBERS)[number]
    ) !== -1
  );
};

export const VEDIC_SVARAS = ['॒', '॑', '᳚', '᳛'] as const;
export const isVedicSvaraTail = (ch: string | undefined): boolean => {
  return !!ch && VEDIC_SVARAS.indexOf(ch as (typeof VEDIC_SVARAS)[number]) !== -1;
};

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
