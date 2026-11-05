const BLOCK_BITS = 7;
const BLOCK_SIZE = 1 << BLOCK_BITS;
const BLOCK_MASK = BLOCK_SIZE - 1;
const EMPTY = 0xffff;

/**
 * Dense `code point -> index` lookup.
 *
 * Each script's single-character keys live in ASCII plus a handful of 128-codepoint
 * Unicode blocks (its own block, shared Devanagari punctuation, Vedic marks, ...), so
 * a direct-indexed table per block replaces string creation + hashing with one or two
 * typed-array loads. Blocks are ordered by population so the script's primary block is probed first.
 *
 * Mirrors `CharIndexTable` in the rust package (`script_data/char_table.rs`).
 */
export class CharIndexTable {
  /** code points 0..127 */
  private readonly ascii: Uint16Array;
  /** `block_id` (`cp >> 7`) of each table in `blocks` */
  private readonly block_ids: number[];
  /** 128-slot table per block */
  private readonly blocks: Uint16Array[];

  /** Builds the table keeping the first index seen for each code point. */
  constructor(entries: Iterable<readonly [cp: number, index: number]>) {
    const ascii = new Uint16Array(BLOCK_SIZE).fill(EMPTY);
    const blocks: { id: number; table: Uint16Array; count: number }[] = [];

    for (const [cp, index] of entries) {
      if (index < 0 || index >= EMPTY) throw new Error('CharIndexTable index must fit in u16');
      let table: Uint16Array;
      if (cp < BLOCK_SIZE) {
        table = ascii;
      } else {
        const block_id = cp >>> BLOCK_BITS;
        let block = blocks.find((b) => b.id === block_id);
        if (!block) {
          block = { id: block_id, table: new Uint16Array(BLOCK_SIZE).fill(EMPTY), count: 0 };
          blocks.push(block);
        }
        block.count++;
        table = block.table;
      }
      const slot = cp & BLOCK_MASK;
      if (table[slot] === EMPTY) table[slot] = index;
    }

    blocks.sort((a, b) => b.count - a.count);
    this.ascii = ascii;
    this.block_ids = blocks.map((b) => b.id);
    this.blocks = blocks.map((b) => b.table);
  }

  /** Builds the table from the single code point keys of `keys` (multi code point keys are skipped) */
  static from_keys(keys: readonly string[]): CharIndexTable {
    const entries: [number, number][] = [];
    for (let i = 0; i < keys.length; i++) {
      const cp = single_code_point(keys[i]);
      if (cp !== -1) entries.push([cp, i]);
    }
    return new CharIndexTable(entries);
  }

  /** @returns the index for the code point or `-1` if not present */
  get(cp: number): number {
    let v: number = EMPTY;
    if (cp < BLOCK_SIZE) {
      v = this.ascii[cp];
    } else {
      const block_id = cp >>> BLOCK_BITS;
      const block_ids = this.block_ids;
      for (let i = 0; i < block_ids.length; i++) {
        if (block_ids[i] === block_id) {
          v = this.blocks[i][cp & BLOCK_MASK];
          break;
        }
      }
    }
    return v === EMPTY ? -1 : v;
  }
}

/** @returns the code point if `text` is exactly one code point, otherwise `-1` */
export const single_code_point = (text: string): number => {
  if (text.length === 0 || text.length > 2) return -1;
  const cp = text.codePointAt(0)!;
  return text.length === (cp > 0xffff ? 2 : 1) ? cp : -1;
};
