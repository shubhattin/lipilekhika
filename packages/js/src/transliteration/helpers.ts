import type {
  OutputBrahmicScriptData,
  OutputScriptData
} from '../make_script_data/output_script_data_schema';

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

  return {
    emit,
    emitPieces,
    lastPiece,
    lastChar,
    popLastChar,
    rewriteTailPieces,
    withLastCharMovedAfter,
    toString: () => result.join('')
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
